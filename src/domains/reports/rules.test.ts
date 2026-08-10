import { describe, expect, it } from "vitest";
import { buildDashboardMetrics, getMonthlyConsolidation, getUnitRanking } from "./rules";
import { CopyRequest } from "../requests/types";

const baseRequest: CopyRequest = {
  id: "1",
  code: "CP-2026-0001",
  origin: "Escola",
  unitId: "u1",
  unitName: "EMEF Paulo Freire",
  requester: "Ana Souza",
  contact: "(11) 99999-0000",
  documentDescription: "Avaliação bimestral",
  pages: 5,
  copies: 30,
  duplex: true,
  printedFaces: 150,
  consumedSheets: 90,
  paper: "A4",
  colorMode: "P&B",
  priority: "Normal",
  desiredDeadline: "2026-08-15",
  status: "Recebido",
  productionOwner: "Carlos",
  requestedAt: "2026-08-10",
  producedAt: "",
  deliveredAt: "",
  pickedUpBy: "",
  notes: "",
  history: [{ status: "Recebido", date: "2026-08-10", by: "Carlos" }],
};

describe("reports domain rules", () => {
  it("builds dashboard totals by status and paper consumption", () => {
    const requests = [
      baseRequest,
      { ...baseRequest, id: "2", code: "CP-2026-0002", status: "Pronto", consumedSheets: 120 },
      { ...baseRequest, id: "3", code: "CP-2026-0003", status: "Entregue", consumedSheets: 40 },
    ] satisfies CopyRequest[];

    expect(buildDashboardMetrics(requests)).toMatchObject({
      totalRequests: 3,
      totalCopies: 450,
      pending: 1,
      ready: 1,
      delivered: 1,
      estimatedReams: 0.5,
    });
  });

  it("ranks units and consolidates monthly totals", () => {
    const requests = [
      baseRequest,
      { ...baseRequest, id: "2", unitId: "u2", unitName: "Sede - RH", printedFaces: 70 },
      { ...baseRequest, id: "3", requestedAt: "2026-09-02", printedFaces: 30 },
    ] satisfies CopyRequest[];

    expect(getUnitRanking(requests)[0]).toMatchObject({
      unitName: "EMEF Paulo Freire",
      requests: 2,
      printedFaces: 180,
    });

    expect(getMonthlyConsolidation(requests)).toEqual([
      { month: "2026-08", requests: 2, printedFaces: 220, consumedSheets: 180 },
      { month: "2026-09", requests: 1, printedFaces: 30, consumedSheets: 90 },
    ]);
  });
});
