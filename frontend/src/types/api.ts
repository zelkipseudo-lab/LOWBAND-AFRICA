export type NetworkProfileId = "fast" | "4g" | "3g" | "slow_3g";

export interface NetworkProfileInfo {
  id: NetworkProfileId;
  name: string;
  downloadSpeed: string;
  uploadSpeed: string;
  latency: string;
  description: string;
}

export interface AnalysisRequest {
  url: string;
  profile: NetworkProfileId;
}

export interface ResourceDistribution {
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
  resources: ResourceDistribution;
}

export type ScoreLabel =
  | "excellent"
  | "acceptable"
  | "needs_improvement"
  | "poor"
  | "incomplete";

export interface ScoreComponents {
  performance: number | null;
  dataEfficiency: number | null;
  resourceOptimization: number | null;
  resilience: number | null;
}

export interface AnalysisScore {
  value: number | null;
  label: ScoreLabel;
  components: ScoreComponents;
  availableWeight: number;
  methodologyVersion: string;
}

export interface Recommendation {
  code: string;
  message: string;
  evidence: Record<string, number>;
}

export interface AnalysisReport {
  analysisId: string;
  status: "completed" | "partial";
  url: string;
  profile: NetworkProfileId;
  startedAt: string;
  durationMs: number;
  metrics: EngineMetrics;
  score: AnalysisScore;
  recommendations: Recommendation[];
  warnings: string[];
}

export interface HistorySummaryItem {
  analysisId: string;
  status: "completed" | "partial";
  url: string;
  profile: NetworkProfileId;
  startedAt: string;
  durationMs: number;
  score: AnalysisScore | null;
}

export interface HistoryListResponse {
  items: HistorySummaryItem[];
  total: number;
  limit: number;
  offset: number;
}

export type ApiErrorCode =
  | "INVALID_JSON"
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "BLOCKED_TARGET"
  | "INVALID_PROFILE"
  | "ANALYSIS_TIMEOUT"
  | "NAVIGATION_FAILED"
  | "ANALYSIS_FAILED"
  | "RATE_LIMITED"
  | "ANALYSIS_BUSY"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "ENGINE_UNAVAILABLE"
  | "EGRESS_POLICY_UNVERIFIED"
  | "INTERNAL_ERROR"
  | "HISTORY_UNAVAILABLE"
  | "INVALID_HISTORY_QUERY"
  | "INVALID_ANALYSIS_ID"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId?: string;
  };
}

export interface HealthResponse {
  status: "ok";
}
