import { formatNumber } from "../requests/rules";
import { getMonthlyConsolidation, getUnitRanking } from "./rules";

export function ReportsView(props: {
  monthly: ReturnType<typeof getMonthlyConsolidation>;
  ranking: ReturnType<typeof getUnitRanking>;
}) {
  const { monthly, ranking } = props;

  return (
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
          {ranking.map((item, index) => (
            <div className="ranking-row" key={item.unitId}>
              <span>{index + 1}</span>
              <strong>{item.unitName}</strong>
              <em>{formatNumber(item.requests)} solicitação(ões)</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
