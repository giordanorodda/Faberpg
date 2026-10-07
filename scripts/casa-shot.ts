/**
 * Screenshots of the house (npm run dev must be running):
 *   npx tsx scripts/casa-shot.ts [out-dir]      SHOTS=c1,c2 to pick some
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 300));
});
// name, time of day, x, z, yaw, pitch, floor height ('sit' sits in the armchair)
const UP = 2.68;
const shots: [string, string, number | 'sit', number, number, number, number][] = [
  ['c1-mattina', 'mattina', 2.3, 2.0, 50, -10, 0],
  ['c2-camino', 'pomeriggio', 0.6, 1.6, 75, -8, 0],
  ['c3-notte', 'notte', 0.7, 1.9, 70, -12, 0],
  ['c4-poltrona-notte', 'notte', 'sit', 0, 0, 0, 0],
  ['c5-tavolo', 'mattina', 0.3, 1.6, -70, -25, 0],
  ['c6-scala', 'pomeriggio', 2.4, -0.4, 40, 8, 0],
  ['c7-camera', 'mattina', 1.2, -0.3, 60, -14, UP],
  ['c8-camera-notte', 'notte', 1.0, 0.0, 65, -16, UP],
  ['c9-gatto', 'pomeriggio', -0.9, 0.6, 90, -40, UP],
  ['c10-libri', 'pomeriggio', -1.6, 1.75, 90, -14, 0],
];
const only = process.env.SHOTS?.split(',');
for (const [name, ora, x, z, yaw, pitch, y] of shots) {
  if (only && !only.includes(name)) continue;
  const t0 = Date.now();
  await page.goto(`${base}casa.html?ora=${ora}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => 'bottega' in window, null, { timeout: 240000 });
  console.log('loaded in', Date.now() - t0, 'ms');
  await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 3000));
  await page.evaluate(
    ([x, z, yaw, pitch, y]) => {
      const b = (window as unknown as { bottega: { view(...a: number[]): void; sit(): void } }).bottega;
      if (x === 'sit') b.sit();
      else b.view(x as number, z as number, yaw as number, pitch as number, y as number);
    },
    [x, z, yaw, pitch, y] as const,
  );
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 240000 });
  console.log('ok', name);
}
await browser.close();
