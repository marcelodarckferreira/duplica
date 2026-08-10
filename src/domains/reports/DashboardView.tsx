import { CheckCircle2, ClipboardList, Clock3, FileText, Printer } from "lucide-react";
import { ReactNode } from "react";
import { RequestTable } from "../requests/RequestsView";
import { CopyRequest } from "../requests/types";
import { formatNumber } from "../requests/rules";
import { buildDashboardMetrics, getUnitRanking } from "./rules";

function Metric(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="metric-card">
      <div aria-hidden="true">{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

export function DashboardView(props: {
  metrics: ReturnType<typeof buildDashboardMetrics>;
  ranking: ReturnType<typeof getUnitRanking>;
  recentRequests: CopyRequest[];
  onSelectRequest: (id: string) => void;
}) {
  const { metrics, ranking, recentRequests, onSelectRequest } = props;

  return (
    <>
      <section className="metric-grid" aria-label="Indicadores principais">
        <Metric icon={<Printer />} label="Total de cópias" value={formatNumber(metrics.totalCopies)} />
        <Metric icon={<ClipboardList />} label="Solicitações" value={formatNumber(metrics.totalRequests)} />
        <Metric icon={<Clock3 />} label="Pendentes" value={formatNumber(metrics.pending)} />
        <Metric icon={<CheckCircle2 />} label="Prontas" value={formatNumber(metrics.ready)} />
        <Metric icon={<CheckCircle2 />} label="Entregues" value={formatNumber(metrics.delivered)} />
        <Metric icon={<FileText />} label="Resmas estimadas" value={metrics.estimatedReams.toLocaleString("pt-BR")} />
      </section>

      <section className="dashboard-layout">
        <div className="panel">
          <div className="panel-heading">
            <h2>Ranking de unidades</h2>
            <span>Por faces impressas</span>
          </div>
          <div className="ranking-list">
            {ranking.map((item, index) => (
              <div className="ranking-row" key={item.unitId}>
                <span>{index + 1}</span>
                <strong>{item.unitName}</strong>
                <em>{formatNumber(item.printedFaces)} faces</em>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <h2>Últimas solicitações</h2>
            <span>Movimento recente</span>
          </div>
          <RequestTable requests={recentRequests} compact onSelect={onSelectRequest} />
        </div>
      </section>
    </>
  );
}
