export type UserRole = "Admin" | "Gerente" | "Operador" | "Consulta";

export type Permission =
  | "viewDashboard"
  | "createRequests"
  | "editRequests"
  | "updateProduction"
  | "manageUnits"
  | "manageUsers"
  | "manageAudit";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  active: boolean;
  avatarUrl: string | null;
  isSystem: boolean;
}

export interface UserDraft {
  id?: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  // Em branco na edição mantém a senha atual (a API nunca devolve a senha/hash
  // existente para pré-preencher o campo — ver backend/app/api/routes/users.py).
  password: string;
  active: boolean;
}
