import assert from "node:assert/strict";
import { chromium } from "../engine/node_modules/playwright/index.mjs";

const baseUrl = process.env.QA_FRONTEND_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.locator("#target-url").fill("https://example.com/");

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/v1/analyze"), { timeout: 10_000 },
  );
  await page.getByRole("button", { name: "Lancer l'audit de connectivité" }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 503, "Expected backend egress configuration error");

  await page.getByText("Code d'erreur : EGRESS_POLICY_UNVERIFIED").waitFor({ timeout: 5_000 });
  const rendered = await page.locator("main").innerText();
  assert.match(rendered, /Service d'analyse temporairement indisponible/);
  assert.match(rendered, /Aucune installation n'est nécessaire sur votre appareil/);
  assert.doesNotMatch(rendered, /install-chromium-egress-policy|PowerShell administrateur|scripts\/start-backend/);

  console.log(JSON.stringify({
    test: "frontend_egress_unavailable",
    apiStatus: response.status(),
    apiCode: "EGRESS_POLICY_UNVERIFIED",
    visitorInstallRequired: false,
    result: "PASS",
  }));
} finally {
  await browser.close();
}
