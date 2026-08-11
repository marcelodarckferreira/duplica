Permission = str

ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "Admin": {
        "viewDashboard",
        "createRequests",
        "editRequests",
        "updateProduction",
        "manageUnits",
        "manageUsers",
        "manageAudit",
    },
    "Gerente": {
        "viewDashboard",
        "createRequests",
        "editRequests",
        "updateProduction",
        "manageUnits",
        "manageUsers",
    },
    "Operador": {"viewDashboard", "createRequests", "editRequests", "updateProduction"},
    "Consulta": {"viewDashboard"},
}


def can_perform(role: str, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())
