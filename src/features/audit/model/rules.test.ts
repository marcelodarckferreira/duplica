import { describe, expect, it } from "vitest";
import { filterAuditEntries, formatDateTime, sortAuditEntries } from "./rules";
import { AuditLogEntry } from "./types";

const baseEntry: AuditLogEntry = {
  id: 1,
  action: "create",
  requestId: "req-1",
  requestCode: "CP-2026-0001",
  actorId: "u1",
  actorName: "Ana Souza",
  detail: "Solicitação criada por Ana Souza.",
  createdAt: "2026-08-10T10:00:00Z",
};

describe("audit domain rules", () => {
  it("filters entries by query, action and date range", () => {
    const entries = [
      baseEntry,
      { ...baseEntry, id: 2, action: "status_change" as const, requestCode: "CP-2026-0002", detail: "Status alterado para Pronto.", createdAt: "2026-08-15T10:00:00Z" },
      { ...baseEntry, id: 3, action: "delete" as const, requestCode: "CP-2026-0003", actorName: "Carlos", detail: "Solicitação excluída.", createdAt: "2026-08-20T10:00:00Z" },
    ];

    expect(filterAuditEntries(entries, { query: "carlos", action: "Todas" })).toHaveLength(1);
    expect(filterAuditEntries(entries, { query: "", action: "status_change" })).toHaveLength(1);
    expect(filterAuditEntries(entries, { query: "", action: "Todas", dateFrom: "2026-08-16" })).toHaveLength(1);
    expect(filterAuditEntries(entries, { query: "", action: "Todas", dateTo: "2026-08-14" })).toHaveLength(1);
    expect(filterAuditEntries(entries, { query: "", action: "Todas" })).toHaveLength(3);
  });

  it("sorts entries by column, ascending or descending", () => {
    const entries = [
      { ...baseEntry, id: 1, requestCode: "CP-2026-0003", createdAt: "2026-08-20T10:00:00Z" },
      { ...baseEntry, id: 2, requestCode: "CP-2026-0001", createdAt: "2026-08-10T10:00:00Z" },
      { ...baseEntry, id: 3, requestCode: "CP-2026-0002", createdAt: "2026-08-15T10:00:00Z" },
    ];

    expect(sortAuditEntries(entries, "createdAt", "asc").map((e) => e.id)).toEqual([2, 3, 1]);
    expect(sortAuditEntries(entries, "createdAt", "desc").map((e) => e.id)).toEqual([1, 3, 2]);
    expect(sortAuditEntries(entries, "requestCode", "asc").map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it("formats a datetime in pt-BR", () => {
    expect(formatDateTime("2026-08-15T10:00:00Z")).toContain("2026");
  });
});
