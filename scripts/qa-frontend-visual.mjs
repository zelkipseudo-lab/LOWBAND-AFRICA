import { chromium } from "../engine/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.env.QA_FRONTEND_URL ?? "http://127.0.0.1:5173";
const EVIDENCE = new URL("../docs/qa-evidence/", import.meta.url).pathname.replace(/^\//, "");
mkdirSync(EVIDENCE, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();

const palette = new Map();
const emoji = [];

function hex(rgb) {
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return rgb;
  const parts = m[1].split(",").map((v) => parseFloat(v.trim()));
  const [r, g, b] = parts;
  const a = parts.length > 3 ? parts[3] : 1;
  if (a === 0) return "transparent";
  const to = (v) => Math.round(v).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}${a === 1 ? "" : `@${a}`}`;
}

async function collect() {
  return page.evaluate(() => {
    const out = [];
    const all = document.querySelectorAll("*");
    for (const el of all) {
      if (["HTML", "HEAD", "SCRIPT", "STYLE", "META", "LINK"].includes(el.tagName)) continue;
      if (el.getClientRects().length === 0) continue;
      const cs = getComputedStyle(el);
      const props = {
        color: cs.color,
        "background-color": cs.backgroundColor,
        "border-top-color": cs.borderTopColor,
        "border-right-color": cs.borderRightColor,
        "border-bottom-color": cs.borderBottomColor,
        "border-left-color": cs.borderLeftColor,
        "outline-color": cs.outlineColor,
        "box-shadow": cs.boxShadow,
        "text-decoration-color": cs.textDecorationColor,
        "fill": cs.fill,
        "stroke": cs.stroke,
      };
      for (const [k, v] of Object.entries(props)) {
        if ((k === "fill" || k === "stroke") && !(el instanceof SVGElement)) continue;
        if (!v || v === "none" || v === "rgba(0, 0, 0, 0)") continue;
        out.push({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 80), prop: k, value: v });
      }
      const text = (el.textContent || "").trim();
      if (text && el.children.length === 0) {
        for (const ch of text) {
          const cp = ch.codePointAt(0);
          if (
            (cp >= 0x1f300 && cp <= 0x1faff) ||
            (cp >= 0x2600 && cp <= 0x27bf) ||
            (cp >= 0x1f000 && cp <= 0x1f0ff) ||
            cp === 0xfe0f ||
            cp === 0x20e3
          ) {
            emoji.push({ tag: el.tagName, char: ch, code: cp.toString(16), text: text.slice(0, 60) });
          }
        }
      }
    }
    return out;
  });
}

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  const entries = [];
  const themeNames = ["canvas", "ink", "surface", "surface-raised", "foreground", "muted", "accent", "accent-strong", "accent-on-ink", "accent-soft", "on-ink", "border", "danger", "warning"];
  const allowedBaseColors = new Set();
  for (const theme of ["dark", "light"]) {
    await page.locator(".app-shell").evaluate((element, value) => { element.dataset.theme = value; }, theme);
    const channelColors = await page.evaluate((names) => {
      const style = getComputedStyle(document.querySelector(".app-shell"));
      return names.map((name) => `rgb(${style.getPropertyValue(`--${name}-rgb`).trim().split(/\s+/).join(", ")})`);
    }, themeNames);
    channelColors.forEach((color) => allowedBaseColors.add(hex(color).toLowerCase()));
    entries.push(...await collect());
  }
  await page.locator(".app-shell").evaluate((element) => { element.dataset.theme = "dark"; });
  for (const e of entries) {
    const key = `${e.prop}=${hex(e.value)}`;
    if (!palette.has(key)) palette.set(key, { count: 0, samples: [] });
    const bucket = palette.get(key);
    bucket.count += 1;
    if (bucket.samples.length < 3) bucket.samples.push(`${e.tag}.${e.cls.slice(0, 40)}`);
  }
  const distinct = [...palette.entries()].sort((a, b) => b[1].count - a[1].count);
  console.log(JSON.stringify({ step: "palette_idle", colors: [...new Set(distinct.map(([key]) => key.split("=")[1]))] }));

  const nullReport = {
    analysisId: "qa-null-metrics-0000",
    status: "completed",
    url: "https://example.org/",
    profile: "3g",
    startedAt: new Date().toISOString(),
    durationMs: 1234,
    metrics: {
      navigationMs: null,
      fcpMs: null,
      lcpMs: null,
      requestCount: 0,
      transferBytes: null,
      failedRequests: 0,
      resources: {
        javascriptBytes: null,
        cssBytes: null,
        imageBytes: null,
        fontBytes: null,
        otherBytes: null,
      },
    },
    score: {
      value: null,
      label: "indisponible",
      components: {
        performance: null,
        dataEfficiency: null,
        resourceOptimization: null,
        resilience: null,
      },
      availableWeight: 0,
      methodologyVersion: "1.0",
    },
    recommendations: [],
    warnings: ["Métrique de test manquante."],
  };

  await page.route("**/api/v1/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(nullReport),
    });
  });

  await page.locator("#target-url").fill("https://example.org/");
  await page.getByRole("button", { name: "Démarrer l'analyse réelle" }).click();
  await page.getByText("RAPPORT D'ANALYSE").waitFor({ timeout: 20_000 });
  const text = await page.locator("main").innerText();
  console.log(
    JSON.stringify(
      {
        step: "null_metrics_ui",
        indisponible_count: (text.match(/Indisponible/gi) || []).length,
        zero_substitution: /Performance\s*:\s*0\b/.test(text),
        extrait: text.slice(0, 900),
      },
      null,
      2,
    ),
  );
  assert.ok((text.match(/Indisponible/gi) || []).length > 0, "Null metrics were not shown as unavailable");
  assert.equal(/Performance\s*:\s*0\b/.test(text), false, "An unavailable performance metric was shown as zero");
  await page.screenshot({ path: `${EVIDENCE}e2e-07-metriques-indisponibles.png`, fullPage: true });

  const entries2 = await collect();
  const palette2 = new Map();
  for (const e of entries2) {
    const key = `${e.prop}=${hex(e.value)}`;
    palette2.set(key, (palette2.get(key) ?? 0) + 1);
  }
  console.log(JSON.stringify({ step: "palette_results", colors: [...new Set([...palette2.keys()].map((key) => key.split("=")[1]))] }));
  const allEntries = [...entries, ...entries2];
  const unauthorizedEntries = allEntries.filter((entry) => {
    const normalized = hex(entry.value).toLowerCase();
    const baseColor = normalized.split("@")[0];
    return normalized !== "transparent" && !allowedBaseColors.has(baseColor);
  });
  const unauthorized = [...new Set(unauthorizedEntries.map((entry) => `${entry.prop}=${hex(entry.value)}`))];
  assert.equal(unauthorized.length, 0, `Unauthorized rendered colors: ${JSON.stringify(unauthorizedEntries.slice(0, 20))}`);
  assert.equal(emoji.length, 0, `Rendered emoji found: ${JSON.stringify(emoji.slice(0, 10))}`);
  console.log(JSON.stringify({ step: "visual_compliance", status: "PASS", unauthorizedColors: unauthorized, emoji: emoji.length }));
} catch (error) {
  console.log(JSON.stringify({ step: "exception", message: String(error) }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
