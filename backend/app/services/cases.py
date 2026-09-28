"""前台读取：列表（浏览/搜索）、分类计数、随机、详情。"""

import logging
import random

from sqlalchemy import Select, and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import not_found
from app.models import Case, CaseImage, Category, Tag, case_tag
from app.schemas import CaseDetail, CasePage, CategoriesOut, CategoryCount, Highlight, TagCount
from app.search import index as search_index
from app.services.serializers import case_detail, case_summary

logger = logging.getLogger(__name__)

MAX_LIMIT = 60


def load_options():
    return (selectinload(Case.category), selectinload(Case.images), selectinload(Case.tags))


def has_image_clause():
    return exists(select(CaseImage.id).where(CaseImage.case_id == Case.id))


def _published_filters(
    stmt: Select, *, category: str | None, has_image: bool | None, tag_id: int | None
) -> Select:
    stmt = stmt.where(Case.status == "published")
    if category:
        stmt = stmt.where(Case.category.has(Category.slug == category))
    if has_image:
        stmt = stmt.where(has_image_clause())
    if tag_id is not None:
        stmt = stmt.where(Case.tags.any(Tag.id == tag_id))
    return stmt


def _like_clause(q: str):
    pattern = f"%{q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')}%"
    return or_(
        Case.title.ilike(pattern),
        Case.prompt.ilike(pattern),
        Case.prompt_zh.ilike(pattern),
        Case.prompt_en.ilike(pattern),
        Case.source_text.ilike(pattern),
    )


def _parse_cursor(cursor: str | None) -> int:
    try:
        return max(int(cursor), 0) if cursor else 0
    except ValueError:
        return 0


async def list_cases(
    session: AsyncSession,
    *,
    category: str | None,
    q: str | None,
    has_image: bool | None,
    tag_id: int | None,
    cursor: str | None,
    limit: int,
) -> CasePage:
    limit = max(1, min(limit, MAX_LIMIT))
    q = (q or "").strip()
    if q:
        try:
            return await _search_cases(
                session,
                q=q,
                category=category,
                has_image=has_image,
                tag_id=tag_id,
                cursor=cursor,
                limit=limit,
            )
        except Exception:  # noqa: BLE001
            logger.warning("Meilisearch 不可用，搜索降级为数据库查询", exc_info=True)
            return await _like_cases(
                session,
                q=q,
                category=category,
                has_image=has_image,
                tag_id=tag_id,
                cursor=cursor,
                limit=limit,
            )
    return await _browse_cases(
        session, category=category, has_image=has_image, tag_id=tag_id, cursor=cursor, limit=limit
    )


async def _browse_cases(
    session: AsyncSession,
    *,
    category: str | None,
    has_image: bool | None,
    tag_id: int | None,
    cursor: str | None,
    limit: int,
) -> CasePage:
    """浏览按 id 游标分页，翻页时不会因为新增数据出现重复或遗漏。"""
    base = _published_filters(select(Case), category=category, has_image=has_image, tag_id=tag_id)
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    after = _parse_cursor(cursor)
    stmt = base.options(*load_options()).order_by(Case.id).limit(limit + 1)
    if after:
        stmt = stmt.where(Case.id > after)
    rows = (await session.scalars(stmt)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return CasePage(
        items=[case_summary(case) for case in rows],
        next_cursor=str(rows[-1].id) if has_more and rows else None,
        total=total,
    )


async def _search_cases(
    session: AsyncSession,
    *,
    q: str,
    category: str | None,
    has_image: bool | None,
    tag_id: int | None,
    cursor: str | None,
    limit: int,
) -> CasePage:
    offset = _parse_cursor(cursor)
    filters = search_index.SearchFilters(category_slug=category, tag_id=tag_id, has_image=has_image or None)
    result = await search_index.search(q, filters, offset=offset, limit=limit)
    ids = [hit.id for hit in result.hits]
    cases = (await session.scalars(select(Case).options(*load_options()).where(Case.id.in_(ids)))).all()
    highlights = {hit.id: Highlight(title=hit.title, excerpt=hit.excerpt) for hit in result.hits}
    items = [
        case_summary(case, highlights.get(case.id))
        for case in search_index.ordered(cases, ids)
        if case.status == "published"
    ]
    next_offset = offset + len(result.hits)
    return CasePage(
        items=items,
        next_cursor=str(next_offset) if result.hits and next_offset < result.total else None,
        total=result.total,
        search_engine="meilisearch",
    )


async def _like_cases(
    session: AsyncSession,
    *,
    q: str,
    category: str | None,
    has_image: bool | None,
    tag_id: int | None,
    cursor: str | None,
    limit: int,
) -> CasePage:
    base = _published_filters(select(Case), category=category, has_image=has_image, tag_id=tag_id).where(
        _like_clause(q)
    )
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    offset = _parse_cursor(cursor)
    rows = (
        await session.scalars(base.options(*load_options()).order_by(Case.id).offset(offset).limit(limit))
    ).all()
    next_offset = offset + len(rows)
    return CasePage(
        items=[case_summary(case) for case in rows],
        next_cursor=str(next_offset) if next_offset < total else None,
        total=total,
    )


async def category_counts(session: AsyncSession, *, q: str | None, tag_id: int | None) -> CategoriesOut:
    categories = (await session.scalars(select(Category).order_by(Category.sort_order, Category.id))).all()
    q = (q or "").strip()
    totals: dict[str, int]
    with_images: dict[str, int]
    if q:
        try:
            totals = await search_index.facet_counts(q, search_index.SearchFilters(tag_id=tag_id))
            with_images = await search_index.facet_counts(
                q, search_index.SearchFilters(tag_id=tag_id, has_image=True)
            )
        except Exception:  # noqa: BLE001
            logger.warning("Meilisearch 不可用，分类计数降级为数据库查询", exc_info=True)
            totals, with_images = await _db_category_counts(session, q=q, tag_id=tag_id)
    else:
        totals, with_images = await _db_category_counts(session, q=None, tag_id=tag_id)

    items = [
        CategoryCount(
            id=category.id,
            slug=category.slug,
            name=category.name,
            total=totals.get(category.slug, 0),
            with_image=with_images.get(category.slug, 0),
        )
        for category in categories
    ]
    return CategoriesOut(
        items=items,
        total=sum(item.total for item in items),
        with_image=sum(item.with_image for item in items),
    )


async def _db_category_counts(
    session: AsyncSession, *, q: str | None, tag_id: int | None
) -> tuple[dict[str, int], dict[str, int]]:
    image_flag = has_image_clause()
    stmt = (
        select(Category.slug, func.count(Case.id), func.count(Case.id).filter(image_flag))
        .join(Case, Case.category_id == Category.id)
        .where(Case.status == "published")
        .group_by(Category.slug)
    )
    if tag_id is not None:
        stmt = stmt.where(Case.tags.any(Tag.id == tag_id))
    if q:
        stmt = stmt.where(_like_clause(q))
    rows = (await session.execute(stmt)).all()
    return {slug: total for slug, total, _ in rows}, {slug: with_image for slug, _, with_image in rows}


async def random_case_id(
    session: AsyncSession, *, category: str | None, q: str | None, tag_id: int | None
) -> int | None:
    q = (q or "").strip()
    if q:
        try:
            filters = search_index.SearchFilters(category_slug=category, tag_id=tag_id, has_image=True)
            ids = await search_index.matching_ids(q, filters)
            return random.choice(ids) if ids else None
        except Exception:  # noqa: BLE001
            logger.warning("Meilisearch 不可用，随机案例降级为数据库查询", exc_info=True)
    stmt = _published_filters(select(Case.id), category=category, has_image=True, tag_id=tag_id)
    if q:
        stmt = stmt.where(_like_clause(q))
    return await session.scalar(stmt.order_by(func.random()).limit(1))


async def get_case_detail(session: AsyncSession, case_id: int) -> CaseDetail:
    case = await session.scalar(
        select(Case).options(*load_options()).where(and_(Case.id == case_id, Case.status == "published"))
    )
    if case is None:
        raise not_found("案例不存在或已下线")
    prev_id = await session.scalar(
        select(func.max(Case.id)).where(Case.status == "published", Case.id < case_id)
    )
    next_id = await session.scalar(
        select(func.min(Case.id)).where(Case.status == "published", Case.id > case_id)
    )
    return case_detail(case, prev_id, next_id)


async def tag_counts(session: AsyncSession) -> list[TagCount]:
    stmt = (
        select(Tag, func.count(Case.id))
        .join(case_tag, case_tag.c.tag_id == Tag.id)
        .join(Case, and_(Case.id == case_tag.c.case_id, Case.status == "published"))
        .group_by(Tag.id)
        .order_by(Tag.kind, func.count(Case.id).desc(), Tag.name)
    )
    rows = (await session.execute(stmt)).all()
    return [TagCount(id=tag.id, name=tag.name, kind=tag.kind, count=count) for tag, count in rows]
