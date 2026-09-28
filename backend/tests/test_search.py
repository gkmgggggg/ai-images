from datetime import UTC, datetime

from app.models import Case, CaseImage, Category, Tag
from app.search.index import (
    HIGHLIGHT_POST,
    HIGHLIGHT_PRE,
    SearchFilters,
    _formatted_excerpt,
    _merge_marks,
    to_document,
)


def make_case(**overrides) -> Case:
    fields = {
        "id": 7,
        "title": "赛博朋克海报",
        "source_text": "@someone",
        "prompt": "[中文]霓虹\n[English]neon",
        "prompt_zh": "霓虹",
        "prompt_en": "neon",
        "status": "published",
        "category": Category(id=1, slug="posters", name="海报与排版"),
        "tags": [Tag(id=3, name="9:16", kind="ratio")],
        "images": [],
        "created_at": datetime(2026, 9, 28, tzinfo=UTC),
    }
    fields.update(overrides)
    return Case(**fields)


def test_to_document_maps_searchable_and_filterable_fields() -> None:
    """F11 F03：索引文档包含搜索字段与筛选字段。"""
    doc = to_document(make_case())
    assert doc["id"] == 7
    assert (doc["category"], doc["category_slug"]) == ("海报与排版", "posters")
    assert (doc["tags"], doc["tag_ids"]) == (["9:16"], [3])
    assert doc["has_image"] is False
    assert doc["created_at"] == int(datetime(2026, 9, 28, tzinfo=UTC).timestamp())

    with_image = to_document(make_case(images=[CaseImage(sha256="x")]))
    assert with_image["has_image"] is True


def test_filter_expression_escapes_values() -> None:
    """F02 F03 F12：分类、标签、仅有图转换为 Meilisearch 过滤表达式，并转义引号。"""
    assert SearchFilters().expression() == []
    assert SearchFilters(category_slug='a"b', tag_id=3, has_image=True).expression() == [
        'category_slug = "a\\"b"',
        "tag_ids = 3",
        "has_image = true",
    ]


def test_highlight_marks_are_merged_and_excerpt_prefers_chinese() -> None:
    """F03：相邻高亮合并；摘要优先取中文提示词中的命中片段。"""
    p, q = HIGHLIGHT_PRE, HIGHLIGHT_POST
    assert _merge_marks(f"{p}赛{q}{p}博{q}{p}朋克{q}风") == f"{p}赛博朋克{q}风"
    formatted = {"prompt_zh": f"一张 {p}海报{q}", "prompt_en": f"a {p}poster{q}", "prompt": "…"}
    assert _formatted_excerpt(formatted) == f"一张 {p}海报{q}"
    assert _formatted_excerpt({"prompt_zh": "没有命中"}) is None
