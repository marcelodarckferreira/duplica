import { apiFetch } from "../../lib/apiClient";
import { AuditLogEntry } from "./types";

interface ApiAuditLogEntry {
  id: number;
  action: string;
  request_id: string;
  request_code: string;
  actor_id: string;
  actor_name: string;
  detail: string;
  created_at: string;
}

function mapEntry(api: ApiAuditLogEntry): AuditLogEntry {
  return {
    id: api.id,
    action: api.action as AuditLogEntry["action"],
    requestId: api.request_id,
    requestCode: api.request_code,
    actorId: api.actor_id,
    actorName: api.actor_name,
    detail: api.detail,
    createdAt: api.created_at,
  };
}

export function createAuditRepository() {
  return {
    async getEntries(): Promise<AuditLogEntry[]> {
      const result = await apiFetch<ApiAuditLogEntry[]>("/api/v1/audit-log");
      return result.map(mapEntry);
    },

    async clear(): Promise<void> {
      await apiFetch<void>("/api/v1/audit-log", { method: "DELETE" });
    },
  };
}
