import { apiFetch } from "../../lib/apiClient";
import { Unit } from "./types";

export function createUnitsRepository() {
  return {
    async getUnits(): Promise<Unit[]> {
      return apiFetch<Unit[]>("/api/v1/units");
    },

    async saveUnit(unit: Unit): Promise<Unit> {
      return apiFetch<Unit>("/api/v1/units", {
        method: "POST",
        body: JSON.stringify({
          id: unit.id,
          name: unit.name,
          code: unit.code,
          origin: unit.origin,
          contact: unit.contact ?? null,
        }),
      });
    },
  };
}
