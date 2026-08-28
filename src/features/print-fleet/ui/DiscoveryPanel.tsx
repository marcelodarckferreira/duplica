import { AlertTriangle, Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../shared/ui/dialog";
import { discoveryProgress, formatDateTime } from "../model/rules";
import { useStartDiscoveryMutation } from "../model/queries";
import { DiscoveryNetwork, DiscoveryRun } from "../model/types";

const RUN_LABELS: Record<string, string> = { queued: "Na fila", running: "Em execução", completed: "Concluída", completed_with_errors: "Concluída com alertas", failed: "Falhou" };

export function DiscoveryPanel({ networks, runs, canManage, loading }: { networks: DiscoveryNetwork[]; runs: DiscoveryRun[]; canManage: boolean; loading: boolean }) {
  const [pending, setPending] = useState<DiscoveryNetwork | null>(null);
  const start = useStartDiscoveryMutation();
  const active = networks.filter((n) => n.active);
  return <div className="grid gap-5">
    <section><div className="mb-3 flex items-center justify-between"><div><h2 className="m-0 text-base font-bold">Executar descoberta</h2><p className="mb-0 mt-1 text-sm text-muted">Varre as redes cadastradas por SNMP v2c. A rede <span className="font-mono">172.15.0.0/16</span> pode levar vários minutos.</p></div></div>
      {active.length === 0 ? <p className="rounded border border-dashed border-border p-5 text-muted">Cadastre e ative uma rede antes de iniciar.</p> : <div className="grid gap-2 md:grid-cols-2">{active.map((network) => <article key={network.id} className="flex items-center justify-between gap-3 rounded border border-border p-3"><div><strong>{network.name}</strong><p className="m-0 font-mono text-xs text-muted">{network.cidr} · {network.targetCount.toLocaleString("pt-BR")} alvos</p></div>{canManage && <Button type="button" size="sm" aria-label={`Iniciar descoberta em ${network.name}`} onClick={() => setPending(network)}><Play size={15} /> Iniciar</Button>}</article>)}</div>}
    </section>
    <section><div className="mb-2 flex items-center gap-2"><RefreshCw size={16} /><h2 className="m-0 text-base font-bold">Histórico</h2></div>{loading ? <p className="text-muted">Carregando execuções…</p> : runs.length === 0 ? <p className="rounded border border-dashed border-border p-5 text-muted">Nenhuma descoberta executada.</p> : <div className="grid gap-2">{runs.map((run) => { const network = networks.find((n) => n.id === run.networkId); const progress = discoveryProgress(run); return <article key={run.id} className="rounded border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{network?.name ?? "Rede removida"}</strong><Badge variant={run.status === "failed" ? "danger" : run.status.includes("error") ? "warning" : run.status === "completed" ? "active" : "neutral"}>{RUN_LABELS[run.status] ?? run.status}</Badge></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-border-soft"><div className="h-full bg-accent" style={{ width: `${progress}%` }} /></div><p className="mb-0 mt-2 text-xs text-muted">{run.scannedTargets.toLocaleString("pt-BR")} de {run.totalTargets.toLocaleString("pt-BR")} · {run.printersFound} impressora(s) · solicitada em {formatDateTime(run.requestedAt)}</p>{run.lastErrorMessage && <p className="mb-0 mt-2 text-sm font-bold text-[#a43b2f]">{run.lastErrorMessage}</p>}</article>; })}</div>}</section>
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}><DialogContent><DialogHeader><DialogTitle>Confirmar descoberta</DialogTitle></DialogHeader><DialogDescription>{pending && pending.targetCount > 4096 ? <>A varredura alcançará <strong>{pending.targetCount.toLocaleString("pt-BR")} endereços</strong>. Ela será processada em lotes e pode levar vários minutos.</> : <>A rede será colocada na fila de descoberta.</>}</DialogDescription>{pending?.isPrivate === false && <p className="m-0 flex gap-2 rounded border border-border bg-surface-soft p-3 text-sm"><AlertTriangle className="shrink-0 text-[#9b6a22]" size={18} /> O bloco informado não é classificado como privado pelo padrão RFC 1918. Confirme que ele pertence à rede interna da sede.</p>}<DialogFooter><Button type="button" variant="soft" onClick={() => setPending(null)}>Cancelar</Button><Button type="button" disabled={start.isPending} onClick={async () => { if (!pending) return; await start.mutateAsync(pending.id); setPending(null); }}>Colocar na fila</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
