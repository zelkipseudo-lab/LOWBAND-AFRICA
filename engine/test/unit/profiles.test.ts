import { describe, expect, it } from "vitest";
import {
  NETWORK_PROFILE_IDS,
  getNetworkProfile,
  isNetworkProfileId,
  kbpsToBytesPerSecond,
  listNetworkProfiles,
} from "../../src/profiles.js";

describe("network profiles", () => {
  it("exposes only the four v1 profiles", () => {
    expect(NETWORK_PROFILE_IDS).toEqual(["fast", "4g", "3g", "slow_3g"]);
    expect(listNetworkProfiles()).toHaveLength(4);
  });

  it("returns the documented fixed parameters", () => {
    expect(getNetworkProfile("fast")).toMatchObject({
      downloadKbps: 20_000,
      uploadKbps: 10_000,
      latencyMs: 20,
    });
    expect(getNetworkProfile("slow_3g")).toMatchObject({
      downloadKbps: 400,
      uploadKbps: 200,
      latencyMs: 400,
    });
  });

  it("rejects the reserved unstable profile", () => {
    expect(isNetworkProfileId("unstable")).toBe(false);
    expect(() => getNetworkProfile("unstable")).toThrow(/Unknown network profile/);
  });

  it("converts Kbps to bytes per second without inventing precision", () => {
    expect(kbpsToBytesPerSecond(8)).toBe(1000);
    expect(kbpsToBytesPerSecond(400)).toBe(50_000);
    expect(kbpsToBytesPerSecond(20_000)).toBe(2_500_000);
    expect(() => kbpsToBytesPerSecond(0)).toThrow();
  });
});
