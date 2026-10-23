import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatBytes, formatDuration, formatPercent, formatDate } from "../src/utils/format";
import { NETWORK_PROFILES, PROFILE_LABELS } from "../src/constants/profiles";
import { getFallbackErrorMessage } from "../src/api/client";
import { generateAnalysisPdf } from "../src/utils/pdfReport";

describe("Formatting utilities", () => {
  it("formats bytes properly and handles null/undefined without fake zeros", () => {
    assert.equal(formatBytes(null), "Indisponible");
    assert.equal(formatBytes(undefined), "Indisponible");
    assert.equal(formatBytes(0), "0 o");
    assert.equal(formatBytes(512), "512 o");
    assert.equal(formatBytes(2048), "2.0 Ko");
    assert.equal(formatBytes(2 * 1024 * 1024), "2.00 Mo");
  });

  it("formats durations properly and handles null/undefined without fake zeros", () => {
    assert.equal(formatDuration(null), "Indisponible");
    assert.equal(formatDuration(undefined), "Indisponible");
    assert.equal(formatDuration(250), "250 ms");
    assert.equal(formatDuration(3500), "3.50 s");
  });

  it("formats percentages properly and handles null/undefined", () => {
    assert.equal(formatPercent(null), "Indisponible");
    assert.equal(formatPercent(undefined), "Indisponible");
    assert.equal(formatPercent(0.47), "47 %");
    assert.equal(formatPercent(1), "100 %");
  });

  it("formats dates gracefully", () => {
    const formatted = formatDate("2026-10-22T10:00:00.000Z");
    assert.match(formatted, /2026/);
    assert.match(formatted, /UTC/);
  });
});

describe("Network profiles constants", () => {
  it("contains exactly the 4 supported profiles from docs/network-profiles.md", () => {
    const ids = NETWORK_PROFILES.map((p) => p.id);
    assert.deepEqual(ids, ["fast", "4g", "3g", "slow_3g"]);
    assert.equal(ids.includes("unstable" as never), false);
  });

  it("provides labels for all 4 profiles", () => {
    assert.ok(PROFILE_LABELS.fast);
    assert.ok(PROFILE_LABELS["4g"]);
    assert.ok(PROFILE_LABELS["3g"]);
    assert.ok(PROFILE_LABELS.slow_3g);
  });
});

describe("API Error messages", () => {
  it("provides clear human-readable messages for all contract codes", () => {
    assert.match(getFallbackErrorMessage("BLOCKED_TARGET"), /protection/i);
    assert.match(getFallbackErrorMessage("ENGINE_UNAVAILABLE"), /indisponible/i);
    assert.match(getFallbackErrorMessage("EGRESS_POLICY_UNVERIFIED"), /aucune installation n'est nécessaire/i);
    assert.match(getFallbackErrorMessage("RATE_LIMITED"), /patiente/i);
    assert.match(getFallbackErrorMessage("ANALYSIS_BUSY"), /analyse est déjà en cours/i);
    assert.match(getFallbackErrorMessage("ANALYSIS_TIMEOUT"), /délai/i);
    assert.match(getFallbackErrorMessage("INVALID_URL"), /valide/i);
    assert.match(getFallbackErrorMessage("HISTORY_UNAVAILABLE"), /historique/i);
    assert.match(getFallbackErrorMessage("INVALID_HISTORY_QUERY"), /paramètres/i);
    assert.match(getFallbackErrorMessage("INVALID_ANALYSIS_ID"), /identifiant/i);
  });
});

describe("PDF Report generator", () => {
  it("exports a valid generator function", () => {
    assert.equal(typeof generateAnalysisPdf, "function");
  });
});
