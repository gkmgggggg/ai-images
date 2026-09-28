from datetime import UTC, datetime

from fastapi import APIRouter, Request, Response
from sqlalchemy import select

from app.api.deps import AdminDep, SessionDep
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import create_session_token, login_limiter, verify_password
from app.models import AdminUser
from app.schemas import AdminMe, LoginIn

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AdminMe)
async def login(data: LoginIn, request: Request, response: Response, session: SessionDep) -> AdminMe:
    client_key = request.client.host if request.client else "unknown"
    if login_limiter.is_blocked(client_key):
        raise AppError(429, "too_many_attempts", "登录失败次数过多，请 5 分钟后再试")

    admin = await session.scalar(select(AdminUser).where(AdminUser.username == data.username))
    if admin is None or not verify_password(data.password, admin.password_hash):
        login_limiter.record_failure(client_key)
        raise AppError(401, "invalid_credentials", "用户名或密码错误")

    login_limiter.reset(client_key)
    admin.last_login_at = datetime.now(UTC)
    await session.commit()

    settings = get_settings()
    response.set_cookie(
        settings.session_cookie,
        create_session_token(admin.id),
        max_age=settings.jwt_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return AdminMe(id=admin.id, username=admin.username)


@router.post("/logout", status_code=204)
async def logout(response: Response) -> Response:
    response.delete_cookie(get_settings().session_cookie, path="/")
    response.status_code = 204
    return response


@router.get("/me", response_model=AdminMe)
async def me(admin: AdminDep) -> AdminMe:
    return AdminMe(id=admin.id, username=admin.username)
