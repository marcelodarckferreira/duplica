import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrintFleetRepository } from "./repository";

const apiNetwork = {
  id: "net-1", name: "Sede", cidr: "172.15.0.0/16", excluded_cidrs: ["172.15.0.0/24"],
  snmp_version: "2c", timeout_ms: 1000, retries: 0, concurrency_limit: 64, active: true,
  credential_configured: true, target_count: 65278, is_private: false,
  created_at: "2026-08-27T12:00:00Z", updated_at: "2026-08-27T12:00:00Z",
};

describe("print fleet repository", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("maps network snake_case fields", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([apiNetwork]), { status: 200 }));
    const [network] = await createPrintFleetRepository().getNetworks();
    expect(network).toMatchObject({ excludedCidrs: ["172.15.0.0/24"], credentialConfigured: true, targetCount: 65278 });
  });

  it("creates a network without exposing the community in the result", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(apiNetwork), { status: 201 }));
    const repo = createPrintFleetRepository();
    const result = await repo.createNetwork({
      name: "Sede", cidr: "172.15.0.0/16", excludedCidrs: [], community: "private-community",
      timeoutMs: 1000, retries: 0, concurrencyLimit: 64,
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ excluded_cidrs: [], community: "private-community", timeout_ms: 1000 });
    expect(result).not.toHaveProperty("community");
  });

  it("starts discovery with an empty POST body", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: "run-1", status: "PENDING" }), { status: 202 }));
    const run = await createPrintFleetRepository().startDiscovery("net-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/print-fleet/networks/net-1/discoveries");
    expect(init).toMatchObject({ method: "POST" });
    expect(init.body).toBeUndefined();
    expect(run.status).toBe("queued");
  });

  it("updates a network without resending a blank saved secret", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(apiNetwork), { status: 200 }));
    await createPrintFleetRepository().updateNetwork("net-1", { name: "Sede atualizada", community: undefined });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.name).toBe("Sede atualizada");
    expect(body).not.toHaveProperty("community");
  });

  it("normalizes supply reading alerts returned by the API", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([{
      id: "reading-1", printer_supply_id: "supply-1", capacity_raw: 100,
      level_raw: 18, capacity_unit_raw: 19, level_percent: 18,
      alert_status: "WARNING", recorded_at: "2026-08-27T12:00:00Z",
    }]), { status: 200 }));

    const [reading] = await createPrintFleetRepository().getReadings("printer-1", "supply-1");

    expect(reading.alertStatus).toBe("warning");
  });
});
