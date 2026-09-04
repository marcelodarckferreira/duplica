import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrintFleetView } from "./PrintFleetView";

const network = { id: "net-1", name: "Rede da sede", cidr: "172.15.0.0/16", excluded_cidrs: [], snmp_version: "2c", timeout_ms: 1000, retries: 0, concurrency_limit: 64, active: true, credential_configured: true, target_count: 65534, is_private: false, created_at: "2026-08-27T12:00:00Z", updated_at: "2026-08-27T12:00:00Z" };
const printer = { id: "printer-1", discovery_network_id: "net-1", management_address: "172.15.4.10", mac_address: null, serial_number: "ABC123", sys_object_id: "1.3.6", sys_name: "HP-PED", sys_description: "HP LaserJet", manufacturer: "HP", model: "LaserJet M404", display_name: "Impressora Pedagógico", unit_id: "setor-pedagogico", onboarding_status: "confirmed", monitoring_enabled: true, operational_status: "online", normalized_errors: [], consecutive_poll_failures: 0, first_seen_at: "2026-08-27T12:00:00Z", last_seen_at: "2026-08-27T12:00:00Z", last_polled_at: "2026-08-27T12:00:00Z", updated_at: "2026-08-27T12:00:00Z" };
const supply = { id: "supply-1", printer_id: "printer-1", snmp_index: "1", description_raw: "Black Cartridge", normalized_type: "toner", color: "black", capacity_raw: 100, level_raw: 18, capacity_unit_raw: 19, level_percent: 18, alert_status: "warning", warning_threshold_percent: 20, critical_threshold_percent: 10, last_seen_at: "2026-08-27T12:00:00Z" };

function renderView() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path.includes("/networks")) return new Response(JSON.stringify([network]), { status: 200 });
    if (path.includes("/discoveries")) return new Response(JSON.stringify({ items: [], total: 0, page: 1, page_size: 25 }), { status: 200 });
    if (path.includes("/printers/printer-1/supplies")) return new Response(JSON.stringify([supply]), { status: 200 });
    if (path.includes("/printers")) return new Response(JSON.stringify({ items: [printer], total: 1, page: 1, page_size: 100 }), { status: 200 });
    return new Response(JSON.stringify({ detail: "not mapped" }), { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PrintFleetView units={[{ id: "setor-pedagogico", code: "SED-PED", name: "Sede - Pedagógico", origin: "SEDE", active: true }]} canManage /></QueryClientProvider>);
}

afterEach(() => vi.unstubAllGlobals());

describe("PrintFleetView", () => {
  it("shows fleet tabs and textual printer status", async () => {
    renderView();
    expect(screen.getByRole("tab", { name: "Impressoras" })).toBeTruthy();
    expect(await screen.findByText("Impressora Pedagógico")).toBeTruthy();
    expect(screen.getByText("Online")).toBeTruthy();
  });

  it("expands a printer and describes its supply level in text", async () => {
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: /Ver detalhes de Impressora Pedagógico/ }));
    expect(await screen.findByText("Toner preto")).toBeTruthy();
    expect(screen.getByText("18% — Atenção")).toBeTruthy();
  });

  it("keeps the large-network warning in the discovery flow", async () => {
    renderView();
    await userEvent.click(screen.getByRole("tab", { name: "Descoberta" }));
    await userEvent.click(await screen.findByRole("button", { name: /Iniciar descoberta em Rede da sede/ }));
    await waitFor(() => expect(screen.getByText(/65\.534 endereços/)).toBeTruthy());
  });
});
