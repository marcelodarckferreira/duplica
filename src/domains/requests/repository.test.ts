import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestsRepository } from "./repository";

const apiRequest = {
  id: "req-1",
  code: "CP-2026-0001",
  origin: "Escola",
  unit_id: "emef-paulo-freire",
  unit_name: "EMEF Paulo Freire",
  requester: "Ana Souza",
  contact: "(11) 99999-0000",
  document_description: "Avaliação bimestral",
  pages: 5,
  copies: 30,
  duplex: true,
  printed_faces: 150,
  consumed_sheets: 90,
  paper: "A4",
  color_mode: "P&B",
  priority: "Normal",
  desired_deadline: "2026-08-15",
  status: "Recebido",
  production_owner: "Carlos",
  requested_at: "2026-08-10",
  produced_at: "",
  delivered_at: "",
  picked_up_by: "",
  notes: "",
  history: [{ status: "Recebido", date: "2026-08-10", by: "Carlos" }],
};

describe("requests repository", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists requests and maps snake_case fields to the frontend shape", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([apiRequest]), { status: 200 }));

    const repo = createRequestsRepository();
    const [request] = await repo.getRequests();

    expect(request).toMatchObject({
      unitId: "emef-paulo-freire",
      unitName: "EMEF Paulo Freire",
      documentDescription: "Avaliação bimestral",
      printedFaces: 150,
      consumedSheets: 90,
      colorMode: "P&B",
      desiredDeadline: "2026-08-15",
      productionOwner: "Carlos",
      requestedAt: "2026-08-10",
    });
    expect(request.history).toEqual([{ status: "Recebido", date: "2026-08-10", by: "Carlos" }]);
  });

  it("creates a request via POST with snake_case body", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(apiRequest), { status: 200 }));

    const repo = createRequestsRepository();
    await repo.createRequest({
      origin: "Escola",
      unitId: "emef-paulo-freire",
      requester: "Ana Souza",
      contact: "(11) 99999-0000",
      documentDescription: "Avaliação bimestral",
      pages: 5,
      copies: 30,
      duplex: true,
      paper: "A4",
      colorMode: "P&B",
      priority: "Normal",
      desiredDeadline: "2026-08-15",
      productionOwner: "Carlos",
      notes: "",
    });

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/requests");
    expect(requestInit.method).toBe("POST");
    expect(JSON.parse(requestInit.body)).toMatchObject({ unit_id: "emef-paulo-freire", document_description: "Avaliação bimestral" });
  });

  it("updates status via PATCH without needing the caller to supply an actor or date", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ...apiRequest, status: "Pronto" }), { status: 200 }));

    const repo = createRequestsRepository();
    const updated = await repo.updateStatus("req-1", "Pronto");

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/requests/req-1/status");
    expect(requestInit.method).toBe("PATCH");
    expect(JSON.parse(requestInit.body)).toEqual({ status: "Pronto", picked_up_by: null });
    expect(updated?.status).toBe("Pronto");
  });

  it("deletes a request via DELETE", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const repo = createRequestsRepository();
    const result = await repo.deleteRequest("req-1");

    expect(result).toBe(true);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.method).toBe("DELETE");
  });
});
