import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUnitsRepository } from "./repository";

describe("units repository", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists units from the API", async () => {
    const units = [
      { id: "emef-paulo-freire", name: "EMEF Paulo Freire", origin: "Escola", code: "ESC-001", contact: null, active: true },
    ];
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(units), { status: 200 }));

    const repo = createUnitsRepository();
    const result = await repo.getUnits();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/units"), expect.any(Object));
    expect(result).toEqual(units);
  });

  it("saves a unit via POST", async () => {
    const saved = { id: "emef-nova", name: "EMEF Nova", origin: "Escola", code: "ESC-010", contact: null, active: true };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(saved), { status: 200 }));

    const repo = createUnitsRepository();
    const result = await repo.saveUnit({
      id: "emef-nova",
      name: "EMEF Nova",
      origin: "Escola",
      code: "ESC-010",
      active: true,
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.method).toBe("POST");
    expect(JSON.parse(requestInit.body)).toMatchObject({ name: "EMEF Nova", code: "ESC-010", origin: "Escola" });
    expect(result).toEqual(saved);
  });

  it("propagates API errors", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Falha ao salvar." }), { status: 400 }));

    const repo = createUnitsRepository();
    await expect(
      repo.saveUnit({ id: "x", name: "X", origin: "Escola", code: "X", active: true }),
    ).rejects.toThrow("Falha ao salvar.");
  });
});
