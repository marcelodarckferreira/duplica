import { Eye, EyeOff, Network, Pencil, Plus, Power } from "lucide-react";
import { FormEvent, useState } from "react";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../shared/ui/dialog";
import { Input } from "../../../shared/ui/input";
import { useCreateNetworkMutation, useSetNetworkActiveMutation, useUpdateNetworkMutation } from "../model/queries";
import { DiscoveryNetwork, NetworkDraft } from "../model/types";

interface NetworksPanelProps { networks: DiscoveryNetwork[]; canManage: boolean; loading: boolean; error: unknown }

export function NetworksPanel({ networks, canManage, loading, error }: NetworksPanelProps) {
  const [dialogNetwork, setDialogNetwork] = useState<DiscoveryNetwork | "new" | null>(null);
  const [message, setMessage] = useState("");
  const toggle = useSetNetworkActiveMutation();
  if (loading) return <p className="text-muted">Carregando redes…</p>;
  if (error) return <p className="font-bold text-[#a43b2f]">Não foi possível carregar as redes.</p>;

  return <>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div><h2 className="m-0 text-base font-bold">Redes autorizadas da sede</h2><p className="mb-0 mt-1 text-sm text-muted">Somente os blocos cadastrados aqui entram na descoberta.</p></div>
      {canManage && <Button type="button" onClick={() => setDialogNetwork("new")}><Plus size={17} /> Nova rede</Button>}
    </div>
    {message && <p role="status" className="font-bold text-accent">{message}</p>}
    {networks.length === 0 ? <p className="rounded border border-dashed border-border p-8 text-center text-muted">Nenhuma rede cadastrada.</p> : (
      <div className="grid gap-3 lg:grid-cols-2">{networks.map((network) => (
        <article key={network.id} className="rounded border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-2"><div className="flex gap-2"><Network className="mt-0.5 text-accent" size={19} /><div><strong>{network.name}</strong><p className="m-0 font-mono text-sm">{network.cidr}</p></div></div><Badge variant={network.active ? "active" : "inactive"}>{network.active ? "Ativa" : "Inativa"}</Badge></div>
          <dl className="my-3 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-xs uppercase text-muted">Alvos</dt><dd className="m-0 font-bold">{network.targetCount.toLocaleString("pt-BR")}</dd></div><div><dt className="text-xs uppercase text-muted">SNMP</dt><dd className="m-0 font-bold">v{network.snmpVersion} · credencial {network.credentialConfigured ? "configurada" : "ausente"}</dd></div><div><dt className="text-xs uppercase text-muted">Tempo limite</dt><dd className="m-0">{network.timeoutMs} ms</dd></div><div><dt className="text-xs uppercase text-muted">Concorrência</dt><dd className="m-0">{network.concurrencyLimit}</dd></div></dl>
          {network.excludedCidrs.length > 0 && <p className="mb-3 text-xs text-muted">Exclusões: <span className="font-mono">{network.excludedCidrs.join(", ")}</span></p>}
          {canManage && <div className="flex gap-2"><Button type="button" size="sm" variant="soft" onClick={() => setDialogNetwork(network)}><Pencil size={15} /> Editar</Button><Button type="button" size="sm" variant="soft" disabled={toggle.isPending} onClick={async () => { await toggle.mutateAsync({ id: network.id, active: !network.active }); setMessage(`Rede ${network.active ? "desativada" : "ativada"}.`); }}><Power size={15} /> {network.active ? "Desativar" : "Ativar"}</Button></div>}
        </article>
      ))}</div>
    )}
    {dialogNetwork && <NetworkDialog key={dialogNetwork === "new" ? "new" : dialogNetwork.id} network={dialogNetwork === "new" ? null : dialogNetwork} onClose={() => setDialogNetwork(null)} onSaved={(editing) => { setDialogNetwork(null); setMessage(editing ? "Rede atualizada. A credencial anterior foi mantida quando o campo ficou vazio." : "Rede cadastrada. A comunidade SNMP foi armazenada de forma protegida."); }} />}
  </>;
}

function NetworkDialog({ network, onClose, onSaved }: { network: DiscoveryNetwork | null; onClose: () => void; onSaved: (editing: boolean) => void }) {
  const editing = network !== null;
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const create = useCreateNetworkMutation();
  const update = useUpdateNetworkMutation();
  const [data, setData] = useState({ name: network?.name ?? "Rede da sede", cidr: network?.cidr ?? "172.15.0.0/16", exclusions: network?.excludedCidrs.join("\n") ?? "", community: "", timeoutMs: String(network?.timeoutMs ?? 1000), retries: String(network?.retries ?? 0), concurrency: String(network?.concurrencyLimit ?? 64) });
  const pending = create.isPending || update.isPending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!data.name.trim() || !data.cidr.trim() || (!editing && !data.community)) { setError(`Informe nome, rede CIDR${editing ? "" : " e comunidade SNMP"}.`); return; }
    const draft: NetworkDraft = { name: data.name.trim(), cidr: data.cidr.trim(), excludedCidrs: data.exclusions.split(/[\n,]/).map((value) => value.trim()).filter(Boolean), community: data.community, timeoutMs: Number(data.timeoutMs), retries: Number(data.retries), concurrencyLimit: Number(data.concurrency) };
    try {
      if (network) await update.mutateAsync({ id: network.id, draft: { ...draft, community: draft.community || undefined } });
      else await create.mutateAsync(draft);
      onSaved(editing);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível salvar a rede."); }
  }

  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{editing ? "Editar rede de descoberta" : "Cadastrar rede de descoberta"}</DialogTitle></DialogHeader><DialogDescription>Informe apenas redes administradas pela sede. Separe exclusões por linha.</DialogDescription><form noValidate className="grid gap-3" onSubmit={submit}>
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Nome<Input value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Rede CIDR<Input className="font-mono" value={data.cidr} onChange={(event) => setData({ ...data, cidr: event.target.value })} /></label></div>
    <label className="grid gap-1 text-sm font-bold">Redes excluídas<textarea className="min-h-20 resize-none rounded border border-border bg-surface p-3 font-mono text-sm" value={data.exclusions} onChange={(event) => setData({ ...data, exclusions: event.target.value })} placeholder="172.15.0.0/24" /></label>
    <label className="grid gap-1 text-sm font-bold">Comunidade SNMP v2c<div className="relative"><Input type={showSecret ? "text" : "password"} autoComplete="new-password" value={data.community} onChange={(event) => setData({ ...data, community: event.target.value })} className="pr-10" /><button type="button" aria-label={showSecret ? "Ocultar comunidade" : "Mostrar comunidade"} onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center text-muted">{showSecret ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><span className="text-xs font-normal text-muted">{editing ? "Deixe vazio para manter a credencial atual." : "O valor é enviado uma vez e não volta a ser exibido."}</span></label>
    <div className="grid grid-cols-3 gap-3"><label className="grid gap-1 text-sm font-bold">Timeout (ms)<Input type="number" min={250} max={10000} value={data.timeoutMs} onChange={(event) => setData({ ...data, timeoutMs: event.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Tentativas<Input type="number" min={0} max={3} value={data.retries} onChange={(event) => setData({ ...data, retries: event.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Concorrência<Input type="number" min={1} max={128} value={data.concurrency} onChange={(event) => setData({ ...data, concurrency: event.target.value })} /></label></div>
    {error && <p className="m-0 text-sm font-bold text-[#a43b2f]">{error}</p>}<DialogFooter><Button type="button" variant="soft" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar rede"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
