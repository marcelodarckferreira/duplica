import { FilterX, Search } from "lucide-react";
import { Button } from "../../../shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { filterSelectClasses, SortableHeader } from "../../../shared/ui/table-filters";
import { cn } from "../../../shared/lib/utils";
import { actionLabels, auditActions, AuditSortKey, formatDateTime, SortDirection } from "../model/rules";
import { AuditAction, AuditLogEntry } from "../model/types";

export function AuditView(props: {
  entries: AuditLogEntry[];
  canClear: boolean;
  onClear: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  actionFilter: AuditAction | "Todas";
  onActionFilterChange: (value: AuditAction | "Todas") => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  sortKey: AuditSortKey;
  sortDirection: SortDirection;
  onSort: (key: AuditSortKey) => void;
  onClearFilters: () => void;
}) {
  const {
    entries,
    canClear,
    onClear,
    query,
    onQueryChange,
    actionFilter,
    onActionFilterChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    sortKey,
    sortDirection,
    onSort,
    onClearFilters,
  } = props;

  const hasActiveFilters = Boolean(query.trim() || actionFilter !== "Todas" || dateFrom || dateTo);

  function sortHeaderProps(key: AuditSortKey) {
    return { sortKey: key, activeSortKey: sortKey, sortDirection, onSort };
  }

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
      <div className="mb-3.5 grid grid-cols-1 items-end gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_160px_138px_138px_48px]">
        <label className="relative block">
          <Search size={17} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por solicitação, detalhe ou responsável"
            className="h-11 w-full rounded border border-border bg-surface pl-9 pr-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase text-label">
          Ação
          <select
            value={actionFilter}
            onChange={(event) => onActionFilterChange(event.target.value as AuditAction | "Todas")}
            className={filterSelectClasses}
          >
            <option>Todas</option>
            {auditActions.map((action) => (
              <option key={action} value={action}>
                {actionLabels[action]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase text-label">
          Data de
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => onDateFromChange(event.target.value)}
            className={cn(filterSelectClasses, "px-2")}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-bold uppercase text-label">
          Data até
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => onDateToChange(event.target.value)}
            className={cn(filterSelectClasses, "px-2")}
          />
        </label>
        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          aria-label="Limpar filtros"
          title="Limpar filtros"
          className="grid h-11 w-11 shrink-0 place-items-center self-end rounded border border-border bg-surface text-muted [appearance:none] hover:border-accent hover:text-accent focus:border-accent focus:outline-none disabled:pointer-events-none disabled:opacity-40"
        >
          <FilterX size={18} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <SortableHeader label="Data/Hora" {...sortHeaderProps("createdAt")} />
              <SortableHeader label="Ação" {...sortHeaderProps("action")} />
              <SortableHeader label="Solicitação" {...sortHeaderProps("requestCode")} />
              <SortableHeader label="Detalhe" {...sortHeaderProps("detail")} />
              <SortableHeader label="Por" {...sortHeaderProps("actorName")} />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="border-b border-border-soft px-2.5 py-2.5">{formatDateTime(entry.createdAt)}</td>
                <td className="border-b border-border-soft px-2.5 py-2.5">{actionLabels[entry.action]}</td>
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
