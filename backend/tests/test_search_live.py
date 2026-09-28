"""对真实 Meilisearch 的集成测试；未设置 ATLAS_TEST_MEILI_URL 时跳过。

    ATLAS_TEST_MEILI_URL=http://127.0.0.1:7700 ATLAS_TEST_MEILI_KEY=<master key> \\
        uv run pytest tests/test_search_live.py

使用独立的 cases_test 索引，结束后删除。
"""

import asyncio
import os
from collections.abc import AsyncIterator, Awaitable, Callable
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.importers.image_inspirer import run_import
from app.search import index as search_index

LIVE_URL = os.environ.get("ATLAS_TEST_MEILI_URL")
pytestmark = pytest.mark.skipif(not LIVE_URL, reason="未设置 ATLAS_TEST_MEILI_URL")


@pytest.fixture
async def live_search(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[None]:
    settings = get_settings().model_copy(
        update={
            "meili_url": LIVE_URL,
            "meili_master_key": os.environ.get("ATLAS_TEST_MEILI_KEY", ""),
            "meili_index": "cases_test",
        }
    )
    monkeypatch.setattr(search_index, "get_settings", lambda: settings)
    yield
    async with search_index.client() as meili:
        await meili.delete_index_if_exists("cases_test")


async def eventually(check: Callable[[], Awaitable[bool]]) -> None:
    """增量同步不等待 Meilisearch 任务完成，这里轮询直到结果符合预期（最多 5 秒）。"""
    async with asyncio.timeout(5):
        while not await check():  # noqa: ASYNC110  轮询外部服务，没有可等待的事件
            await asyncio.sleep(0.2)


async def test_search_uses_meilisearch_and_follows_admin_edits(
    live_search: None, admin_client: AsyncClient, resources_dir: Path
) -> None:
    """F03 F11：导入后可搜索并高亮；后台改标题、下线后索引随之更新。"""
    run = await run_import(resources_dir=resources_dir)
    assert "搜索索引已重建" in run.log

    result = (await admin_client.get("/cases", params={"q": "登录页面"})).json()
    assert result["search_engine"] == "meilisearch"
    assert result["items"][0]["highlight"]["title"] == "\u0002登录页面\u0003"
    case_id = result["items"][0]["id"]

    await admin_client.patch(f"/admin/cases/{case_id}", json={"title": "独角兽界面"})

    async def found() -> bool:
        items = (await admin_client.get("/cases", params={"q": "独角兽"})).json()["items"]
        return [item["id"] for item in items] == [case_id]

    await eventually(found)

    await admin_client.patch(f"/admin/cases/{case_id}", json={"status": "hidden"})

    async def gone() -> bool:
        return (await admin_client.get("/cases", params={"q": "独角兽"})).json()["total"] == 0

    await eventually(gone)
    await admin_client.patch(
        f"/admin/cases/{case_id}", json={"status": "published", "title": "登录页面", "clear_overrides": True}
    )
