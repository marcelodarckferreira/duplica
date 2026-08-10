import { AuditLogEntry } from "./types";

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
    <div className="panel">
      <div className="panel-heading">
        <h2>Log de auditoria</h2>
        <span>{entries.length} registro(s) — retenção de 60 dias</span>
      </div>
      {canClear && (
        <div className="form-actions">
          <button className="secondary-action" type="button" onClick={onClear}>
            Limpar log
          </button>
        </div>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Ação</th>
              <th>Solicitação</th>
              <th>Detalhe</th>
              <th>Por</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.createdAt)}</td>
                <td>{ACTION_LABELS[entry.action]}</td>
                <td>{entry.requestCode}</td>
                <td>{entry.detail}</td>
                <td>{entry.actorName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
