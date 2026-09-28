from pathlib import Path
from typing import Protocol

from app.core.config import get_settings


class Storage(Protocol):
    def save(self, key: str, data: bytes) -> None: ...
    def delete(self, key: str) -> None: ...
    def exists(self, key: str) -> bool: ...
    def url(self, key: str) -> str: ...


class LocalStorage:
    """把文件存到本地目录，由 Nginx（或开发时的 FastAPI StaticFiles）按 /media/ 前缀提供访问。

    以后切换到阿里云 OSS 时，实现同样的四个方法即可。
    """

    def __init__(self, root: Path, url_prefix: str) -> None:
        self.root = root
        self.url_prefix = url_prefix if url_prefix.endswith("/") else f"{url_prefix}/"

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root.resolve()):
            raise ValueError(f"非法的存储 key：{key}")
        return path

    def save(self, key: str, data: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_bytes(data)
        tmp.replace(path)

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    def exists(self, key: str) -> bool:
        return self._path(key).exists()

    def url(self, key: str) -> str:
        return f"{self.url_prefix}{key}"


def get_storage() -> Storage:
    settings = get_settings()
    return LocalStorage(settings.media_root, settings.media_url_prefix)
