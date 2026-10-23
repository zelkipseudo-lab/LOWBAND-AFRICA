import type { NetworkProfile, NetworkProfileId } from "./types.js";

const PROFILES: Record<NetworkProfileId, NetworkProfile> = {
  fast: {
    id: "fast",
    label: "Rapide (laboratoire)",
    downloadKbps: 20_000,
    uploadKbps: 10_000,
    latencyMs: 20,
    packetLossPercent: null,
  },
  "4g": {
    id: "4g",
    label: "4G (laboratoire)",
    downloadKbps: 10_000,
    uploadKbps: 5_000,
    latencyMs: 50,
    packetLossPercent: null,
  },
  "3g": {
    id: "3g",
    label: "3G (laboratoire)",
    downloadKbps: 1_500,
    uploadKbps: 750,
    latencyMs: 150,
    packetLossPercent: null,
  },
  slow_3g: {
    id: "slow_3g",
    label: "3G lent (laboratoire)",
    downloadKbps: 400,
    uploadKbps: 200,
    latencyMs: 400,
    packetLossPercent: null,
  },
};

export const NETWORK_PROFILE_IDS: readonly NetworkProfileId[] = [
  "fast",
  "4g",
  "3g",
  "slow_3g",
];

export function isNetworkProfileId(value: string): value is NetworkProfileId {
  return (NETWORK_PROFILE_IDS as readonly string[]).includes(value);
}

export function getNetworkProfile(id: string): NetworkProfile {
  if (!isNetworkProfileId(id)) {
    throw new Error(`Unknown network profile: ${id}`);
  }
  return PROFILES[id];
}

export function listNetworkProfiles(): NetworkProfile[] {
  return NETWORK_PROFILE_IDS.map((id) => PROFILES[id]);
}

export function kbpsToBytesPerSecond(kbps: number): number {
  if (!Number.isFinite(kbps) || kbps <= 0) {
    throw new Error("kbps must be a positive finite number");
  }
  return Math.round((kbps * 1000) / 8);
}
