import { AuditAction, AuditLogEntry } from "./types";

export const auditActions: AuditAction[] = ["create", "update", "delete", "status_change"];

export const actionLabels: Record<AuditAction, string> = {
  create: "Criação",
  update: "Edição",
  delete: "Exclusão",
  status_change: "Mudança de status",
};

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(iso));
}

export function filterAuditEntries(
  entries: AuditLogEntry[],
  filters: {
    query: string;
    action: AuditAction | "Todas";
    // Filtro pela data do registro (createdAt) — ambos opcionais, formato ISO "YYYY-MM-DD".
    dateFrom?: string;
    dateTo?: string;
  },
): AuditLogEntry[] {
  const normalized = filters.query.trim().toLocaleLowerCase("pt-BR");
  return entries.filter((entry) => {
    const matchesQuery = [entry.requestCode, entry.detail, entry.actorName, actionLabels[entry.action]]
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(normalized);
    const matchesAction = filters.action === "Todas" || entry.action === filters.action;
    const entryDate = entry.createdAt.slice(0, 10);
    const matchesDateFrom = !filters.dateFrom || entryDate >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || entryDate <= filters.dateTo;
    return matchesQuery && matchesAction && matchesDateFrom && matchesDateTo;
  });
}

// Colunas da tabela de Auditoria pelas quais dá pra ordenar clicando no
// título — mesmo padrão do domínio requests (ver RequestSortKey).
export const auditSortKeys = ["createdAt", "action", "requestCode", "detail", "actorName"] as const;
export type AuditSortKey = (typeof auditSortKeys)[number];
export type SortDirection = "asc" | "desc";

export function sortAuditEntries(
  entries: AuditLogEntry[],
  key: AuditSortKey,
  direction: SortDirection,
): AuditLogEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const valueA = key === "action" ? actionLabels[a.action] : a[key];
    const valueB = key === "action" ? actionLabels[b.action] : b[key];
    return String(valueA).localeCompare(String(valueB), "pt-BR");
  });
  return direction === "asc" ? sorted : sorted.reverse();
}
