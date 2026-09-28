import re

from app.models import Case, CaseImage
from app.schemas import (
    AdminCaseDetail,
    AdminCaseItem,
    CaseDetail,
    CaseSummary,
    CategoryRef,
    Highlight,
    ImageOut,
    ImageVariant,
    TagOut,
)
from app.services.storage import get_storage

EXCERPT_LENGTH = 140
_whitespace = re.compile(r"\s+")


def excerpt_of(case: Case) -> str:
    text = _whitespace.sub(" ", case.prompt_zh or case.prompt_en or case.prompt).strip()
    return text if len(text) <= EXCERPT_LENGTH else f"{text[:EXCERPT_LENGTH]}…"


def image_out(image: CaseImage) -> ImageOut:
    storage = get_storage()

    def variant(name: str) -> ImageVariant:
        data = image.variants.get(name) or {
            "key": image.storage_key,
            "width": image.width,
            "height": image.height,
        }
        return ImageVariant(url=storage.url(data["key"]), width=data["width"], height=data["height"])

    return ImageOut(
        id=image.id,
        url=storage.url(image.storage_key),
        width=image.width,
        height=image.height,
        color=image.dominant_color,
        thumb=variant("thumb"),
        medium=variant("medium"),
    )


def case_summary(case: Case, highlight: Highlight | None = None) -> CaseSummary:
    return CaseSummary(
        id=case.id,
        title=case.title,
        category=CategoryRef.model_validate(case.category),
        source=case.source_text,
        excerpt=excerpt_of(case),
        cover=image_out(case.images[0]) if case.images else None,
        tags=[TagOut.model_validate(tag) for tag in case.tags],
        highlight=highlight,
    )


def _detail_fields(case: Case) -> dict:
    return {
        "id": case.id,
        "title": case.title,
        "category": CategoryRef.model_validate(case.category),
        "source_text": case.source_text,
        "source_url": case.source_url,
        "prompt": case.prompt,
        "prompt_zh": case.prompt_zh,
        "prompt_en": case.prompt_en,
        "prompt_format": case.prompt_format,
        "images": [image_out(image) for image in case.images],
        "tags": [TagOut.model_validate(tag) for tag in case.tags],
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


def case_detail(case: Case, prev_id: int | None, next_id: int | None) -> CaseDetail:
    return CaseDetail(**_detail_fields(case), prev_id=prev_id, next_id=next_id)


def admin_case_item(case: Case) -> AdminCaseItem:
    return AdminCaseItem(
        id=case.id,
        title=case.title,
        category=CategoryRef.model_validate(case.category),
        status=case.status,
        origin=case.origin,
        upstream_no=case.upstream_no,
        cover=image_out(case.images[0]) if case.images else None,
        tags=[TagOut.model_validate(tag) for tag in case.tags],
        overridden_fields=list(case.overridden_fields or []),
        updated_at=case.updated_at,
    )


def admin_case_detail(case: Case) -> AdminCaseDetail:
    return AdminCaseDetail(
        **_detail_fields(case),
        category_id=case.category_id,
        status=case.status,
        origin=case.origin,
        upstream_no=case.upstream_no,
        overridden_fields=list(case.overridden_fields or []),
    )
