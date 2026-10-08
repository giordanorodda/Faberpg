/**
 * Screenshots of the lived-in houses, with their people. Starts its own
 * Vite server, so nothing else needs to be running:
 *   npx tsx scripts/interni-shot.ts [out-dir]      SHOTS=e1,k2 to pick some
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await server.listen();
const base = 'http://localhost:5199/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 300));
});
// name, page, minute of day, weekday, x, z, yaw, pitch, then optionally a person to talk to
type Shot = [string, string, number, number, number, number, number, number, string?];
const shots: Shot[] = [
  ['e1-erbe-mattina', 'erbe', 600, 1, 1.8, 1.9, 30, -10],
  ['e2-erbe-fuoco', 'erbe', 1140, 1, 0.6, 1.2, 70, -12],
  ['e3-erbe-notte', 'erbe', 1260, 1, 1.6, 1.8, 40, -14],
  ['e4-erbe-rastrelliera', 'erbe', 960, 1, -0.6, -0.2, 150, -10],
  ['e5-erbe-letto', 'erbe', 120, 1, 0.6, 0.6, -60, -22],
  ['e6-erbe-parla', 'erbe', 660, 1, 0.9, -0.5, 30, -8, 'ysolde'],
  ['k1-carto-mattina', 'cartografo', 600, 1, -1.8, 1.9, -20, -12],
  ['k2-carto-mappe', 'cartografo', 640, 1, 0.3, 0.0, -10, -16],
  ['k3-carto-cannocchiale', 'cartografo', 1080, 1, 1.0, 0.8, 110, -6],
  ['k4-carto-domenica', 'cartografo', 960, 6, 0.9, 0.9, -70, -14],
  ['k5-carto-notte', 'cartografo', 1320, 1, -1.2, 1.8, -30, -12],
  ['k6-carto-parla', 'cartografo', 900, 1, -1.9, 0.3, 80, -10, 'corvino'],
];
const only = process.env.SHOTS?.split(',');
let current = '';
for (const [name, place, minute, weekday, x, z, yaw, pitch, talk] of shots) {
  if (only && !only.some((o) => name.startsWith(o))) continue;
  if (current !== place) {
    await page.goto(`${base}${place}.html`, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => (window as unknown as { interno?: unknown }).interno, null, { timeout: 300000 });
    current = place;
  }
  const who = await page.evaluate(([m, w, x, z, y, p]) => {
    const I = (window as any).interno;
    const r = I.at(m, w);
    I.view(x, z, y, p);
    return r;
  }, [minute, weekday, x, z, yaw, pitch]);
  console.log(name, JSON.stringify(who));
  if (talk) {
    const st = await page.evaluate((id) => (window as any).interno.talk(id), talk);
    console.log('  talk:', JSON.stringify(st).slice(0, 400));
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 180000 });
  if (talk) await page.keyboard.press('Escape');
}
await browser.close();
await server.close();
