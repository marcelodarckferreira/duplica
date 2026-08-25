import { Origin } from "../../units/model/types";
import { ColorMode, CopyRequest, Layout, Priority, RequestDraft, RequestStatus, Staple } from "./types";

export const statuses: RequestStatus[] = ["Recebido", "Em produção", "Pronto", "Entregue", "Cancelado"];
// Ordem real da linha de produção — usada pra impedir retroceder de fase ou
// repetir uma fase já registrada (ver isStatusSelectable). "Cancelado" fica
// de fora porque é um estado terminal à parte, não um passo da sequência.
const STATUS_ORDER: RequestStatus[] = ["Recebido", "Em produção", "Pronto", "Entregue"];
export const priorities: Priority[] = ["Normal", "Urgente", "Institucional"];
export const papers: CopyRequest["paper"][] = [
  "Half Letter (5.5 x 8.5 in)",
  "Executive (7.25 x 10.5 in)",
  "8 x 10 in",
  "Letter (8.5 x 11 in)",
  "8.5 x 13 in",
  "Legal (8.5 x 14 in)",
  "11 x 17 in",
  "12 x 18 in",
  "Super B (13 x 19 in)",
  "A6 (4.1 x 5.8 in; 105 x 148 mm)",
  "A5 (5.8 x 8.2 in; 148 x 210 mm)",
  "A4 (8.2 x 11.7 in; 210 x 297 mm)",
  "A3 (11.7 x 16.5 in; 297 x 420 mm)",
  "SRA3 (12.6 x 17.7 in; 320 x 450 mm)",
  "Oficio 9 (8.46 x 12.4 in)",
  "Mexico-Oficio (8.5 x 13.4 in)",
  "Monarch (3.875 x 7.5 in)",
  "Envelope #10 (4.125 x 9.5 in)",
  "17 x 22 in",
  "A2 (16.5 x 23.4 in; 420 x 594 mm)",
  "User-Defined",
];
export const colors: ColorMode[] = ["P&B", "Colorido"];
export const staples: Staple[] = ["Off", "Top Left 1", "Left 2", "Top Right 1", "Right 2", "Top 2"];
export const layouts: Layout[] = ["Retrato", "Paisagem"];

export const emptyDraft: RequestDraft = {
  origin: "ESCOLA",
  unitId: "emef-paulo-freire",
  personId: "",
  requester: "",
  registrationNumber: "",
  contact: "",
  documentDescription: "",
  pages: 1,
  copies: 1,
  duplex: false,
  staple: "Off",
  layout: "Retrato",
  paper: "A4 (8.2 x 11.7 in; 210 x 297 mm)",
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
    personId: "",
    requester: request.requester,
    registrationNumber: request.registrationNumber,
    contact: request.contact,
    documentDescription: request.documentDescription,
    pages: request.pages,
    copies: request.copies,
    duplex: request.duplex,
    staple: request.staple,
    layout: request.layout,
    paper: request.paper,
    colorMode: request.colorMode,
    priority: request.priority,
    desiredDeadline: request.desiredDeadline,
    productionOwner: request.productionOwner,
    notes: request.notes,
  };
}

// Espelha a validação do backend (ver update_status em backend/app/api/routes/requests.py):
// cada fase só pode acontecer uma vez, a ordem não pode retroceder, e uma vez
// cancelada a solicitação não recebe mais nenhuma fase.
export function isStatusSelectable(history: { status: RequestStatus }[], candidate: RequestStatus): boolean {
  const existing = new Set(history.map((entry) => entry.status));
  if (existing.has(candidate)) return false;
  if (existing.has("Cancelado")) return false;

  if (candidate === "Cancelado") return !existing.has("Entregue");

  const candidateIndex = STATUS_ORDER.indexOf(candidate);
  const recordedIndexes = STATUS_ORDER.filter((item) => existing.has(item)).map((item) => STATUS_ORDER.indexOf(item));
  if (recordedIndexes.length && candidateIndex <= Math.max(...recordedIndexes)) return false;
  return true;
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
    // Filtro pela data de emissão (requestedAt) — ambos opcionais, formato ISO "YYYY-MM-DD".
    dateFrom?: string;
    dateTo?: string;
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
    const matchesDateFrom = !filters.dateFrom || request.requestedAt >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || request.requestedAt <= filters.dateTo;
    return matchesQuery && matchesStatus && matchesOrigin && matchesUnit && matchesDateFrom && matchesDateTo;
  });
}

// Colunas da tabela de Solicitações pelas quais dá pra ordenar (clicando no
// título da coluna) — strings ISO como requestedAt/desiredDeadline ordenam
// corretamente com localeCompare, sem precisar parsear como Date.
export const requestSortKeys = ["code", "productionOwner", "unitName", "requester", "documentDescription", "status", "requestedAt", "desiredDeadline"] as const;
export type RequestSortKey = (typeof requestSortKeys)[number];
export type SortDirection = "asc" | "desc";

export function sortRequests(requests: CopyRequest[], key: RequestSortKey, direction: SortDirection): CopyRequest[] {
  const sorted = [...requests].sort((a, b) => a[key].localeCompare(b[key], "pt-BR"));
  return direction === "asc" ? sorted : sorted.reverse();
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

// 1 resma = 500 folhas — mesma conversão usada no dashboard (ver toReams em
// features/reports/model/rules.ts), duplicada aqui pra não inverter a
// dependência de domínio (requests não deve importar de reports).
const SHEETS_PER_REAM = 500;

export function formatReams(consumedSheets: number): string {
  const reams = Math.round((consumedSheets / SHEETS_PER_REAM) * 10) / 10;
  return reams.toLocaleString("pt-BR");
}

export function formatDate(value: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

const STATUS_VARIANTS: Record<RequestStatus, "recebido" | "em-producao" | "pronto" | "entregue" | "cancelado"> = {
  Recebido: "recebido",
  "Em produção": "em-producao",
  Pronto: "pronto",
  Entregue: "entregue",
  Cancelado: "cancelado",
};

export function statusVariant(status: RequestStatus): "recebido" | "em-producao" | "pronto" | "entregue" | "cancelado" {
  return STATUS_VARIANTS[status];
}
