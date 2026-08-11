import { CopyRequest, RequestStatus } from "../../requests/model/types";

export function buildDashboardMetrics(requests: CopyRequest[]) {
  const countStatus = (status: RequestStatus) =>
    requests.filter((request) => request.status === status).length;
  const totalSheets = requests.reduce((sum, request) => sum + request.consumedSheets, 0);

  return {
    totalRequests: requests.length,
    totalCopies: requests.reduce((sum, request) => sum + request.printedFaces, 0),
    pending: requests.filter((request) =>
      ["Recebido", "Em produção"].includes(request.status),
    ).length,
    ready: countStatus("Pronto"),
    delivered: countStatus("Entregue"),
    canceled: countStatus("Cancelado"),
    totalSheets,
    estimatedReams: Math.round((totalSheets / 500) * 10) / 10,
  };
}

export function getUnitRanking(requests: CopyRequest[]) {
  const grouped = new Map<string, { unitId: string; unitName: string; requests: number; printedFaces: number }>();

  for (const request of requests) {
    const current = grouped.get(request.unitId) ?? {
      unitId: request.unitId,
      unitName: request.unitName,
      requests: 0,
      printedFaces: 0,
    };
    current.requests += 1;
    current.printedFaces += request.printedFaces;
    grouped.set(request.unitId, current);
  }

  return [...grouped.values()].sort((a, b) => b.printedFaces - a.printedFaces);
}

export function getMonthlyConsolidation(requests: CopyRequest[]) {
  const grouped = new Map<string, { month: string; requests: number; printedFaces: number; consumedSheets: number }>();

  for (const request of requests) {
    const month = request.requestedAt.slice(0, 7);
    const current = grouped.get(month) ?? { month, requests: 0, printedFaces: 0, consumedSheets: 0 };
    current.requests += 1;
    current.printedFaces += request.printedFaces;
    current.consumedSheets += request.consumedSheets;
    grouped.set(month, current);
  }

  return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month));
}
