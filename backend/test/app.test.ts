import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EngineError, TargetGuardError, type EngineResult } from "@lowband/analysis-engine";
import { createApp as buildApp } from "../src/app.js";
import { JsonFileAnalysisHistoryStore, sanitizeHistoryUrl, type AnalysisHistoryRecord, type AnalysisHistoryStore } from "../src/history.js";

const metrics = {
  navigationMs: 2_000, fcpMs: 1_000, lcpMs: null, requestCount: 4,
  transferBytes: 100_000, failedRequests: 1,
  resources: { javascriptBytes: 37_111, cssBytes: 10_000, imageBytes: 50_333, fontBytes: 5_000, otherBytes: 25_000 },
};
const engineResult: EngineResult = {
  engineVersion: "0.1.0", requestedUrl: "https://example.com/", finalUrl: "https://example.com/",
  profile: "slow_3g", startedAt: "2026-10-22T10:00:00.000Z", durationMs: 2_500, metrics,
  networkEmulation: { profile: "slow_3g", downloadKbps: 400, uploadKbps: 200, latencyMs: 400, packetLossPercent: null, applied: true, method: "cdp_network_emulateNetworkConditions" },
  warnings: ["LCP indisponible pour cette navigation."],
};
const input = { url: "https://example.com/", profile: "slow_3g" };
const publicGuard = { assertUrlAllowed: vi.fn(async () => ({ url: input.url, hostname: "example.com", addresses: ["93.184.216.34"] })) };
function memoryHistoryStore(): AnalysisHistoryStore {
  const records: AnalysisHistoryRecord[] = [];
  return {
    async list(limit, offset) { return { items: records.slice(offset, offset + limit), total: records.length }; },
    async get(id) { return records.find((record) => record.analysisId === id) ?? null; },
    async save(record) { records.unshift(record); },
    async delete(id) { const index = records.findIndex((record) => record.analysisId === id); if (index < 0) return false; records.splice(index, 1); return true; },
  };
}
function createApp(options: Parameters<typeof buildApp>[0] = {}) {
  return buildApp({ historyStore: memoryHistoryStore(), ...options });
}

describe("API contract", () => {
  it("removes common secret query values and fragments from stored history URLs", () => {
    const safeUrl = sanitizeHistoryUrl("https://example.com/path?lang=fr&access_token=private&api_key=secret#token=fragment");
    expect(safeUrl).toBe("https://example.com/path?lang=fr");
    expect(safeUrl).not.toContain("private");
    expect(safeUrl).not.toContain("secret");
  });

  it("reports health without host details", async () => {
    const response = await request(createApp()).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns a JSON error envelope for unknown API routes and methods", async () => {
    const app = createApp();
    const missing = await request(app).get("/api/v1/unknown");
    expect(missing.status).toBe(404);
    expect(missing.body.error).toMatchObject({ code: "NOT_FOUND", requestId: expect.any(String) });
    const wrongMethod = await request(app).get("/api/v1/analyze");
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("adapts actual engine metrics to the public report schema", async () => {
    const analyzer = vi.fn(async () => engineResult);
    const response = await request(createApp({ analyzer, guard: publicGuard as never, egressIsolationVerified: true }))
      .post("/api/v1/analyze").send(input);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "completed", url: input.url, profile: "slow_3g", startedAt: engineResult.startedAt,
      durationMs: 2_500, metrics, score: { value: expect.any(Number), methodologyVersion: "1.0" },
      recommendations: [
        expect.objectContaining({ code: "REVIEW_IMAGES", evidence: { imageShare: 0.5 } }),
        expect.objectContaining({ code: "REVIEW_JAVASCRIPT", evidence: { javascriptShare: 0.37 } }),
        expect.objectContaining({ code: "INVESTIGATE_FAILED_REQUESTS" }),
      ],
      warnings: engineResult.warnings,
    });
    expect(response.body.analysisId).toMatch(/^[0-9a-f-]{36}$/i);
    for (const value of Object.values(response.body.score.components).filter((value): value is number => value !== null)) {
      expect(Math.round(value * 100) / 100).toBe(value);
    }
    expect(analyzer).toHaveBeenCalledWith(input.url, expect.objectContaining({ profile: "slow_3g", totalTimeoutMs: 40_000 }));
  });

  it("automatically persists successful reports and makes them available after store restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lowband-history-"));
    const filePath = join(directory, "history.json");
    try {
      const response = await request(buildApp({ analyzer: vi.fn(async () => engineResult), guard: publicGuard as never, egressIsolationVerified: true, historyStore: new JsonFileAnalysisHistoryStore(filePath) }))
        .post("/api/v1/analyze").send(input);
      expect(response.status).toBe(200);
      const persisted = await readFile(filePath, "utf8");
      expect(persisted).toContain(response.body.analysisId);
      const restartedApp = buildApp({ historyStore: new JsonFileAnalysisHistoryStore(filePath) });
      const list = await request(restartedApp).get("/api/v1/history");
      expect(list.status).toBe(200);
      expect(list.body).toMatchObject({ total: 1, limit: 20, offset: 0 });
      expect(list.body.items[0]).toMatchObject({ analysisId: response.body.analysisId, url: input.url, profile: "slow_3g", status: "completed" });
      const detail = await request(restartedApp).get(`/api/v1/history/${response.body.analysisId}`);
      expect(detail.status).toBe(200);
      expect(detail.body).toEqual(response.body);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("serializes repeated file writes and deletion without losing records", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lowband-history-writes-"));
    const store = new JsonFileAnalysisHistoryStore(join(directory, "history.json"));
    const record = (analysisId: string): AnalysisHistoryRecord => ({
      analysisId, status: "completed", url: input.url, profile: "slow_3g", startedAt: engineResult.startedAt,
      durationMs: engineResult.durationMs, metrics: engineResult.metrics, score: null, recommendations: [], warnings: [],
    });
    try {
      const firstId = "00000000-0000-4000-8000-000000000001";
      const secondId = "00000000-0000-4000-8000-000000000002";
      await Promise.all([store.save(record(firstId)), store.save(record(secondId))]);
      expect((await store.list(10, 0)).total).toBe(2);
      expect(await store.delete(firstId)).toBe(true);
      expect(await store.delete(firstId)).toBe(false);
      expect((await new JsonFileAnalysisHistoryStore(join(directory, "history.json")).list(10, 0)).items.map((item) => item.analysisId)).toEqual([secondId]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("returns an empty paginated history and validates pagination and IDs", async () => {
    const app = createApp();
    expect((await request(app).get("/api/v1/history")).body).toMatchObject({ items: [], total: 0, limit: 20, offset: 0 });
    expect((await request(app).get("/api/v1/history?limit=2&offset=0")).body).toMatchObject({ items: [], total: 0, limit: 2, offset: 0 });
    expect((await request(app).get("/api/v1/history?limit=101")).body.error.code).toBe("INVALID_HISTORY_QUERY");
    expect((await request(app).get("/api/v1/history?offset=-1")).body.error.code).toBe("INVALID_HISTORY_QUERY");
    expect((await request(app).get("/api/v1/history/not-an-id")).body.error.code).toBe("INVALID_ANALYSIS_ID");
    expect((await request(app).get("/api/v1/history/00000000-0000-4000-8000-000000000000")).status).toBe(404);
  });

  it("supports deleting history entries and reports storage failures", async () => {
    const store = memoryHistoryStore();
    const app = buildApp({ analyzer: vi.fn(async () => engineResult), guard: publicGuard as never, egressIsolationVerified: true, historyStore: store });
    const created = await request(app).post("/api/v1/analyze").send(input);
    expect((await request(app).delete(`/api/v1/history/${created.body.analysisId}`)).status).toBe(204);
    expect((await request(app).get(`/api/v1/history/${created.body.analysisId}`)).status).toBe(404);
    const failingStore: AnalysisHistoryStore = {
      async list() { throw new Error("storage detail"); }, async get() { throw new Error("storage detail"); },
      async save() { throw new Error("storage detail"); }, async delete() { throw new Error("storage detail"); },
    };
    const failedRead = await request(buildApp({ historyStore: failingStore })).get("/api/v1/history");
    expect(failedRead.status).toBe(503);
    expect(failedRead.body.error.code).toBe("HISTORY_UNAVAILABLE");
    const failedWrite = await request(buildApp({ analyzer: vi.fn(async () => engineResult), guard: publicGuard as never, egressIsolationVerified: true, historyStore: failingStore })).post("/api/v1/analyze").send(input);
    expect(failedWrite.status).toBe(503);
    expect(failedWrite.body.error.code).toBe("HISTORY_UNAVAILABLE");
    expect(JSON.stringify(failedWrite.body)).not.toContain("storage detail");
  });

  it("does not write failed analyses to history", async () => {
    const store = memoryHistoryStore();
    const response = await request(buildApp({ analyzer: vi.fn(async () => { throw new EngineError("NAVIGATION_FAILED", "secret"); }), guard: publicGuard as never, egressIsolationVerified: true, historyStore: store })).post("/api/v1/analyze").send(input);
    expect(response.status).toBe(502);
    expect((await store.list(20, 0)).total).toBe(0);
  });

  it("persists a navigation timeout as a partial result with its original warning", async () => {
    const partialResult = { ...engineResult, warnings: ["La navigation n'a pas atteint l'événement load dans le délai imparti; les mesures sont partielles."] };
    const store = memoryHistoryStore();
    const response = await request(buildApp({ analyzer: vi.fn(async () => partialResult), guard: publicGuard as never, egressIsolationVerified: true, historyStore: store })).post("/api/v1/analyze").send(input);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("partial");
    expect(response.body.warnings).toEqual(partialResult.warnings);
    expect((await store.get(response.body.analysisId))?.status).toBe("partial");
  });

  it("warns when headless FCP is later than the load navigation duration", async () => {
    const result = { ...engineResult, warnings: [], metrics: { ...metrics, navigationMs: 800, fcpMs: 900 } };
    const response = await request(createApp({ analyzer: vi.fn(async () => result), guard: publicGuard as never, egressIsolationVerified: true }))
      .post("/api/v1/analyze").send(input);
    expect(response.status).toBe(200);
    expect(response.body.warnings).toContain("FCP observé après la durée de navigation (load) ; les horloges de peinture headless peuvent diverger.");
  });

  it.each([
    [{ url: "ftp://example.com/", profile: "4g" }, "UNSUPPORTED_PROTOCOL", 400],
    [{ url: "http://127.0.0.1/", profile: "4g" }, "BLOCKED_TARGET", 403],
    [{ url: "https://example.com/", profile: "unstable" }, "INVALID_PROFILE", 400],
  ])("rejects invalid input or target", async (body, code, status) => {
    const guard = { assertUrlAllowed: vi.fn(async () => { throw new TargetGuardError("BLOCKED_TARGET", "secret internal detail"); }) };
    const response = await request(createApp({ guard: guard as never, egressIsolationVerified: true })).post("/api/v1/analyze").send(body);
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
    expect(JSON.stringify(response.body)).not.toContain("secret internal detail");
  });

  it("reports a distinct service configuration error until egress isolation is verified", async () => {
    const analyzer = vi.fn();
    const response = await request(createApp({ analyzer, guard: publicGuard as never, egressIsolationVerified: false })).post("/api/v1/analyze").send(input);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("EGRESS_POLICY_UNVERIFIED");
    expect(analyzer).not.toHaveBeenCalled();
  });

  it("reports Chromium launch failures separately from the egress gate", async () => {
    const analyzer = vi.fn(async () => { throw new EngineError("ENGINE_UNAVAILABLE", "Chromium binary failed to launch"); });
    const response = await request(createApp({ analyzer, guard: publicGuard as never, egressIsolationVerified: true })).post("/api/v1/analyze").send(input);
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("ENGINE_UNAVAILABLE");
    expect(analyzer).toHaveBeenCalledOnce();
  });

  it("limits concurrency to one running analysis", async () => {
    let release!: (value: EngineResult) => void;
    let markEntered!: () => void;
    const entered = new Promise<void>((resolve) => { markEntered = resolve; });
    const analyzer = vi.fn(() => new Promise<EngineResult>((resolve) => { release = resolve; markEntered(); }));
    const app = createApp({ analyzer, guard: publicGuard as never, egressIsolationVerified: true });
    const first = request(app).post("/api/v1/analyze").send(input).then((response) => response);
    await entered;
    const second = await request(app).post("/api/v1/analyze").send(input);
    expect(second.status).toBe(503);
    expect(second.body.error.code).toBe("ANALYSIS_BUSY");
    release(engineResult);
    expect((await first).status).toBe(200);
    expect(analyzer).toHaveBeenCalledTimes(1);
  });

  it("does not consume the frequency quota for blocked targets", async () => {
    const guard = { assertUrlAllowed: vi.fn(async (url: string) => {
      if (url.includes("127.0.0.1")) throw new TargetGuardError("BLOCKED_TARGET", "private detail");
      return { url, hostname: "example.com", addresses: ["93.184.216.34"] };
    }) };
    const app = createApp({ analyzer: vi.fn(async () => engineResult), guard: guard as never, egressIsolationVerified: true });
    const blocked = await request(app).post("/api/v1/analyze").send({ url: "http://127.0.0.1/", profile: "4g" });
    expect(blocked.status).toBe(403);
    const allowed = [];
    for (let index = 0; index < 10; index += 1) allowed.push(await request(app).post("/api/v1/analyze").send(input));
    expect(allowed.every((response) => response.status === 200)).toBe(true);
    expect((await request(app).post("/api/v1/analyze").send(input)).body.error.code).toBe("RATE_LIMITED");
  });

  it("rejects unsupported ports as invalid URL syntax", async () => {
    const response = await request(createApp()).post("/api/v1/analyze").send({ url: "https://example.com:8080/", profile: "4g" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_URL");
  });

  it("limits attempts from one client to ten per ten-minute window", async () => {
    const analyzer = vi.fn(async () => engineResult);
    const app = createApp({ analyzer, guard: publicGuard as never, egressIsolationVerified: true });
    const responses = [];
    for (let index = 0; index < 11; index += 1) {
      responses.push(await request(app).post("/api/v1/analyze").send(input));
    }
    expect(responses.slice(0, 10).every((response) => response.status === 200)).toBe(true);
    expect(responses[10]?.status).toBe(429);
    expect(analyzer).toHaveBeenCalledTimes(10);
  });

  it("uses forwarded client IPs only when an explicit proxy is trusted", async () => {
    const previous = process.env.LOWBAND_TRUST_PROXY;
    process.env.LOWBAND_TRUST_PROXY = "127.0.0.1";
    try {
      const app = createApp({ analyzer: vi.fn(async () => engineResult), guard: publicGuard as never, egressIsolationVerified: true });
      const send = (ip: string) => request(app).post("/api/v1/analyze").set("X-Forwarded-For", ip).send(input);
      for (let index = 0; index < 10; index += 1) expect((await send("198.51.100.10")).status).toBe(200);
      expect((await send("198.51.100.10")).status).toBe(429);
      expect((await send("198.51.100.11")).status).toBe(200);
    } finally {
      if (previous === undefined) delete process.env.LOWBAND_TRUST_PROXY;
      else process.env.LOWBAND_TRUST_PROXY = previous;
    }
  });

  it("maps timeouts to the contract error envelope", async () => {
    const analyzer = vi.fn(async () => { throw new EngineError("ANALYSIS_TIMEOUT", "private detail"); });
    const response = await request(createApp({ analyzer, guard: publicGuard as never, egressIsolationVerified: true })).post("/api/v1/analyze").send(input);
    expect(response.status).toBe(408);
    expect(response.body.error).toMatchObject({ code: "ANALYSIS_TIMEOUT", requestId: expect.any(String) });
    expect(JSON.stringify(response.body)).not.toContain("private detail");
  });

  it("rejects malformed and oversized JSON with a stable envelope", async () => {
    const app = createApp();
    const malformed = await request(app).post("/api/v1/analyze").set("Content-Type", "application/json").send("{");
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("INVALID_JSON");
    const oversized = await request(app).post("/api/v1/analyze").set("Content-Type", "application/json").send(JSON.stringify({ url: "x".repeat(9_000), profile: "4g" }));
    expect(oversized.status).toBe(400);
    expect(oversized.body.error.code).toBe("INVALID_JSON");
  });
});
