from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import decode_session_token
from app.db import get_session
from app.models import AdminUser

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def current_admin(request: Request, session: SessionDep) -> AdminUser:
    token = request.cookies.get(get_settings().session_cookie)
    admin_id = decode_session_token(token) if token else None
    admin = await session.get(AdminUser, admin_id) if admin_id else None
    if admin is None:
        raise AppError(401, "unauthorized", "请先登录")
    return admin


AdminDep = Annotated[AdminUser, Depends(current_admin)]
