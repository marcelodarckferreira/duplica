import { Origin } from "../../units/model/types";

export type ColorMode = "P&B" | "Colorido";
export type Priority = "Normal" | "Urgente" | "Institucional";
export type RequestStatus = "Recebido" | "Em produção" | "Pronto" | "Entregue" | "Cancelado";
export type PaperSize =
  | "Half Letter (5.5 x 8.5 in)"
  | "Executive (7.25 x 10.5 in)"
  | "8 x 10 in"
  | "Letter (8.5 x 11 in)"
  | "8.5 x 13 in"
  | "Legal (8.5 x 14 in)"
  | "11 x 17 in"
  | "12 x 18 in"
  | "Super B (13 x 19 in)"
  | "A6 (4.1 x 5.8 in; 105 x 148 mm)"
  | "A5 (5.8 x 8.2 in; 148 x 210 mm)"
  | "A4 (8.2 x 11.7 in; 210 x 297 mm)"
  | "A3 (11.7 x 16.5 in; 297 x 420 mm)"
  | "SRA3 (12.6 x 17.7 in; 320 x 450 mm)"
  | "Oficio 9 (8.46 x 12.4 in)"
  | "Mexico-Oficio (8.5 x 13.4 in)"
  | "Monarch (3.875 x 7.5 in)"
  | "Envelope #10 (4.125 x 9.5 in)"
  | "17 x 22 in"
  | "A2 (16.5 x 23.4 in; 420 x 594 mm)"
  | "User-Defined";
export type Staple = "Off" | "Top Left 1" | "Left 2" | "Top Right 1" | "Right 2" | "Top 2";
export type Layout = "Retrato" | "Paisagem";

export interface StatusHistoryEntry {
  id: number;
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
  registrationNumber: string;
  contact: string;
  documentDescription: string;
  pages: number;
  copies: number;
  duplex: boolean;
  staple: Staple;
  layout: Layout;
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
  signature: string;
  notes: string;
  history: StatusHistoryEntry[];
}

export interface RequestDraft {
  origin: Origin;
  unitId: string;
  personId: string;
  requester: string;
  registrationNumber: string;
  contact: string;
  documentDescription: string;
  pages: number;
  copies: number;
  duplex: boolean;
  staple: Staple;
  layout: Layout;
  paper: PaperSize;
  colorMode: ColorMode;
  priority: Priority;
  desiredDeadline: string;
  productionOwner: string;
  notes: string;
}
