"""API 集成测试：使用独立的测试库，Meilisearch 指向一个不可用的端口，以验证搜索降级路径。

需要本机 PostgreSQL 中存在 ai_images_test 库（createdb ai_images_test），
或通过 ATLAS_TEST_DATABASE_URL 指定。
"""

import io
import os
import shutil
import tempfile
from collections.abc import AsyncIterator
from pathlib import Path

import pytest

_tmp = Path(tempfile.mkdtemp(prefix="atlas-test-"))
os.environ["ATLAS_DATABASE_URL"] = os.environ.get(
    "ATLAS_TEST_DATABASE_URL", "postgresql+asyncpg://localhost:5432/ai_images_test"
)
os.environ["ATLAS_MEILI_URL"] = "http://127.0.0.1:9"
os.environ["ATLAS_MEDIA_ROOT"] = str(_tmp / "media")
os.environ["ATLAS_RESOURCES_DIR"] = str(_tmp / "resources")
os.environ["ATLAS_ENV"] = "test"

from httpx import ASGITransport, AsyncClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import AdminUser  # noqa: E402


def make_jpeg(color: tuple[int, int, int], size: tuple[int, int] = (600, 800)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, "JPEG")
    return buffer.getvalue()


def write_resources(root: Path, *, poster_title: str = "红色海报") -> None:
    posters = root / "db" / "海报与排版"
    ui = root / "db" / "UI与界面"
    (posters / "images").mkdir(parents=True, exist_ok=True)
    (ui / "images").mkdir(parents=True, exist_ok=True)
    (root / "UPSTREAM_COMMIT").write_text("abcdef1234567890\n")
    (posters / "prompt.md").write_text(
        f"""# 海报

## 例 1：{poster_title}

**来源：** 小红书号1

```text
一张红色的竖版海报，9:16
```

## 例 2：没有图的海报

**来源：** 未提供

```text
A blue poster without image
```
""",
        encoding="utf-8",
    )
    (ui / "prompt.md").write_text(
        """# UI

## 例 1：登录页面

**来源：** [@designer](https://x.com/designer)

```text
{"type": "login page", "style": "minimal"}
```
""",
        encoding="utf-8",
    )
    (posters / "images" / "case1.jpg").write_bytes(make_jpeg((200, 30, 30)))
    (ui / "images" / "case1.jpg").write_bytes(make_jpeg((30, 30, 200)))


@pytest.fixture(scope="session")
def resources_dir() -> Path:
    root = Path(os.environ["ATLAS_RESOURCES_DIR"])
    write_resources(root)
    return root


@pytest.fixture(scope="session", autouse=True)
async def database() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as session:
        session.add(AdminUser(username="admin", password_hash=hash_password("secret-pass")))
        await session.commit()
    yield
    await engine.dispose()
    shutil.rmtree(_tmp, ignore_errors=True)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1") as http:
        yield http


@pytest.fixture
async def admin_client(client: AsyncClient) -> AsyncClient:
    response = await client.post("/auth/login", json={"username": "admin", "password": "secret-pass"})
    assert response.status_code == 200, response.text
    return client
