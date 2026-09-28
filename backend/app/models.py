from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, TimestampMixin

CASE_STATUSES = ("draft", "published", "hidden")
PROMPT_FORMATS = ("text", "json")
TAG_KINDS = ("style", "ratio", "model", "other")

case_tag = Table(
    "case_tag",
    Base.metadata,
    Column("case_id", ForeignKey("case.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tag.id", ondelete="CASCADE"), primary_key=True),
)


class Category(TimestampMixin, Base):
    __tablename__ = "category"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    cases: Mapped[list["Case"]] = relationship(back_populates="category")


class Case(TimestampMixin, Base):
    __tablename__ = "case"
    __table_args__ = (UniqueConstraint("category_id", "upstream_no"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("category.id", ondelete="RESTRICT"), index=True)
    upstream_no: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    source_text: Mapped[str] = mapped_column(String(300), default="")
    source_url: Mapped[str | None] = mapped_column(String(500))
    prompt: Mapped[str] = mapped_column(Text, default="")
    prompt_zh: Mapped[str] = mapped_column(Text, default="")
    prompt_en: Mapped[str] = mapped_column(Text, default="")
    prompt_format: Mapped[str] = mapped_column(String(16), default="text")
    status: Mapped[str] = mapped_column(String(16), default="published", index=True)
    origin: Mapped[str] = mapped_column(String(16), default="manual")
    # 管理员手工改过的字段名；重新导入上游时这些字段保持不动
    overridden_fields: Mapped[list[str]] = mapped_column(JSONB, default=list)

    category: Mapped[Category] = relationship(back_populates="cases")
    images: Mapped[list["CaseImage"]] = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="CaseImage.sort_order, CaseImage.id",
    )
    tags: Mapped[list["Tag"]] = relationship(secondary=case_tag, back_populates="cases", order_by="Tag.id")


class CaseImage(Base):
    __tablename__ = "case_image"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("case.id", ondelete="CASCADE"), index=True)
    storage_key: Mapped[str] = mapped_column(String(300))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    bytes: Mapped[int] = mapped_column(BigInteger)
    dominant_color: Mapped[str] = mapped_column(String(7), default="#d4d4d4")
    # {"thumb": {"key", "width", "height"}, "medium": {...}}
    variants: Mapped[dict] = mapped_column(JSONB, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    case: Mapped[Case] = relationship(back_populates="images")


class Tag(TimestampMixin, Base):
    __tablename__ = "tag"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)
    kind: Mapped[str] = mapped_column(String(16), default="style")

    cases: Mapped[list[Case]] = relationship(secondary=case_tag, back_populates="tags")


class AdminUser(Base):
    __tablename__ = "admin_user"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ImportRun(Base):
    __tablename__ = "import_run"

    id: Mapped[int] = mapped_column(primary_key=True)
    upstream_commit: Mapped[str] = mapped_column(String(64), default="")
    trigger: Mapped[str] = mapped_column(String(16), default="cli")
    status: Mapped[str] = mapped_column(String(16), default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created: Mapped[int] = mapped_column(Integer, default=0)
    updated: Mapped[int] = mapped_column(Integer, default=0)
    skipped: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    log: Mapped[str] = mapped_column(Text, default="")
