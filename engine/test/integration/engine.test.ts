import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyze } from "../../src/analyze.js";
import { EngineError } from "../../src/errors.js";
import { createTargetGuard } from "../../src/security/target-guard.js";
import { startFixtureServer, type FixtureServer } from "./fixture-server.js";

let fixture: FixtureServer;

beforeAll(async () => {
  fixture = await startFixtureServer();
});

afterAll(async () => {
  await fixture.close();
});

describe("real Playwright analysis", () => {
  it(
    "measures a real local navigation and its resources",
    async () => {
      const result = await analyze(fixture.baseUrl + "/", {
        profile: "fast",
        headless: true,
        totalTimeoutMs: 20_000,
        navigationTimeoutMs: 15_000,
        settleTimeMs: 2_000,
      });

      expect(result.requestedUrl).toBe(fixture.baseUrl + "/");
      expect(result.finalUrl).toBe(fixture.baseUrl + "/");
      expect(result.profile).toBe("fast");
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.metrics.requestCount).toBeGreaterThanOrEqual(4);
      expect(result.metrics.transferBytes).not.toBeNull();
      expect(result.metrics.transferBytes as number).toBeGreaterThan(0);
      expect(result.metrics.failedRequests).toBe(0);
      expect(result.metrics.navigationMs).not.toBeNull();
      expect(result.metrics.fcpMs).not.toBeNull();
      expect(result.metrics.lcpMs).not.toBeNull();
      expect(result.metrics.resources.javascriptBytes).toBeGreaterThan(0);
      expect(result.metrics.resources.cssBytes).toBeGreaterThan(0);
      expect(result.metrics.resources.imageBytes).toBeGreaterThan(0);
      expect(result.networkEmulation).toMatchObject({
        profile: "fast",
        downloadKbps: 20_000,
        uploadKbps: 10_000,
        latencyMs: 20,
        packetLossPercent: null,
        applied: true,
      });
    },
    30_000,
  );

  it(
    "applies the requested latency and throughput to real navigations",
    async () => {
      const fast = await analyze(fixture.baseUrl + "/", {
        profile: "fast",
        totalTimeoutMs: 20_000,
        navigationTimeoutMs: 15_000,
        settleTimeMs: 200,
      });
      const slow = await analyze(fixture.baseUrl + "/", {
        profile: "slow_3g",
        totalTimeoutMs: 20_000,
        navigationTimeoutMs: 15_000,
        settleTimeMs: 200,
      });

      expect(fast.metrics.navigationMs).not.toBeNull();
      expect(slow.metrics.navigationMs).not.toBeNull();
      const delta = (slow.metrics.navigationMs as number) - (fast.metrics.navigationMs as number);
      expect(delta).toBeGreaterThan(1_000);
      expect(slow.networkEmulation.latencyMs).toBe(400);
    },
    45_000,
  );

  it(
    "blocks a local target when the target guard is enabled",
    async () => {
      const guard = createTargetGuard();
      await expect(
        analyze(fixture.baseUrl + "/", {
          profile: "fast",
          targetGuard: guard,
          totalTimeoutMs: 10_000,
        }),
      ).rejects.toMatchObject({ code: "BLOCKED_TARGET" });
    },
    20_000,
  );

  it(
    "checks every request through the guard, including subresources",
    async () => {
      let blocked = 0;
      const guard = {
        assertUrlAllowed: async (url: string) => {
          if (url.endsWith("/image.svg")) {
            blocked += 1;
            throw new Error("blocked by test guard");
          }
        },
      };

      const result = await analyze(fixture.baseUrl + "/", {
        profile: "fast",
        targetGuard: guard,
        totalTimeoutMs: 20_000,
        navigationTimeoutMs: 15_000,
        settleTimeMs: 500,
      });

      expect(blocked).toBe(1);
      expect(result.warnings.some((warning) => warning.includes("garde de cible"))).toBe(true);
      expect(result.metrics.resources.imageBytes ?? 0).toBe(0);
      expect(result.metrics.failedRequests).toBeGreaterThanOrEqual(1);
    },
    30_000,
  );

  it(
    "validates redirects as new targets",
    async () => {
      const guard = {
        assertUrlAllowed: async (url: string) => {
          if (url.endsWith("/final")) {
            throw new Error("redirect target blocked by test guard");
          }
        },
      };

      const error = await analyze(fixture.baseUrl + "/redirect", {
        profile: "fast",
        targetGuard: guard,
        totalTimeoutMs: 10_000,
        navigationTimeoutMs: 5_000,
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(EngineError);
      expect(error).toMatchObject({ code: "BLOCKED_TARGET" });
    },
    20_000,
  );

  it("rejects the reserved unstable profile before launching a browser", async () => {
    await expect(
      analyze(fixture.baseUrl + "/", {
        profile: "unstable",
        totalTimeoutMs: 10_000,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PROFILE" });
  });

  it(
    "returns a partial, explicitly warned result when navigation times out",
    async () => {
      const result = await analyze(fixture.baseUrl + "/slow", {
        profile: "fast",
        totalTimeoutMs: 6_000,
        navigationTimeoutMs: 800,
        settleTimeMs: 100,
      });

      expect(result.warnings.some((warning) => warning.includes("délai imparti"))).toBe(true);
      expect(result.metrics.navigationMs).toBeNull();
      expect(result.metrics.transferBytes).toBeNull();
    },
    20_000,
  );

  it(
    "closes the active browser when the caller aborts an analysis",
    async () => {
      const controller = new AbortController();
      const pending = analyze(fixture.baseUrl + "/slow", {
        profile: "fast",
        totalTimeoutMs: 10_000,
        navigationTimeoutMs: 9_000,
        signal: controller.signal,
      });
      setTimeout(() => controller.abort(), 250);
      await expect(pending).rejects.toMatchObject({ code: "ANALYSIS_CANCELLED" });
    },
    15_000,
  );

  it(
    "maps a connection failure to NAVIGATION_FAILED",
    async () => {
      const closed = await startFixtureServer();
      const url = closed.baseUrl + "/";
      await closed.close();

      const error = await analyze(url, {
        profile: "fast",
        totalTimeoutMs: 10_000,
        navigationTimeoutMs: 5_000,
      }).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(EngineError);
      expect(error).toMatchObject({ code: "NAVIGATION_FAILED" });
    },
    30_000,
  );
});
