import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUnitsRepository } from "../api/repository";
import { Unit } from "./types";

const unitsRepo = createUnitsRepository();

export const unitsKeys = {
  all: ["units"] as const,
};

export function useUnitsQuery(enabled: boolean) {
  return useQuery({
    queryKey: unitsKeys.all,
    queryFn: () => unitsRepo.getUnits(),
    enabled,
  });
}

export function useSaveUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unit: Omit<Unit, "code">) => unitsRepo.saveUnit(unit),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitsKeys.all }),
  });
}

export function useToggleUnitActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => unitsRepo.toggleUnitActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitsKeys.all }),
  });
}

export function useDeleteUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unitsRepo.deleteUnit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitsKeys.all }),
  });
}
