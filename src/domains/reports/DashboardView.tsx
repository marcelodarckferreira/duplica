import { CheckCircle2, ClipboardList, Clock3, FileText, Printer } from "lucide-react";
import { ReactNode } from "react";
import { RequestTable } from "../requests/RequestsView";
import { CopyRequest } from "../requests/types";
import { formatNumber } from "../requests/rules";
import { buildDashboardMetrics, getMonthlyConsolidation, getUnitRanking } from "./rules";

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
  monthly: ReturnType<typeof getMonthlyConsolidation>;
  fullRanking: ReturnType<typeof getUnitRanking>;
  recentRequests: CopyRequest[];
  onSelectRequest: (id: string) => void;
}) {
  const { metrics, ranking, monthly, fullRanking, recentRequests, onSelectRequest } = props;

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

      <section className="dashboard-layout">
        <div className="panel">
          <div className="panel-heading">
            <h2>Consolidação mensal</h2>
            <span>Solicitações, faces e folhas</span>
          </div>
          <table className="data-table">
            <thead><tr><th>Mês</th><th>Solicitações</th><th>Faces</th><th>Folhas</th></tr></thead>
            <tbody>
              {monthly.map((item) => (
                <tr key={item.month}>
                  <td>{item.month}</td>
                  <td>{formatNumber(item.requests)}</td>
                  <td>{formatNumber(item.printedFaces)}</td>
                  <td>{formatNumber(item.consumedSheets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="panel-heading">
            <h2>Uso por unidade</h2>
            <span>Ranking geral</span>
          </div>
          <div className="ranking-list">
            {fullRanking.map((item, index) => (
              <div className="ranking-row" key={item.unitId}>
                <span>{index + 1}</span>
                <strong>{item.unitName}</strong>
                <em>{formatNumber(item.requests)} solicitação(ões)</em>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
