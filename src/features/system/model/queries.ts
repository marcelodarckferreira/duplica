import { useQuery } from "@tanstack/react-query";
import { createSystemRepository } from "../api/repository";

const systemRepository = createSystemRepository();

export const systemVersionKey = ["system", "version"] as const;

export function useSystemVersionQuery(enabled: boolean) {
  return useQuery({
    queryKey: systemVersionKey,
    queryFn: () => systemRepository.getVersion(),
    enabled,
    retry: false,
  });
}
