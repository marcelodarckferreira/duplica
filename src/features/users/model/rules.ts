import { Permission, UserRole } from "./types";

export const roles: UserRole[] = ["Admin", "Gerente", "Operador", "Consulta"];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Admin: [
    "viewDashboard",
    "createRequests",
    "editRequests",
    "updateProduction",
    "manageUnits",
    "managePeople",
    "manageUsers",
    "manageAudit",
    "viewPrintFleet",
    "managePrintFleet",
  ],
  Gerente: [
    "viewDashboard",
    "createRequests",
    "editRequests",
    "updateProduction",
    "manageUnits",
    "managePeople",
    "manageUsers",
  ],
  Operador: ["viewDashboard", "createRequests", "editRequests", "updateProduction"],
  Consulta: ["viewDashboard"],
};

export function canPerform(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
