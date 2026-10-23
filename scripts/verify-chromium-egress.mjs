import { createServer } from "node:http";
import { chromium } from "../engine/node_modules/playwright/index.mjs";
import { createTargetGuard } from "../engine/dist/index.js";

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/plain" });
  response.end("LOWBAND_LOCAL_EGRESS_PROBE");
});

function listen(serverInstance) {
  return new Promise((resolve, reject) => {
    serverInstance.once("error", reject);
    serverInstance.listen(0, "127.0.0.1", () => {
      serverInstance.off("error", reject);
      resolve(serverInstance.address().port);
    });
  });
}

const port = await listen(server);
let browser;

try {
  const localUrl = `http://127.0.0.1:${port}/probe`;
  const directProbe = await fetch(localUrl, { signal: AbortSignal.timeout(2_000) });
  const directBody = await directProbe.text();
  if (directBody !== "LOWBAND_LOCAL_EGRESS_PROBE") {
    throw new Error("Le serveur de vérification local ne répond pas comme prévu.");
  }

  browser = await chromium.launch({
    headless: true,
    args: ["--disable-background-networking", "--no-first-run"],
  });
  const page = await browser.newPage();
  const session = await page.context().newCDPSession(page);
  const targetGuard = createTargetGuard();

  // Windows Defender Firewall does not filter local loopback traffic. Verify
  // localhost through the same TargetGuard enforced on every Chromium request
  // by the analysis engine's CDP Fetch interception.
  let loopbackBlocked = false;
  session.on("Fetch.requestPaused", (event) => {
    void (async () => {
      try {
        await targetGuard.assertUrlAllowed(event.request.url);
        await session.send("Fetch.continueRequest", { requestId: event.requestId });
      } catch {
        if (event.request.url === localUrl) loopbackBlocked = true;
        await session.send("Fetch.failRequest", {
          requestId: event.requestId,
          errorReason: "BlockedByClient",
        }).catch(() => undefined);
      }
    })();
  });
  await session.send("Fetch.enable", {
    patterns: [{ urlPattern: "*", requestStage: "Request" }],
  });

  try {
    await page.goto(localUrl, { waitUntil: "domcontentloaded", timeout: 2_500 });
  } catch {
    // The expected result is that the TargetGuard aborts the local navigation.
  }
  if (!loopbackBlocked) {
    throw new Error("Le contrôle de sécurité Chromium n’a pas bloqué la requête vers 127.0.0.1.");
  }
  // A blocked top-level navigation leaves Chromium on an internal error page;
  // use a fresh page for the public HTTPS check so the two probes stay isolated.
  await page.close();
  const publicPage = await browser.newPage();

  const publicResponse = await publicPage.goto("https://example.com/", {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  if (!publicResponse || !publicResponse.ok()) {
    throw new Error(`La sonde HTTPS publique a échoué (${publicResponse?.status() ?? "sans réponse"}).`);
  }

  console.log("Sonde Chromium réussie : le garde SSRF bloque 127.0.0.1 et Chromium atteint example.com en HTTPS. Le lanceur PowerShell vérifie séparément la règle pare-feu EGRESS.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await new Promise((resolve) => server.close(resolve));
}
