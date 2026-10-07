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
];
for (const [name, ora, x, z, yaw, pitch] of shots) {
  await page.goto(`${base}bottega.html?ora=${ora}`);
  await page.waitForTimeout(2500);
  await page.evaluate(([x, z, yaw, pitch]) => (window as unknown as { bottega: { view(...a: number[]): void } }).bottega.view(x, z, yaw, pitch), [x, z, yaw, pitch]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('ok', name);
}
await browser.close();
