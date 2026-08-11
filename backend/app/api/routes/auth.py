from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.db.base import get_db
from app.db.models.user import User
from app.schemas.user import Token, UserOut, UserSelfUpdate

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    identifier = form_data.username.strip().lower()
    result = await db.execute(select(User).where((User.email == identifier) | (User.username == identifier)))
    user = result.scalar_one_or_none()

    if not user or not user.active or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário/e-mail ou senha inválidos.")

    token = create_access_token(subject=user.id, extra_claims={"role": user.role})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
@limiter.limit("5/minute")
async def update_me(
    request: Request,
    payload: UserSelfUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    # Autoatendimento: só o próprio usuário edita nome/e-mail/senha aqui — nunca
    # papel/status, que continuam exclusivos da tela de administração (manageUsers).
    email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    existing_with_email = result.scalar_one_or_none()
    if existing_with_email and existing_with_email.id != user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe uma conta com este e-mail.")

    if payload.password:
        if not payload.current_password or not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta.")
        user.hashed_password = hash_password(payload.password)

    user.name = payload.name.strip()
    user.email = email
    await db.commit()
    await db.refresh(user)
    return user
