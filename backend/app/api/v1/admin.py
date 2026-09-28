from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile
from sqlalchemy import select

from app.api.deps import SessionDep, current_admin
from app.core.config import get_settings
from app.core.errors import AppError, bad_request, not_found
from app.importers.image_inspirer import ImportAlreadyRunning, run_import, start_run
from app.models import ImportRun
from app.schemas import (
    AdminCaseDetail,
    AdminCasePage,
    AdminCategory,
    CaseCreate,
    CaseStatus,
    CaseUpdate,
    CategoryCreate,
    CategoryOrder,
    CategoryUpdate,
    ImportRunDetail,
    ImportRunOut,
    TagCount,
    TagCreate,
    TagUpdate,
    TaskAccepted,
)
from app.search import index as search_index
from app.services import admin as admin_service

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(current_admin)])


# ---------- 案例 ----------


@router.get("/cases", response_model=AdminCasePage)
async def list_cases(
    session: SessionDep,
    q: Annotated[str | None, Query(max_length=100)] = None,
    status: CaseStatus | None = None,
    category_id: int | None = None,
    origin: str | None = None,
    has_image: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> AdminCasePage:
    return await admin_service.list_cases(
        session,
        q=q,
        status=status,
        category_id=category_id,
        origin=origin,
        has_image=has_image,
        page=page,
        page_size=page_size,
    )


@router.post("/cases", response_model=AdminCaseDetail, status_code=201)
async def create_case(session: SessionDep, data: CaseCreate) -> AdminCaseDetail:
    return await admin_service.create_case(session, data)


@router.get("/cases/{case_id}", response_model=AdminCaseDetail)
async def get_case(session: SessionDep, case_id: int) -> AdminCaseDetail:
    return await admin_service.get_case(session, case_id)


@router.patch("/cases/{case_id}", response_model=AdminCaseDetail)
async def update_case(session: SessionDep, case_id: int, data: CaseUpdate) -> AdminCaseDetail:
    return await admin_service.update_case(session, case_id, data)


@router.delete("/cases/{case_id}", status_code=204)
async def delete_case(session: SessionDep, case_id: int) -> None:
    await admin_service.delete_case(session, case_id)


@router.post("/cases/{case_id}/images", response_model=AdminCaseDetail, status_code=201)
async def upload_image(
    session: SessionDep, case_id: int, file: Annotated[UploadFile, File()]
) -> AdminCaseDetail:
    limit = get_settings().max_upload_bytes
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise AppError(413, "file_too_large", f"图片不能超过 {limit // 1024 // 1024} MB")
    if not data:
        raise bad_request("文件为空")
    return await admin_service.add_image(session, case_id, data)


@router.delete("/cases/{case_id}/images/{image_id}", response_model=AdminCaseDetail)
async def delete_image(session: SessionDep, case_id: int, image_id: int) -> AdminCaseDetail:
    return await admin_service.delete_image(session, case_id, image_id)


@router.post("/cases/{case_id}/images/{image_id}/cover", response_model=AdminCaseDetail)
async def set_cover(session: SessionDep, case_id: int, image_id: int) -> AdminCaseDetail:
    return await admin_service.set_cover(session, case_id, image_id)


# ---------- 分类 ----------


@router.get("/categories", response_model=list[AdminCategory])
async def list_categories(session: SessionDep) -> list[AdminCategory]:
    return await admin_service.list_categories(session)


@router.post("/categories", response_model=AdminCategory, status_code=201)
async def create_category(session: SessionDep, data: CategoryCreate) -> AdminCategory:
    return await admin_service.create_category(session, data)


@router.put("/categories/order", status_code=204)
async def reorder_categories(session: SessionDep, data: CategoryOrder) -> None:
    await admin_service.reorder_categories(session, data.ids)


@router.patch("/categories/{category_id}", status_code=204)
async def update_category(session: SessionDep, category_id: int, data: CategoryUpdate) -> None:
    await admin_service.update_category(session, category_id, data)


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(session: SessionDep, category_id: int) -> None:
    await admin_service.delete_category(session, category_id)


# ---------- 标签 ----------


@router.get("/tags", response_model=list[TagCount])
async def list_tags(session: SessionDep) -> list[TagCount]:
    return await admin_service.list_tags(session)


@router.post("/tags", response_model=TagCount, status_code=201)
async def create_tag(session: SessionDep, data: TagCreate) -> TagCount:
    return await admin_service.create_tag(session, data)


@router.patch("/tags/{tag_id}", status_code=204)
async def update_tag(session: SessionDep, tag_id: int, data: TagUpdate) -> None:
    await admin_service.update_tag(session, tag_id, data)


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(session: SessionDep, tag_id: int) -> None:
    await admin_service.delete_tag(session, tag_id)


# ---------- 导入与索引 ----------


@router.post("/imports", response_model=TaskAccepted, status_code=202)
async def trigger_import(session: SessionDep, background: BackgroundTasks) -> TaskAccepted:
    try:
        run = await start_run(session, trigger="admin")
    except ImportAlreadyRunning as exc:
        raise AppError(409, "import_running", str(exc)) from exc
    background.add_task(run_import, trigger="admin", run_id=run.id)
    return TaskAccepted(message="导入任务已开始", import_run_id=run.id)


@router.get("/imports", response_model=list[ImportRunOut])
async def list_imports(
    session: SessionDep, limit: Annotated[int, Query(ge=1, le=100)] = 30
) -> list[ImportRun]:
    return list((await session.scalars(select(ImportRun).order_by(ImportRun.id.desc()).limit(limit))).all())


@router.get("/imports/{run_id}", response_model=ImportRunDetail)
async def get_import(session: SessionDep, run_id: int) -> ImportRun:
    run = await session.get(ImportRun, run_id)
    if run is None:
        raise not_found("导入记录不存在")
    return run


@router.post("/search/reindex", response_model=TaskAccepted)
async def reindex(session: SessionDep) -> TaskAccepted:
    try:
        count = await search_index.reindex_all(session)
    except Exception as exc:  # noqa: BLE001
        raise AppError(503, "search_unavailable", f"搜索服务不可用：{exc}") from exc
    return TaskAccepted(message=f"搜索索引已重建，共 {count} 条")
