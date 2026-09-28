"""后台写入：案例、图片、分类、标签。每次写库后同步搜索索引。"""

import asyncio

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import bad_request, conflict, not_found
from app.models import Case, CaseImage, Category, Tag, case_tag
from app.schemas import (
    AdminCaseDetail,
    AdminCasePage,
    AdminCategory,
    CaseCreate,
    CaseUpdate,
    CategoryCreate,
    CategoryUpdate,
    TagCount,
    TagCreate,
    TagUpdate,
)
from app.search import index as search_index
from app.services.cases import has_image_clause, load_options
from app.services.images import InvalidImageError, process_image
from app.services.serializers import admin_case_detail, admin_case_item
from app.services.storage import Storage, get_storage

# 这些字段来自上游；管理员改过之后，重新导入不会覆盖
UPSTREAM_FIELDS = (
    "category_id",
    "title",
    "source_text",
    "source_url",
    "prompt",
    "prompt_zh",
    "prompt_en",
    "prompt_format",
)


async def _get_case(session: AsyncSession, case_id: int) -> Case:
    case = await session.scalar(select(Case).options(*load_options()).where(Case.id == case_id))
    if case is None:
        raise not_found("案例不存在")
    return case


async def _load_tags(session: AsyncSession, tag_ids: list[int]) -> list[Tag]:
    if not tag_ids:
        return []
    tags = (await session.scalars(select(Tag).where(Tag.id.in_(tag_ids)))).all()
    if len(tags) != len(set(tag_ids)):
        raise bad_request("部分标签不存在")
    order = {tag_id: index for index, tag_id in enumerate(tag_ids)}
    return sorted(tags, key=lambda tag: order[tag.id])


async def _ensure_category(session: AsyncSession, category_id: int) -> None:
    if await session.get(Category, category_id) is None:
        raise bad_request("分类不存在")


# ---------- 案例 ----------


async def list_cases(
    session: AsyncSession,
    *,
    q: str | None,
    status: str | None,
    category_id: int | None,
    origin: str | None,
    has_image: bool | None,
    page: int,
    page_size: int,
) -> AdminCasePage:
    page = max(page, 1)
    page_size = max(1, min(page_size, 100))
    stmt = select(Case)
    if q and q.strip():
        term = q.strip()
        pattern = f"%{term.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')}%"
        conditions = [Case.title.ilike(pattern), Case.prompt.ilike(pattern), Case.source_text.ilike(pattern)]
        if term.isdigit():
            conditions.append(Case.id == int(term))
        stmt = stmt.where(or_(*conditions))
    if status:
        stmt = stmt.where(Case.status == status)
    if category_id:
        stmt = stmt.where(Case.category_id == category_id)
    if origin:
        stmt = stmt.where(Case.origin == origin)
    if has_image is not None:
        stmt = stmt.where(has_image_clause() if has_image else ~has_image_clause())
    total = await session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (
        await session.scalars(
            stmt.options(*load_options())
            .order_by(Case.updated_at.desc(), Case.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return AdminCasePage(
        items=[admin_case_item(case) for case in rows], total=total, page=page, page_size=page_size
    )


async def get_case(session: AsyncSession, case_id: int) -> AdminCaseDetail:
    return admin_case_detail(await _get_case(session, case_id))


async def create_case(session: AsyncSession, data: CaseCreate) -> AdminCaseDetail:
    await _ensure_category(session, data.category_id)
    tags = await _load_tags(session, data.tag_ids)
    fields = data.model_dump(exclude={"tag_ids"})
    fields["source_url"] = str(data.source_url) if data.source_url else None
    case = Case(**fields, origin="manual", overridden_fields=[], images=[], tags=tags)
    session.add(case)
    await session.commit()
    await search_index.sync_cases(session, [case.id])
    return await get_case(session, case.id)


async def update_case(session: AsyncSession, case_id: int, data: CaseUpdate) -> AdminCaseDetail:
    case = await _get_case(session, case_id)
    changes = data.model_dump(exclude_unset=True, exclude={"tag_ids", "clear_overrides"})
    if "source_url" in changes:
        changes["source_url"] = str(data.source_url) if data.source_url else None
    for key in ("title", "category_id", "prompt_format", "status"):
        if key in changes and changes[key] is None:
            raise bad_request(f"{key} 不能为空")
    if "category_id" in changes:
        await _ensure_category(session, changes["category_id"])

    overridden = set(case.overridden_fields or [])
    for key, value in changes.items():
        if getattr(case, key) != value:
            setattr(case, key, value)
            if key in UPSTREAM_FIELDS:
                overridden.add(key)
    if data.tag_ids is not None:
        tags = await _load_tags(session, data.tag_ids)
        if [tag.id for tag in tags] != [tag.id for tag in case.tags]:
            case.tags = tags
            overridden.add("tags")
    if data.clear_overrides:
        overridden.clear()
    if case.origin == "upstream":
        case.overridden_fields = sorted(overridden)
    await session.commit()
    await search_index.sync_cases(session, [case.id])
    return await get_case(session, case.id)


async def delete_case(session: AsyncSession, case_id: int) -> None:
    case = await _get_case(session, case_id)
    images = list(case.images)
    await session.delete(case)
    await session.flush()
    await cleanup_image_files(session, get_storage(), images)
    await session.commit()
    await search_index.sync_cases(session, [case_id])


# ---------- 图片 ----------


async def cleanup_image_files(session: AsyncSession, storage: Storage, images: list[CaseImage]) -> None:
    """删除不再被任何案例引用的图片文件（同一张图可能被多个案例复用）。"""
    for image in images:
        still_used = await session.scalar(
            select(func.count()).select_from(CaseImage).where(CaseImage.sha256 == image.sha256)
        )
        if still_used:
            continue
        storage.delete(image.storage_key)
        for variant in (image.variants or {}).values():
            storage.delete(variant["key"])


def _mark_images_overridden(case: Case) -> None:
    if case.origin == "upstream" and "images" not in (case.overridden_fields or []):
        case.overridden_fields = sorted({*case.overridden_fields, "images"})


async def add_image(session: AsyncSession, case_id: int, data: bytes) -> AdminCaseDetail:
    case = await _get_case(session, case_id)
    try:
        processed = await asyncio.to_thread(process_image, data, get_storage(), reencode_original=True)
    except InvalidImageError as exc:
        raise bad_request(str(exc)) from exc
    if any(image.sha256 == processed.sha256 for image in case.images):
        raise conflict("这张图片已经在该案例中")
    next_order = max((image.sort_order for image in case.images), default=-1) + 1
    case.images.append(
        CaseImage(
            storage_key=processed.storage_key,
            sha256=processed.sha256,
            width=processed.width,
            height=processed.height,
            bytes=processed.bytes,
            dominant_color=processed.dominant_color,
            variants=processed.variants,
            sort_order=next_order,
        )
    )
    _mark_images_overridden(case)
    await session.commit()
    await search_index.sync_cases(session, [case.id])
    return await get_case(session, case.id)


async def delete_image(session: AsyncSession, case_id: int, image_id: int) -> AdminCaseDetail:
    case = await _get_case(session, case_id)
    image = next((image for image in case.images if image.id == image_id), None)
    if image is None:
        raise not_found("图片不存在")
    case.images.remove(image)
    _mark_images_overridden(case)
    await session.flush()
    await cleanup_image_files(session, get_storage(), [image])
    await session.commit()
    await search_index.sync_cases(session, [case.id])
    return await get_case(session, case.id)


async def set_cover(session: AsyncSession, case_id: int, image_id: int) -> AdminCaseDetail:
    case = await _get_case(session, case_id)
    if not any(image.id == image_id for image in case.images):
        raise not_found("图片不存在")
    ordered = sorted(case.images, key=lambda image: (image.id != image_id, image.sort_order, image.id))
    for index, image in enumerate(ordered):
        image.sort_order = index
    _mark_images_overridden(case)
    await session.commit()
    session.expire(case, ["images"])  # 让下面的查询按新的 sort_order 重新加载图片
    return await get_case(session, case_id)


# ---------- 分类 ----------


async def list_categories(session: AsyncSession) -> list[AdminCategory]:
    stmt = (
        select(Category, func.count(Case.id))
        .outerjoin(Case, Case.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.sort_order, Category.id)
    )
    return [
        AdminCategory(id=c.id, slug=c.slug, name=c.name, sort_order=c.sort_order, case_count=count)
        for c, count in (await session.execute(stmt)).all()
    ]


async def _commit_unique(session: AsyncSession, message: str) -> None:
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise conflict(message) from exc


async def create_category(session: AsyncSession, data: CategoryCreate) -> AdminCategory:
    max_order = await session.scalar(select(func.max(Category.sort_order))) or 0
    category = Category(name=data.name.strip(), slug=data.slug, sort_order=max_order + 1)
    session.add(category)
    await _commit_unique(session, "分类名称或 slug 已存在")
    return AdminCategory(
        id=category.id, slug=category.slug, name=category.name, sort_order=category.sort_order, case_count=0
    )


async def _category_case_ids(session: AsyncSession, category_id: int) -> list[int]:
    return list((await session.scalars(select(Case.id).where(Case.category_id == category_id))).all())


async def update_category(session: AsyncSession, category_id: int, data: CategoryUpdate) -> None:
    category = await session.get(Category, category_id)
    if category is None:
        raise not_found("分类不存在")
    if data.name is not None:
        category.name = data.name.strip()
    if data.slug is not None:
        category.slug = data.slug
    await _commit_unique(session, "分类名称或 slug 已存在")
    await search_index.sync_cases(session, await _category_case_ids(session, category_id))


async def delete_category(session: AsyncSession, category_id: int) -> None:
    category = await session.get(Category, category_id)
    if category is None:
        raise not_found("分类不存在")
    if await _category_case_ids(session, category_id):
        raise conflict("分类下还有案例，请先移走或删除这些案例")
    await session.delete(category)
    await session.commit()


async def reorder_categories(session: AsyncSession, ids: list[int]) -> None:
    categories = {c.id: c for c in (await session.scalars(select(Category))).all()}
    if set(ids) != set(categories):
        raise bad_request("排序需要包含全部分类")
    for index, category_id in enumerate(ids):
        categories[category_id].sort_order = index
    await session.commit()


# ---------- 标签 ----------


async def list_tags(session: AsyncSession) -> list[TagCount]:
    stmt = (
        select(Tag, func.count(case_tag.c.case_id))
        .outerjoin(case_tag, case_tag.c.tag_id == Tag.id)
        .group_by(Tag.id)
        .order_by(Tag.kind, Tag.name)
    )
    return [
        TagCount(id=t.id, name=t.name, kind=t.kind, count=count)
        for t, count in (await session.execute(stmt)).all()
    ]


async def create_tag(session: AsyncSession, data: TagCreate) -> TagCount:
    tag = Tag(name=data.name, kind=data.kind)
    session.add(tag)
    await _commit_unique(session, "标签已存在")
    return TagCount(id=tag.id, name=tag.name, kind=tag.kind, count=0)


async def _tag_case_ids(session: AsyncSession, tag_id: int) -> list[int]:
    return list((await session.scalars(select(case_tag.c.case_id).where(case_tag.c.tag_id == tag_id))).all())


async def update_tag(session: AsyncSession, tag_id: int, data: TagUpdate) -> None:
    tag = await session.get(Tag, tag_id)
    if tag is None:
        raise not_found("标签不存在")
    if data.name is not None:
        tag.name = data.name
    if data.kind is not None:
        tag.kind = data.kind
    await _commit_unique(session, "标签已存在")
    await search_index.sync_cases(session, await _tag_case_ids(session, tag_id))


async def delete_tag(session: AsyncSession, tag_id: int) -> None:
    tag = await session.get(Tag, tag_id)
    if tag is None:
        raise not_found("标签不存在")
    case_ids = await _tag_case_ids(session, tag_id)
    await session.delete(tag)
    await session.commit()
    await search_index.sync_cases(session, case_ids)
