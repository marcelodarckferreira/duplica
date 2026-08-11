import { CheckCircle2, ClipboardList, Clock3, FileText, Printer } from "lucide-react";
import { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { RequestTable } from "../../requests/ui/RequestsView";
import { CopyRequest } from "../../requests/model/types";
import { formatNumber } from "../../requests/model/rules";
import { buildDashboardMetrics, getMonthlyConsolidation, getUnitRanking } from "../model/rules";

function Metric(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="grid min-h-[140px] content-between gap-2 rounded-lg border border-border bg-surface p-4">
      <div aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-white [&_svg]:h-[22px] [&_svg]:w-[22px]">
        {props.icon}
      </div>
      <span className="text-sm text-muted">{props.label}</span>
      <strong className="text-[1.7rem] leading-none text-text">{props.value}</strong>
    </article>
  );
}

function RankingList(props: { items: { unitId: string; unitName: string; label: string }[] }) {
  return (
    <div className="grid gap-2.5">
      {props.items.map((item, index) => (
        <div key={item.unitId} className="grid grid-cols-[34px_1fr_auto] items-center gap-2.5 border-b border-border-soft py-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-soft font-extrabold text-accent-strong">{index + 1}</span>
          <strong className="text-text">{item.unitName}</strong>
          <em className="not-italic text-muted">{item.label}</em>
        </div>
      ))}
    </div>
  );
}

export function DashboardView(props: {
  metrics: ReturnType<typeof buildDashboardMetrics>;
  ranking: ReturnType<typeof getUnitRanking>;
  monthly: ReturnType<typeof getMonthlyConsolidation>;
  fullRanking: ReturnType<typeof getUnitRanking>;
  recentRequests: CopyRequest[];
  onSelectRequest: (id: string) => void;
}) {
  const { metrics, ranking, monthly, fullRanking, recentRequests, onSelectRequest } = props;

  return (
    <>
      <section className="mb-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6" aria-label="Indicadores principais">
        <Metric icon={<Printer />} label="Total de cópias" value={formatNumber(metrics.totalCopies)} />
        <Metric icon={<ClipboardList />} label="Solicitações" value={formatNumber(metrics.totalRequests)} />
        <Metric icon={<Clock3 />} label="Pendentes" value={formatNumber(metrics.pending)} />
        <Metric icon={<CheckCircle2 />} label="Prontas" value={formatNumber(metrics.ready)} />
        <Metric icon={<CheckCircle2 />} label="Entregues" value={formatNumber(metrics.delivered)} />
        <Metric icon={<FileText />} label="Resmas estimadas" value={metrics.estimatedReams.toLocaleString("pt-BR")} />
      </section>

      <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Ranking de unidades</CardTitle>
            <CardDescription>Por faces impressas</CardDescription>
          </CardHeader>
          <RankingList items={ranking.map((item) => ({ ...item, label: `${formatNumber(item.printedFaces)} faces` }))} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimas solicitações</CardTitle>
            <CardDescription>Movimento recente</CardDescription>
          </CardHeader>
          <RequestTable requests={recentRequests} compact onSelect={onSelectRequest} />
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Consolidação mensal</CardTitle>
            <CardDescription>Solicitações, faces e folhas</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Mês</th>
                  <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Solicitações</th>
                  <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Faces</th>
                  <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Folhas</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((item) => (
                  <tr key={item.month}>
                    <td className="border-b border-border-soft px-2.5 py-2.5">{item.month}</td>
                    <td className="border-b border-border-soft px-2.5 py-2.5">{formatNumber(item.requests)}</td>
                    <td className="border-b border-border-soft px-2.5 py-2.5">{formatNumber(item.printedFaces)}</td>
                    <td className="border-b border-border-soft px-2.5 py-2.5">{formatNumber(item.consumedSheets)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Uso por unidade</CardTitle>
            <CardDescription>Ranking geral</CardDescription>
          </CardHeader>
          <RankingList items={fullRanking.map((item) => ({ ...item, label: `${formatNumber(item.requests)} solicitação(ões)` }))} />
        </Card>
      </section>
    </>
  );
}
