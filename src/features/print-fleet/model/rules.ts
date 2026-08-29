import { Unit } from "../../units/model/types";
import { OnboardingStatus, OperationalStatus, Printer, SupplyAlert } from "./types";

export const STATUS_LABELS: Record<OperationalStatus, string> = { online: "Online", warning: "Com alerta", offline: "Offline", unknown: "Sem leitura" };
export const ONBOARDING_LABELS: Record<OnboardingStatus, string> = { pending: "Pendente", confirmed: "Confirmada", ignored: "Ignorada", conflict: "Conflito" };

export function printerDisplayName(printer: Pick<Printer, "displayName" | "sysName" | "managementAddress">): string {
  return printer.displayName ?? printer.sysName ?? printer.managementAddress;
}

// Colunas da tabela de Impressoras pelas quais dá pra ordenar (clicando no
// título da coluna) — mesmo padrão do SortableHeader usado em Solicitações e
// Auditoria. "unit"/status ordenam pelo rótulo visível (pt-BR), não pela
// chave interna, pra bater com o que a pessoa vê na tela.
export const printerSortKeys = ["name", "unit", "operationalStatus", "onboardingStatus"] as const;
export type PrinterSortKey = (typeof printerSortKeys)[number];
export type SortDirection = "asc" | "desc";

export function sortPrinters(printers: Printer[], units: Unit[], key: PrinterSortKey, direction: SortDirection): Printer[] {
  function value(printer: Printer): string {
    if (key === "name") return printerDisplayName(printer);
    if (key === "unit") return units.find((u) => u.id === printer.unitId)?.name ?? "Setor não definido";
    if (key === "operationalStatus") return STATUS_LABELS[printer.operationalStatus];
    return ONBOARDING_LABELS[printer.onboardingStatus];
  }
  const sorted = [...printers].sort((a, b) => value(a).localeCompare(value(b), "pt-BR"));
  return direction === "asc" ? sorted : sorted.reverse();
}

export function discoveryProgress(run: { scannedTargets: number; totalTargets: number }): number {
  if (run.totalTargets <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((run.scannedTargets / run.totalTargets) * 100)));
}

export function formatSupplyLevel(value: number | null): string {
  return value === null ? "Indisponível" : `${Math.round(value)}%`;
}

export function supplyTone(alert: SupplyAlert): "active" | "warning" | "danger" | "neutral" {
  if (alert === "critical") return "danger";
  if (alert === "warning") return "warning";
  if (alert === "ok") return "active";
  return "neutral";
}

export function formatDateTime(value: string | null): string {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
}
