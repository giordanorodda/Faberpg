/**
 * Bakes the procedural materials of the shop into image files under
 * public/textures/ (npm run dev must be running):
 *
 *   npm run bake            all of them
 *   npm run bake -- floor   only some
 *
 * Generation is slow (seconds per material), which is why the game loads
 * the images instead of generating them at every start.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.BASE_URL ?? 'http://localhost:5173/';
const out = 'public/textures';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto(`${base}tools/bake.html`);
await page.waitForFunction(() => 'bake' in window);
const all = (await page.evaluate(() => (window as unknown as { recipes: string[] }).recipes)) as string[];
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : all;
for (const name of wanted) {
  const t0 = Date.now();
  const imgs = (await page.evaluate((n) => (window as unknown as { bake: (n: string) => Record<string, string> }).bake(n), name)) as Record<string, string>;
  for (const [kind, url] of Object.entries(imgs)) writeFileSync(`${out}/${name}_${kind}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close();
