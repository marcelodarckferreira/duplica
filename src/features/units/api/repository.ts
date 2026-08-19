import { apiFetch } from "../../../shared/api/apiClient";
import { Unit } from "../model/types";

export function createUnitsRepository() {
  return {
    async getUnits(): Promise<Unit[]> {
      return apiFetch<Unit[]>("/api/v1/units");
    },

    // "code" não entra: é gerado no servidor na criação e nunca mais muda.
    async saveUnit(unit: Omit<Unit, "code">): Promise<Unit> {
      return apiFetch<Unit>("/api/v1/units", {
        method: "POST",
        body: JSON.stringify({
          id: unit.id,
          name: unit.name,
          origin: unit.origin,
          contact: unit.contact ?? null,
        }),
      });
    },

    async toggleUnitActive(id: string, active: boolean): Promise<Unit> {
      return apiFetch<Unit>(`/api/v1/units/${id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
    },

    async deleteUnit(id: string): Promise<void> {
      await apiFetch<void>(`/api/v1/units/${id}`, { method: "DELETE" });
    },
  };
}
