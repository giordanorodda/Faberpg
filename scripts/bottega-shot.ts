/**
 * Screenshots of the 3D shop (npm run dev must be running):
 *   npx tsx scripts/bottega-shot.ts [out-dir]
 * Headless Chromium renders WebGL in software, so it is slow: a few seconds per shot.
 */
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? 'screenshots';
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? 'http://localhost:5173/';
const pageName = process.env.PAGE ?? 'bottega.html';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 300)); });
const shots: [string, string, number, number, number, number][] = [
  ['b1-mattina', 'mattina', 1.4, 1.8, 35, -8],
  ['b2-bancone', 'mattina', -0.6, 0.6, 0, -18],
  ['b3-tramonto', 'tramonto', 2.6, -0.2, 60, -6],
  ['b4-notte', 'notte', 1.0, 1.2, 20, -10],
  ['b5-registro', 'pomeriggio', 0.0, -0.45, 0, -55],
  ['b6-porta', 'pomeriggio', -0.4, 0.2, 165, -4],
  ['b7-notte-scaffali', 'notte', 2.6, 0.4, 25, 4],
  ['b8-bancone-tramonto', 'tramonto', 0.1, -0.35, 15, -42],
  ['b9-parete-ovest', 'mattina', 0.6, 0.6, 90, 2],
];
const only = process.env.SHOTS?.split(',');
for (const [name, ora, x, z, yaw, pitch] of shots) {
  if (only && !only.includes(name)) continue;
  const t0 = Date.now();
  await page.goto(`${base}${pageName}?ora=${ora}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => 'bottega' in window, null, { timeout: 180000 });
  console.log('loaded in', Date.now() - t0, 'ms');
  await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 8000)); // models and panoramas load asynchronously
  await page.evaluate(([x, z, yaw, pitch]) => (window as unknown as { bottega: { view(...a: number[]): void } }).bottega.view(x, z, yaw, pitch), [x, z, yaw, pitch]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 240000 });
  console.log('ok', name);
}
await browser.close();
