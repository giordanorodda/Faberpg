import { FishingSession } from './activities/fishing';
import { forageAt } from './activities/forage';
import { AUTOSAVE_SECONDS, PLAYER_SPEED, TIME_SPEEDS } from './config';
import type { Action, Input } from './core/input';
import { saveTo, type KeyValueStore } from './core/save';
import type { GameState } from './core/state';
import {
  calendarOf,
  daylight,
  describeDate,
  formatClock,
  MINUTES_PER_DAY,
  WEEKDAY_NAMES,
  type Calendar,
} from './core/time';
import { weatherFor, type DayWeather } from './core/weather';
import { INSPECT } from './data/ambient';
import { DIALOGUE } from './data/dialogue';
import { item, ITEMS } from './data/items';
import { chooseLine, lineKey, type DialogueContext } from './dialogue/dialogue';
import { NpcActor } from './npc/actor';
import { resolveSchedule } from './npc/schedule';
import type { NpcDef } from './npc/types';
import { addItem, hasItem } from './player/inventory';
import type { Renderer, Scene } from './render/renderer';
import { esc, type Ui } from './ui/ui';
import type { Facing, Point } from './world/types';
import type { World } from './world/world';

type Mode = 'play' | 'dialogue' | 'choice' | 'panel' | 'fishing' | 'sleeping';

const DIR: Record<Facing, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const WAKE_MINUTE = 6 * 60 + 30;

export class Game {
  mode: Mode = 'play';
  readonly npcs: NpcActor[];
  /** Player position in tiles (fractional while walking) and the tile being walked to. */
  private px: number;
  private py: number;
  private target: Point | null = null;
  private walkTime = 0;
  private fishing: FishingSession | null = null;
  private fishingBobber: Point | null = null;
  private talkingTo: NpcActor | null = null;
  private pendingChoice: ((index: number) => void) | null = null;
  private lastRegion: string | null = null;
  private lastBuilding: string | null = null;
  private lastBump = 0;
  private autosaveTimer = 0;
  private time = 0;
  private weatherCache = new Map<number, DayWeather>();
  private lastDay: number;

  constructor(
    readonly state: GameState,
    private readonly world: World,
    npcDefs: NpcDef[],
    private readonly input: Input,
    private readonly ui: Ui,
    private readonly renderer: Renderer,
    private readonly store: KeyValueStore,
  ) {
    this.px = state.player.x;
    this.py = state.player.y;
    this.npcs = npcDefs.map((d) => new NpcActor(d, world.spots[resolveSchedule(d, this.cal, this.weather.kind).at]));
    this.lastDay = this.cal.day;
    this.syncNpcs(true);
    const here = this.world.interiorAt(this.px, this.py);
    this.lastBuilding = here?.id ?? null;
    this.lastRegion = this.world.regionAt(this.px, this.py)?.id ?? null;
  }

  // ------------------------------------------------------------ world state

  get cal(): Calendar {
    return calendarOf(this.state.minutes);
  }

  get weather(): DayWeather {
    return this.weatherOn(this.cal.day);
  }

  private weatherOn(day: number): DayWeather {
    let w = this.weatherCache.get(day);
    if (!w) {
      w = weatherFor(this.state.seed, day);
      this.weatherCache.set(day, w);
    }
    return w;
  }

  private get speed(): number {
    return TIME_SPEEDS[this.state.settings.speedIndex] ?? 1;
  }

  private get playerTile(): Point {
    return { x: Math.round(this.px), y: Math.round(this.py) };
  }

  private get flags(): Set<string> {
    return new Set(this.state.flags);
  }

  private setFlag(f: string): void {
    if (!this.state.flags.includes(f)) this.state.flags.push(f);
  }

  /** Moves the clock forward. A jump (sleep, return after absence) puts everyone where they should be. */
  advance(minutes: number, jump: boolean): void {
    this.state.minutes += minutes;
    const day = this.cal.day;
    if (day !== this.lastDay) {
      this.lastDay = day;
      this.state.saidToday = { day, keys: [] };
      this.state.foraged = { day, ids: [] };
    }
    this.syncNpcs(jump);
  }

  private syncNpcs(snap: boolean): void {
    const cal = this.cal;
    const w = this.weather.kind;
    for (const n of this.npcs) {
      if (n.talking) continue;
      n.setEntry(resolveSchedule(n.def, cal, w), this.world, snap);
    }
  }

  /** Buildings where someone is awake: their windows glow at night and the hearth burns. */
  private litBuildings(): Set<string> {
    const lit = new Set<string>();
    for (const n of this.npcs) {
      if (n.asleep) continue;
      const b = this.world.interiorAt(n.tileX, n.tileY);
      if (b) lit.add(b.id);
    }
    const m = this.cal.minute;
    const tavern = this.world.building('tavern');
    if (tavern && this.world.isDoorOpen(tavern, m)) lit.add('tavern');
    const home = this.world.interiorAt(this.playerTile.x, this.playerTile.y);
    if (home?.access === 'always') lit.add(home.id);
    return lit;
  }

  private forageToday(): { x: number; y: number; item: string; id: string }[] {
    const cal = this.cal;
    const out = [];
    for (const f of this.world.forage) {
      if (this.state.foraged.ids.includes(f.id)) continue;
      const it = forageAt(this.state.seed, cal.day, cal.season, f);
      if (it) out.push({ x: f.x, y: f.y, item: it, id: f.id });
    }
    return out;
  }

  // ------------------------------------------------------------ loop

  update(dt: number): void {
    this.time += dt;
    const actions = this.input.consume();

    if (this.mode !== 'sleeping' && this.mode !== 'panel') {
      // The world keeps going during conversations and while fishing.
      this.advance((dt * this.speed) / 60, false);
    }

    switch (this.mode) {
      case 'play':
        this.updatePlay(dt, actions);
        break;
      case 'dialogue':
        if (actions.includes('interact') || actions.includes('cancel')) {
          if (actions.includes('cancel') || !this.ui.advanceDialogue()) this.endDialogue();
        }
        break;
      case 'choice':
        for (const a of actions) {
          if (a === 'left' || a === 'up') this.ui.moveChoice(-1);
          if (a === 'right' || a === 'down') this.ui.moveChoice(1);
          if (a === 'interact' || a === 'cancel') {
            const pick = a === 'cancel' ? -1 : this.ui.choiceIndex;
            this.ui.closeChoice();
            this.mode = 'play';
            const cb = this.pendingChoice;
            this.pendingChoice = null;
            cb?.(pick);
            break;
          }
        }
        break;
      case 'panel':
        for (const a of actions) {
          if (a === 'cancel' || a === 'interact' || a === this.ui.panelKind) {
            this.ui.closePanel();
            this.mode = 'play';
          }
        }
        break;
      case 'fishing':
        this.updateFishing(dt, actions);
        break;
      case 'sleeping':
        break;
    }

    const speedFactor = Math.min(this.speed, 20);
    const pt = this.playerTile;
    for (const n of this.npcs) n.update(dt, speedFactor, (x, y) => x === pt.x && y === pt.y);

    this.autosaveTimer += dt;
    if (this.autosaveTimer > AUTOSAVE_SECONDS) this.save();
    this.updateHud();
  }

  render(): void {
    const scene: Scene = {
      cal: this.cal,
      weather: this.weather,
      daylight: daylight(this.state.minutes),
      time: this.time,
      player: { x: this.px, y: this.py, facing: this.state.player.facing, walkTime: this.walkTime },
      npcs: this.npcs,
      inside: this.world.interiorAt(this.playerTile.x, this.playerTile.y),
      lit: this.litBuildings(),
      forage: this.forageToday(),
      fishing: this.fishing && this.fishingBobber ? { bobber: this.fishingBobber, phase: this.fishing.phase } : null,
    };
    this.renderer.render(scene);
    this.updateLabel(scene);
  }

  /** Development helper: moves the player (used by scripts/screenshot.ts). */
  teleport(x: number, y: number): void {
    this.px = x;
    this.py = y;
    this.target = null;
    this.arrived();
  }

  save(): void {
    this.autosaveTimer = 0;
    this.state.player.x = this.target ? this.target.x : Math.round(this.px);
    this.state.player.y = this.target ? this.target.y : Math.round(this.py);
    try {
      saveTo(this.store, this.state);
    } catch (e) {
      console.warn('Salvataggio non riuscito', e);
    }
  }

  // ------------------------------------------------------------ walking

  private updatePlay(dt: number, actions: Action[]): void {
    for (const a of actions) {
      if (a === 'interact') this.interact();
      else if (a === 'inventory') this.openInventory();
      else if (a === 'notebook') this.openNotebook();
      else if (a === 'help') this.openHelp();
      else if (a === 'clock') this.state.settings.showClock = !this.state.settings.showClock;
      else if (a === 'speed') {
        this.state.settings.speedIndex = (this.state.settings.speedIndex + 1) % TIME_SPEEDS.length;
        if (this.speed === 1) this.ui.toast('Il tempo torna a scorrere come quello vero.');
      }
      if (this.mode !== 'play') return;
    }
    this.walk(dt);
  }

  private walk(dt: number): void {
    if (!this.target) {
      const dir = this.input.direction();
      if (!dir) {
        this.walkTime = 0;
        return;
      }
      const facing = dir as Facing;
      this.state.player.facing = facing;
      const from = this.playerTile;
      const to = { x: from.x + DIR[facing].x, y: from.y + DIR[facing].y };
      if (this.canStep(from, to)) this.target = to;
      else {
        this.walkTime = 0;
        this.bump(to);
        return;
      }
    }
    const t = this.target!;
    const dx = t.x - this.px;
    const dy = t.y - this.py;
    const dist = Math.hypot(dx, dy);
    const step = PLAYER_SPEED * dt;
    this.walkTime += dt;
    if (dist <= step) {
      this.px = t.x;
      this.py = t.y;
      this.target = null;
      this.arrived();
      // keep walking smoothly if the key is still held
      if (this.input.direction()) this.walk(0);
    } else {
      this.px += (dx / dist) * step;
      this.py += (dy / dist) * step;
    }
  }

  private canStep(from: Point, to: Point): boolean {
    if (!this.world.walkableForPlayer(to.x, to.y, this.cal.minute, from)) return false;
    return !this.npcAt(to);
  }

  private npcAt(p: Point): NpcActor | undefined {
    return this.npcs.find((n) => (n.tileX === p.x && n.tileY === p.y) || (n.path[0] && n.path[0].x === p.x && n.path[0].y === p.y));
  }

  /** Walking into something: a closed door or the edge of the known world says so, gently. */
  private bump(to: Point): void {
    if (this.time - this.lastBump < 2.5) return;
    const t = this.world.tile(to.x, to.y);
    if (t === '+') {
      this.lastBump = this.time;
      const b = this.world.buildingAt(to.x, to.y);
      if (b?.access === 'locked') this.ui.toast(`${b.name}: la porta è chiusa.`);
      else this.ui.toast(`${b?.name ?? 'La porta'}: chiuso, a quest'ora.`);
    } else if (t === 'X') {
      this.lastBump = this.time;
      this.ui.toast(INSPECT.X.join(' '));
    }
  }

  private arrived(): void {
    const p = this.playerTile;
    const b = this.world.interiorAt(p.x, p.y);
    if ((b?.id ?? null) !== this.lastBuilding) {
      this.lastBuilding = b?.id ?? null;
      if (b && b.access !== 'locked') this.ui.showLocation(b.name);
    }
    const r = b ? null : this.world.regionAt(p.x, p.y);
    if (!b && (r?.id ?? null) !== this.lastRegion) {
      this.lastRegion = r?.id ?? null;
      if (r) this.ui.showLocation(r.name);
    }
  }

  // ------------------------------------------------------------ interaction

  private interact(): void {
    const p = this.playerTile;
    const f = DIR[this.state.player.facing];
    const front = { x: p.x + f.x, y: p.y + f.y };

    // Across a counter you can still talk to whoever stands behind it.
    const across = this.world.tile(front.x, front.y) === 'C' ? { x: front.x + f.x, y: front.y + f.y } : front;
    const npc = this.npcAt(front) ?? this.npcAt(across);
    if (npc) return this.talk(npc);

    const forage = this.forageToday().find((it) => (it.x === front.x && it.y === front.y) || (it.x === p.x && it.y === p.y));
    if (forage) {
      addItem(this.state.inventory, forage.item);
      this.state.foraged.ids.push(forage.id);
      this.ui.toast(`Raccogli: ${item(forage.item).name.toLowerCase()}.`);
      return;
    }

    const tile = this.world.tile(front.x, front.y);
    const building = this.world.buildingAt(front.x, front.y);

    if (tile === '~') return this.startFishing(front);
    if (tile === 'B' && building?.access === 'always') return this.offerSleep();

    const lines = (building && INSPECT[`${building.id}:${tile}`]) || INSPECT[tile];
    if (lines) this.ui.toast(lines.join(' '), 9);
  }

  private label(n: NpcActor): string {
    return this.state.relations[n.def.id] ? n.def.name.split(' ')[0] : n.def.role;
  }

  private talk(npc: NpcActor): void {
    if (npc.asleep) {
      this.ui.toast(`(${this.state.relations[npc.def.id] ? npc.def.name.split(' ')[0] : 'Qualcuno'} dorme. Meglio non svegliarlo.)`);
      return;
    }
    const cal = this.cal;
    const rel = this.state.relations[npc.def.id];
    const lines = DIALOGUE[npc.def.id] ?? [];
    const here = this.world.interiorAt(npc.tileX, npc.tileY);
    const region = this.world.regionAt(npc.tileX, npc.tileY);
    const at = [here?.id, region?.id, npc.entry?.at].filter((s): s is string => !!s);
    const ctx: DialogueContext = {
      cal,
      weather: this.weather.kind,
      at,
      activity: npc.entry?.activity ?? 'rest',
      familiarity: rel?.fam ?? 0,
      firstMeeting: !rel,
      flags: this.flags,
      hasItem: (id) => hasItem(this.state.inventory, id),
      saidEver: new Set(this.state.said),
      saidToday: new Set(this.state.saidToday.keys),
    };
    const i = chooseLine(npc.def.id, lines, ctx, Math.random);
    const line = i >= 0 ? lines[i] : { text: ['(Ti fa un cenno con la testa.)'] };

    // Remember the conversation (§33): familiarity grows once per day.
    if (!rel) this.state.relations[npc.def.id] = { fam: 1, talks: 1, lastTalkDay: cal.day };
    else {
      if (rel.lastTalkDay !== cal.day) rel.fam = Math.min(10, rel.fam + 1);
      rel.talks++;
      rel.lastTalkDay = cal.day;
    }
    if (i >= 0) {
      const key = lineKey(npc.def.id, i);
      this.state.saidToday.keys.push(key);
      if (lines[i].once) this.state.said.push(key);
      for (const f of lines[i].sets ?? []) this.setFlag(f);
      const note = lines[i].note;
      if (note && !this.state.notebook.some((e) => e.text === note)) {
        this.state.notebook.push({ day: cal.day, text: note });
        window.setTimeout(() => this.ui.toast('Annoti qualcosa nel taccuino.', 4), 400);
      }
    }

    npc.talking = true;
    npc.faceTowards({ x: this.px, y: this.py });
    this.talkingTo = npc;
    this.mode = 'dialogue';
    this.ui.openDialogue(npc.def.name, line.text);
  }

  private endDialogue(): void {
    this.ui.closeDialogue();
    if (this.talkingTo) {
      this.talkingTo.talking = false;
      this.talkingTo = null;
    }
    this.mode = 'play';
    this.syncNpcs(false);
  }

  // ------------------------------------------------------------ fishing

  private startFishing(water: Point): void {
    if (!hasItem(this.state.inventory, 'canna')) {
      this.ui.toast('L\'acqua è ferma e scura. Senza una canna, puoi solo guardarla.');
      return;
    }
    // The float lands a couple of tiles out, if there is water there.
    const f = DIR[this.state.player.facing];
    let bobber = water;
    for (let k = 2; k <= 3; k++) {
      const c = { x: this.playerTile.x + f.x * k, y: this.playerTile.y + f.y * k };
      if (this.world.isWater(c.x, c.y)) bobber = c;
      else break;
    }
    this.fishing = new FishingSession(Math.random);
    this.fishingBobber = bobber;
    this.mode = 'fishing';
    this.ui.toast('Lanci la lenza. Ora si aspetta.', 4);
  }

  private updateFishing(dt: number, actions: Action[]): void {
    const s = this.fishing!;
    const cal = this.cal;
    const w = this.weather.kind;
    for (const ev of s.update(dt, cal, w)) {
      if (ev.type === 'ambient') this.ui.toast(ev.text, 8);
      if (ev.type === 'escaped') this.ui.toast('Il galleggiante torna su. Se n\'è andato.', 4);
    }
    const moving = this.input.direction() !== null;
    for (const a of actions) {
      if (a === 'cancel' || (moving && s.phase !== 'bite')) return this.stopFishing('Ritiri la lenza.');
      if (a === 'interact') {
        const res = s.pull(cal, w);
        if (res?.type === 'caught') {
          addItem(this.state.inventory, res.item);
          return this.stopFishing(`Hai preso: ${item(res.item).name.toLowerCase()}.`);
        }
        return this.stopFishing(s.phase === 'waiting' ? 'Ritiri la lenza. Niente, per ora.' : 'Ritiri la lenza.');
      }
    }
    if (moving && s.phase === 'bite') this.stopFishing('Ritiri la lenza.');
  }

  private stopFishing(message: string): void {
    this.fishing = null;
    this.fishingBobber = null;
    this.mode = 'play';
    this.ui.toast(message, 5);
  }

  // ------------------------------------------------------------ sleep

  private offerSleep(): void {
    const m = this.cal.minute;
    const night = m >= 19 * 60 || m < 5 * 60;
    this.pendingChoice = (i) => {
      if (i !== 0) return;
      const now = this.state.minutes;
      const dayStart = Math.floor(now / MINUTES_PER_DAY) * MINUTES_PER_DAY;
      let until: number;
      if (!night) until = now + 120;
      else if (m < 5 * 60) until = dayStart + WAKE_MINUTE;
      else until = dayStart + MINUTES_PER_DAY + WAKE_MINUTE;
      this.sleepUntil(until, night);
    };
    this.mode = 'choice';
    this.ui.openChoice(night ? 'Dormire fino al mattino?' : 'Riposare un paio d\'ore?', ['Sì', 'Non ancora']);
  }

  private sleepUntil(until: number, night: boolean): void {
    this.mode = 'sleeping';
    this.ui.setFade(true);
    window.setTimeout(() => {
      this.advance(until - this.state.minutes, true);
      this.save();
      window.setTimeout(() => {
        this.ui.setFade(false);
        this.mode = 'play';
        this.ui.toast(night ? this.wakeLine() : 'Ti alzi. La luce, fuori, è cambiata.', 7);
      }, 700);
    }, 1000);
  }

  private wakeLine(): string {
    const w = this.weather;
    if (w.kind === 'rain') return 'Ti svegli col rumore della pioggia sul tetto.';
    if (w.morningFog) return 'Ti svegli. Dalla finestra, la nebbia copre lo stagno.';
    if (w.kind === 'cloudy') return 'Ti svegli. Il cielo è basso e grigio.';
    return 'Ti svegli. Fuori il cielo è limpido.';
  }

  // ------------------------------------------------------------ panels

  private openInventory(): void {
    const inv = this.state.inventory;
    const html = inv.length
      ? ITEMS.filter((it) => inv.some((e) => e.id === it.id))
          .map((it) => {
            const q = inv.find((e) => e.id === it.id)!.qty;
            return `<div class="item"><b>${esc(it.name)}</b>${q > 1 ? ` <span class="qty">×${q}</span>` : ''}<div class="desc">${esc(it.description)}</div></div>`;
          })
          .join('')
      : '<p>Niente. Le tasche vuote hanno un loro peso.</p>';
    this.mode = 'panel';
    this.ui.openPanel('inventory', 'Quello che porti con te', html);
  }

  private openNotebook(): void {
    const html = this.state.notebook
      .slice()
      .reverse()
      .map((e) => {
        const c = calendarOf(e.day * MINUTES_PER_DAY);
        return `<p><span class="day">${esc(describeDate(c))}</span><br>${esc(e.text)}</p>`;
      })
      .join('');
    this.mode = 'panel';
    this.ui.openPanel('notebook', 'Taccuino', html);
  }

  openHelp(): void {
    const html = `
      <p>Acquaferma è un villaggio piccolo. Qui non devi diventare qualcuno: puoi semplicemente esserci.</p>
      <p><kbd>WASD</kbd> o frecce: cammina &nbsp; <kbd>E</kbd> / <kbd>Spazio</kbd>: parla, guarda, raccogli, pesca, dormi</p>
      <p><kbd>I</kbd>: quello che porti con te &nbsp; <kbd>N</kbd>: taccuino &nbsp; <kbd>T</kbd>: mostra o nascondi l'ora &nbsp; <kbd>H</kbd>: questo aiuto</p>
      <p>Il tempo scorre come quello vero: una giornata ad Acquaferma dura una giornata. Puoi dormire nel tuo letto per arrivare al mattino.</p>
      <p>Per pescare, mettiti davanti all'acqua con la canna e premi <kbd>E</kbd>. Poi aspetta. Quando il galleggiante va giù, premi di nuovo <kbd>E</kbd>.</p>
      <p class="day">Durante lo sviluppo: <kbd>V</kbd> accelera il tempo (×1, ×10, ×60, ×600).</p>`;
    this.mode = 'panel';
    this.ui.openPanel('help', 'Un piccolo mondo in cui abitare', html);
  }

  // ------------------------------------------------------------ HUD

  private updateHud(): void {
    const c = this.cal;
    this.ui.setClock(
      this.state.settings.showClock
        ? `${WEEKDAY_NAMES[c.weekday]} · ${formatClock(c.minute)}<div class="date">${esc(describeDate(c))}</div>`
        : null,
    );
    this.ui.setSpeed(this.speed === 1 ? null : `tempo ×${this.speed}`);
  }

  private updateLabel(scene: Scene): void {
    if (this.mode !== 'play' && this.mode !== 'fishing') return this.ui.setLabel(null);
    const p = this.playerTile;
    const f = DIR[this.state.player.facing];
    const n = this.npcAt({ x: p.x + f.x, y: p.y + f.y });
    if (!n || (scene.inside === null && this.world.interiorAt(n.tileX, n.tileY))) return this.ui.setLabel(null);
    const s = this.renderer.toScreen(n.x + 0.5, n.y);
    const rect = this.renderer.canvas.getBoundingClientRect();
    const k = rect.width / this.renderer.canvas.width;
    this.ui.setLabel(this.label(n), s.x * k, s.y * k);
  }
}
