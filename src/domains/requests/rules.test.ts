import { describe, expect, it } from "vitest";
import { calculatePrintTotals, filterRequests, formatDate, formatNumber, requestToDraft, statusClass } from "./rules";
import { CopyRequest } from "./types";

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

describe("requests domain rules", () => {
  it("calculates printed faces and consumed sheets for simplex and duplex jobs", () => {
    expect(calculatePrintTotals({ pages: 8, copies: 120, duplex: false })).toEqual({
      printedFaces: 960,
      consumedSheets: 960,
    });

    expect(calculatePrintTotals({ pages: 5, copies: 30, duplex: true })).toEqual({
      printedFaces: 150,
      consumedSheets: 90,
    });
  });

  it("filters requests by query, status, origin and unit", () => {
    const requests = [
      baseRequest,
      { ...baseRequest, id: "2", unitId: "u2", unitName: "EMEF Ana Nery", status: "Pronto" as const },
      { ...baseRequest, id: "3", origin: "Sede SEMED" as const, unitId: "u3", unitName: "Sede - RH" },
    ];

    expect(filterRequests(requests, { query: "ana nery", status: "Todos", origin: "Todas", unitId: "Todas" })).toHaveLength(1);
    expect(filterRequests(requests, { query: "", status: "Pronto", origin: "Todas", unitId: "Todas" })).toHaveLength(1);
    expect(filterRequests(requests, { query: "", status: "Todos", origin: "Sede SEMED", unitId: "Todas" })).toHaveLength(1);
    expect(filterRequests(requests, { query: "", status: "Todos", origin: "Todas", unitId: "u1" })).toHaveLength(1);
    expect(filterRequests(requests, { query: "", status: "Todos", origin: "Todas", unitId: "Todas" })).toHaveLength(3);
  });

  it("formats numbers and dates in pt-BR", () => {
    expect(formatNumber(1234)).toBe("1.234");
    expect(formatDate("2026-08-15")).toBe("15/08/2026");
    expect(formatDate("")).toBe("-");
  });

  it("builds a badge class from status", () => {
    expect(statusClass("Em produção")).toBe("badge status-em-producao");
    expect(statusClass("Entregue")).toBe("badge status-entregue");
  });

  it("converts a request back into an editable draft", () => {
    expect(requestToDraft(baseRequest)).toMatchObject({
      origin: "Escola",
      unitId: "u1",
      requester: "Ana Souza",
    });
  });
});
