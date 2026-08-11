export type Origin = "Escola" | "Sede SEMED";

export interface Unit {
  id: string;
  name: string;
  origin: Origin;
  code: string;
  contact?: string;
  active: boolean;
}
