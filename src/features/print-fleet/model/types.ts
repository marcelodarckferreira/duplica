export type OnboardingStatus = "pending" | "confirmed" | "ignored" | "conflict";
export type OperationalStatus = "unknown" | "online" | "warning" | "offline";
export type DiscoveryRunStatus = "queued" | "running" | "completed" | "completed_with_errors" | "failed";
export type SupplyAlert = "ok" | "warning" | "critical" | "unknown";

export interface DiscoveryNetwork {
  id: string;
  name: string;
  cidr: string;
  excludedCidrs: string[];
  snmpVersion: string;
  timeoutMs: number;
  retries: number;
  concurrencyLimit: number;
  active: boolean;
  credentialConfigured: boolean;
  targetCount: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkDraft {
  name: string;
  cidr: string;
  excludedCidrs: string[];
  community: string;
  timeoutMs: number;
  retries: number;
  concurrencyLimit: number;
}

export interface DiscoveryRun {
  id: string;
  networkId: string;
  status: DiscoveryRunStatus;
  totalTargets: number;
  scannedTargets: number;
  responsiveDevices: number;
  printersFound: number;
  newPrinters: number;
  errorCount: number;
  requestedByUserId: string;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  heartbeatAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface Printer {
  id: string;
  discoveryNetworkId: string;
  managementAddress: string;
  macAddress: string | null;
  serialNumber: string | null;
  sysObjectId: string | null;
  sysName: string | null;
  sysDescription: string | null;
  manufacturer: string | null;
  model: string | null;
  displayName: string | null;
  unitId: string | null;
  onboardingStatus: OnboardingStatus;
  monitoringEnabled: boolean;
  operationalStatus: OperationalStatus;
  normalizedErrors: string[];
  consecutivePollFailures: number;
  firstSeenAt: string;
  lastSeenAt: string | null;
  lastPolledAt: string | null;
  updatedAt: string;
}

export interface ManualPrinterDraft {
  discoveryNetworkId: string;
  managementAddress: string;
  displayName: string;
  unitId: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  macAddress?: string;
}

export interface PrinterSupply {
  id: string;
  printerId: string;
  snmpIndex: string;
  descriptionRaw: string;
  normalizedType: string;
  color: string;
  capacityRaw: number;
  levelRaw: number;
  capacityUnitRaw: number | null;
  levelPercent: number | null;
  alertStatus: SupplyAlert;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
  lastSeenAt: string;
}

export interface SupplyReading {
  id: number;
  printerSupplyId: string;
  capacityRaw: number;
  levelRaw: number;
  capacityUnitRaw: number | null;
  levelPercent: number | null;
  alertStatus: SupplyAlert;
  recordedAt: string;
}

export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
