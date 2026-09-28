from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

CaseStatus = Literal["draft", "published", "hidden"]
PromptFormat = Literal["text", "json"]
TagKind = Literal["style", "ratio", "model", "other"]


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- 公共 ----------


class CategoryRef(Schema):
    id: int
    slug: str
    name: str


class TagOut(Schema):
    id: int
    name: str
    kind: TagKind


class ImageVariant(Schema):
    url: str
    width: int
    height: int


class ImageOut(Schema):
    id: int
    url: str
    width: int
    height: int
    color: str
    thumb: ImageVariant
    medium: ImageVariant


class Highlight(Schema):
    """高亮片段：命中词用 \\u0002 和 \\u0003 包裹，前端据此拆分渲染，避免注入 HTML。"""

    title: str | None = None
    excerpt: str | None = None


class CaseSummary(Schema):
    id: int
    title: str
    category: CategoryRef
    source: str
    excerpt: str
    cover: ImageOut | None
    tags: list[TagOut]
    highlight: Highlight | None = None


class CasePage(Schema):
    items: list[CaseSummary]
    next_cursor: str | None
    total: int
    search_engine: Literal["meilisearch", "database"] = "database"


class CaseDetail(Schema):
    id: int
    title: str
    category: CategoryRef
    source_text: str
    source_url: str | None
    prompt: str
    prompt_zh: str
    prompt_en: str
    prompt_format: PromptFormat
    images: list[ImageOut]
    tags: list[TagOut]
    prev_id: int | None = None
    next_id: int | None = None
    created_at: datetime
    updated_at: datetime


class RandomCase(Schema):
    id: int | None


class CategoryCount(Schema):
    id: int
    slug: str
    name: str
    total: int
    with_image: int


class CategoriesOut(Schema):
    items: list[CategoryCount]
    total: int
    with_image: int


class TagCount(TagOut):
    count: int


class UpstreamInfo(Schema):
    name: str
    url: str
    commit: str
    license: str


class MetaOut(Schema):
    total: int
    with_image: int
    categories: int
    upstream: UpstreamInfo
    search_available: bool


# ---------- 鉴权 ----------


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class AdminMe(Schema):
    id: int
    username: str


# ---------- 管理后台 ----------


class AdminCaseItem(Schema):
    id: int
    title: str
    category: CategoryRef
    status: CaseStatus
    origin: str
    upstream_no: int | None
    cover: ImageOut | None
    tags: list[TagOut]
    overridden_fields: list[str]
    updated_at: datetime


class AdminCasePage(Schema):
    items: list[AdminCaseItem]
    total: int
    page: int
    page_size: int


class AdminCaseDetail(CaseDetail):
    category_id: int
    status: CaseStatus
    origin: str
    upstream_no: int | None
    overridden_fields: list[str]


def _strip(value: str | None) -> str | None:
    return value.strip() if isinstance(value, str) else value


class CaseWrite(BaseModel):
    category_id: int
    title: str = Field(min_length=1, max_length=200)
    source_text: str = Field(default="", max_length=300)
    source_url: HttpUrl | None = None
    prompt: str = Field(default="", max_length=50_000)
    prompt_zh: str = Field(default="", max_length=50_000)
    prompt_en: str = Field(default="", max_length=50_000)
    prompt_format: PromptFormat = "text"
    status: CaseStatus = "draft"
    tag_ids: list[int] = Field(default_factory=list)

    _strip_title = field_validator("title", "source_text", mode="before")(_strip)

    @field_validator("source_url", mode="before")
    @classmethod
    def _empty_url(cls, value: str | None) -> str | None:
        return value or None


class CaseCreate(CaseWrite):
    pass


class CaseUpdate(BaseModel):
    category_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    source_text: str | None = Field(default=None, max_length=300)
    source_url: HttpUrl | None = None
    prompt: str | None = Field(default=None, max_length=50_000)
    prompt_zh: str | None = Field(default=None, max_length=50_000)
    prompt_en: str | None = Field(default=None, max_length=50_000)
    prompt_format: PromptFormat | None = None
    status: CaseStatus | None = None
    tag_ids: list[int] | None = None
    # 清空「手工修改」标记，下次导入时恢复为上游内容
    clear_overrides: bool = False

    _strip_title = field_validator("title", "source_text", mode="before")(_strip)

    @field_validator("source_url", mode="before")
    @classmethod
    def _empty_url(cls, value: str | None) -> str | None:
        return value or None


class AdminCategory(Schema):
    id: int
    slug: str
    name: str
    sort_order: int
    case_count: int


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    slug: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    slug: str | None = Field(default=None, min_length=1, max_length=64, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class CategoryOrder(BaseModel):
    ids: list[int]


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    kind: TagKind = "style"

    _strip_name = field_validator("name", mode="before")(_strip)


class TagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    kind: TagKind | None = None

    _strip_name = field_validator("name", mode="before")(_strip)


class ImportRunOut(Schema):
    id: int
    upstream_commit: str
    trigger: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    created: int
    updated: int
    skipped: int
    failed: int


class ImportRunDetail(ImportRunOut):
    log: str


class TaskAccepted(Schema):
    message: str
    import_run_id: int | None = None
