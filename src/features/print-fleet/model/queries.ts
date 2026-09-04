import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createPrintFleetRepository } from "../api/repository";
import { ManualPrinterDraft, NetworkDraft } from "./types";

const repo = createPrintFleetRepository();
export const printFleetKeys = { all: ["print-fleet"] as const, networks: ["print-fleet", "networks"] as const, discoveries: ["print-fleet", "discoveries"] as const, printers: ["print-fleet", "printers"] as const, supplies: (id: string) => ["print-fleet", "printers", id, "supplies"] as const };

export function usePrintFleetQueries(enabled: boolean) {
  const client = useQueryClient();
  const networks = useQuery({ queryKey: printFleetKeys.networks, queryFn: () => repo.getNetworks(), enabled });
  const discoveries = useQuery({ queryKey: printFleetKeys.discoveries, queryFn: () => repo.getDiscoveries(), enabled, refetchInterval: (query) => query.state.data?.items.some((run) => run.status === "queued" || run.status === "running") ? 3000 : false });
  const printers = useQuery({ queryKey: printFleetKeys.printers, queryFn: () => repo.getPrinters(), enabled });
  useEffect(() => {
    if (discoveries.data?.items.some((run) => run.status === "completed" || run.status === "completed_with_errors")) {
      client.invalidateQueries({ queryKey: printFleetKeys.printers });
    }
  }, [client, discoveries.dataUpdatedAt]);
  return { networks, discoveries, printers };
}

function useInvalidateFleetMutation<T>(mutationFn: (value: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: printFleetKeys.all }) });
}

export const useCreateNetworkMutation = () => useInvalidateFleetMutation((draft: NetworkDraft) => repo.createNetwork(draft));
export const useUpdateNetworkMutation = () => useInvalidateFleetMutation(({ id, draft }: { id: string; draft: Partial<NetworkDraft> }) => repo.updateNetwork(id, draft));
export const useSetNetworkActiveMutation = () => useInvalidateFleetMutation(({ id, active }: { id: string; active: boolean }) => repo.setNetworkActive(id, active));
export const useStartDiscoveryMutation = () => useInvalidateFleetMutation((id: string) => repo.startDiscovery(id));
export const useCreatePrinterMutation = () => useInvalidateFleetMutation((draft: ManualPrinterDraft) => repo.createPrinter(draft));
export const useConfirmPrinterMutation = () => useInvalidateFleetMutation(({ id, displayName, unitId, manufacturer, model }: { id: string; displayName: string; unitId: string; manufacturer: string; model: string }) => repo.confirmPrinter(id, displayName, unitId, manufacturer, model));
export const useSetOnboardingMutation = () => useInvalidateFleetMutation(({ id, action }: { id: string; action: "ignore" | "reopen" }) => repo.setOnboarding(id, action));
export const useSetMonitoringMutation = () => useInvalidateFleetMutation(({ id, enabled }: { id: string; enabled: boolean }) => repo.setMonitoring(id, enabled));
export const usePollPrinterMutation = () => useInvalidateFleetMutation((id: string) => repo.pollPrinter(id));

export function usePrinterSuppliesQuery(printerId: string | null) {
  return useQuery({ queryKey: printFleetKeys.supplies(printerId ?? "none"), queryFn: () => repo.getSupplies(printerId!), enabled: Boolean(printerId) });
}
