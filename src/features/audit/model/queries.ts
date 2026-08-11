import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAuditRepository } from "../api/repository";

const auditRepo = createAuditRepository();

export const auditKeys = {
  all: ["audit"] as const,
};

export function useAuditQuery(enabled: boolean) {
  return useQuery({
    queryKey: auditKeys.all,
    queryFn: () => auditRepo.getEntries(),
    enabled,
  });
}

export function useClearAuditMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => auditRepo.clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: auditKeys.all }),
  });
}
