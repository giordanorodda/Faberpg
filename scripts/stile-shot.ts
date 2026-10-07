/**
 * Screenshots of the style sketch (npm run dev must be running):
 *   npx tsx scripts/stile-shot.ts [out-dir]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
const views: [string, number[]][] = [
  ['s1-angolo', [1.15, 1.45, 1.35, -0.75, 0.95, -0.85]],
  ['s2-mensola', [0.35, 1.5, -0.4, 0.3, 1.45, -1.5]],
  ['s3-aglio-botte', [-0.2, 1.3, 0.2, -0.75, 1.2, -1.4]],
];
const only = process.env.SHOTS?.split(',');
for (const [name, v] of views) {
  if (only && !only.includes(name)) continue;
  await page.goto(`${base}stile.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => 'stile' in window, null, { timeout: 180000 });
  await page.evaluate((v) => (window as unknown as { stile: { view(...a: number[]): void } }).stile.view(...v), v);
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 240000 });
  console.log('ok', name);
}
await browser.close();
