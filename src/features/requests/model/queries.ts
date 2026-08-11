import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRequestsRepository } from "../api/repository";
import { CopyRequest, RequestDraft, RequestStatus } from "./types";

const requestsRepo = createRequestsRepository();

export const requestsKeys = {
  all: ["requests"] as const,
};

export function useRequestsQuery() {
  return useQuery({
    queryKey: requestsKeys.all,
    queryFn: () => requestsRepo.getRequests(),
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
    mutationFn: ({ id, draft }: { id: string; draft: Partial<RequestDraft & Pick<CopyRequest, "pickedUpBy">> }) =>
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
    mutationFn: ({ id, status, pickedUpBy }: { id: string; status: RequestStatus; pickedUpBy?: string }) =>
      requestsRepo.updateStatus(id, status, pickedUpBy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestsKeys.all }),
  });
}
