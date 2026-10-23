import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from "playwright";
import { EngineError } from "./errors.js";
import { getNetworkProfile, kbpsToBytesPerSecond } from "./profiles.js";
import { NetworkCollector } from "./network/collector.js";
import { TargetGuardError } from "./security/target-guard.js";
import type {
  AnalyzeOptions,
  AppliedNetworkEmulation,
  CollectResult,
  EngineMetrics,
  EngineResult,
  NetworkProfile,
  NetworkProfileId,
} from "./types.js";

export const ENGINE_VERSION = "0.1.0";
const DEFAULT_TOTAL_TIMEOUT_MS = 45_000;
const DEFAULT_NAVIGATION_TIMEOUT_MS = 30_000;
const DEFAULT_SETTLE_TIME_MS = 2_000;
const MAX_LAUNCH_TIMEOUT_MS = 15_000;
const MAX_TIMER_MS = 2_147_483_647;

const PERF_INIT_SCRIPT = `
(() => {
  if (window.__lowbandPerf) return;
  const state = { fcp: null, lcp: null };
  Object.defineProperty(window, "__lowbandPerf", {
    value: state,
    writable: false,
    configurable: false,
    enumerable: false
  });
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint" && state.fcp === null) {
          state.fcp = entry.startTime;
        }
      }
    }).observe({ type: "paint", buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last && typeof last.startTime === "number") {
        state.lcp = last.startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (_) {}
})();
`;

interface PageTiming {
  loadEventEnd: number | null;
  fcp: number | null;
  lcp: number | null;
}

function clampTimeout(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.round(value), MAX_TIMER_MS);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("operation timeout")), Math.max(1, timeoutMs));
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function resolveProfile(profileId: string): NetworkProfile {
  try {
    return getNetworkProfile(profileId);
  } catch (error) {
    throw new EngineError("INVALID_PROFILE", undefined, { cause: error });
  }
}

function assertBasicTarget(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new EngineError("INVALID_TARGET", undefined);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new EngineError("INVALID_TARGET", undefined);
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new EngineError("INVALID_TARGET", undefined);
  }
  return parsed;
}

function mapGuardError(error: unknown): EngineError {
  if (error instanceof TargetGuardError) {
    switch (error.reason) {
      case "BLOCKED_TARGET":
        return new EngineError("BLOCKED_TARGET", undefined, { cause: error });
      case "DNS_RESOLUTION_FAILED":
        return new EngineError("NAVIGATION_FAILED", undefined, { cause: error });
      case "UNSUPPORTED_PROTOCOL":
      case "INVALID_URL":
      default:
        return new EngineError("INVALID_TARGET", undefined, { cause: error });
    }
  }
  return new EngineError("INVALID_TARGET", undefined, { cause: error });
}

function mapNavigationError(error: unknown): EngineError {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout/i.test(message)) {
    return new EngineError("ANALYSIS_TIMEOUT", undefined, { cause: error });
  }
  return new EngineError("NAVIGATION_FAILED", undefined, { cause: error });
}

interface FetchRequestPausedEvent {
  requestId: string;
  frameId?: string;
  resourceType?: string;
  request: { url: string };
}

async function applyGuard(
  session: CDPSession,
  guard: NonNullable<AnalyzeOptions["targetGuard"]>,
  mainFrameId: string | null,
  counters: { blockedRequests: number; blockedMainFrame: boolean },
): Promise<void> {
  await session.send("Fetch.enable", {
    patterns: [{ urlPattern: "*", requestStage: "Request" }],
  });

  session.on("Fetch.requestPaused", (event: FetchRequestPausedEvent) => {
    void (async () => {
      const requestUrl = event.request.url;
      if (
        requestUrl.startsWith("data:") ||
        requestUrl.startsWith("blob:") ||
        requestUrl.startsWith("about:")
      ) {
        await session.send("Fetch.continueRequest", { requestId: event.requestId }).catch(() => undefined);
        return;
      }

      try {
        await guard.assertUrlAllowed(requestUrl);
        await session.send("Fetch.continueRequest", { requestId: event.requestId });
      } catch {
        counters.blockedRequests += 1;
        if (
          event.resourceType === "Document" &&
          (mainFrameId === null || event.frameId === mainFrameId)
        ) {
          counters.blockedMainFrame = true;
        }
        await session
          .send("Fetch.failRequest", {
            requestId: event.requestId,
            errorReason: "BlockedByClient",
          })
          .catch(() => undefined);
      }
    })();
  });
}

async function readPageTiming(page: Page): Promise<PageTiming> {
  return page.evaluate(() => {
    const state = (window as unknown as { __lowbandPerf?: { fcp?: number | null; lcp?: number | null } })
      .__lowbandPerf;
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const paintEntries = performance.getEntriesByType("paint");
    const fcpPaint = paintEntries.find((entry) => entry.name === "first-contentful-paint");

    const loadEventEnd =
      navigation && Number.isFinite(navigation.loadEventEnd) && navigation.loadEventEnd > 0
        ? navigation.loadEventEnd
        : null;
    const fcpCandidates = [state?.fcp, fcpPaint?.startTime];
    const fcp = fcpCandidates.find(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    );
    const lcp =
      typeof state?.lcp === "number" && Number.isFinite(state.lcp) && state.lcp > 0
        ? state.lcp
        : null;

    return {
      loadEventEnd,
      fcp: fcp ?? null,
      lcp,
    };
  });
}

function roundMetric(value: number | null, label: string, warnings: string[]): number | null {
  if (value === null || !Number.isFinite(value)) {
    warnings.push(`${label} indisponible pour cette navigation.`);
    return null;
  }
  return Math.round(value);
}

async function collectPageResult(
  page: Page,
  collector: NetworkCollector,
  blocked: { blockedRequests: number; blockedMainFrame: boolean },
  navigationTimedOut: boolean,
  wallNavigationMs: number | null,
  remainingMs: number,
): Promise<CollectResult> {
  const warnings: string[] = [];
  const aggregate = collector.snapshot();
  let timing: PageTiming = { loadEventEnd: null, fcp: null, lcp: null };

  try {
    timing = await withTimeout(
      readPageTiming(page),
      navigationTimedOut ? Math.min(1_000, remainingMs) : Math.min(5_000, remainingMs),
    );
  } catch {
    warnings.push("Les métriques de performance de la page n'ont pas pu être lues.");
  }

  if (navigationTimedOut) {
    warnings.push(
      "La navigation n'a pas atteint l'événement load dans le délai imparti; les mesures sont partielles.",
    );
  }

  const navigationCandidate = timing.loadEventEnd ?? (navigationTimedOut ? null : wallNavigationMs);
  const navigationMs = roundMetric(navigationCandidate, "Temps de navigation", warnings);
  if (timing.loadEventEnd === null && navigationMs !== null) {
    warnings.push("Temps de navigation mesuré par horloge murale, faute de Navigation Timing.");
  }
  const fcpMs = roundMetric(timing.fcp, "FCP", warnings);
  const lcpMs = roundMetric(timing.lcp, "LCP", warnings);

  if (aggregate.transferBytes === null) {
    warnings.push("Taille de transfert indisponible : aucune réponse terminée mesurée.");
  }
  if (aggregate.incompleteResponses > 0) {
    warnings.push(
      `${aggregate.incompleteResponses} requête(s) sans événement de fin; leur taille n'est pas comptée.`,
    );
  }
  if (aggregate.failedRequests > 0) {
    warnings.push(
      `${aggregate.failedRequests} requête(s) en échec ou en erreur HTTP; les octets partiels de ces requêtes ne sont pas comptés.`,
    );
  }
  if (aggregate.fromDiskCache > 0) {
    warnings.push(
      `${aggregate.fromDiskCache} réponse(s) servies depuis le cache navigateur; les octets transférés peuvent être sous-estimés.`,
    );
  }
  if (aggregate.fromServiceWorker > 0) {
    warnings.push(
      `${aggregate.fromServiceWorker} réponse(s) servies par un service worker; le transfert réseau peut être masqué.`,
    );
  }
  if (blocked.blockedRequests > 0) {
    warnings.push(
      `${blocked.blockedRequests} requête(s) bloquée(s) par la garde de cible car elles visaient une adresse non publique.`,
    );
  }
  if (aggregate.requestCount === 0) {
    warnings.push("Aucune requête réseau n'a été observée.");
  }

  const metrics: EngineMetrics = {
    navigationMs,
    fcpMs,
    lcpMs,
    requestCount: aggregate.requestCount,
    transferBytes:
      aggregate.transferBytes === null ? null : Math.round(aggregate.transferBytes),
    failedRequests: aggregate.failedRequests,
    resources:
      aggregate.transferBytes === null
        ? {
            javascriptBytes: null,
            cssBytes: null,
            imageBytes: null,
            fontBytes: null,
            otherBytes: null,
          }
        : {
            javascriptBytes: Math.round(aggregate.resources.javascriptBytes ?? 0),
            cssBytes: Math.round(aggregate.resources.cssBytes ?? 0),
            imageBytes: Math.round(aggregate.resources.imageBytes ?? 0),
            fontBytes: Math.round(aggregate.resources.fontBytes ?? 0),
            otherBytes: Math.round(aggregate.resources.otherBytes ?? 0),
          },
  };

  return {
    metrics,
    warnings,
    finalUrl: page.url() || null,
    navigationTimedOut,
    blockedRequests: blocked.blockedRequests,
    blockedMainFrame: blocked.blockedMainFrame,
  };
}

export async function analyze(
  url: string,
  options: AnalyzeOptions,
): Promise<EngineResult> {
  const startedAtDate = new Date();
  const startWall = Date.now();
  const profile = resolveProfile(options.profile);
  assertBasicTarget(url);

  const totalTimeoutMs = clampTimeout(options.totalTimeoutMs, DEFAULT_TOTAL_TIMEOUT_MS);
  const navigationTimeoutMs = clampTimeout(
    options.navigationTimeoutMs,
    Math.min(DEFAULT_NAVIGATION_TIMEOUT_MS, totalTimeoutMs),
  );
  const settleTimeMs = clampTimeout(options.settleTimeMs, DEFAULT_SETTLE_TIME_MS);
  const deadline = startWall + totalTimeoutMs;

  if (options.targetGuard) {
    try {
      await options.targetGuard.assertUrlAllowed(url);
    } catch (error) {
      throw mapGuardError(error);
    }
  }

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  const remaining = (): number => Math.max(1, deadline - Date.now());

  const run = async (): Promise<EngineResult> => {
    try {
      browser = await chromium.launch({
        headless: options.headless ?? true,
        timeout: Math.min(MAX_LAUNCH_TIMEOUT_MS, remaining()),
        executablePath: options.executablePath,
        args: options.noSandbox ? ["--disable-dev-shm-usage", "--no-sandbox"] : ["--disable-dev-shm-usage"],
      });
    } catch (error) {
      throw new EngineError("ENGINE_UNAVAILABLE", undefined, { cause: error });
    }

    context = await browser.newContext({
      acceptDownloads: false,
      ignoreHTTPSErrors: false,
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    });
    page = await context.newPage();
    await page.addInitScript({ content: PERF_INIT_SCRIPT });

    const session = await context.newCDPSession(page);
    const collector = new NetworkCollector(session);
    await collector.start();
    await session.send("Network.setCacheDisabled", {
      cacheDisabled: options.disableCache ?? true,
    });
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: profile.latencyMs,
      downloadThroughput: kbpsToBytesPerSecond(profile.downloadKbps),
      uploadThroughput: kbpsToBytesPerSecond(profile.uploadKbps),
    });

    const networkEmulation: AppliedNetworkEmulation = {
      profile: profile.id as NetworkProfileId,
      downloadKbps: profile.downloadKbps,
      uploadKbps: profile.uploadKbps,
      latencyMs: profile.latencyMs,
      packetLossPercent: null,
      applied: true,
      method: "cdp_network_emulateNetworkConditions",
    };

    const blocked = { blockedRequests: 0, blockedMainFrame: false };
    if (options.targetGuard) {
      const frameTree = (await session.send("Page.getFrameTree")) as {
        frameTree: { frame: { id: string } };
      };
      await applyGuard(session, options.targetGuard, frameTree.frameTree.frame.id, blocked);
    }

    let navigationTimedOut = false;
    const navigationStart = Date.now();
    const navTimeout = Math.max(1, Math.min(navigationTimeoutMs, remaining()));

    try {
      await page.goto(url, {
        waitUntil: "load",
        timeout: navTimeout,
      });
    } catch (error) {
      if (blocked.blockedMainFrame) {
        throw new EngineError("BLOCKED_TARGET", undefined, { cause: error });
      }
      const message = error instanceof Error ? error.message : String(error);
      if (/timeout/i.test(message)) {
        navigationTimedOut = true;
      } else {
        throw mapNavigationError(error);
      }
    }
    const wallNavigationMs = Date.now() - navigationStart;

    if (blocked.blockedMainFrame) {
      throw new EngineError("BLOCKED_TARGET");
    }

    const settle = Math.max(0, Math.min(settleTimeMs, remaining()));
    if (settle > 0) {
      await page.waitForTimeout(settle);
    }

    const collected = await collectPageResult(
      page,
      collector,
      blocked,
      navigationTimedOut,
      wallNavigationMs,
      remaining(),
    );

    if (
      collected.metrics.requestCount === 0 &&
      collected.metrics.navigationMs === null &&
      !navigationTimedOut
    ) {
      throw new EngineError("NAVIGATION_FAILED");
    }

    const durationMs = Math.round(Date.now() - startWall);
    return {
      engineVersion: ENGINE_VERSION,
      requestedUrl: url,
      finalUrl: collected.finalUrl === "about:blank" ? null : collected.finalUrl,
      profile: profile.id,
      startedAt: startedAtDate.toISOString(),
      durationMs,
      metrics: collected.metrics,
      networkEmulation,
      warnings: collected.warnings,
    };
  };

  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new EngineError("ANALYSIS_TIMEOUT"));
    }, totalTimeoutMs);
    if (typeof timer.unref === "function") timer.unref();
  });

  const cancellationPromise = options.signal
    ? new Promise<never>((_, reject) => {
        if (options.signal?.aborted) {
          reject(new EngineError("ANALYSIS_CANCELLED"));
          return;
        }
        options.signal?.addEventListener(
          "abort",
          () => reject(new EngineError("ANALYSIS_CANCELLED")),
          { once: true },
        );
      })
    : null;

  try {
    return await Promise.race(cancellationPromise ? [run(), timeoutPromise, cancellationPromise] : [run(), timeoutPromise]);
  } catch (error) {
    if (error instanceof EngineError) throw error;
    throw new EngineError("ANALYSIS_FAILED", undefined, { cause: error });
  } finally {
    if (timer) clearTimeout(timer);
    if (page) await withTimeout(page.close(), 3_000).catch(() => undefined);
    if (context) await withTimeout(context.close(), 3_000).catch(() => undefined);
    if (browser) await withTimeout(browser.close(), 5_000).catch(() => undefined);
  }
}
