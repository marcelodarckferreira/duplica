export type AuditAction = "create" | "update" | "delete" | "status_change";

export interface AuditLogEntry {
  id: number;
  action: AuditAction;
  requestId: string;
  requestCode: string;
  actorId: string;
  actorName: string;
  detail: string;
  createdAt: string;
}
