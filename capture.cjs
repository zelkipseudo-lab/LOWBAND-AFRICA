const { chromium } = require('./engine/node_modules/playwright');

const mockReport = {
  analysisId: "lb-audit-98234-x1",
  status: "completed",
  url: "https://example.com",
  profile: "3g",
  startedAt: "2026-10-22T20:30:00.000Z",
  durationMs: 4250,
  metrics: {
    navigationMs: 3820,
    fcpMs: 1420,
    lcpMs: 2650,
    requestCount: 28,
    transferBytes: 485000,
    failedRequests: 1,
    resources: {
      javascriptBytes: 180000,
      cssBytes: 45000,
      imageBytes: 210000,
      fontBytes: 35000,
      otherBytes: 15000,
    },
  },
  score: {
    value: 78,
    label: "acceptable",
    components: {
      performance: 72,
      dataEfficiency: 85,
      resourceOptimization: 76,
      resilience: 80,
    },
    availableWeight: 1.0,
    methodologyVersion: "1.0",
  },
  recommendations: [
    {
      code: "REVIEW_IMAGES",
      message: "La part des images représente 43.3 % du volume total transféré.",
      evidence: { imageShare: 0.433, imageBytes: 210000 },
    },
    {
      code: "REVIEW_JAVASCRIPT",
      message: "Les scripts JavaScript occupent 37.1 % de la bande passante observée.",
      evidence: { jsShare: 0.371, jsBytes: 180000 },
    },
  ],
  warnings: [
    "La métrique LCP a été capturée sur une fenêtre d'observation de 2 s après le premier rendu.",
  ],
};

const mockHistoryList = {
  items: [
    {
      analysisId: "lb-audit-98234-x1",
      status: "completed",
      url: "https://example.com",
      profile: "3g",
      startedAt: "2026-10-22T20:30:00.000Z",
      durationMs: 4250,
      score: {
        value: 78,
        label: "acceptable",
        components: { performance: 72, dataEfficiency: 85, resourceOptimization: 76, resilience: 80 },
        availableWeight: 1.0,
        methodologyVersion: "1.0",
      },
    },
    {
      analysisId: "lb-audit-12903-a2",
      status: "completed",
      url: "https://www.wikipedia.org",
      profile: "4g",
      startedAt: "2026-10-22T19:15:00.000Z",
      durationMs: 2840,
      score: {
        value: 91,
        label: "excellent",
        components: { performance: 88, dataEfficiency: 94, resourceOptimization: 90, resilience: 95 },
        availableWeight: 1.0,
        methodologyVersion: "1.0",
      },
    },
    {
      analysisId: "lb-audit-44810-c3",
      status: "partial",
      url: "https://news-portal-heavy.test",
      profile: "slow_3g",
      startedAt: "2026-10-22T18:00:00.000Z",
      durationMs: 9100,
      score: {
        value: 34,
        label: "poor",
        components: { performance: 22, dataEfficiency: 35, resourceOptimization: 40, resilience: 45 },
        availableWeight: 1.0,
        methodologyVersion: "1.0",
      },
    },
  ],
  total: 3,
  limit: 20,
  offset: 0,
};

async function setupMocks(page) {
  await page.route('**/api/v1/health', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    })
  );
  await page.route('**/api/v1/analyze', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockReport),
    })
  );
  await page.route('**/api/v1/history?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockHistoryList),
    })
  );
  await page.route('**/api/v1/history', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockHistoryList),
    })
  );
  await page.route('**/api/v1/history/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockReport),
    })
  );
}

async function capture() {
  const browser = await chromium.launch();

  // 1. Desktop Dark
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-desktop-dark.png', fullPage: true });
    await page.close();
  }

  // 2. Desktop Light
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      const appShell = document.querySelector('.app-shell');
      if (appShell) appShell.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-desktop-light.png', fullPage: true });
    await page.close();
  }

  // 3. Mobile Dark (390px)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-mobile-dark.png', fullPage: true });
    await page.close();
  }

  // 4. Mobile Light (390px)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      const appShell = document.querySelector('.app-shell');
      if (appShell) appShell.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-mobile-light.png', fullPage: true });
    await page.close();
  }

  // 5. Results View Dark (Desktop) with prominent PDF download button
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(400);
    await page.fill('#target-url', 'https://example.com');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const h = document.querySelector('.site-header');
      if (h) h.style.position = 'relative';
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-results-dark.png', fullPage: true });
    await page.close();
  }

  // 6. Results View Light (Desktop)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(400);
    await page.fill('#target-url', 'https://example.com');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      const appShell = document.querySelector('.app-shell');
      if (appShell) appShell.setAttribute('data-theme', 'light');
      const h = document.querySelector('.site-header');
      if (h) h.style.position = 'relative';
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-results-light.png', fullPage: true });
    await page.close();
  }

  // 7. Documentation Modal (Desktop Dark)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(400);
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await b.innerText();
      if (text.includes('Méthodologie')) {
        await b.click();
        await page.waitForTimeout(400);
        break;
      }
    }
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-modal-dark.png' });
    await page.close();
  }

  // 8. History View Dark (Desktop)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(400);
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await b.innerText();
      if (text.includes('Historique')) {
        await b.click();
        await page.waitForTimeout(500);
        break;
      }
    }
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-history-dark.png', fullPage: true });
    await page.close();
  }

  // 9. History View Light (Desktop)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await setupMocks(page);
    await page.goto('http://127.0.0.1:5174');
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      const appShell = document.querySelector('.app-shell');
      if (appShell) appShell.setAttribute('data-theme', 'light');
    });
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await b.innerText();
      if (text.includes('Historique')) {
        await b.click();
        await page.waitForTimeout(500);
        break;
      }
    }
    await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-history-light.png', fullPage: true });
    await page.close();
  }

  await browser.close();
  console.log('All 9 screenshots generated successfully!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
