import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUnitsRepository } from "../api/repository";
import { Unit } from "./types";

const unitsRepo = createUnitsRepository();

export const unitsKeys = {
  all: ["units"] as const,
};

export function useUnitsQuery() {
  return useQuery({
    queryKey: unitsKeys.all,
    queryFn: () => unitsRepo.getUnits(),
  });
}

export function useSaveUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unit: Unit) => unitsRepo.saveUnit(unit),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitsKeys.all }),
  });
}
