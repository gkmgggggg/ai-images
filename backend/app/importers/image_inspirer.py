"""导入仓库内的 image-inspirer 素材快照（resources/image-inspirer/db/<分类>/prompt.md + images/）。

- 按 (分类, 上游编号) 幂等更新；上游编号跨分类会重复，所以不能单独作为主键。
- 管理员手工改过的字段（case.overridden_fields）保持不动。
- 图片按 sha256 去重，只有内容变化才重新生成衍生图。
- 从提示词中识别画面比例（如 3:4、16:9），自动打上比例标签。
"""

import asyncio
import json
import logging
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.db import SessionLocal
from app.models import Case, CaseImage, Category, ImportRun, Tag
from app.search import index as search_index
from app.services.admin import cleanup_image_files
from app.services.images import process_image, sha256_of
from app.services.storage import get_storage

logger = logging.getLogger(__name__)

UPSTREAM_NAME = "wukongnotnull/image-inspirer"
UPSTREAM_URL = "https://github.com/wukongnotnull/image-inspirer"
UPSTREAM_LICENSE = "Apache-2.0"

CATEGORY_SLUGS = {
    "UI与界面": "ui",
    "人物与角色": "characters",
    "其他应用场景": "others",
    "历史与古风题材": "history",
    "品牌与标志": "branding",
    "商品与电商": "ecommerce",
    "图表与信息可视化": "infographics",
    "场景与叙事": "scenes",
    "建筑与空间": "architecture",
    "插画与艺术": "illustration",
    "摄影与写实": "photography",
    "文档与出版物": "documents",
    "海报与排版": "posters",
}

RATIOS = {"1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"}

_heading = re.compile(r"^## 例 (\d+)：(.+)$", re.MULTILINE)
_source = re.compile(r"\*\*来源：\*\*\s*(.+)")
_code_block = re.compile(r"```(?:text|json)?[ \t]*\n?([\s\S]*?)```")
_md_link = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
_zh_section = re.compile(r"\[中文\]\s*([\s\S]*?)(?=\n\s*\[(?:English|英文)\]|\Z)", re.IGNORECASE)
_en_section = re.compile(r"\[(?:English|英文)\]\s*([\s\S]*?)(?=\n\s*\[中文\]|\Z)", re.IGNORECASE)
_cjk = re.compile(r"[㐀-鿿]")
_latin = re.compile(r"[A-Za-z]")
_ratio = re.compile(r"(?<!\d)(1|2|3|4|5|9|16|21)\s*[:：比]\s*(1|2|3|4|5|9|16)(?!\d)")
_placeholder_sources = {"", "未提供", "未标注", "无"}


@dataclass
class ParsedCase:
    upstream_no: int
    title: str
    source_text: str
    source_url: str | None
    prompt: str
    prompt_zh: str
    prompt_en: str
    prompt_format: str
    ratios: list[str] = field(default_factory=list)


def split_languages(prompt: str) -> tuple[str, str]:
    """返回 (中文提示词, 英文提示词)。有 [中文]/[English] 标记时按标记拆分，否则按字符占比判断整段语言。"""
    zh_match = _zh_section.search(prompt)
    en_match = _en_section.search(prompt)
    if zh_match or en_match:
        return (zh_match.group(1).strip() if zh_match else "", en_match.group(1).strip() if en_match else "")
    cjk = len(_cjk.findall(prompt))
    latin = len(_latin.findall(prompt))
    if cjk and cjk >= 0.2 * (cjk + latin):
        return prompt, ""
    return "", prompt


def detect_format(prompt: str) -> str:
    stripped = prompt.strip()
    if stripped[:1] in "{[":
        try:
            json.loads(stripped)
            return "json"
        except ValueError:
            pass
    return "text"


def detect_ratios(prompt: str) -> list[str]:
    found: list[str] = []
    for a, b in _ratio.findall(prompt):
        ratio = f"{a}:{b}"
        if ratio in RATIOS and ratio not in found:
            found.append(ratio)
    return found


def parse_source(raw: str) -> tuple[str, str | None]:
    raw = raw.strip()
    link = _md_link.search(raw)
    url = link.group(2) if link and link.group(2).startswith(("http://", "https://")) else None
    text = _md_link.sub(r"\1", raw).replace("\\_", "_").strip()
    return ("" if text in _placeholder_sources else text), url


def parse_prompt_markdown(markdown: str) -> list[ParsedCase]:
    headings = list(_heading.finditer(markdown))
    cases: list[ParsedCase] = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(markdown)
        block = markdown[heading.start() : end]
        source_match = _source.search(block)
        source_text, source_url = parse_source(source_match.group(1) if source_match else "")
        code = _code_block.search(block)
        if code:
            prompt = code.group(1).strip()
        else:
            lines = [
                line
                for line in block.splitlines()
                if not line.startswith(("## ", "**来源", "![")) and line.strip() != "---"
            ]
            prompt = "\n".join(lines).strip()
        prompt_zh, prompt_en = split_languages(prompt)
        cases.append(
            ParsedCase(
                upstream_no=int(heading.group(1)),
                title=heading.group(2).strip(),
                source_text=source_text,
                source_url=source_url,
                prompt=prompt,
                prompt_zh=prompt_zh,
                prompt_en=prompt_en,
                prompt_format=detect_format(prompt),
                ratios=detect_ratios(prompt),
            )
        )
    return cases


def read_upstream_commit(resources_dir: Path) -> str:
    path = resources_dir / "UPSTREAM_COMMIT"
    return path.read_text(encoding="utf-8").strip() if path.exists() else ""


class ImportAlreadyRunning(RuntimeError):
    pass


def _read_optional(path: Path) -> bytes | None:
    return path.read_bytes() if path.exists() else None


def _list_prompt_files(db_dir: Path) -> list[tuple[Path, str]]:
    if not db_dir.is_dir():
        raise FileNotFoundError(f"找不到上游素材目录：{db_dir}")
    directories = sorted((p for p in db_dir.iterdir() if p.is_dir()), key=lambda p: p.name)
    return [
        (d, (d / "prompt.md").read_text(encoding="utf-8")) for d in directories if (d / "prompt.md").exists()
    ]


@dataclass
class _Counters:
    created: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    lines: list[str] = field(default_factory=list)


class Importer:
    def __init__(self, session: AsyncSession, resources_dir: Path, log: Callable[[str], None]) -> None:
        self.session = session
        self.resources_dir = resources_dir
        self.storage = get_storage()
        self.log = log
        self.counters = _Counters()
        self._tags: dict[str, Tag] = {}

    def note(self, line: str) -> None:
        self.counters.lines.append(line)
        self.log(line)

    async def _category(self, name: str, sort_order: int) -> Category:
        category = await self.session.scalar(select(Category).where(Category.name == name))
        if category is None:
            slug = CATEGORY_SLUGS.get(name) or f"category-{sort_order + 1}"
            category = Category(name=name, slug=slug, sort_order=sort_order)
            self.session.add(category)
            await self.session.flush()
            self.note(f"新建分类：{name}（{slug}）")
        return category

    async def _ratio_tag(self, ratio: str) -> Tag:
        if ratio not in self._tags:
            tag = await self.session.scalar(select(Tag).where(Tag.name == ratio))
            if tag is None:
                tag = Tag(name=ratio, kind="ratio")
                self.session.add(tag)
                await self.session.flush()
            self._tags[ratio] = tag
        return self._tags[ratio]

    async def _sync_image(self, case: Case, image_path: Path) -> bool:
        """让案例图片与上游一致，返回是否有变化。"""
        data = await asyncio.to_thread(_read_optional, image_path)
        if data is None:
            if not case.images:
                return False
            removed = list(case.images)
            case.images.clear()
            await self.session.flush()
            await cleanup_image_files(self.session, self.storage, removed)
            return True

        sha = sha256_of(data)
        if [image.sha256 for image in case.images] == [sha]:
            return False
        processed = await asyncio.to_thread(process_image, data, self.storage, reencode_original=False)
        removed = list(case.images)
        case.images.clear()
        case.images.append(
            CaseImage(
                storage_key=processed.storage_key,
                sha256=processed.sha256,
                width=processed.width,
                height=processed.height,
                bytes=processed.bytes,
                dominant_color=processed.dominant_color,
                variants=processed.variants,
                sort_order=0,
            )
        )
        await self.session.flush()
        await cleanup_image_files(self.session, self.storage, removed)
        return True

    async def import_case(self, category: Category, parsed: ParsedCase, image_path: Path) -> None:
        case = await self.session.scalar(
            select(Case)
            .options(selectinload(Case.images), selectinload(Case.tags))
            .where(Case.category_id == category.id, Case.upstream_no == parsed.upstream_no)
        )
        fields = {
            "title": parsed.title,
            "source_text": parsed.source_text,
            "source_url": parsed.source_url,
            "prompt": parsed.prompt,
            "prompt_zh": parsed.prompt_zh,
            "prompt_en": parsed.prompt_en,
            "prompt_format": parsed.prompt_format,
        }
        created = case is None
        changed = False
        if case is None:
            case = Case(
                category_id=category.id,
                upstream_no=parsed.upstream_no,
                origin="upstream",
                status="published",
                overridden_fields=[],
                images=[],
                tags=[],
                **fields,
            )
            self.session.add(case)
        else:
            for key, value in fields.items():
                if key not in case.overridden_fields and getattr(case, key) != value:
                    setattr(case, key, value)
                    changed = True

        overridden = set(case.overridden_fields or [])
        if "images" not in overridden and await self._sync_image(case, image_path):
            changed = True
        if "tags" not in overridden:
            tags = [await self._ratio_tag(ratio) for ratio in parsed.ratios]
            if [tag.id for tag in tags] != [tag.id for tag in case.tags]:
                case.tags = tags
                changed = True

        if created:
            self.counters.created += 1
        elif changed:
            self.counters.updated += 1
        else:
            self.counters.skipped += 1

    async def run(self) -> None:
        prompt_files = await asyncio.to_thread(_list_prompt_files, self.resources_dir / "db")
        for sort_order, (directory, markdown) in enumerate(prompt_files):
            category = await self._category(directory.name, sort_order)
            parsed_cases = parse_prompt_markdown(markdown)
            self.log(f"{directory.name}：{len(parsed_cases)} 条")
            for parsed in parsed_cases:
                image_path = directory / "images" / f"case{parsed.upstream_no}.jpg"
                try:
                    async with self.session.begin_nested():
                        await self.import_case(category, parsed, image_path)
                except Exception as exc:  # noqa: BLE001
                    self._tags.clear()  # 回滚的保存点里可能新建过标签，缓存不再可信
                    self.counters.failed += 1
                    self.note(f"失败：{directory.name} 例 {parsed.upstream_no}「{parsed.title}」：{exc}")
                    logger.exception("导入案例失败")
            await self.session.commit()


async def run_import(
    *,
    trigger: str = "cli",
    resources_dir: Path | None = None,
    session_factory: async_sessionmaker[AsyncSession] = SessionLocal,
    log: Callable[[str], None] = logger.info,
    run_id: int | None = None,
) -> ImportRun:
    """执行一次导入并写入 import_run 记录。run_id 由后台接口预先创建时传入。"""
    resources_dir = resources_dir or get_settings().resources_dir
    async with session_factory() as session:
        if run_id is None:
            run = await start_run(session, trigger=trigger, resources_dir=resources_dir)
        else:
            run = await session.get(ImportRun, run_id)
            if run is None:
                raise ValueError(f"import_run {run_id} 不存在")

        run_pk = run.id  # rollback 会让 run 过期，之后不能再直接读属性
        importer = Importer(session, resources_dir, log)
        try:
            await importer.run()
            run.status = "succeeded"
        except Exception as exc:  # noqa: BLE001
            await session.rollback()
            run = await session.get(ImportRun, run_pk, populate_existing=True)
            assert run is not None
            run.status = "failed"
            importer.note(f"导入中止：{exc}")
            logger.exception("导入中止")

        counters = importer.counters
        run.created, run.updated, run.skipped, run.failed = (
            counters.created,
            counters.updated,
            counters.skipped,
            counters.failed,
        )
        summary = (
            f"新增 {counters.created}，更新 {counters.updated}，"
            f"未变化 {counters.skipped}，失败 {counters.failed}"
        )
        log(summary)
        try:
            count = await search_index.reindex_all(session)
            counters.lines.append(f"搜索索引已重建：{count} 条")
        except Exception as exc:  # noqa: BLE001
            counters.lines.append(f"搜索索引重建失败：{exc}（可稍后在后台手动重建）")
            logger.exception("导入后重建索引失败")
        run.log = "\n".join([summary, *counters.lines])
        run.finished_at = datetime.now(UTC)
        await session.commit()
        return run


async def start_run(session: AsyncSession, *, trigger: str, resources_dir: Path | None = None) -> ImportRun:
    running = await session.scalar(select(ImportRun).where(ImportRun.status == "running"))
    if running is not None:
        started = running.started_at
        if started and (datetime.now(UTC) - started).total_seconds() < 3600:
            raise ImportAlreadyRunning(f"已有导入任务在运行（#{running.id}）")
        running.status = "failed"
        running.log = (running.log or "") + "\n超时未结束，已标记为失败"
    run = ImportRun(
        trigger=trigger,
        upstream_commit=read_upstream_commit(resources_dir or get_settings().resources_dir),
        status="running",
    )
    session.add(run)
    await session.commit()
    return run
