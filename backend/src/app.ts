import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import {
  analyze,
  createTargetGuard,
  EngineError,
  isNetworkProfileId,
  TargetGuardError,
  type EngineResult,
  type NetworkProfileId,
} from "@lowband/analysis-engine";
import { buildRecommendations, calculateScore } from "./scoring.js";
import { isValidAnalysisId, JsonFileAnalysisHistoryStore, sanitizeHistoryUrl, type AnalysisHistoryRecord, type AnalysisHistoryStore } from "./history.js";

type PublicErrorCode = "INVALID_JSON" | "INVALID_URL" | "UNSUPPORTED_PROTOCOL" | "BLOCKED_TARGET" | "INVALID_PROFILE" | "INVALID_HISTORY_QUERY" | "INVALID_ANALYSIS_ID" | "ANALYSIS_TIMEOUT" | "NAVIGATION_FAILED" | "ANALYSIS_FAILED" | "RATE_LIMITED" | "ANALYSIS_BUSY" | "ENGINE_UNAVAILABLE" | "EGRESS_POLICY_UNVERIFIED" | "HISTORY_UNAVAILABLE" | "INTERNAL_ERROR" | "NOT_FOUND" | "METHOD_NOT_ALLOWED";
type Analyzer = (url: string, options: Parameters<typeof analyze>[1]) => Promise<EngineResult>;

interface AppOptions {
  analyzer?: Analyzer;
  egressIsolationVerified?: boolean;
  now?: () => number;
  guard?: ReturnType<typeof createTargetGuard>;
  historyStore?: AnalysisHistoryStore;
}

const errorMessages: Record<PublicErrorCode, string> = {
  INVALID_JSON: "Le corps JSON est invalide.", INVALID_URL: "L’URL fournie est invalide.",
  INVALID_HISTORY_QUERY: "Les paramètres de pagination sont invalides.", INVALID_ANALYSIS_ID: "L’identifiant d’analyse est invalide.",
  UNSUPPORTED_PROTOCOL: "Seuls les protocoles HTTP et HTTPS sont acceptés.",
  BLOCKED_TARGET: "Cette cible ne peut pas être analysée.", INVALID_PROFILE: "Le profil réseau demandé n’est pas pris en charge.",
  ANALYSIS_TIMEOUT: "L’analyse a dépassé sa durée maximale.", NAVIGATION_FAILED: "La navigation vers le site a échoué.",
  ANALYSIS_FAILED: "L’analyse a échoué.", RATE_LIMITED: "Trop de demandes. Réessayez plus tard.",
  ANALYSIS_BUSY: "Une analyse est déjà en cours. Réessayez dans quelques instants.",
  ENGINE_UNAVAILABLE: "Le service d’analyse est indisponible.", INTERNAL_ERROR: "Une erreur interne est survenue.",
  EGRESS_POLICY_UNVERIFIED: "Le service d’analyse n’est pas configuré pour traiter les demandes en toute sécurité.",
  HISTORY_UNAVAILABLE: "L’historique est temporairement indisponible.",
  NOT_FOUND: "Cette ressource API n’existe pas.", METHOD_NOT_ALLOWED: "Cette méthode n’est pas autorisée pour cette ressource.",
};

function sendError(res: Response, requestId: string, status: number, code: PublicErrorCode): void {
  res.status(status).json({ error: { code, message: errorMessages[code], requestId } });
}

function mapEngineError(error: unknown): { status: number; code: PublicErrorCode } {
  if (error instanceof TargetGuardError) {
    if (error.reason === "BLOCKED_TARGET") return { status: 403, code: "BLOCKED_TARGET" };
    if (error.reason === "DNS_RESOLUTION_FAILED") return { status: 502, code: "NAVIGATION_FAILED" };
    if (error.reason === "UNSUPPORTED_PROTOCOL") return { status: 400, code: "UNSUPPORTED_PROTOCOL" };
    return { status: 400, code: "INVALID_URL" };
  }
  if (error instanceof EngineError) {
    switch (error.code) {
      case "INVALID_PROFILE": return { status: 400, code: "INVALID_PROFILE" };
      case "BLOCKED_TARGET": return { status: 403, code: "BLOCKED_TARGET" };
      case "ANALYSIS_TIMEOUT": return { status: 408, code: "ANALYSIS_TIMEOUT" };
      case "NAVIGATION_FAILED": return { status: 502, code: "NAVIGATION_FAILED" };
      case "ENGINE_UNAVAILABLE": return { status: 502, code: "ENGINE_UNAVAILABLE" };
      case "ANALYSIS_CANCELLED": return { status: 500, code: "INTERNAL_ERROR" };
      default: return { status: 500, code: "INTERNAL_ERROR" };
    }
  }
  return { status: 500, code: "INTERNAL_ERROR" };
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const analyzeTarget = options.analyzer ?? analyze;
  const guard = options.guard ?? createTargetGuard();
  const egressIsolationVerified = options.egressIsolationVerified ?? process.env.LOWBAND_EGRESS_ISOLATION === "verified";
  const now = options.now ?? Date.now;
  const historyStore = options.historyStore ?? new JsonFileAnalysisHistoryStore();
  const rateWindows = new Map<string, { start: number; count: number }>();
  let active = 0;

  app.disable("x-powered-by");
  const trustedProxies = (process.env.LOWBAND_TRUST_PROXY ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (trustedProxies.length) app.set("trust proxy", trustedProxies);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.vary("Origin");
    // CORS is opt-in for a separately hosted frontend and is restricted to an explicit origin.
    const allowedOrigin = process.env.LOWBAND_FRONTEND_ORIGIN;
    if (allowedOrigin && req.get("origin") === allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: "8kb", strict: true, type: "application/json" }));

  app.get("/api/v1/health", (_req, res) => res.status(200).json({ status: "ok" }));

  app.get("/api/v1/history", async (req, res) => {
    const rawLimit = req.query.limit;
    const rawOffset = req.query.offset;
    if ((rawLimit !== undefined && (typeof rawLimit !== "string" || !/^\d+$/.test(rawLimit))) ||
        (rawOffset !== undefined && (typeof rawOffset !== "string" || !/^\d+$/.test(rawOffset)))) {
      return sendError(res, randomUUID(), 400, "INVALID_HISTORY_QUERY");
    }
    const limit = rawLimit === undefined ? 20 : Number(rawLimit);
    const offset = rawOffset === undefined ? 0 : Number(rawOffset);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0) {
      return sendError(res, randomUUID(), 400, "INVALID_HISTORY_QUERY");
    }
    try {
      const page = await historyStore.list(limit, offset);
      return res.status(200).json({ items: page.items.map(toHistorySummary), total: page.total, limit, offset });
    } catch {
      console.error(JSON.stringify({ event: "history_read_failed" }));
      return sendError(res, randomUUID(), 503, "HISTORY_UNAVAILABLE");
    }
  });

  app.get("/api/v1/history/:analysisId", async (req, res) => {
    if (!isValidAnalysisId(req.params.analysisId ?? "")) return sendError(res, randomUUID(), 400, "INVALID_ANALYSIS_ID");
    try {
      const record = await historyStore.get(req.params.analysisId!);
      if (!record) return sendError(res, randomUUID(), 404, "NOT_FOUND");
      return res.status(200).json(record);
    } catch {
      console.error(JSON.stringify({ event: "history_read_failed" }));
      return sendError(res, randomUUID(), 503, "HISTORY_UNAVAILABLE");
    }
  });

  app.delete("/api/v1/history/:analysisId", async (req, res) => {
    if (!isValidAnalysisId(req.params.analysisId ?? "")) return sendError(res, randomUUID(), 400, "INVALID_ANALYSIS_ID");
    try {
      const deleted = await historyStore.delete(req.params.analysisId!);
      if (!deleted) return sendError(res, randomUUID(), 404, "NOT_FOUND");
      return res.status(204).end();
    } catch {
      console.error(JSON.stringify({ event: "history_delete_failed" }));
      return sendError(res, randomUUID(), 503, "HISTORY_UNAVAILABLE");
    }
  });

  app.post("/api/v1/analyze", async (req: Request, res: Response) => {
    const requestId = randomUUID();
    if (!req.is("application/json")) return sendError(res, requestId, 400, "INVALID_JSON");
    const body = req.body as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return sendError(res, requestId, 400, "INVALID_JSON");
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => key !== "url" && key !== "profile") || typeof record.url !== "string") return sendError(res, requestId, 400, "INVALID_URL");
    if (typeof record.profile !== "string") return sendError(res, requestId, 400, "INVALID_PROFILE");
    if (!isNetworkProfileId(record.profile)) return sendError(res, requestId, 400, "INVALID_PROFILE");
    if (record.url.length > 2048 || record.url.trim() !== record.url) return sendError(res, requestId, 400, "INVALID_URL");
    let parsed: URL;
    try { parsed = new URL(record.url); } catch { return sendError(res, requestId, 400, "INVALID_URL"); }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return sendError(res, requestId, 400, "UNSUPPORTED_PROTOCOL");
    if (parsed.username || parsed.password || !parsed.hostname) return sendError(res, requestId, 400, "INVALID_URL");
    if (parsed.port && parsed.port !== "80" && parsed.port !== "443") return sendError(res, requestId, 400, "INVALID_URL");

    const peer = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const timestamp = now();
    const window = rateWindows.get(peer);
    if (window && timestamp - window.start < 10 * 60_000 && window.count >= 10) return sendError(res, requestId, 429, "RATE_LIMITED");
    if (active >= 1) return sendError(res, requestId, 503, "ANALYSIS_BUSY");

    active += 1;
    try {
      await guard.assertUrlAllowed(record.url);
    } catch (error) {
      const mapped = mapEngineError(error);
      active -= 1;
      return sendError(res, requestId, mapped.status, mapped.code);
    }
    if (!egressIsolationVerified) {
      active -= 1;
      return sendError(res, requestId, 503, "EGRESS_POLICY_UNVERIFIED");
    }

    // Count only analyses that pass validation, the SSRF guard and the local safety gate.
    if (!window || timestamp - window.start >= 10 * 60_000) rateWindows.set(peer, { start: timestamp, count: 1 });
    else window.count += 1;
    if (rateWindows.size > 10_000) {
      for (const [key, entry] of rateWindows) {
        if (timestamp - entry.start >= 10 * 60_000) rateWindows.delete(key);
      }
      while (rateWindows.size > 10_000) rateWindows.delete(rateWindows.keys().next().value!);
    }

    const startedAt = new Date(now()).toISOString();
    const abortController = new AbortController();
    res.once("close", () => {
      if (!res.writableEnded) abortController.abort();
    });
    try {
      const result = await analyzeTarget(record.url, {
        profile: record.profile as NetworkProfileId,
        targetGuard: guard,
        totalTimeoutMs: 40_000,
        navigationTimeoutMs: 30_000,
        headless: true,
        disableCache: true,
        signal: abortController.signal,
      });
      if (res.destroyed) return;
      const report = {
        analysisId: randomUUID(),
        status: result.warnings.some((warning) => warning.includes("les mesures sont partielles")) ? "partial" as const : "completed" as const,
        url: result.requestedUrl,
        profile: result.profile, startedAt: result.startedAt || startedAt, durationMs: result.durationMs,
        metrics: result.metrics, score: roundScore(calculateScore(result.metrics)),
        recommendations: buildRecommendations(result.metrics).map((recommendation) => ({
          ...recommendation,
          evidence: Object.fromEntries(Object.entries(recommendation.evidence).map(([key, value]) => [key, round2(value)])),
        })),
        warnings: [...result.warnings, ...(result.metrics.fcpMs !== null && result.metrics.navigationMs !== null && result.metrics.fcpMs > result.metrics.navigationMs
          ? ["FCP observé après la durée de navigation (load) ; les horloges de peinture headless peuvent diverger."]
          : [])],
      };
      try {
        await historyStore.save({ ...report, url: sanitizeHistoryUrl(report.url) });
      } catch {
        console.error(JSON.stringify({ event: "history_write_failed", requestId }));
        return sendError(res, requestId, 503, "HISTORY_UNAVAILABLE");
      }
      return res.status(200).json(report);
    } catch (error) {
      const mapped = mapEngineError(error);
      if (mapped.status >= 500) console.error(JSON.stringify({ event: "analysis_failed", requestId, code: mapped.code }));
      if (!res.destroyed) return sendError(res, requestId, mapped.status, mapped.code);
    } finally {
      active -= 1;
    }
  });

  app.all("/api/v1/analyze", (_req, res) => {
    const requestId = randomUUID();
    return sendError(res, requestId, 405, "METHOD_NOT_ALLOWED");
  });
  app.all("/api/v1/health", (_req, res) => {
    const requestId = randomUUID();
    return sendError(res, requestId, 405, "METHOD_NOT_ALLOWED");
  });
  app.all("/api/v1/history", (_req, res) => sendError(res, randomUUID(), 405, "METHOD_NOT_ALLOWED"));
  app.all("/api/v1/history/:analysisId", (_req, res) => sendError(res, randomUUID(), 405, "METHOD_NOT_ALLOWED"));

  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const requestId = randomUUID();
    if (error && typeof error === "object" && "type" in error && error.type === "entity.parse.failed") {
      return sendError(res, requestId, 400, "INVALID_JSON");
    }
    if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") {
      return sendError(res, requestId, 400, "INVALID_JSON");
    }
    console.error(JSON.stringify({ event: "http_request_failed", requestId }));
    return sendError(res, requestId, 500, "INTERNAL_ERROR");
  };
  app.use(errorHandler);
  app.use((req, res) => {
    const requestId = randomUUID();
    return sendError(res, requestId, 404, "NOT_FOUND");
  });
  return app;
}

function toHistorySummary(record: AnalysisHistoryRecord): Record<string, unknown> {
  return {
    analysisId: record.analysisId, status: record.status, url: record.url, profile: record.profile,
    startedAt: record.startedAt, durationMs: record.durationMs, score: record.score,
  };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
function roundScore<T extends ReturnType<typeof calculateScore>>(score: T): T {
  return {
    ...score,
    availableWeight: round2(score.availableWeight),
    components: Object.fromEntries(Object.entries(score.components).map(([key, value]) => [key, value === null ? null : round2(value)])) as T["components"],
  };
}
