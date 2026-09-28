import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _password_hash.verify(password, hashed)


def create_session_token(admin_id: int) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {"sub": str(admin_id), "iat": now, "exp": now + timedelta(minutes=settings.jwt_expire_minutes)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_session_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


class LoginRateLimiter:
    """进程内的登录失败限流：同一来源在窗口期内失败次数过多时拒绝登录。"""

    def __init__(self, max_failures: int = 5, window_seconds: int = 300) -> None:
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _prune(self, key: str) -> deque[float]:
        cutoff = time.monotonic() - self.window_seconds
        failures = self._failures[key]
        while failures and failures[0] < cutoff:
            failures.popleft()
        return failures

    def is_blocked(self, key: str) -> bool:
        return len(self._prune(key)) >= self.max_failures

    def record_failure(self, key: str) -> None:
        self._prune(key).append(time.monotonic())

    def reset(self, key: str) -> None:
        self._failures.pop(key, None)


login_limiter = LoginRateLimiter()
