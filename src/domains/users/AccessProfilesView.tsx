import { Check } from "lucide-react";
import { ROLE_PERMISSIONS, roles } from "./rules";
import { Permission } from "./types";

const PERMISSION_LABELS: Record<Permission, string> = {
  viewDashboard: "Ver dashboard",
  createRequests: "Criar solicitações",
  editRequests: "Editar solicitações",
  updateProduction: "Atualizar produção/status",
  manageUnits: "Gerenciar unidades",
  manageUsers: "Gerenciar usuários",
  manageAudit: "Gerenciar auditoria",
};

const PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

export function AccessProfilesView() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Perfis de acesso</h2>
        <span>{roles.length} perfil(is)</span>
      </div>
      <p className="form-note">
        Cada perfil tem um conjunto fixo de permissões, definido no código do sistema — não é possível criar novos
        perfis nem alternar permissões individualmente por aqui.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Permissão</th>
              {roles.map((role) => (
                <th key={role}>{role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <td>{PERMISSION_LABELS[permission]}</td>
                {roles.map((role) => (
                  <td key={role} style={{ textAlign: "center" }}>
                    {ROLE_PERMISSIONS[role].includes(permission) ? (
                      <Check size={16} aria-label="Permitido" color="var(--accent-strong)" />
                    ) : (
                      <span aria-label="Não permitido" style={{ color: "var(--muted)" }}>
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
