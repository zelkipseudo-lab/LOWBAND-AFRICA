import { describe, expect, it } from "vitest";
import { buildRecommendations, calculateScore } from "../src/scoring.js";

const emptyMetrics = {
  navigationMs: null, fcpMs: null, lcpMs: null, requestCount: 0, transferBytes: null, failedRequests: 0,
  resources: { javascriptBytes: null, cssBytes: null, imageBytes: null, fontBytes: null, otherBytes: null },
};

describe("score and recommendations", () => {
  it("keeps unavailable values null and the score incomplete", () => {
    expect(calculateScore(emptyMetrics)).toMatchObject({ value: null, label: "incomplete", availableWeight: 0 });
  });
  it("calculates a reproducible score from available metrics", () => {
    expect(calculateScore({ ...emptyMetrics, navigationMs: 5_000, transferBytes: 1_000_000, requestCount: 50 }))
      .toMatchObject({ value: 53, components: { performance: 50, dataEfficiency: 50, resourceOptimization: 15, resilience: 100 }, availableWeight: 1 });
  });
  it("emits recommendations only when evidence thresholds are calculable", () => {
    expect(buildRecommendations({ ...emptyMetrics, transferBytes: 100, requestCount: 61, failedRequests: 4, resources: { ...emptyMetrics.resources, imageBytes: 50, javascriptBytes: null } }).map(({ code }) => code))
      .toEqual(["REVIEW_IMAGES", "REDUCE_REQUESTS", "INVESTIGATE_FAILED_REQUESTS"]);
    expect(buildRecommendations(emptyMetrics)).toEqual([]);
  });
});
