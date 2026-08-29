import { ChevronDown, ChevronUp, EyeOff, Pencil, Plus, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Unit } from "../../units/model/types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../shared/ui/dialog";
import { Input } from "../../../shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { Switch } from "../../../shared/ui/switch";
import { SortableHeader } from "../../../shared/ui/table-filters";
import { useConfirmPrinterMutation, useCreatePrinterMutation, usePollPrinterMutation, useSetMonitoringMutation, useSetOnboardingMutation } from "../model/queries";
import { ONBOARDING_LABELS, PrinterSortKey, printerDisplayName, SortDirection, sortPrinters, STATUS_LABELS } from "../model/rules";
import { DiscoveryNetwork, OnboardingStatus, Printer } from "../model/types";
import { PrinterDetails } from "./PrinterDetails";

const FILTER_OPTIONS: { value: OnboardingStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "ignored", label: "Ignoradas" },
];

export function PrintersPanel({ printers, networks, units, canManage, loading, error, statusFilter = "all", onStatusFilterChange }: { printers: Printer[]; networks: DiscoveryNetwork[]; units: Unit[]; canManage: boolean; loading: boolean; error: unknown; statusFilter?: OnboardingStatus | "all"; onStatusFilterChange?: (status: OnboardingStatus | "all") => void }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Printer | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sortKey, setSortKey] = useState<PrinterSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const searchRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirmPrinterMutation();
  const onboarding = useSetOnboardingMutation();
  const monitoring = useSetMonitoringMutation();
  const create = useCreatePrinterMutation();
  const poll = usePollPrinterMutation();
  const counts = useMemo(() => ({ all: printers.length, pending: printers.filter((p) => p.onboardingStatus === "pending").length, confirmed: printers.filter((p) => p.onboardingStatus === "confirmed").length, ignored: printers.filter((p) => p.onboardingStatus === "ignored").length, conflict: printers.filter((p) => p.onboardingStatus === "conflict").length }), [printers]);
  const filtered = useMemo(() => sortPrinters(printers.filter((p) => (statusFilter === "all" || p.onboardingStatus === statusFilter) && [p.displayName, p.managementAddress, p.model, p.manufacturer].some((v) => v?.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")))), units, sortKey, sortDirection), [printers, query, statusFilter, units, sortKey, sortDirection]);

  function handleSort(key: PrinterSortKey) {
    if (key === sortKey) { setSortDirection((direction) => (direction === "asc" ? "desc" : "asc")); return; }
    setSortKey(key);
    setSortDirection("asc");
  }

  function sortHeaderProps(key: PrinterSortKey) {
    return { sortKey: key, activeSortKey: sortKey, sortDirection, onSort: handleSort };
  }

  if (loading) return <p className="text-muted">Carregando impressoras…</p>;
  if (error) return <p className="font-bold text-[#a43b2f]">Não foi possível carregar o parque de impressão.</p>;
  return <>
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative min-w-0 flex-1"><span className="sr-only">Buscar impressoras</span><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-muted" /><Input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, IP, fabricante ou modelo" className="pl-9 pr-10" />{query && <button type="button" aria-label="Limpar busca" onClick={() => { setQuery(""); searchRef.current?.focus(); }} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"><X size={15} /></button>}</label>
      {canManage && <Button type="button" onClick={() => setManualOpen(true)}><Plus size={17} /> Cadastrar manualmente</Button>}
    </div>
    <div role="group" aria-label="Filtrar por situação de cadastro" className="mb-3 flex flex-wrap gap-2">{FILTER_OPTIONS.map((opt) => <button key={opt.value} type="button" aria-pressed={statusFilter === opt.value} onClick={() => onStatusFilterChange?.(opt.value)} className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors [appearance:none] ${statusFilter === opt.value ? "border-accent bg-accent-strong text-white" : "border-border bg-surface-soft text-muted hover:border-accent/40 hover:text-text"}`}>{opt.label} · {counts[opt.value]}</button>)}</div>
    {message && <p role="status" className="font-bold text-accent">{message}</p>}
    {filtered.length === 0 ? <div className="rounded border border-dashed border-border p-8 text-center text-muted">Nenhuma impressora encontrada.</div> : <div className="overflow-x-auto rounded border border-border">
      <table className="w-full border-collapse text-sm"><thead><tr className="bg-surface-soft text-left text-xs uppercase text-muted">
        <SortableHeader label="Impressora" {...sortHeaderProps("name")} />
        <SortableHeader label="Setor" {...sortHeaderProps("unit")} />
        <SortableHeader label="Situação" {...sortHeaderProps("operationalStatus")} />
        <SortableHeader label="Cadastro" {...sortHeaderProps("onboardingStatus")} />
        <th className="border-b border-border px-2.5 py-2.5 text-right text-xs uppercase text-muted">Ações</th>
      </tr></thead>
      <tbody>{filtered.map((printer) => { const unit = units.find((u) => u.id === printer.unitId); const name = printerDisplayName(printer); const isExpanded = expanded === printer.id; return <tr key={printer.id} onClick={() => setExpanded(isExpanded ? null : printer.id)} className={`cursor-pointer border-t border-border-soft hover:bg-surface-hover ${isExpanded ? "bg-surface-hover" : ""}`}><td colSpan={5} className="p-0"><div className="grid grid-cols-[minmax(220px,2fr)_minmax(150px,1fr)_130px_120px_auto] items-center gap-2 px-3 py-2"><div><strong className="block">{name}</strong><span className="font-mono text-xs text-muted">{printer.managementAddress} · {printer.manufacturer ?? "Fabricante desconhecido"} {printer.model ?? ""}</span></div><span>{unit?.name ?? "Setor não definido"}</span><Badge variant={printer.operationalStatus === "online" ? "active" : printer.operationalStatus === "warning" ? "warning" : printer.operationalStatus === "offline" ? "danger" : "neutral"}>{STATUS_LABELS[printer.operationalStatus]}</Badge><Badge variant={printer.onboardingStatus === "confirmed" ? "active" : "neutral"}>{ONBOARDING_LABELS[printer.onboardingStatus]}</Badge><div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>{canManage && <button type="button" aria-label={`Forçar leitura SNMP de ${name}`} disabled={poll.isPending && poll.variables === printer.id} onClick={() => poll.mutateAsync(printer.id).then(() => setMessage("Leitura concluída.")).catch((e) => setMessage(e instanceof Error ? e.message : "Falha ao ler a impressora."))} className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text disabled:pointer-events-none disabled:opacity-50">{<RefreshCw size={16} className={poll.isPending && poll.variables === printer.id ? "animate-spin" : undefined} />}</button>}{canManage && printer.onboardingStatus !== "confirmed" && printer.onboardingStatus !== "ignored" && <button type="button" aria-label={`Editar ${name}`} onClick={() => setEditing(printer)} className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"><Pencil size={16} /></button>}{canManage && printer.onboardingStatus === "ignored" && <button type="button" aria-label={`Reabrir cadastro de ${name}`} onClick={() => onboarding.mutate({ id: printer.id, action: "reopen" })} className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"><RotateCcw size={16} /></button>}{canManage && printer.onboardingStatus !== "ignored" && <Switch aria-label={`${printer.monitoringEnabled ? "Desativar" : "Ativar"} monitoramento de ${name}`} checked={printer.monitoringEnabled} onCheckedChange={() => monitoring.mutate({ id: printer.id, enabled: !printer.monitoringEnabled })} />}<button type="button" aria-label={`${isExpanded ? "Fechar" : "Ver"} detalhes de ${name}`} onClick={() => setExpanded(isExpanded ? null : printer.id)} className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text">{isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button></div></div>{isExpanded && <PrinterDetails printer={printer} />}</td></tr>; })}</tbody></table>
    </div>}
    <PrinterReviewDialog key={editing?.id ?? "none"} printer={editing} units={units} pending={confirm.isPending} onClose={() => setEditing(null)} onConfirm={async (displayName, unitId, manufacturer, model) => { if (!editing) return; await confirm.mutateAsync({ id: editing.id, displayName, unitId, manufacturer, model }); setEditing(null); setMessage("Impressora confirmada e vinculada ao setor."); }} onIgnore={async () => { if (!editing) return; await onboarding.mutateAsync({ id: editing.id, action: "ignore" }); setEditing(null); }} />
    <ManualPrinterDialog open={manualOpen} networks={networks} units={units} pending={create.isPending} onClose={() => setManualOpen(false)} onSubmit={async (data) => { await create.mutateAsync(data); setManualOpen(false); setMessage("Impressora cadastrada."); }} />
  </>;
}

function PrinterReviewDialog({ printer, units, pending, onClose, onConfirm, onIgnore }: { printer: Printer | null; units: Unit[]; pending: boolean; onClose: () => void; onConfirm: (name: string, unit: string, manufacturer: string, model: string) => Promise<void>; onIgnore: () => Promise<void> }) {
  const [name, setName] = useState(printer?.displayName ?? printer?.sysName ?? ""); const [unit, setUnit] = useState(""); const [manufacturer, setManufacturer] = useState(printer?.manufacturer ?? ""); const [model, setModel] = useState(printer?.model ?? ""); const [error, setError] = useState("");
  return <Dialog open={Boolean(printer)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Revisar impressora</DialogTitle></DialogHeader><DialogDescription>Confirme o nome patrimonial e o setor da sede.</DialogDescription><form noValidate onSubmit={async (e) => { e.preventDefault(); if (!name.trim() || !unit) { setError("Informe o nome e selecione o setor."); return; } await onConfirm(name.trim(), unit, manufacturer.trim(), model.trim()); }} className="grid gap-3"><label className="grid gap-1 text-sm font-bold">Nome<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Impressora" /></label><label className="grid gap-1 text-sm font-bold">Setor<Select value={unit} onValueChange={setUnit}><SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger><SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Fabricante<Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Fabricante" /></label><label className="grid gap-1 text-sm font-bold">Modelo<Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Modelo" /></label></div>{error && <p className="m-0 text-sm font-bold text-[#a43b2f]">{error}</p>}<DialogFooter><Button type="button" variant="soft" disabled={pending} onClick={onIgnore}><EyeOff size={16} /> Ignorar</Button><Button type="submit" disabled={pending}>Confirmar cadastro</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ManualPrinterDialog({ open, networks, units, pending, onClose, onSubmit }: { open: boolean; networks: DiscoveryNetwork[]; units: Unit[]; pending: boolean; onClose: () => void; onSubmit: (data: { discoveryNetworkId: string; managementAddress: string; displayName: string; unitId: string; manufacturer: string; model: string }) => Promise<void> }) {
  const [data, setData] = useState({ discoveryNetworkId: "", managementAddress: "", displayName: "", unitId: "", manufacturer: "", model: "" }); const [error, setError] = useState("");
  return <Dialog open={open} onOpenChange={(v) => !v && onClose()}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Cadastrar impressora</DialogTitle></DialogHeader><DialogDescription>Use quando o equipamento não responder à descoberta automática.</DialogDescription><form noValidate className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); if (!data.discoveryNetworkId || !data.managementAddress || !data.displayName || !data.unitId) { setError("Preencha rede, IP, nome e setor."); return; } await onSubmit(data); }}><label className="grid gap-1 text-sm font-bold">Rede<Select value={data.discoveryNetworkId} onValueChange={(v) => setData({ ...data, discoveryNetworkId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{networks.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent></Select></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Endereço IP<Input className="font-mono" value={data.managementAddress} onChange={(e) => setData({ ...data, managementAddress: e.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Nome<Input value={data.displayName} onChange={(e) => setData({ ...data, displayName: e.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Fabricante<Input value={data.manufacturer} onChange={(e) => setData({ ...data, manufacturer: e.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Modelo<Input value={data.model} onChange={(e) => setData({ ...data, model: e.target.value })} /></label></div><label className="grid gap-1 text-sm font-bold">Setor<Select value={data.unitId} onValueChange={(v) => setData({ ...data, unitId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></label>{error && <p className="m-0 text-sm font-bold text-[#a43b2f]">{error}</p>}<DialogFooter><Button type="button" variant="soft" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>Salvar impressora</Button></DialogFooter></form></DialogContent></Dialog>;
}
