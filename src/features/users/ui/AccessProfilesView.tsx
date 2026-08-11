import { Check } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { ROLE_PERMISSIONS, roles } from "../model/rules";
import { Permission } from "../model/types";

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
    <Card>
      <CardHeader>
        <CardTitle>Perfis de acesso</CardTitle>
        <CardDescription>{roles.length} perfil(is)</CardDescription>
      </CardHeader>
      <p className="m-0 mb-3 font-bold text-accent">
        Cada perfil tem um conjunto fixo de permissões, definido no código do sistema — não é possível criar novos
        perfis nem alternar permissões individualmente por aqui.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Permissão</th>
              {roles.map((role) => (
                <th key={role} className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">{role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <td className="border-b border-border-soft px-2.5 py-2.5">{PERMISSION_LABELS[permission]}</td>
                {roles.map((role) => (
                  <td key={role} className="border-b border-border-soft px-2.5 py-2.5 text-center">
                    {ROLE_PERMISSIONS[role].includes(permission) ? (
                      <Check size={16} aria-label="Permitido" className="mx-auto text-accent-strong" />
                    ) : (
                      <span aria-label="Não permitido" className="text-muted">
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
    </Card>
  );
}
