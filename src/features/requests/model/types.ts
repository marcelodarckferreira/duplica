import { Origin } from "../../units/model/types";

export type ColorMode = "P&B" | "Colorido";
export type Priority = "Normal" | "Urgente" | "Institucional";
export type RequestStatus = "Recebido" | "Em produção" | "Pronto" | "Entregue" | "Cancelado";
export type PaperSize = "A4" | "A3" | "Ofício";

export interface StatusHistoryEntry {
  status: RequestStatus;
  date: string;
  by: string;
}

export interface CopyRequest {
  id: string;
  code: string;
  origin: Origin;
  unitId: string;
  unitName: string;
  requester: string;
  contact: string;
  documentDescription: string;
  pages: number;
  copies: number;
  duplex: boolean;
  printedFaces: number;
  consumedSheets: number;
  paper: PaperSize;
  colorMode: ColorMode;
  priority: Priority;
  desiredDeadline: string;
  status: RequestStatus;
  productionOwner: string;
  requestedAt: string;
  producedAt: string;
  deliveredAt: string;
  pickedUpBy: string;
  notes: string;
  history: StatusHistoryEntry[];
}

export interface RequestDraft {
  origin: Origin;
  unitId: string;
  requester: string;
  contact: string;
  documentDescription: string;
  pages: number;
  copies: number;
  duplex: boolean;
  paper: PaperSize;
  colorMode: ColorMode;
  priority: Priority;
  desiredDeadline: string;
  productionOwner: string;
  notes: string;
}
