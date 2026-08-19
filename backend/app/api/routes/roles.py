from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission
from app.core.permissions import ALL_PERMISSIONS, ALL_ROLES
from app.db.base import get_db
from app.db.models.role_permission import RolePermission
from app.db.models.user import User
from app.schemas.role_permission import RolePermissionsOut, RolePermissionsUpdate

router = APIRouter(prefix="/api/v1/roles", tags=["roles"])


@router.get("/permissions", response_model=list[RolePermissionsOut])
async def list_role_permissions(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("manageUsers")),
) -> list[RolePermissionsOut]:
    result = await db.execute(select(RolePermission))
    by_role: dict[str, list[str]] = {role: [] for role in ALL_ROLES}
    for row in result.scalars().all():
        by_role.setdefault(row.role, []).append(row.permission)
    return [RolePermissionsOut(role=role, permissions=sorted(perms)) for role, perms in by_role.items()]


@router.put("/{role}/permissions", response_model=RolePermissionsOut)
async def update_role_permissions(
    role: str,
    payload: RolePermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manageUsers")),
) -> RolePermissionsOut:
    if role not in ALL_ROLES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado.")

    invalid = set(payload.permissions) - ALL_PERMISSIONS
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Permissão inválida: {', '.join(sorted(invalid))}.",
        )

    # Ninguém edita as permissões do próprio perfil — evita que uma conta com
    # manageUsers se autoexclua da própria capacidade de gerenciar (mesma
    # lógica já usada em users.py para impedir trocar o próprio papel).
    if role == current_user.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar as permissões do próprio perfil.",
        )

    # Guarda de segurança: pelo menos um perfil no sistema precisa manter
    # manageUsers, senão ninguém mais consegue acessar Usuários/Perfis de
    # Acesso para corrigir isso depois (ficaria só editável direto no banco).
    if "manageUsers" not in payload.permissions:
        result = await db.execute(
            select(RolePermission.role).where(
                RolePermission.permission == "manageUsers",
                RolePermission.role != role,
            )
        )
        if result.first() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pelo menos um perfil precisa manter a permissão de gerenciar usuários.",
            )

    await db.execute(delete(RolePermission).where(RolePermission.role == role))
    for permission in payload.permissions:
        db.add(RolePermission(role=role, permission=permission))
    await db.commit()

    return RolePermissionsOut(role=role, permissions=sorted(payload.permissions))
