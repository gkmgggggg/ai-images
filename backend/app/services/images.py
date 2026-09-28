"""图片入库：校验、按内容 hash 命名、生成 WebP 衍生图、提取宽高与主色。"""

import hashlib
import io
from dataclasses import dataclass, field

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings
from app.services.storage import Storage

ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
MAX_PIXELS = 60_000_000


class InvalidImageError(ValueError):
    pass


@dataclass
class ProcessedImage:
    sha256: str
    storage_key: str
    width: int
    height: int
    bytes: int
    dominant_color: str
    variants: dict = field(default_factory=dict)


def _variant(img: Image.Image, max_side: int) -> tuple[bytes, int, int]:
    copy = img.copy()
    copy.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    copy.save(buffer, "WEBP", quality=80, method=6)
    return buffer.getvalue(), copy.width, copy.height


def _dominant_color(img: Image.Image) -> str:
    r, g, b = img.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))[:3]
    return f"#{r:02x}{g:02x}{b:02x}"


def process_image(data: bytes, storage: Storage, *, reencode_original: bool) -> ProcessedImage:
    """处理一张图片并写入存储。

    reencode_original=True 用于后台上传：原图重新编码，去掉 EXIF 等元数据，也避免保存伪装成图片的文件。
    上游导入的图片可信，保留原始字节。
    """
    settings = get_settings()
    try:
        with Image.open(io.BytesIO(data)) as probe:
            fmt = probe.format or ""
            if fmt not in ALLOWED_FORMATS:
                raise InvalidImageError(f"不支持的图片格式：{fmt or '未知'}（仅支持 JPEG、PNG、WebP）")
            if probe.width * probe.height > MAX_PIXELS:
                raise InvalidImageError("图片像素过大")
            probe.verify()
        img = Image.open(io.BytesIO(data))
        img.load()
    except UnidentifiedImageError as exc:
        raise InvalidImageError("无法识别的图片文件") from exc

    img = ImageOps.exif_transpose(img)
    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    img = img.convert("RGBA" if has_alpha else "RGB")

    ext = ALLOWED_FORMATS[fmt]
    if reencode_original:
        buffer = io.BytesIO()
        if has_alpha or fmt == "PNG":
            img.save(buffer, "PNG", optimize=True)
            ext = "png"
        else:
            img.save(buffer, "JPEG", quality=92, optimize=True)
            ext = "jpg"
        data = buffer.getvalue()

    sha = hashlib.sha256(data).hexdigest()
    prefix = f"{sha[:2]}/{sha}"
    original_key = f"originals/{prefix}.{ext}"
    if not storage.exists(original_key):
        storage.save(original_key, data)

    variants: dict[str, dict] = {}
    for name, size in (("thumb", settings.thumb_size), ("medium", settings.medium_size)):
        key = f"variants/{prefix}-{size}.webp"
        webp, width, height = _variant(img, size)
        if not storage.exists(key):
            storage.save(key, webp)
        variants[name] = {"key": key, "width": width, "height": height}

    return ProcessedImage(
        sha256=sha,
        storage_key=original_key,
        width=img.width,
        height=img.height,
        bytes=len(data),
        dominant_color=_dominant_color(img.convert("RGB")),
        variants=variants,
    )


def sha256_of(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
