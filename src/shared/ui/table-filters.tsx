import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "../lib/utils";

export const filterSelectClasses =
  "h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none";

// Cabeçalho de coluna clicável pra ordenar uma tabela — usado por Solicitações
// e Auditoria (ver RequestSortKey/AuditSortKey). Sem onSort, cai pra um <th>
// comum, sem o botão nem os ícones de seta.
export function SortableHeader<K extends string>(props: {
  label: string;
  sortKey: K;
  activeSortKey?: K;
  sortDirection?: "asc" | "desc";
  onSort?: (key: K) => void;
}) {
  const isActive = props.activeSortKey === props.sortKey;
  const Icon = isActive ? (props.sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  if (!props.onSort) {
    return <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">{props.label}</th>;
  }
  return (
    <th className="border-b border-border px-0 py-0 text-left text-xs uppercase text-muted">
      <button
        type="button"
        onClick={() => props.onSort?.(props.sortKey)}
        className={cn(
          "flex w-full items-center gap-1 border-0 bg-transparent px-2.5 py-2.5 text-left text-xs uppercase [appearance:none] hover:text-text",
          isActive ? "text-text" : "text-muted",
        )}
      >
        {props.label}
        <Icon size={12} className={cn(!isActive && "opacity-50")} />
      </button>
    </th>
  );
}
