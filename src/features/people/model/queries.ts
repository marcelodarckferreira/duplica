import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPeopleRepository } from "../api/repository";
import { Person } from "./types";

const peopleRepo = createPeopleRepository();

export const peopleKeys = {
  all: ["people"] as const,
};

export function usePeopleQuery(enabled: boolean) {
  return useQuery({
    queryKey: peopleKeys.all,
    queryFn: () => peopleRepo.getPeople(),
    enabled,
  });
}

export function useSavePersonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (person: Omit<Person, "active"> & { active?: boolean }) => peopleRepo.savePerson(person),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
  });
}

export function useTogglePersonActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => peopleRepo.togglePersonActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
  });
}

export function useDeletePersonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => peopleRepo.deletePerson(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
  });
}
