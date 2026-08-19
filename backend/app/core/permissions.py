from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.role_permission import RolePermission

Permission = str

ALL_ROLES: list[str] = ["Admin", "Gerente", "Operador", "Consulta"]

ALL_PERMISSIONS: set[Permission] = {
    "viewDashboard",
    "createRequests",
    "editRequests",
    "updateProduction",
    "manageUnits",
    "manageUsers",
    "manageAudit",
}

# Valores usados só para semear a tabela role_permissions na migração inicial
# (ver alembic/versions/*_add_role_permissions_table.py) — depois disso a
# tabela é a fonte de verdade, editável em Perfis de Acesso.
DEFAULT_ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "Admin": {
        "viewDashboard",
        "createRequests",
        "editRequests",
        "updateProduction",
        "manageUnits",
        "manageUsers",
        "manageAudit",
    },
    "Gerente": {"viewDashboard", "createRequests", "editRequests", "updateProduction", "manageUnits", "manageUsers"},
    "Operador": {"viewDashboard", "createRequests", "editRequests", "updateProduction"},
    "Consulta": {"viewDashboard"},
}


async def can_perform(db: AsyncSession, role: str, permission: Permission) -> bool:
    result = await db.execute(
        select(RolePermission).where(RolePermission.role == role, RolePermission.permission == permission)
    )
    return result.scalar_one_or_none() is not None
