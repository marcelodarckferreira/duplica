from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission
from app.core.security import hash_password
from app.db.base import get_db
from app.db.models.user import User
from app.schemas.user import UserCreate, UserOut, UserToggleActive

router = APIRouter(prefix="/api/v1/users", tags=["users"])

UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads"
AVATAR_DIR = UPLOADS_DIR / "avatars"
AVATAR_CONTENT_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024


@router.get("", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("manageUsers")),
) -> list[User]:
    result = await db.execute(select(User).order_by(User.name))
    return list(result.scalars().all())


@router.post("", response_model=UserOut)
async def save_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manageUsers")),
) -> User:
    email = payload.email.strip().lower()
    username = payload.username.strip().lower()

    result = await db.execute(select(User).where(User.email == email))
    existing_with_email = result.scalar_one_or_none()
    if existing_with_email and existing_with_email.id != payload.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe uma conta com este e-mail.")

    result = await db.execute(select(User).where(User.username == username))
    existing_with_username = result.scalar_one_or_none()
    if existing_with_username and existing_with_username.id != payload.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe uma conta com este usuário.")

    if payload.id:
        target = await db.get(User, payload.id)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
        # Ninguém edita o próprio papel de acesso por aqui — evita que uma conta
        # com manageUsers mas sem manageAudit (ex.: Gerente) se auto-promova a
        # um papel com mais permissões. Trocar de papel é sempre coisa de outra conta.
        if target.id == current_user.id and payload.role != target.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível alterar o próprio papel de acesso.",
            )
    else:
        if not payload.password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha obrigatória para nova conta.")
        target = User(id=f"user-{uuid4()}")
        db.add(target)

    target.username = username
    target.name = payload.name.strip()
    target.email = email
    target.role = payload.role
    target.active = payload.active
    if payload.password:
        target.hashed_password = hash_password(payload.password)

    await db.commit()
    await db.refresh(target)
    return target


@router.patch("/{user_id}/active", response_model=UserOut)
async def toggle_user_active(
    user_id: str,
    payload: UserToggleActive,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manageUsers")),
) -> User:
    if user_id == current_user.id and not payload.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A conta em uso não pode ser desativada.")

    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    target.active = payload.active
    await db.commit()
    await db.refresh(target)
    return target


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manageUsers")),
) -> None:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível excluir a própria conta.")

    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    if target.is_system:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta é uma conta do sistema e não pode ser excluída.")

    if target.avatar_path:
        avatar_file = UPLOADS_DIR / target.avatar_path
        if avatar_file.is_relative_to(AVATAR_DIR) and avatar_file.exists():
            avatar_file.unlink()

    await db.delete(target)
    await db.commit()


@router.post("/{user_id}/avatar", response_model=UserOut)
async def upload_user_avatar(
    user_id: str,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("manageUsers")),
) -> User:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    extension = AVATAR_CONTENT_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Envie uma imagem PNG, JPEG ou WEBP.")

    contents = await file.read(MAX_AVATAR_BYTES + 1)
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagem muito grande (máximo 2 MB).")

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{user_id}-{uuid4().hex[:8]}.{extension}"
    (AVATAR_DIR / filename).write_bytes(contents)

    if target.avatar_path:
        old_file = UPLOADS_DIR / target.avatar_path
        if old_file.is_relative_to(AVATAR_DIR) and old_file.exists():
            old_file.unlink()

    target.avatar_path = f"avatars/{filename}"
    await db.commit()
    await db.refresh(target)
    return target
