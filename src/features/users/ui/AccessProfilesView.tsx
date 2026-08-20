import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Checkbox } from "../../../shared/ui/checkbox";
import { useRolePermissionsQuery, useUpdateRolePermissionsMutation } from "../model/queries";
import { roles } from "../model/rules";
import { Permission, UserRole } from "../model/types";

const PERMISSION_LABELS: Record<Permission, string> = {
  viewDashboard: "Ver dashboard",
  createRequests: "Criar solicitações",
  editRequests: "Editar solicitações",
  updateProduction: "Atualizar status da solicitação",
  manageUnits: "Gerenciar locais",
  managePeople: "Gerenciar pessoas",
  manageUsers: "Gerenciar usuários",
  manageAudit: "Gerenciar auditoria",
};

const PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

export function AccessProfilesView(props: { currentUserRole: UserRole }) {
  const { currentUserRole } = props;
  const rolePermissionsQuery = useRolePermissionsQuery(true);
  const updateRolePermissionsMutation = useUpdateRolePermissionsMutation();

  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<Set<Permission>>(new Set());
  const [error, setError] = useState("");

  const rolePermissions = rolePermissionsQuery.data;

  function startEdit(role: UserRole) {
    setError("");
    setEditingRole(role);
    setPendingPermissions(new Set(rolePermissions?.[role] ?? []));
  }

  function cancelEdit() {
    setEditingRole(null);
    setError("");
  }

  function togglePending(permission: Permission, checked: boolean) {
    setPendingPermissions((current) => {
      const next = new Set(current);
      if (checked) next.add(permission);
      else next.delete(permission);
      return next;
    });
  }

  async function saveEdit() {
    if (!editingRole) return;
    setError("");
    try {
      await updateRolePermissionsMutation.mutateAsync({ role: editingRole, permissions: Array.from(pendingPermissions) });
      setEditingRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as permissões.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfis de acesso</CardTitle>
        <CardDescription>{roles.length} perfil(is)</CardDescription>
      </CardHeader>
      <p className="m-0 mb-3 font-bold text-accent">
        Cada perfil tem um conjunto de permissões. Clique no ícone de edição na coluna do perfil para
        alterar quais permissões ele tem.
      </p>
      {error && <p className="m-0 mb-3 font-bold text-[#a43b2f]">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Permissão</th>
              {roles.map((role) => (
                <th key={role} className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">
                  <div className="flex items-center gap-1.5">
                    {role}
                    {editingRole === role ? (
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Salvar permissões de ${role}`}
                          disabled={updateRolePermissionsMutation.isPending}
                          onClick={saveEdit}
                          className="grid h-6 w-6 place-items-center rounded border-0 bg-transparent p-0 text-accent-strong [appearance:none] hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-50"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancelar edição"
                          disabled={updateRolePermissionsMutation.isPending}
                          onClick={cancelEdit}
                          className="grid h-6 w-6 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ) : (
                      role !== currentUserRole &&
                      role !== "Admin" && (
                        <button
                          type="button"
                          aria-label={`Editar permissões de ${role}`}
                          onClick={() => startEdit(role)}
                          className="grid h-6 w-6 place-items-center rounded border-0 bg-transparent p-0 text-muted normal-case [appearance:none] hover:bg-surface-soft hover:text-text"
                        >
                          <Pencil size={13} />
                        </button>
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission}>
                <td className="border-b border-border-soft px-2.5 py-2.5">{PERMISSION_LABELS[permission]}</td>
                {roles.map((role) => (
                  <td key={role} className="border-b border-border-soft px-2.5 py-2.5 text-center">
                    {editingRole === role ? (
                      <Checkbox
                        checked={pendingPermissions.has(permission)}
                        onCheckedChange={(checked) => togglePending(permission, checked === true)}
                        aria-label={`${PERMISSION_LABELS[permission]} — ${role}`}
                      />
                    ) : (rolePermissions?.[role] ?? []).includes(permission) ? (
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
