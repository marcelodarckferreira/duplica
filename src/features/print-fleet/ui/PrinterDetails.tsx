import { AlertTriangle, Droplets, WifiOff } from "lucide-react";
import { Badge } from "../../../shared/ui/badge";
import { formatDateTime, formatSupplyLevel, supplyTone } from "../model/rules";
import { usePrinterSuppliesQuery } from "../model/queries";
import { Printer } from "../model/types";

const COLOR_LABELS: Record<string, string> = { black: "preto", cyan: "ciano", magenta: "magenta", yellow: "amarelo", unknown: "não identificado" };
const TYPE_LABELS: Record<string, string> = { toner: "Toner", ink: "Tinta", drum: "Cilindro", waste_toner: "Coletor", other: "Insumo" };
const ALERT_LABELS = { ok: "Normal", warning: "Atenção", critical: "Crítico", unknown: "Sem leitura" } as const;

export function PrinterDetails({ printer }: { printer: Printer }) {
  const supplies = usePrinterSuppliesQuery(printer.id);
  return (
    <div className="grid gap-4 border-t border-border-soft bg-surface-soft/50 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-4">
        <div><dt className="text-xs font-bold uppercase text-muted">IP</dt><dd className="m-0 font-mono">{printer.managementAddress}</dd></div>
        <div><dt className="text-xs font-bold uppercase text-muted">Serial</dt><dd className="m-0 font-mono">{printer.serialNumber ?? "—"}</dd></div>
        <div><dt className="text-xs font-bold uppercase text-muted">Última leitura</dt><dd className="m-0">{formatDateTime(printer.lastPolledAt)}</dd></div>
        <div><dt className="text-xs font-bold uppercase text-muted">Monitoramento</dt><dd className="m-0">{printer.monitoringEnabled ? "Ativo" : "Desativado"}</dd></div>
      </dl>
      <section aria-label="Insumos">
        <h3 className="mb-2 mt-0 text-sm font-bold text-text">Insumos</h3>
        {supplies.isLoading && <p className="text-sm text-muted">Consultando insumos…</p>}
        {supplies.error && <p className="flex items-center gap-2 text-sm font-bold text-[#a43b2f]"><WifiOff size={16} /> Não foi possível carregar os insumos.</p>}
        {supplies.data?.length === 0 && <p className="text-sm text-muted">A impressora ainda não informou insumos via SNMP.</p>}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {supplies.data?.map((supply) => {
            const percent = supply.levelPercent === null ? 0 : Math.max(0, Math.min(100, supply.levelPercent));
            return <article key={supply.id} className="rounded border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2"><strong className="text-sm">{TYPE_LABELS[supply.normalizedType] ?? "Insumo"} {COLOR_LABELS[supply.color] ?? supply.color}</strong><Badge variant={supplyTone(supply.alertStatus)}>{ALERT_LABELS[supply.alertStatus]}</Badge></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border-soft" aria-hidden="true"><div className="h-full bg-accent" style={{ width: `${percent}%` }} /></div>
              <p className="mb-0 mt-2 flex items-center gap-1.5 text-sm font-bold">{supply.alertStatus !== "ok" && <AlertTriangle size={14} />} {formatSupplyLevel(supply.levelPercent)} — {ALERT_LABELS[supply.alertStatus]}</p>
              <p className="mb-0 mt-1 flex items-center gap-1 text-xs text-muted"><Droplets size={13} /> Atualizado em {formatDateTime(supply.lastSeenAt)}</p>
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
