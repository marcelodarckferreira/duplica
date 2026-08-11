import { Permission, UserRole } from "./types";

export const roles: UserRole[] = ["Administrador", "Gerente", "Operador", "Consulta"];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Administrador: [
    "viewDashboard",
    "createRequests",
    "editRequests",
    "updateProduction",
    "manageUnits",
    "manageUsers",
    "manageAudit",
  ],
  Gerente: ["viewDashboard", "createRequests", "editRequests", "updateProduction", "manageUnits", "manageUsers"],
  Operador: ["viewDashboard", "createRequests", "editRequests", "updateProduction"],
  Consulta: ["viewDashboard"],
};

export function canPerform(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
