export type Origin = "ESCOLA" | "SEDE";

export interface Unit {
  id: string;
  name: string;
  origin: Origin;
  code: string;
  contact?: string;
  active: boolean;
}
