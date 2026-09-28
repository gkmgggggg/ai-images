"""Meilisearch 索引：配置、文档映射、增量同步与全量重建。

PostgreSQL 是唯一数据源，索引只保存已发布案例，随时可以从数据库重建。
索引写入失败只记日志，不影响业务写入；搜索时 Meilisearch 不可用会降级到数据库查询。
"""

import logging
import os
from collections.abc import Iterable, Iterator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass

from meilisearch_python_sdk import AsyncClient
from meilisearch_python_sdk.models.settings import LocalizedAttributes, MeilisearchSettings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models import Case

logger = logging.getLogger(__name__)

HIGHLIGHT_PRE = "\u0002"
HIGHLIGHT_POST = "\u0003"
BATCH_SIZE = 500

INDEX_SETTINGS = MeilisearchSettings(
    # 顺序即权重：标题命中排在提示词命中之前
    searchable_attributes=["title", "tags", "prompt_zh", "prompt_en", "prompt", "source", "category"],
    filterable_attributes=["category_slug", "tag_ids", "has_image"],
    sortable_attributes=["id", "created_at"],
    displayed_attributes=["*"],
    localized_attributes=[
        LocalizedAttributes(attribute_patterns=["title", "prompt_zh", "category", "tags"], locales=["cmn"]),
        LocalizedAttributes(attribute_patterns=["prompt_en"], locales=["eng"]),
    ],
)


_PROXY_VARS = ("ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy")


@contextmanager
def _without_proxy_env() -> Iterator[None]:
    """Meilisearch 是内网服务，不应走系统代理。

    SDK 内部的 httpx 客户端在初始化时读取代理环境变量（且会提前创建 SOCKS 传输），
    又不暴露 trust_env 参数，所以只在构造客户端的这一刻移除这些变量。
    """
    saved = {key: os.environ.pop(key) for key in _PROXY_VARS if key in os.environ}
    try:
        yield
    finally:
        os.environ.update(saved)


def client() -> AsyncClient:
    settings = get_settings()
    with _without_proxy_env():
        return AsyncClient(settings.meili_url, settings.meili_master_key, timeout=5)


def to_document(case: Case) -> dict:
    return {
        "id": case.id,
        "title": case.title,
        "category": case.category.name,
        "category_slug": case.category.slug,
        "source": case.source_text,
        "prompt": case.prompt,
        "prompt_zh": case.prompt_zh,
        "prompt_en": case.prompt_en,
        "tags": [tag.name for tag in case.tags],
        "tag_ids": [tag.id for tag in case.tags],
        "has_image": bool(case.images),
        "created_at": int(case.created_at.timestamp()) if case.created_at else 0,
    }


def _load_options():
    return (selectinload(Case.category), selectinload(Case.images), selectinload(Case.tags))


async def ensure_index(wait: bool = True) -> None:
    settings = get_settings()
    async with client() as meili:
        index = await meili.get_or_create_index(settings.meili_index, primary_key="id")
        task = await index.update_settings(INDEX_SETTINGS)
        if wait:
            await meili.wait_for_task(task.task_uid, timeout_in_ms=60_000)


async def is_available() -> bool:
    try:
        async with client() as meili:
            health = await meili.health()
            return health.status == "available"
    except Exception:  # noqa: BLE001
        return False


async def sync_cases(session: AsyncSession, case_ids: Iterable[int]) -> None:
    """增量同步：已发布的写入索引，其余（草稿、隐藏、已删除）从索引移除。"""
    ids = sorted(set(case_ids))
    if not ids:
        return
    cases = (await session.scalars(select(Case).options(*_load_options()).where(Case.id.in_(ids)))).all()
    published = [case for case in cases if case.status == "published"]
    removed = sorted(set(ids) - {case.id for case in published})
    try:
        async with client() as meili:
            index = meili.index(get_settings().meili_index)
            if published:
                await index.add_documents([to_document(case) for case in published], primary_key="id")
            if removed:
                await index.delete_documents([str(case_id) for case_id in removed])
    except Exception:  # noqa: BLE001
        logger.exception("同步搜索索引失败，case_ids=%s；可在后台执行「重建搜索索引」修复", ids)


async def reindex_all(session: AsyncSession) -> int:
    """全量重建：清空后按批写入全部已发布案例，返回写入条数。"""
    await ensure_index()
    cases = (
        await session.scalars(
            select(Case).options(*_load_options()).where(Case.status == "published").order_by(Case.id)
        )
    ).all()
    documents = [to_document(case) for case in cases]
    async with client() as meili:
        index = meili.index(get_settings().meili_index)
        task = await index.delete_all_documents()
        await meili.wait_for_task(task.task_uid, timeout_in_ms=60_000)
        for start in range(0, len(documents), BATCH_SIZE):
            task = await index.add_documents(documents[start : start + BATCH_SIZE], primary_key="id")
            await meili.wait_for_task(task.task_uid, timeout_in_ms=120_000)
    logger.info("搜索索引已重建：%s 条", len(documents))
    return len(documents)


@dataclass
class SearchFilters:
    category_slug: str | None = None
    tag_id: int | None = None
    has_image: bool | None = None

    def expression(self) -> list[str]:
        parts: list[str] = []
        if self.category_slug:
            escaped = self.category_slug.replace("\\", "\\\\").replace('"', '\\"')
            parts.append(f'category_slug = "{escaped}"')
        if self.tag_id is not None:
            parts.append(f"tag_ids = {int(self.tag_id)}")
        if self.has_image is not None:
            parts.append(f"has_image = {'true' if self.has_image else 'false'}")
        return parts


@dataclass
class SearchHit:
    id: int
    title: str | None
    excerpt: str | None


@dataclass
class SearchResult:
    hits: list[SearchHit]
    total: int


def _merge_marks(value: str) -> str:
    # 中文分词后相邻的词会被分别高亮（「[赛][博][朋克]」），合并成一段
    return value.replace(HIGHLIGHT_POST + HIGHLIGHT_PRE, "")


def _formatted_excerpt(formatted: dict) -> str | None:
    for field in ("prompt_zh", "prompt_en", "prompt", "source"):
        value = formatted.get(field)
        if isinstance(value, str) and HIGHLIGHT_PRE in value:
            return _merge_marks(" ".join(value.split()))
    return None


async def search(query: str, filters: SearchFilters, *, offset: int, limit: int) -> SearchResult:
    async with client() as meili:
        index = meili.index(get_settings().meili_index)
        result = await index.search(
            query,
            offset=offset,
            limit=limit,
            filter=filters.expression() or None,
            attributes_to_retrieve=["id"],
            attributes_to_highlight=["title", "prompt_zh", "prompt_en", "prompt", "source"],
            attributes_to_crop=["prompt_zh", "prompt_en", "prompt"],
            crop_length=48,
            crop_marker="…",
            highlight_pre_tag=HIGHLIGHT_PRE,
            highlight_post_tag=HIGHLIGHT_POST,
            matching_strategy="all",
        )
    hits = []
    for hit in result.hits:
        formatted = hit.get("_formatted") or {}
        title = formatted.get("title")
        hits.append(
            SearchHit(
                id=int(hit["id"]),
                title=_merge_marks(title) if isinstance(title, str) and HIGHLIGHT_PRE in title else None,
                excerpt=_formatted_excerpt(formatted),
            )
        )
    return SearchResult(hits=hits, total=result.estimated_total_hits or 0)


async def facet_counts(query: str, filters: SearchFilters) -> dict[str, int]:
    async with client() as meili:
        index = meili.index(get_settings().meili_index)
        result = await index.search(
            query,
            limit=0,
            filter=filters.expression() or None,
            facets=["category_slug"],
            matching_strategy="all",
        )
    return dict((result.facet_distribution or {}).get("category_slug", {}))


async def matching_ids(query: str, filters: SearchFilters, limit: int = 1000) -> list[int]:
    async with client() as meili:
        index = meili.index(get_settings().meili_index)
        result = await index.search(
            query,
            limit=limit,
            filter=filters.expression() or None,
            attributes_to_retrieve=["id"],
            matching_strategy="all",
        )
    return [int(hit["id"]) for hit in result.hits]


def ordered(cases: Sequence[Case], ids: Sequence[int]) -> list[Case]:
    by_id = {case.id: case for case in cases}
    return [by_id[case_id] for case_id in ids if case_id in by_id]
