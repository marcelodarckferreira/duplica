import { Permission, UserRole } from "./types";

export const roles: UserRole[] = ["Administrador", "Operador", "Consulta"];

export function canPerform(role: UserRole, permission: Permission): boolean {
  const permissions: Record<UserRole, Permission[]> = {
    Administrador: [
      "viewDashboard",
      "createRequests",
      "editRequests",
      "updateProduction",
      "manageUnits",
      "manageUsers",
      "manageAudit",
    ],
    Operador: ["viewDashboard", "createRequests", "editRequests", "updateProduction"],
    Consulta: ["viewDashboard"],
  };

  return permissions[role].includes(permission);
}
