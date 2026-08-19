import { apiFetch } from "../../../shared/api/apiClient";
import { Person } from "../model/types";

interface ApiPerson {
  id: string;
  name: string;
  registration_number: string;
  phone: string;
  unit_id: string;
  active: boolean;
}

function mapPerson(api: ApiPerson): Person {
  return {
    id: api.id,
    name: api.name,
    registrationNumber: api.registration_number,
    phone: api.phone,
    unitId: api.unit_id,
    active: api.active,
  };
}

export function createPeopleRepository() {
  return {
    async getPeople(): Promise<Person[]> {
      const result = await apiFetch<ApiPerson[]>("/api/v1/people");
      return result.map(mapPerson);
    },

    async savePerson(person: Omit<Person, "active"> & { active?: boolean }): Promise<Person> {
      const result = await apiFetch<ApiPerson>("/api/v1/people", {
        method: "POST",
        body: JSON.stringify({
          id: person.id || null,
          name: person.name,
          registration_number: person.registrationNumber,
          phone: person.phone,
          unit_id: person.unitId,
        }),
      });
      return mapPerson(result);
    },

    async togglePersonActive(id: string, active: boolean): Promise<Person> {
      const result = await apiFetch<ApiPerson>(`/api/v1/people/${id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      return mapPerson(result);
    },

    async deletePerson(id: string): Promise<void> {
      await apiFetch<void>(`/api/v1/people/${id}`, { method: "DELETE" });
    },
  };
}
