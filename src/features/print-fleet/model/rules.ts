import { SupplyAlert } from "./types";

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
