import { chromium } from "../engine/node_modules/playwright/index.mjs";

const BASE = process.env.QA_FRONTEND_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
const out = [];
const log = (step, detail) => {
  out.push({ step, ...detail });
  console.log(JSON.stringify({ step, ...detail }));
};

const fakeReport = (url, profile) => ({
  analysisId: "qa-states-0001",
  status: "completed",
  url,
  profile,
  startedAt: new Date().toISOString(),
  durationMs: 2500,
  metrics: {
    navigationMs: 1200,
    fcpMs: 900,
    lcpMs: 1100,
    requestCount: 5,
    transferBytes: 4096,
    failedRequests: 0,
    resources: { javascriptBytes: 2048, cssBytes: 1024, imageBytes: 512, fontBytes: 512, otherBytes: 0 },
  },
  score: {
    value: 80,
    label: "acceptable",
    components: { performance: 70.4, dataEfficiency: 90.2, resourceOptimization: 85, resilience: 100 },
    availableWeight: 1,
    methodologyVersion: "1.0",
  },
  recommendations: [],
  warnings: [],
});

try {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });

  await page.route("**/api/v1/analyze", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    await new Promise((r) => setTimeout(r, 3000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeReport(body.url, body.profile)),
    });
  });

  await page.locator("#target-url").fill("https://example.net/");
  await page.getByRole("button", { name: /Haut débit \(Fast\)/ }).click();
  await page.getByRole("button", { name: "Démarrer l'analyse réelle" }).click();

  const loadingTitle = await page
    .getByText("Analyse réelle en cours")
    .waitFor({ timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  const loadingText = loadingTitle ? await page.locator("main").innerText() : "";
  log("etat_chargement", {
    visible: loadingTitle,
    cible_affichee: loadingText.includes("https://example.net/"),
    profil_affiche: loadingText.includes("Haut débit (20 Mbps / 20 ms)"),
    etapes: ["Garde SSRF", "Émulation CDP", "Mesures réelles"].filter((s) => loadingText.includes(s)),
  });

  await page.getByText("RAPPORT D'ANALYSE").waitFor({ timeout: 20_000 });
  const resText = await page.locator("main").innerText();
  log("resultats_affichage", {
    score_80: resText.includes("80"),
    sous_scores_arrondis: resText.includes("70/100") && !resText.includes("70.4/100"),
    ressources: resText.includes("JavaScript") || resText.includes("2,0"),
  });

  await page.getByRole("button", { name: "Nouvelle analyse" }).click();
  const urlAfterReset = await page.locator("#target-url").inputValue();
  const formVisible = await page.locator("#target-url").isVisible();
  log("remise_a_zero", { formulaire_visible: formVisible, url_conservee: urlAfterReset });

  await page.locator("#target-url").fill("https://example.com/");
  await page.locator("#target-url").press("Enter");
  const submittedByKeyboard = await page
    .getByText("Analyse réelle en cours")
    .waitFor({ timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  log("soumission_clavier", { ok: submittedByKeyboard });

  await page.getByText("RAPPORT D'ANALYSE").waitFor({ timeout: 20_000 });
  const footer = await page.locator("footer").innerText();
  log("pied_de_page", {
    cadre_experimental: footer.includes("Cadre méthodologique expérimental"),
    mention_ssrf: footer.includes("SSRF"),
    version_api: footer.includes("Version API v1.0"),
  });
  if (!resText.includes("80") || !resText.includes("70/100") || !(resText.includes("JavaScript") || resText.includes("2,0"))) {
    throw new Error("Les valeurs du rapport simulé ne sont pas présentées comme prévu.");
  }

  await page.unroute("**/api/v1/analyze");
  await page.route("**/api/v1/analyze", (route) => route.abort("connectionrefused"));
  await page.getByRole("button", { name: "Lancer une analyse sur une autre adresse" }).click();
  await page.locator("#target-url").fill("https://example.com/");
  await page.getByRole("button", { name: "Démarrer l'analyse réelle" }).click();
  await page.getByText("Code d'erreur :").waitFor({ timeout: 10_000 });
  const errText = await page.locator("main").innerText();
  const networkErrorCode = (errText.match(/Code d'erreur\s*:\s*(\w+)/i) ?? [])[1] ?? null;
  log("erreur_backend_joignable", {
    code: networkErrorCode,
    expose_adresse_interne: errText.includes("127.0.0.1:3001"),
  });
  if (!submittedByKeyboard || networkErrorCode !== "NETWORK_ERROR" || errText.includes("127.0.0.1:3001")) {
    throw new Error("Échec d'une vérification d'état frontend.");
  }
} catch (error) {
  log("exception", { message: String(error) });
} finally {
  await browser.close();
}
