import * as Tabs from "@radix-ui/react-tabs";
import { Network, Printer as PrinterIcon, Radar } from "lucide-react";
import { useMemo, useState } from "react";
import { Unit } from "../../units/model/types";
import { Card } from "../../../shared/ui/card";
import { usePrintFleetQueries } from "../model/queries";
import { OnboardingStatus } from "../model/types";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { NetworksPanel } from "./NetworksPanel";
import { PrintersPanel } from "./PrintersPanel";

const tabClass = "inline-flex min-h-10 items-center gap-2 border-0 border-b-2 border-transparent bg-transparent px-3 text-sm font-bold text-muted [appearance:none] data-[state=active]:border-accent data-[state=active]:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function PrintFleetView({ units, canManage }: { units: Unit[]; canManage: boolean }) {
  const queries = usePrintFleetQueries(true);
  const networks = queries.networks.data ?? [];
  const runs = queries.discoveries.data?.items ?? [];
  const printers = queries.printers.data?.items ?? [];
  const [tab, setTab] = useState("printers");
  const [printerStatusFilter, setPrinterStatusFilter] = useState<OnboardingStatus | "all">("all");
  const pendingCount = useMemo(() => printers.filter((p) => p.onboardingStatus === "pending").length, [printers]);
  return <Card className="p-0"><div className="border-b border-border px-4 pt-4"><p className="m-0 text-sm text-muted">Inventário e insumos das impressoras conectadas à rede da sede, organizados por setor.</p><Tabs.Root value={tab} onValueChange={setTab} className="mt-3"><Tabs.List aria-label="Parque de impressão" className="flex gap-1 overflow-x-auto"><Tabs.Trigger value="printers" className={tabClass}><PrinterIcon size={16} /> Impressoras</Tabs.Trigger><Tabs.Trigger value="discovery" className={tabClass}><Radar size={16} /> Descoberta</Tabs.Trigger><Tabs.Trigger value="networks" className={tabClass}><Network size={16} /> Redes</Tabs.Trigger></Tabs.List><Tabs.Content value="printers" className="p-4 focus-visible:outline-none"><PrintersPanel printers={printers} networks={networks} units={units} canManage={canManage} loading={queries.printers.isLoading} error={queries.printers.error} statusFilter={printerStatusFilter} onStatusFilterChange={setPrinterStatusFilter} /></Tabs.Content><Tabs.Content value="discovery" className="p-4 focus-visible:outline-none"><DiscoveryPanel networks={networks} runs={runs} canManage={canManage} loading={queries.discoveries.isLoading} pendingPrinters={pendingCount} onReviewPending={() => { setPrinterStatusFilter("pending"); setTab("printers"); }} /></Tabs.Content><Tabs.Content value="networks" className="p-4 focus-visible:outline-none"><NetworksPanel networks={networks} canManage={canManage} loading={queries.networks.isLoading} error={queries.networks.error} /></Tabs.Content></Tabs.Root></div></Card>;
}
