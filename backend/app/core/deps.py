from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Permission, can_perform
from app.core.security import decode_access_token
from app.db.base import get_db
from app.db.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_error

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_error

    user = await db.get(User, user_id)
    if user is None or not user.active:
        raise credentials_error

    return user


def require_permission(permission: Permission):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if not can_perform(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para esta ação.",
            )
        return user

    return dependency
