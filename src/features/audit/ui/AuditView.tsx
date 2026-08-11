import { Button } from "../../../shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { AuditLogEntry } from "../model/types";

const ACTION_LABELS: Record<AuditLogEntry["action"], string> = {
  create: "Criação",
  update: "Edição",
  delete: "Exclusão",
  status_change: "Mudança de status",
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(iso));
}

export function AuditView(props: {
  entries: AuditLogEntry[];
  canClear: boolean;
  onClear: () => void;
}) {
  const { entries, canClear, onClear } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de auditoria</CardTitle>
        <CardDescription>{entries.length} registro(s) — retenção de 60 dias</CardDescription>
      </CardHeader>
      {canClear && (
        <div className="mb-3.5 flex flex-wrap gap-2">
          <Button type="button" variant="soft" onClick={onClear}>
            Limpar log
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Data/Hora</th>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Ação</th>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Solicitação</th>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Detalhe</th>
              <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Por</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="border-b border-border-soft px-2.5 py-2.5">{formatDateTime(entry.createdAt)}</td>
                <td className="border-b border-border-soft px-2.5 py-2.5">{ACTION_LABELS[entry.action]}</td>
                <td className="border-b border-border-soft px-2.5 py-2.5">{entry.requestCode}</td>
                <td className="border-b border-border-soft px-2.5 py-2.5">{entry.detail}</td>
                <td className="border-b border-border-soft px-2.5 py-2.5">{entry.actorName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
