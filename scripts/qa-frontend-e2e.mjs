import { chromium } from "../engine/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.env.QA_FRONTEND_URL ?? "http://127.0.0.1:5173";
const EVIDENCE = new URL("../docs/qa-evidence/", import.meta.url).pathname.replace(/^\//, "");
mkdirSync(EVIDENCE, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
const apiCalls = [];
const results = [];

function log(step, detail) {
  const line = { step, ...detail };
  results.push(line);
  console.log(JSON.stringify(line));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1366, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    consoleErrors.push({ type: msg.type(), text: msg.text() });
  }
});
page.on("pageerror", (err) => pageErrors.push(String(err)));
page.on("requestfailed", (req) =>
  failedRequests.push({ url: req.url(), failure: req.failure()?.errorText }),
);
page.on("response", (res) => {
  if (res.url().includes("/api/v1/")) {
    apiCalls.push({ url: res.url(), status: res.status() });
  }
});

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const health = await page
    .getByText("Opérationnel")
    .waitFor({ timeout: 15_000 })
    .then(() => "online")
    .catch(() => "absent");
  log("health_badge", { value: health });

  const h1 = await page.locator("h1").first().innerText();
  log("hero_h1", { value: h1 });

  const profileButtons = await page.locator("button", { hasText: "Mbits" }).count();
  log("profile_buttons", { count: profileButtons });

  await page.screenshot({ path: `${EVIDENCE}e2e-01-accueil-desktop.png`, fullPage: true });

  await page.getByRole("button", { name: "Méthodologie" }).click();
  const modalVisible = await page.getByRole("dialog").isVisible();
  await page.screenshot({ path: `${EVIDENCE}e2e-02-modale-methodologie.png`, fullPage: false });
  await page.getByRole("button", { name: "Fermer la documentation" }).click();
  log("documentation_modal", { visible: modalVisible, closed: !(await page.getByRole("dialog").isVisible().catch(() => false)) });

  await page.locator("#target-url").fill("http://localhost:3001");
  await page.getByRole("button", { name: "Démarrer l'analyse réelle" }).click();
  const clientError = await page.locator("#url-error-message").innerText().catch(() => null);
  log("validation_cliente_lochost", { message: clientError });
  await page.screenshot({ path: `${EVIDENCE}e2e-03-validation-client.png`, fullPage: false });

  await page.locator("#target-url").fill("https://example.com/");
  await page.getByRole("button", { name: /3G Lente \/ Edge Dégradé/ }).click();
  await page.getByRole("button", { name: "Démarrer l'analyse réelle" }).click();

  const loadingVisible = await page
    .getByText("Analyse en cours d'exécution...")
    .isVisible()
    .catch(() => false);
  log("etat_chargement", { visible: loadingVisible });

  await page.getByText("RAPPORT D'ANALYSE").waitFor({ timeout: 90_000 });
  const scoreText = await page.locator("main").innerText();
  log("analyse_reussie", {
    url_present: scoreText.includes("https://example.com/"),
    profil_present: scoreText.includes("3G Lente"),
    longueur_texte: scoreText.length,
  });
  await page.screenshot({ path: `${EVIDENCE}e2e-04-resultats-desktop.png`, fullPage: true });

  const clipText = await page.evaluate(async () => {
    const el = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("Copier le résumé"),
    );
    if (!el) return null;
    el.click();
    await new Promise((r) => setTimeout(r, 400));
    return navigator.clipboard.readText().catch((e) => `CLIPBOARD_ERROR:${String(e)}`);
  });
  log("copier_resume", {
    clipboard: clipText === null ? "bouton_absent" : String(clipText).slice(0, 400),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${EVIDENCE}e2e-05-resultats-mobile.png`, fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  log("mobile_overflow_px", { value: overflow });
  await page.setViewportSize({ width: 1366, height: 900 });

  await page.getByRole("button", { name: "Lancer une analyse sur une autre adresse" }).click();
  await page.locator("#target-url").fill("http://169.254.169.254/latest/meta-data/");
  await page.getByRole("button", { name: "Démarrer l'analyse réelle" }).click();
  await page.getByText("Code d'erreur :").waitFor({ timeout: 30_000 });
  const errText = await page.locator("main").innerText();
  log("erreur_ssrf_metadata", {
    code_blocked_target: errText.includes("BLOCKED_TARGET"),
    titre: errText.includes("Destination non autorisée"),
  });
  await page.screenshot({ path: `${EVIDENCE}e2e-06-erreur-ssrf.png`, fullPage: true });

  await page.getByRole("button", { name: "Modifier l'URL ou le profil" }).click();
  await page.locator("#target-url").fill("ftp://example.com/");
  await page.getByRole("button", { name: "Démarrer l'analyse réelle" }).click();
  const protoErr = await page.locator("#url-error-message").innerText().catch(() => null);
  log("validation_cliente_protocole", { message: protoErr });
} catch (error) {
  log("exception", { message: String(error) });
  await page.screenshot({ path: `${EVIDENCE}e2e-erreur.png`, fullPage: true }).catch(() => undefined);
} finally {
  log("console_errors", { count: consoleErrors.length, items: consoleErrors.slice(0, 20) });
  log("page_errors", { count: pageErrors.length, items: pageErrors.slice(0, 20) });
  log("requests_failed", { count: failedRequests.length, items: failedRequests.slice(0, 20) });
  log("api_calls", { items: apiCalls });
  await browser.close();
}
