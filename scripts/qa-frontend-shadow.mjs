import { chromium } from "../engine/node_modules/playwright/index.mjs";

const BASE = process.env.QA_FRONTEND_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

await page.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });

const data = await page.evaluate(() => {
  const shadowColors = new Map();
  const shadowSamples = new Map();
  const fillAttr = new Map();
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const bs = cs.boxShadow;
    if (bs && bs !== "none") {
      const matches = bs.match(/rgba?\([^)]+\)/g) ?? [];
      for (const m of matches) {
        const n = m.replace(/\s+/g, "");
        shadowColors.set(n, (shadowColors.get(n) ?? 0) + 1);
        if (!shadowSamples.has(n)) {
          shadowSamples.set(
            n,
            `${el.tagName}.${String(el.className).slice(0, 60)} :: ${bs.slice(0, 90)}`,
          );
        }
      }
    }
    if (el.tagName === "svg") {
      const attr = el.getAttribute("fill");
      fillAttr.set(attr ?? "(absent)", (fillAttr.get(attr ?? "(absent)") ?? 0) + 1);
    }
  }
  const svgSample = document.querySelector("header svg");
  return {
    shadowColors: [...shadowColors.entries()],
    shadowSamples: [...shadowSamples.entries()],
    fillAttr: [...fillAttr.entries()],
    svgOuter: svgSample ? svgSample.outerHTML.slice(0, 500) : null,
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
