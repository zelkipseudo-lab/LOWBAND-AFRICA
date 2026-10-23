export type NetworkProfileId = "fast" | "4g" | "3g" | "slow_3g";

export interface NetworkProfile {
  id: NetworkProfileId;
  label: string;
  downloadKbps: number;
  uploadKbps: number;
  latencyMs: number;
  packetLossPercent: null;
}

export interface ResourceBreakdown {
  javascriptBytes: number | null;
  cssBytes: number | null;
  imageBytes: number | null;
  fontBytes: number | null;
  otherBytes: number | null;
}

export interface EngineMetrics {
  navigationMs: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  requestCount: number;
  transferBytes: number | null;
  failedRequests: number;
  resources: ResourceBreakdown;
}

export interface AppliedNetworkEmulation {
  profile: NetworkProfileId;
  downloadKbps: number;
  uploadKbps: number;
  latencyMs: number;
  packetLossPercent: null;
  applied: true;
  method: "cdp_network_emulateNetworkConditions";
}

export interface EngineResult {
  engineVersion: string;
  requestedUrl: string;
  finalUrl: string | null;
  profile: NetworkProfileId;
  startedAt: string;
  durationMs: number;
  metrics: EngineMetrics;
  networkEmulation: AppliedNetworkEmulation;
  warnings: string[];
}

export type EngineErrorCode =
  | "INVALID_TARGET"
  | "INVALID_PROFILE"
  | "BLOCKED_TARGET"
  | "ANALYSIS_TIMEOUT"
  | "NAVIGATION_FAILED"
  | "ENGINE_UNAVAILABLE"
  | "ANALYSIS_CANCELLED"
  | "ANALYSIS_FAILED";

export interface TargetGuardLike {
  assertUrlAllowed(url: string): Promise<unknown>;
}

export interface AnalyzeOptions {
  profile: NetworkProfileId | string;
  targetGuard?: TargetGuardLike;
  totalTimeoutMs?: number;
  navigationTimeoutMs?: number;
  settleTimeMs?: number;
  headless?: boolean;
  noSandbox?: boolean;
  disableCache?: boolean;
  executablePath?: string;
  signal?: AbortSignal;
}

export interface CollectResult {
  metrics: EngineMetrics;
  warnings: string[];
  finalUrl: string | null;
  navigationTimedOut: boolean;
  blockedRequests: number;
  blockedMainFrame: boolean;
}
