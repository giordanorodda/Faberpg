import { ADVANCE_WHILE_AWAY, VIEW_H, VIEW_W } from './config';
import { Input } from './core/input';
import { loadFrom } from './core/save';
import { newGame } from './core/state';
import { MINUTES_PER_DAY } from './core/time';
import { BUILDINGS, FORAGE_SPOTS, MAP_ROWS, REGIONS, SPOTS } from './data/map';
import { NPCS } from './data/npcs';
import { Game } from './game';
import { Renderer } from './render/renderer';
import { Ui } from './ui/ui';
import { World } from './world/world';

const world = new World({ rows: MAP_ROWS, buildings: BUILDINGS, spots: SPOTS, regions: REGIONS, forage: FORAGE_SPOTS });
const store = window.localStorage;
const params = new URLSearchParams(location.search);
if (params.has('nuovo')) {
  store.removeItem('faberpg.save');
  store.removeItem('faberpg.save.prev');
}

const now = new Date();
const loaded = loadFrom(store);
const state = loaded ?? newGame((Math.random() * 2 ** 32) >>> 0, now.getHours() * 60 + now.getMinutes());
// For automated checks: ?ora=19:30 sets the time of day.
const ora = params.get('ora');

const canvas = document.getElementById('world') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLDivElement;
const input = new Input();
input.attach(window);
const ui = new Ui();
const renderer = new Renderer(canvas, world);
const game = new Game(state, world, NPCS, input, ui, renderer, store);

// The world went on while you were away (§3, §8). Nothing was lost meanwhile.
let awayMinutes = 0;
if (loaded && ADVANCE_WHILE_AWAY) {
  awayMinutes = Math.max(0, (Date.now() - loaded.savedAtReal) / 60000);
  if (awayMinutes > 1) game.advance(awayMinutes, true);
}
if (ora) {
  const [h, m] = ora.split(':').map(Number);
  const day = Math.floor(state.minutes / MINUTES_PER_DAY);
  game.advance(day * MINUTES_PER_DAY + h * 60 + (m || 0) - state.minutes, true);
}

function fit(): void {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H) * 4) / 4);
  stage.style.width = `${VIEW_W * scale}px`;
  stage.style.height = `${VIEW_H * scale}px`;
  stage.style.setProperty('--u', `${scale}px`);
}
window.addEventListener('resize', fit);
fit();

if (!loaded) {
  game.openHelp();
} else if (awayMinutes > 60 * 24) {
  const days = Math.floor(awayMinutes / (60 * 24));
  ui.toast(days === 1 ? 'Sei stato via un giorno. Ad Acquaferma la vita è andata avanti.' : `Sei stato via ${days} giorni. Ad Acquaferma la vita è andata avanti.`, 8);
} else if (awayMinutes > 120) {
  ui.toast('Sei stato via qualche ora. Il paese ha continuato senza di te.', 7);
}

const saveNow = () => game.save();
window.addEventListener('beforeunload', saveNow);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveNow();
});

let last = performance.now();
function frame(t: number): void {
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy in the browser console, and for automated screenshots.
(window as unknown as { game: Game; input: Input }).game = game;
(window as unknown as { game: Game; input: Input }).input = input;
