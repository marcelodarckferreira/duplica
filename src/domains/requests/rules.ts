import { Origin } from "../units/types";
import { ColorMode, CopyRequest, Priority, RequestDraft, RequestStatus } from "./types";

export const statuses: RequestStatus[] = ["Recebido", "Em produção", "Pronto", "Entregue", "Cancelado"];
export const priorities: Priority[] = ["Normal", "Urgente", "Institucional"];
export const papers: CopyRequest["paper"][] = ["A4", "A3", "Ofício"];
export const colors: ColorMode[] = ["P&B", "Colorido"];

export const emptyDraft: RequestDraft = {
  origin: "Escola",
  unitId: "emef-paulo-freire",
  requester: "",
  contact: "",
  documentDescription: "",
  pages: 1,
  copies: 1,
  duplex: false,
  paper: "A4",
  colorMode: "P&B",
  priority: "Normal",
  desiredDeadline: todayIso(),
  productionOwner: "",
  notes: "",
};

export function requestToDraft(request: CopyRequest): RequestDraft {
  return {
    origin: request.origin,
    unitId: request.unitId,
    requester: request.requester,
    contact: request.contact,
    documentDescription: request.documentDescription,
    pages: request.pages,
    copies: request.copies,
    duplex: request.duplex,
    paper: request.paper,
    colorMode: request.colorMode,
    priority: request.priority,
    desiredDeadline: request.desiredDeadline,
    productionOwner: request.productionOwner,
    notes: request.notes,
  };
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function calculatePrintTotals(input: {
  pages: number;
  copies: number;
  duplex: boolean;
}): { printedFaces: number; consumedSheets: number } {
  const pages = Math.max(0, Math.trunc(input.pages));
  const copies = Math.max(0, Math.trunc(input.copies));
  const printedFaces = pages * copies;
  const sheetsPerCopy = input.duplex ? Math.ceil(pages / 2) : pages;

  return {
    printedFaces,
    consumedSheets: sheetsPerCopy * copies,
  };
}

export function filterRequests(
  requests: CopyRequest[],
  filters: {
    query: string;
    status: RequestStatus | "Todos";
    origin: Origin | "Todas";
    unitId: string;
  },
): CopyRequest[] {
  const normalized = filters.query.trim().toLocaleLowerCase("pt-BR");
  return requests.filter((request) => {
    const matchesQuery = [
      request.code,
      request.unitName,
      request.requester,
      request.documentDescription,
      request.contact,
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(normalized);
    const matchesStatus = filters.status === "Todos" || request.status === filters.status;
    const matchesOrigin = filters.origin === "Todas" || request.origin === filters.origin;
    const matchesUnit = filters.unitId === "Todas" || request.unitId === filters.unitId;
    return matchesQuery && matchesStatus && matchesOrigin && matchesUnit;
  });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatDate(value: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function statusClass(status: RequestStatus): string {
  return `badge status-${status
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/\s+/g, "-")
    .toLowerCase()}`;
}
