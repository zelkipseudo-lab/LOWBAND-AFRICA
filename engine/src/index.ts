export { analyze, ENGINE_VERSION } from "./analyze.js";
export { EngineError, isEngineError } from "./errors.js";
export {
  NETWORK_PROFILE_IDS,
  getNetworkProfile,
  isNetworkProfileId,
  kbpsToBytesPerSecond,
  listNetworkProfiles,
} from "./profiles.js";
export {
  TargetGuard,
  TargetGuardError,
  createTargetGuard,
  isPublicIpAddress,
} from "./security/target-guard.js";
export type {
  AnalyzeOptions,
  AppliedNetworkEmulation,
  EngineErrorCode,
  EngineMetrics,
  EngineResult,
  NetworkProfile,
  NetworkProfileId,
  ResourceBreakdown,
  TargetGuardLike,
} from "./types.js";
