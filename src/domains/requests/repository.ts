import { apiFetch } from "../../lib/apiClient";
import { CopyRequest, RequestDraft, RequestStatus, StatusHistoryEntry } from "./types";

interface ApiStatusHistoryEntry {
  status: string;
  date: string;
  by: string;
}

interface ApiCopyRequest {
  id: string;
  code: string;
  origin: string;
  unit_id: string;
  unit_name: string;
  requester: string;
  contact: string;
  document_description: string;
  pages: number;
  copies: number;
  duplex: boolean;
  printed_faces: number;
  consumed_sheets: number;
  paper: string;
  color_mode: string;
  priority: string;
  desired_deadline: string;
  status: string;
  production_owner: string;
  requested_at: string;
  produced_at: string;
  delivered_at: string;
  picked_up_by: string;
  notes: string;
  history: ApiStatusHistoryEntry[];
}

function mapHistory(history: ApiStatusHistoryEntry[]): StatusHistoryEntry[] {
  return history.map((entry) => ({ status: entry.status as RequestStatus, date: entry.date, by: entry.by }));
}

function mapRequest(api: ApiCopyRequest): CopyRequest {
  return {
    id: api.id,
    code: api.code,
    origin: api.origin as CopyRequest["origin"],
    unitId: api.unit_id,
    unitName: api.unit_name,
    requester: api.requester,
    contact: api.contact,
    documentDescription: api.document_description,
    pages: api.pages,
    copies: api.copies,
    duplex: api.duplex,
    printedFaces: api.printed_faces,
    consumedSheets: api.consumed_sheets,
    paper: api.paper as CopyRequest["paper"],
    colorMode: api.color_mode as CopyRequest["colorMode"],
    priority: api.priority as CopyRequest["priority"],
    desiredDeadline: api.desired_deadline,
    status: api.status as RequestStatus,
    productionOwner: api.production_owner,
    requestedAt: api.requested_at,
    producedAt: api.produced_at,
    deliveredAt: api.delivered_at,
    pickedUpBy: api.picked_up_by,
    notes: api.notes,
    history: mapHistory(api.history),
  };
}

function mapDraftBody(draft: RequestDraft) {
  return {
    origin: draft.origin,
    unit_id: draft.unitId,
    requester: draft.requester,
    contact: draft.contact,
    document_description: draft.documentDescription,
    pages: draft.pages,
    copies: draft.copies,
    duplex: draft.duplex,
    paper: draft.paper,
    color_mode: draft.colorMode,
    priority: draft.priority,
    desired_deadline: draft.desiredDeadline,
    production_owner: draft.productionOwner,
    notes: draft.notes,
  };
}

export function createRequestsRepository() {
  return {
    async getRequests(): Promise<CopyRequest[]> {
      const result = await apiFetch<ApiCopyRequest[]>("/api/v1/requests");
      return result.map(mapRequest);
    },

    async createRequest(draft: RequestDraft): Promise<CopyRequest> {
      const result = await apiFetch<ApiCopyRequest>("/api/v1/requests", {
        method: "POST",
        body: JSON.stringify(mapDraftBody(draft)),
      });
      return mapRequest(result);
    },

    async updateRequest(
      id: string,
      patch: Partial<RequestDraft & Pick<CopyRequest, "pickedUpBy">>,
    ): Promise<CopyRequest | null> {
      const body: Record<string, unknown> = {};
      if (patch.origin !== undefined) body.origin = patch.origin;
      if (patch.unitId !== undefined) body.unit_id = patch.unitId;
      if (patch.requester !== undefined) body.requester = patch.requester;
      if (patch.contact !== undefined) body.contact = patch.contact;
      if (patch.documentDescription !== undefined) body.document_description = patch.documentDescription;
      if (patch.pages !== undefined) body.pages = patch.pages;
      if (patch.copies !== undefined) body.copies = patch.copies;
      if (patch.duplex !== undefined) body.duplex = patch.duplex;
      if (patch.paper !== undefined) body.paper = patch.paper;
      if (patch.colorMode !== undefined) body.color_mode = patch.colorMode;
      if (patch.priority !== undefined) body.priority = patch.priority;
      if (patch.desiredDeadline !== undefined) body.desired_deadline = patch.desiredDeadline;
      if (patch.productionOwner !== undefined) body.production_owner = patch.productionOwner;
      if (patch.notes !== undefined) body.notes = patch.notes;
      if (patch.pickedUpBy !== undefined) body.picked_up_by = patch.pickedUpBy;

      const result = await apiFetch<ApiCopyRequest>(`/api/v1/requests/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      return mapRequest(result);
    },

    async deleteRequest(id: string): Promise<boolean> {
      await apiFetch<void>(`/api/v1/requests/${id}`, { method: "DELETE" });
      return true;
    },

    async updateStatus(id: string, status: RequestStatus, pickedUpBy = ""): Promise<CopyRequest | null> {
      const result = await apiFetch<ApiCopyRequest>(`/api/v1/requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, picked_up_by: pickedUpBy || null }),
      });
      return mapRequest(result);
    },
  };
}
