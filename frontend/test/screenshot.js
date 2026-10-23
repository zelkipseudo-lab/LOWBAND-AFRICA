import pkg from 'playwright';
const { chromium } = pkg;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5174');
  const toggle = await page.$('button');
  // Click theme toggle if found
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await b.innerText();
    if (text.includes('Thème') || text.includes('clair') || text.includes('sombre')) {
      await b.click();
      await page.waitForTimeout(400);
      break;
    }
  }
  await page.screenshot({ path: 'd:/LowBand_Africa/screenshot-light.png', fullPage: true });
  await browser.close();
  console.log('Done');
}
main();
