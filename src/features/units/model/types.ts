export type Origin = "Escola" | "Setor SEMED";

export interface Unit {
  id: string;
  name: string;
  origin: Origin;
  code: string;
  contact?: string;
  active: boolean;
}
