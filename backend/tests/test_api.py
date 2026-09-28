from pathlib import Path

from httpx import AsyncClient

from app.importers.image_inspirer import run_import
from tests.conftest import make_jpeg, write_resources


async def test_import_is_idempotent(resources_dir: Path) -> None:
    first = await run_import(resources_dir=resources_dir)
    assert (first.status, first.created, first.failed) == ("succeeded", 3, 0)
    assert "搜索索引重建失败" in first.log  # 测试环境没有 Meilisearch

    second = await run_import(resources_dir=resources_dir)
    assert (second.created, second.updated, second.skipped) == (0, 0, 3)


async def test_import_missing_resources_is_recorded_as_failed(tmp_path: Path) -> None:
    run = await run_import(resources_dir=tmp_path / "missing")
    assert run.status == "failed"
    assert "找不到上游素材目录" in run.log


async def test_browse_filters_and_cursor(client: AsyncClient) -> None:
    page = (await client.get("/cases", params={"limit": 1})).json()
    assert page["total"] == 3
    assert page["next_cursor"]
    next_page = (await client.get("/cases", params={"limit": 1, "cursor": page["next_cursor"]})).json()
    assert next_page["items"][0]["id"] > page["items"][0]["id"]

    with_image = (await client.get("/cases", params={"has_image": True})).json()
    assert with_image["total"] == 2
    assert all(item["cover"]["thumb"]["url"].endswith("-480.webp") for item in with_image["items"])

    posters = (await client.get("/cases", params={"category": "posters"})).json()
    assert {item["category"]["slug"] for item in posters["items"]} == {"posters"}

    tags = (await client.get("/tags")).json()
    assert [t["name"] for t in tags] == ["9:16"]
    tagged = (await client.get("/cases", params={"tag": tags[0]["id"]})).json()
    assert [item["title"] for item in tagged["items"]] == ["红色海报"]


async def test_search_falls_back_to_database(client: AsyncClient) -> None:
    result = (await client.get("/cases", params={"q": "blue"})).json()
    assert result["search_engine"] == "database"
    assert [item["title"] for item in result["items"]] == ["没有图的海报"]

    counts = (await client.get("/categories", params={"q": "海报"})).json()
    posters = next(item for item in counts["items"] if item["slug"] == "posters")
    assert (posters["total"], posters["with_image"]) == (2, 1)


async def test_detail_and_random(client: AsyncClient) -> None:
    first = (await client.get("/cases", params={"limit": 1})).json()["items"][0]
    detail = (await client.get(f"/cases/{first['id']}")).json()
    assert detail["prev_id"] is None and detail["next_id"]
    assert detail["images"][0]["medium"]["url"].endswith("-1080.webp")

    random_case = (await client.get("/cases/random", params={"category": "ui"})).json()
    ui_case = (await client.get("/cases", params={"category": "ui"})).json()["items"][0]
    assert random_case["id"] == ui_case["id"]
    assert (await client.get("/cases/999999")).json()["code"] == "not_found"


async def test_admin_requires_login(client: AsyncClient) -> None:
    response = await client.get("/admin/cases")
    assert response.status_code == 401
    bad = await client.post("/auth/login", json={"username": "admin", "password": "wrong"})
    assert bad.status_code == 401


async def test_admin_edit_survives_reimport(admin_client: AsyncClient, resources_dir: Path) -> None:
    listing = (await admin_client.get("/admin/cases", params={"q": "红色海报"})).json()
    case_id = listing["items"][0]["id"]

    updated = (await admin_client.patch(f"/admin/cases/{case_id}", json={"title": "手工改过的标题"})).json()
    assert updated["overridden_fields"] == ["title"]

    # 上游改了标题和图片，重新导入：标题保持手工版本，图片跟随上游
    write_resources(resources_dir, poster_title="上游新标题")
    (resources_dir / "db" / "海报与排版" / "images" / "case1.jpg").write_bytes(make_jpeg((10, 200, 10)))
    run = await run_import(resources_dir=resources_dir)
    assert run.updated == 1

    detail = (await admin_client.get(f"/admin/cases/{case_id}")).json()
    assert detail["title"] == "手工改过的标题"
    assert detail["images"][0]["color"].startswith("#0")

    cleared = (await admin_client.patch(f"/admin/cases/{case_id}", json={"clear_overrides": True})).json()
    assert cleared["overridden_fields"] == []
    await run_import(resources_dir=resources_dir)
    detail = (await admin_client.get(f"/admin/cases/{case_id}")).json()
    assert detail["title"] == "上游新标题"


async def test_admin_case_crud_and_images(admin_client: AsyncClient) -> None:
    categories = (await admin_client.get("/admin/categories")).json()
    tag = (await admin_client.post("/admin/tags", json={"name": "极简", "kind": "style"})).json()

    created = await admin_client.post(
        "/admin/cases",
        json={
            "category_id": categories[0]["id"],
            "title": "  手工案例  ",
            "prompt": "一只橘猫",
            "status": "draft",
            "tag_ids": [tag["id"]],
            "source_url": "",
        },
    )
    assert created.status_code == 201, created.text
    case = created.json()
    assert case["title"] == "手工案例"
    assert case["origin"] == "manual" and case["source_url"] is None
    assert [t["name"] for t in case["tags"]] == ["极简"]

    # 草稿不出现在前台
    assert (await admin_client.get(f"/cases/{case['id']}")).status_code == 404

    upload = await admin_client.post(
        f"/admin/cases/{case['id']}/images", files={"file": ("a.jpg", make_jpeg((1, 2, 3)), "image/jpeg")}
    )
    assert upload.status_code == 201, upload.text
    second = await admin_client.post(
        f"/admin/cases/{case['id']}/images", files={"file": ("b.jpg", make_jpeg((250, 250, 0)), "image/jpeg")}
    )
    images = second.json()["images"]
    assert len(images) == 2

    duplicate = await admin_client.post(
        f"/admin/cases/{case['id']}/images", files={"file": ("a.jpg", make_jpeg((1, 2, 3)), "image/jpeg")}
    )
    assert duplicate.status_code == 409
    not_image = await admin_client.post(
        f"/admin/cases/{case['id']}/images", files={"file": ("x.jpg", b"not an image", "image/jpeg")}
    )
    assert not_image.status_code == 400

    cover = (await admin_client.post(f"/admin/cases/{case['id']}/images/{images[1]['id']}/cover")).json()
    assert cover["images"][0]["id"] == images[1]["id"]

    published = await admin_client.patch(f"/admin/cases/{case['id']}", json={"status": "published"})
    assert published.json()["overridden_fields"] == []  # 手工案例不记录覆盖
    assert (await admin_client.get(f"/cases/{case['id']}")).status_code == 200

    assert (await admin_client.delete(f"/admin/cases/{case['id']}")).status_code == 204
    assert (await admin_client.get(f"/admin/cases/{case['id']}")).status_code == 404


async def test_admin_categories(admin_client: AsyncClient) -> None:
    created = (
        await admin_client.post("/admin/categories", json={"name": "测试分类", "slug": "test-cat"})
    ).json()
    dup = await admin_client.post("/admin/categories", json={"name": "测试分类", "slug": "other"})
    assert dup.status_code == 409
    bad_slug = await admin_client.post("/admin/categories", json={"name": "x", "slug": "Bad Slug"})
    assert bad_slug.status_code == 422

    ids = [c["id"] for c in (await admin_client.get("/admin/categories")).json()]
    reordered = [created["id"], *[i for i in ids if i != created["id"]]]
    assert (await admin_client.put("/admin/categories/order", json={"ids": reordered})).status_code == 204
    assert (await admin_client.get("/admin/categories")).json()[0]["id"] == created["id"]

    non_empty = next(c for c in (await admin_client.get("/admin/categories")).json() if c["case_count"])
    assert (await admin_client.delete(f"/admin/categories/{non_empty['id']}")).status_code == 409
    assert (await admin_client.delete(f"/admin/categories/{created['id']}")).status_code == 204


async def test_admin_imports_listing(admin_client: AsyncClient) -> None:
    runs = (await admin_client.get("/admin/imports")).json()
    assert runs and runs[0]["status"] == "succeeded"
    detail = (await admin_client.get(f"/admin/imports/{runs[0]['id']}")).json()
    assert "新增" in detail["log"]
    reindex = await admin_client.post("/admin/search/reindex")
    assert reindex.status_code == 503
