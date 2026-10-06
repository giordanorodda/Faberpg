/**
 * Takes screenshots of the running game (npm run dev must be running).
 *
 *   npx tsx scripts/screenshot.ts [url] [out-dir]
 *
 * Shots: the start, then the village at several times of day. Useful for
 * checking a change without playing (and for agents working on the code).
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'screenshots';
mkdirSync(out, { recursive: true });

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1152, height: 672 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

type Shot = { name: string; ora: string; setup?: string };
const shots: Shot[] = [
  { name: '01-casa-mattina', ora: '08:30' },
  { name: '02-piazza-mezzogiorno', ora: '12:15', setup: 'teleport(30,25)' },
  { name: '03-stagno-pomeriggio', ora: '16:00', setup: 'teleport(45,30)' },
  { name: '04-osteria-sera', ora: '20:30', setup: 'teleport(30,24)' },
  { name: '05-dentro-osteria-sera', ora: '20:30', setup: 'teleport(30,20)' },
  { name: '06-villaggio-notte', ora: '23:30', setup: 'teleport(31,27)' },
  { name: '07-bosco-mattina', ora: '09:30', setup: 'teleport(19,6)' },
];

for (const s of shots) {
  await page.goto(`${base}?nuovo&ora=${s.ora}`);
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); // close the help panel
  if (s.setup) {
    await page.evaluate((code) => {
      const g = (window as unknown as { game: { teleport(x: number, y: number): void } }).game;
      // eslint-disable-next-line no-new-func
      new Function('game', `game.${code}`)(g);
    }, s.setup);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${s.name}.png` });
  console.log(`✓ ${s.name}`);
}

await browser.close();
if (errors.length) {
  console.error('Errori nella pagina:\n' + errors.join('\n'));
  process.exit(1);
}
