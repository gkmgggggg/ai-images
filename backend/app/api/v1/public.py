from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import SessionDep
from app.core.config import get_settings
from app.importers.image_inspirer import UPSTREAM_LICENSE, UPSTREAM_NAME, UPSTREAM_URL, read_upstream_commit
from app.models import Case, Category
from app.schemas import CaseDetail, CasePage, CategoriesOut, MetaOut, RandomCase, TagCount, UpstreamInfo
from app.search import index as search_index
from app.services import cases as case_service

router = APIRouter(tags=["public"])

CategoryQuery = Annotated[str | None, Query(description="分类 slug")]
KeywordQuery = Annotated[str | None, Query(max_length=100, description="搜索关键词")]
TagQuery = Annotated[int | None, Query(alias="tag", description="标签 id")]


@router.get("/cases", response_model=CasePage)
async def list_cases(
    session: SessionDep,
    category: CategoryQuery = None,
    q: KeywordQuery = None,
    has_image: bool = False,
    tag_id: TagQuery = None,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=60)] = 24,
) -> CasePage:
    return await case_service.list_cases(
        session, category=category, q=q, has_image=has_image, tag_id=tag_id, cursor=cursor, limit=limit
    )


@router.get("/cases/random", response_model=RandomCase)
async def random_case(
    session: SessionDep, category: CategoryQuery = None, q: KeywordQuery = None, tag_id: TagQuery = None
) -> RandomCase:
    return RandomCase(id=await case_service.random_case_id(session, category=category, q=q, tag_id=tag_id))


@router.get("/cases/{case_id}", response_model=CaseDetail)
async def get_case(session: SessionDep, case_id: int) -> CaseDetail:
    return await case_service.get_case_detail(session, case_id)


@router.get("/categories", response_model=CategoriesOut)
async def categories(session: SessionDep, q: KeywordQuery = None, tag_id: TagQuery = None) -> CategoriesOut:
    return await case_service.category_counts(session, q=q, tag_id=tag_id)


@router.get("/tags", response_model=list[TagCount])
async def tags(session: SessionDep) -> list[TagCount]:
    return await case_service.tag_counts(session)


@router.get("/meta", response_model=MetaOut)
async def meta(session: SessionDep) -> MetaOut:
    counts = await case_service.category_counts(session, q=None, tag_id=None)
    categories_total = await session.scalar(select(func.count()).select_from(Category)) or 0
    return MetaOut(
        total=counts.total,
        with_image=counts.with_image,
        categories=categories_total,
        upstream=UpstreamInfo(
            name=UPSTREAM_NAME,
            url=UPSTREAM_URL,
            commit=read_upstream_commit(get_settings().resources_dir)[:7],
            license=UPSTREAM_LICENSE,
        ),
        search_available=await search_index.is_available(),
    )


@router.get("/healthz")
async def healthz(session: SessionDep) -> dict:
    await session.scalar(select(func.count()).select_from(Case).limit(1))
    return {"status": "ok", "database": "ok", "search": "ok" if await search_index.is_available() else "down"}
