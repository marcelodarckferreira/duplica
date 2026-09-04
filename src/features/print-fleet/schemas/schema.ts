import { z } from "zod";

const ipv4Cidr = z.string().trim().regex(/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, "Informe uma rede IPv4 em CIDR.");

export const networkDraftSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da rede."),
  cidr: ipv4Cidr,
  exclusionsText: z.string(),
  community: z.string().min(1, "Informe a comunidade SNMP."),
  timeoutMs: z.coerce.number().int().min(250).max(10_000),
  retries: z.coerce.number().int().min(0).max(3),
  concurrencyLimit: z.coerce.number().int().min(1).max(128),
});

export const manualPrinterSchema = z.object({
  discoveryNetworkId: z.string().min(1, "Selecione a rede."),
  managementAddress: z.string().trim().min(1, "Informe o endereço IP."),
  displayName: z.string().trim().min(1, "Informe o nome."),
  unitId: z.string().min(1, "Selecione o setor."),
  manufacturer: z.string(),
  model: z.string(),
});

export type NetworkDraftInput = z.infer<typeof networkDraftSchema>;
export type ManualPrinterInput = z.infer<typeof manualPrinterSchema>;
