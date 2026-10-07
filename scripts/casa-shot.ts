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
const shots: [string, string, number | 'sit' | 'read', number, number, number, number][] = [
  ['c1-mattina', 'mattina', 2.3, 2.0, 50, -10, 0],
  ['c2-camino', 'pomeriggio', 0.6, 1.6, 75, -8, 0],
  ['c3-notte', 'notte', 0.7, 1.9, 70, -12, 0],
  ['c4-poltrona-notte', 'notte', 'sit', 0, 0, 0, 0],
  ['c5-tavolo', 'mattina', 0.3, 1.6, -70, -25, 0],
  ['c6-scala', 'pomeriggio', 2.4, -0.4, 40, 8, 0],
  ['c7-camera', 'mattina', 1.2, -0.3, 60, -14, UP],
  ['c8-camera-notte', 'notte', 1.0, 0.0, 65, -16, UP],
  ['c9-gatto', 'pomeriggio', -0.9, 0.6, 90, -40, UP],
  ['d1-angolo', 'pomeriggio', -0.5, 2.0, 70, -10, 0],
  ['d2-mensola', 'pomeriggio', -1.55, 0.0, 90, -16, 0],
  ['d3-poltrona', 'pomeriggio', -2.25, 0.62, -115, -24, 0],
  ['d4-tavolino', 'notte', -1.5, 1.95, 57, -42, 0],
  ['d5-lettura', 'notte', 'read', 0, 0, 0, 0],
  ['d6-lettura-giorno', 'pomeriggio', 'read', 1, 0, 0, 0],
  ['d7-gatto', 'pomeriggio', -0.85, 1.65, 90, -58, UP],
  ['d8-gatto-basso', 'pomeriggio', -0.85, 1.35, 100, -38, UP],
  ['d9-gatto-vicino', 'pomeriggio', -1.05, 1.3, 125, -28, UP - 0.8],
  ['k1-cucina', 'mattina', -0.9, 0.2, 55, -14, 0],
  ['k2-madia', 'pomeriggio', -1.5, -1.45, 75, -32, 0],
  ['k3-acquaio', 'mattina', -1.75, -0.95, 15, -22, 0],
  ['k4-cucina-notte', 'notte', -0.7, 0.4, 50, -14, 0],
  ['t1-tavolo', 'mattina', 0.5, 1.9, -60, -24, 0],
  ['t2-piattaia', 'mattina', 1.6, -0.35, -90, -10, 0],
  ['t3-ingresso', 'pomeriggio', 1.0, 0.9, 180, -22, 0],
  ['t4-camera', 'mattina', 0.9, -0.9, 170, -10, UP],
  ['g1-gatto-panca', 'mattina', 1.75, 1.45, -55, -30, 0],
  ['g2-gatto-ciotola', 'alba', -1.05, -0.75, 55, -35, 0],
  ['g3-gatto-fuoco', 'notte', -0.95, 0.75, 75, -30, 0],
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
      const b = (window as unknown as { bottega: { view(...a: number[]): void; sit(): void; read(i: number): void } }).bottega;
      if (x === 'sit') b.sit();
      else if (x === 'read') {
        b.sit();
        b.read(z as number);
      }
      else b.view(x as number, z as number, yaw as number, pitch as number, y as number);
    },
    [x, z, yaw, pitch, y] as const,
  );
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 240000 });
  console.log('ok', name);
}
await browser.close();
