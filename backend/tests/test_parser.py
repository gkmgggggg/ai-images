from app.core.config import REPO_DIR
from app.importers.image_inspirer import (
    detect_format,
    detect_ratios,
    parse_prompt_markdown,
    parse_source,
    split_languages,
)

SAMPLE = """# 示例 — 提示词合集

## 例 3：足球主题电影海报

**来源：** 未提供

![case3.jpg](images/case3.jpg)

```text
生成一张竖版 9:16 海报，时间 10:30，比例 3:45 不算
```

---

## 例 58：主题海报版式设计

**来源：** [@liyue\\_ai](https://x.com/liyue_ai)

```text
Flat illustration, vertical 9:16 composition, --ar 16:9
```

## 例 7：双语

**来源：** 小红书号123

```text
[中文]
一只猫
[English]
A cat
```
"""


def test_parse_prompt_markdown() -> None:
    """F08 F12：解析案例边界、来源、中英文与比例标签。"""
    cases = parse_prompt_markdown(SAMPLE)
    assert [c.upstream_no for c in cases] == [3, 58, 7]

    poster, english, bilingual = cases
    assert poster.title == "足球主题电影海报"
    assert poster.source_text == ""
    assert poster.source_url is None
    assert poster.prompt_zh.startswith("生成一张竖版")
    assert poster.prompt_en == ""
    assert poster.ratios == ["9:16"]

    assert english.source_text == "@liyue_ai"
    assert english.source_url == "https://x.com/liyue_ai"
    assert english.prompt_zh == ""
    assert english.prompt_en.startswith("Flat illustration")
    assert english.ratios == ["9:16", "16:9"]

    assert bilingual.prompt_zh == "一只猫"
    assert bilingual.prompt_en == "A cat"


def test_split_languages_uses_character_ratio() -> None:
    """F08：按字符占比判断整段提示词的语言。"""
    # 英文提示词里夹了少量要渲染的中文，仍然算英文
    zh, en = split_languages('A poster with the title "北京" in bold serif letters, cinematic lighting')
    assert (zh, en[:8]) == ("", "A poster")
    zh, en = split_languages("一张海报，标题是 Hello")
    assert zh and not en


def test_detect_format() -> None:
    """F08：识别 JSON 格式的提示词。"""
    assert detect_format('{"type": "poster"}') == "json"
    assert detect_format("{not json") == "text"
    assert detect_format("plain") == "text"


def test_detect_ratios_ignores_times_and_unknown_ratios() -> None:
    """F12：比例识别忽略时间与非常见比例。"""
    assert detect_ratios("12:30 开会，7:5 不常见，比例 4：5") == ["4:5"]
    assert detect_ratios("16比9 宽屏") == ["16:9"]


def test_parse_source_plain_text() -> None:
    """F08：纯文本来源不生成链接。"""
    assert parse_source("小红书号4264014889") == ("小红书号4264014889", None)


def test_bundled_resources_parse_completely() -> None:
    """F08：仓库内快照的 668 条案例都能解析出提示词。"""
    db = REPO_DIR / "resources" / "image-inspirer" / "db"
    total = 0
    for prompt in db.glob("*/prompt.md"):
        cases = parse_prompt_markdown(prompt.read_text(encoding="utf-8"))
        assert all(c.prompt for c in cases), prompt
        total += len(cases)
    assert total == 668
