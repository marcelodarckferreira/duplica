import { BadgeInfo, Container, Database, GitCommitHorizontal, PackageCheck, RefreshCw } from "lucide-react";
import { Button } from "../../../shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/ui/dialog";
import { useSystemVersionQuery } from "../model/queries";

function VersionRow(props: { icon: typeof PackageCheck; label: string; value: string }) {
  const { icon: Icon, label, value } = props;
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded border border-border-soft bg-surface px-3 py-2.5">
      <span className="grid h-8 w-8 place-items-center rounded bg-surface-soft text-accent-strong" aria-hidden="true">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="m-0 break-all font-mono text-sm font-bold text-text">{value}</p>
      </div>
    </div>
  );
}

export function AboutModal(props: {
  open: boolean;
  onClose: () => void;
}) {
  const { open, onClose } = props;
  const versionQuery = useSystemVersionQuery(open);
  const errorMessage = versionQuery.error instanceof Error
    ? versionQuery.error.message
    : "Não foi possível consultar as versões.";

  function closeModal() {
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Sobre o Duplica</DialogTitle>
        </DialogHeader>
        <DialogDescription className="m-0">
          Informações da versão atualmente conectada. Frontend e backend são um único artefato —
          sobem juntos com o mesmo número de versão e a mesma imagem Docker.
        </DialogDescription>

        <div className="flex items-center gap-3 rounded-lg bg-accent-strong px-4 py-3 text-white">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded border border-white/20 bg-white/10" aria-hidden="true">
            <BadgeInfo size={24} />
          </span>
          <div>
            <p className="m-0 text-base font-bold">Duplica</p>
            <p className="m-0 text-xs text-white/80">Controle institucional de impressão</p>
          </div>
        </div>

        <div className="min-h-[252px]" aria-live="polite">
          {versionQuery.isLoading && (
            <div className="grid min-h-[252px] place-items-center" role="status">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-muted">
                <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Consultando versões…
              </span>
            </div>
          )}

          {versionQuery.isError && (
            <div className="grid min-h-[252px] place-items-center rounded border border-border bg-status-cancelado-bg p-4 text-center">
              <div>
                <p className="m-0 mb-3 text-sm font-bold text-status-cancelado-fg" role="alert">{errorMessage}</p>
                <Button type="button" variant="soft" size="sm" onClick={() => versionQuery.refetch()} disabled={versionQuery.isFetching}>
                  <RefreshCw size={15} className={versionQuery.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
                  {versionQuery.isFetching ? "Tentando novamente…" : "Tentar novamente"}
                </Button>
              </div>
            </div>
          )}

          {versionQuery.data && (
            <div className="grid gap-2" role="group" aria-label="Versões do sistema">
              <VersionRow icon={PackageCheck} label="Versão do app (frontend + backend)" value={versionQuery.data.applicationVersion} />
              <VersionRow icon={GitCommitHorizontal} label="Versão GitHub" value={versionQuery.data.gitSha} />
              <VersionRow icon={Container} label="Imagem Docker" value={`duplica:${versionQuery.data.applicationVersion}`} />
              <VersionRow icon={Database} label="Versão do banco de dados" value={versionQuery.data.databaseRevision} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
