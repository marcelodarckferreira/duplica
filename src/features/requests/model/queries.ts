import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRequestsRepository } from "../api/repository";
import { CopyRequest, RequestDraft, RequestStatus } from "./types";

const requestsRepo = createRequestsRepository();

export const requestsKeys = {
  all: ["requests"] as const,
};

export function useRequestsQuery(enabled: boolean) {
  return useQuery({
    queryKey: requestsKeys.all,
    queryFn: () => requestsRepo.getRequests(),
    enabled,
  });
}

export function useCreateRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: RequestDraft) => requestsRepo.createRequest(draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestsKeys.all }),
  });
}

export function useUpdateRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: Partial<RequestDraft & Pick<CopyRequest, "pickedUpBy" | "signature">> }) =>
      requestsRepo.updateRequest(id, draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestsKeys.all }),
  });
}

export function useDeleteRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requestsRepo.deleteRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestsKeys.all }),
  });
}

export function useUpdateRequestStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, pickedUpBy, signature }: { id: string; status: RequestStatus; pickedUpBy?: string; signature?: string }) =>
      requestsRepo.updateStatus(id, status, pickedUpBy, signature),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestsKeys.all }),
  });
}

export function useDeleteHistoryEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, entryId }: { requestId: string; entryId: number }) =>
      requestsRepo.deleteHistoryEntry(requestId, entryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestsKeys.all }),
  });
}
