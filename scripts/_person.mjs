import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
for (const q of ['', 'vicino']) {
  await page.goto('http://localhost:5173/persona.html?' + q, { timeout: 240000 });
  await page.waitForFunction(() => window.ready, null, { timeout: 240000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/n-persone${q ? '-vicino' : ''}.png`, timeout: 240000 });
}
await browser.close();
