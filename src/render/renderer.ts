import { TILE, VIEW_H, VIEW_W } from '../config';
import { hash, hash01 } from '../core/rng';
import type { Calendar, Season } from '../core/time';
import type { DayWeather } from '../core/weather';
import type { NpcActor } from '../npc/actor';
import type { NpcLook } from '../npc/types';
import type { BuildingDef, Facing, Point } from '../world/types';
import type { World } from '../world/world';
import { COLORS, PLAYER_LOOK, SEASON_PALETTES, type SeasonPalette } from './palette';
import { drawCharacter, drawSleeper, shade } from './sprites';

export interface Scene {
  cal: Calendar;
  weather: DayWeather;
  /** 0 night .. 1 day. */
  daylight: number;
  /** Real seconds since start, for animations. */
  time: number;
  player: { x: number; y: number; facing: Facing; walkTime: number };
  npcs: NpcActor[];
  /** The building the player is inside, if any. */
  inside: BuildingDef | null;
  /** Buildings with someone awake inside (lit windows at night). */
  lit: ReadonlySet<string>;
  forage: { x: number; y: number; item: string }[];
  fishing: { bobber: Point; phase: string } | null;
}

const T = TILE;

/** Tile columns of a building's front windows: every other tile, away from the door. */
function windowsOf(b: BuildingDef): number[] {
  const xs: number[] = [];
  for (let x = b.x + 1; x < b.x + b.w - 1; x++) {
    if (Math.abs(x - b.door.x) <= 1) continue;
    if (b.w > 5 && (x - b.x) % 2 === 0) continue;
    xs.push(x);
  }
  return xs;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ground: HTMLCanvasElement | null = null;
  private groundSeason: Season | null = null;
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private rain: { x: number; y: number; s: number }[] = [];
  camX = 0;
  camY = 0;

  constructor(canvas: HTMLCanvasElement, private world: World) {
    this.canvas = canvas;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.light = document.createElement('canvas');
    this.light.width = VIEW_W;
    this.light.height = VIEW_H;
    this.lctx = this.light.getContext('2d')!;
    for (let i = 0; i < 140; i++) this.rain.push({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, s: 0.7 + Math.random() * 0.6 });
  }

  /** Screen position (in view pixels) of a tile coordinate. */
  toScreen(x: number, y: number): Point {
    return { x: x * T - this.camX, y: y * T - this.camY };
  }

  render(s: Scene): void {
    const ctx = this.ctx;
    const pal = SEASON_PALETTES[s.cal.season];
    if (!this.ground || this.groundSeason !== s.cal.season) {
      this.ground = this.buildGround(pal, s.cal.season);
      this.groundSeason = s.cal.season;
    }
    // camera follows the player, clamped to the map
    const mw = this.world.width * T;
    const mh = this.world.height * T;
    this.camX = Math.round(Math.min(Math.max(s.player.x * T + T / 2 - VIEW_W / 2, 0), mw - VIEW_W));
    this.camY = Math.round(Math.min(Math.max(s.player.y * T + T / 2 - VIEW_H / 2, 0), mh - VIEW_H));

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(this.ground, -this.camX, -this.camY);

    const x0 = Math.max(0, Math.floor(this.camX / T) - 1);
    const y0 = Math.max(0, Math.floor(this.camY / T) - 1);
    const x1 = Math.min(this.world.width - 1, Math.ceil((this.camX + VIEW_W) / T) + 1);
    const y1 = Math.min(this.world.height - 1, Math.ceil((this.camY + VIEW_H) / T) + 2);

    this.drawWater(s, x0, y0, x1, y1);
    this.drawFires(s, x0, y0, x1, y1);
    for (const f of s.forage) this.drawForage(f.x * T - this.camX, f.y * T - this.camY, f.item);

    // Y-sorted pass: trees, people, roofs.
    const drawables: { y: number; draw: () => void }[] = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (this.world.tile(x, y) === 'T') drawables.push({ y: y + 0.4, draw: () => this.drawTree(x, y, pal) });
      }
    }
    for (const n of s.npcs) {
      drawables.push({
        y: n.y + 0.5,
        draw: () => {
          const sx = Math.round(n.x * T - this.camX);
          const sy = Math.round(n.y * T - this.camY);
          if (n.asleep) drawSleeper(this.ctx, sx, sy, n.def.look, s.time + n.def.age);
          else drawCharacter(this.ctx, sx, sy, n.def.look, n.facing, n.walkTime);
          if (n.entry?.activity === 'fish' && !n.moving) this.drawRod(sx, sy, n.facing, s.time);
        },
      });
    }
    drawables.push({
      y: s.player.y + 0.5,
      draw: () => {
        const sx = Math.round(s.player.x * T - this.camX);
        const sy = Math.round(s.player.y * T - this.camY);
        drawCharacter(this.ctx, sx, sy, PLAYER_LOOK as NpcLook, s.player.facing, s.player.walkTime);
        if (s.fishing) this.drawFishingLine(sx, sy, s.player.facing, s.fishing, s.time);
      },
    });
    for (const b of this.world.buildings) {
      if (b === s.inside) continue;
      drawables.push({ y: b.y + b.h - 0.5, draw: () => this.drawBuildingOutside(b, s) });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    if (s.inside) this.dimOutside(s.inside);
    this.drawWeather(s);
    this.drawLight(s);
  }

  // ---------------------------------------------------------------- ground

  private buildGround(pal: SeasonPalette, season: Season): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.world.width * T;
    c.height = this.world.height * T;
    const g = c.getContext('2d')!;
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) this.drawGroundTile(g, x, y, pal, season);
    }
    return c;
  }

  private drawGroundTile(g: CanvasRenderingContext2D, x: number, y: number, pal: SeasonPalette, season: Season): void {
    const t = this.world.tile(x, y);
    const X = x * T;
    const Y = y * T;
    const h = hash(x, y);
    const fill = (c: string, dx = 0, dy = 0, w = T, hh = T) => {
      g.fillStyle = c;
      g.fillRect(X + dx, Y + dy, w, hh);
    };
    const speckle = (c: string, n: number, salt: number) => {
      for (let i = 0; i < n; i++) {
        const r = hash(x, y, salt, i);
        fill(c, r % 16, (r >> 4) % 16, 1, 1);
      }
    };
    const grass = () => {
      fill(pal.grass);
      speckle(pal.grassDark, 6, 1);
      speckle(pal.grassLight, 4, 2);
    };
    const floor = () => {
      fill(COLORS.floor);
      for (let i = 0; i < 4; i++) fill(COLORS.floorDark, 0, i * 4 + 3, T, 1);
      fill(COLORS.floorDark, (h % 12) + 2, 0, 1, 3);
    };
    switch (t) {
      case '.':
      case 'T':
        grass();
        break;
      case ',':
        grass();
        for (let i = 0; i < 5; i++) {
          const r = hash(x, y, 3, i);
          fill(pal.grassDark, r % 14 + 1, (r >> 4) % 10 + 4, 1, 3);
          fill(pal.grassLight, r % 14 + 2, (r >> 4) % 10 + 3, 1, 2);
        }
        break;
      case '*':
        grass();
        if (pal.flowers.length > 0) {
          for (let i = 0; i < 4; i++) {
            const r = hash(x, y, 4, i);
            fill(pal.flowers[r % pal.flowers.length], (r >> 3) % 14 + 1, (r >> 7) % 14 + 1, 2, 2);
          }
        }
        break;
      case 't':
        grass();
        g.fillStyle = pal.bareTrees ? '#6a5a44' : pal.canopyDark;
        g.beginPath();
        g.arc(X + 8, Y + 9, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = pal.bareTrees ? '#7a6a54' : pal.canopy[h % pal.canopy.length];
        g.beginPath();
        g.arc(X + 7, Y + 8, 4, 0, Math.PI * 2);
        g.fill();
        break;
      case ':':
      case 'X':
        fill(COLORS.path);
        speckle(COLORS.pathDark, 5, 5);
        speckle(COLORS.pathLight, 3, 6);
        this.blendEdges(g, x, y, pal);
        break;
      case 'n':
        fill(COLORS.path);
        speckle(COLORS.pathDark, 4, 5);
        fill(COLORS.woodDark, 2, 9, 12, 2);
        fill(COLORS.wood, 2, 6, 12, 3);
        fill(COLORS.woodLight, 2, 6, 12, 1);
        break;
      case 's':
        fill(COLORS.sand);
        speckle(COLORS.sandDark, 6, 7);
        break;
      case 'r':
        fill(COLORS.sand);
        for (let i = 0; i < 6; i++) {
          const r = hash(x, y, 8, i);
          const rx = (r % 13) + 1;
          fill(season === 3 ? '#9a8a5a' : '#4f7a3a', rx, 2 + ((r >> 4) % 4), 1, 12);
          fill(season === 3 ? '#b09a6a' : '#6a9a4a', rx, 2 + ((r >> 4) % 4), 1, 2);
        }
        break;
      case '~':
        fill(COLORS.water);
        break;
      case '=':
        fill(COLORS.water);
        fill(COLORS.wood, 0, 2, T, 12);
        for (let i = 0; i < 4; i++) fill(COLORS.woodDark, i * 4 + 3, 2, 1, 12);
        fill(COLORS.woodDark, 0, 13, T, 1);
        break;
      case 'o': {
        fill(COLORS.soil);
        for (let i = 0; i < 4; i++) fill(COLORS.soilDark, 0, i * 4 + 2, T, 1);
        if (pal.sprouts) for (let i = 0; i < 4; i++) fill(pal.sprouts, ((h >> (i * 3)) % 4) + i * 4, i * 4, 2, 2);
        break;
      }
      case 'f':
        grass();
        fill(COLORS.woodDark, 0, 6, T, 2);
        fill(COLORS.woodDark, 0, 11, T, 2);
        fill(COLORS.wood, 2, 3, 2, 12);
        fill(COLORS.wood, 12, 3, 2, 12);
        break;
      case 'w':
        fill(COLORS.path);
        g.fillStyle = COLORS.stone;
        g.beginPath();
        g.arc(X + 8, Y + 8, 7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = COLORS.stoneDark;
        g.beginPath();
        g.arc(X + 8, Y + 8, 4.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#1e2a34';
        g.beginPath();
        g.arc(X + 8, Y + 8, 3.5, 0, Math.PI * 2);
        g.fill();
        break;
      case '_':
        floor();
        break;
      case '#':
        fill(COLORS.wallDark);
        fill(COLORS.wall, 1, 1, T - 2, T - 2);
        speckle(COLORS.wallDark, 4, 9);
        break;
      case '+':
        floor();
        fill(COLORS.woodDark, 2, 0, 12, T);
        fill(COLORS.wood, 3, 1, 10, T - 2);
        fill(COLORS.woodDark, 8, 1, 1, T - 2);
        break;
      case 'B': {
        floor();
        const blanket = ['#7a3a3a', '#3a5a7a', '#5a6a3a', '#7a5a3a'][h % 4];
        fill(COLORS.woodDark, 1, 0, 14, T);
        fill('#e8e0d0', 2, 1, 12, 4);
        fill(blanket, 2, 5, 12, 10);
        fill(shade(blanket, 20), 2, 5, 12, 1);
        break;
      }
      case 'C':
        floor();
        fill(COLORS.woodDark, 0, 2, T, 12);
        fill(COLORS.woodLight, 0, 2, T, 3);
        break;
      case 'h':
        floor();
        fill(COLORS.woodDark, 2, 3, 12, 10);
        fill(COLORS.wood, 2, 3, 12, 8);
        fill(COLORS.woodLight, 3, 4, 10, 1);
        break;
      case 'F':
        floor();
        fill(COLORS.stoneDark, 0, 0, T, T);
        fill(COLORS.stone, 1, 1, 14, 3);
        fill('#2a2422', 3, 5, 10, 9);
        break;
      case 'S': {
        floor();
        fill(COLORS.woodDark, 0, 0, T, 12);
        const books = ['#7a3030', '#30507a', '#4a6a30', '#8a7030', '#5a3a6a'];
        for (let row = 0; row < 2; row++) {
          for (let i = 0; i < 5; i++) {
            if ((h >> (i + row * 5)) & 1) fill(books[(h + i + row) % books.length], 1 + i * 3, 1 + row * 5, 2, 4);
          }
        }
        break;
      }
      case 'k':
        floor();
        g.fillStyle = COLORS.woodDark;
        g.beginPath();
        g.arc(X + 8, Y + 8, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = COLORS.wood;
        g.beginPath();
        g.arc(X + 8, Y + 8, 4.5, 0, Math.PI * 2);
        g.fill();
        fill('#3a3a3a', 2, 7, 12, 1);
        break;
      case 'l':
        floor();
        fill(COLORS.woodDark, 1, 1, 14, 2);
        fill(COLORS.woodDark, 1, 13, 14, 2);
        fill(COLORS.woodDark, 1, 1, 2, 14);
        fill(COLORS.woodDark, 13, 1, 2, 14);
        for (let i = 0; i < 5; i++) fill(i % 2 ? '#3a4a8a' : '#c8a83a', 3, 4 + i * 2, 10, 1);
        break;
      default:
        grass();
    }
  }

  /** Softens the border between a path and the grass around it. */
  private blendEdges(g: CanvasRenderingContext2D, x: number, y: number, pal: SeasonPalette): void {
    const isPath = (t: string) => t === ':' || t === 'X' || t === 'n' || t === 'w' || t === '+' || t === '=' || t === 'o' || t === 's' || t === '#' || t === '_';
    const X = x * T;
    const Y = y * T;
    g.fillStyle = pal.grass;
    const nb: [number, number, (i: number) => [number, number]][] = [
      [0, -1, (i) => [i, 0]],
      [0, 1, (i) => [i, 15]],
      [-1, 0, (i) => [0, i]],
      [1, 0, (i) => [15, i]],
    ];
    for (const [dx, dy, at] of nb) {
      if (isPath(this.world.tile(x + dx, y + dy))) continue;
      for (let i = 0; i < 16; i++) {
        if (hash(x, y, dx * 3 + dy, i) % 3 === 0) {
          const [px, py] = at(i);
          g.fillRect(X + px, Y + py, 1, 1);
        }
      }
    }
  }

  // ---------------------------------------------------------------- dynamic layers

  private drawWater(s: Scene, x0: number, y0: number, x1: number, y1: number): void {
    const ctx = this.ctx;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!this.world.isWater(x, y)) continue;
        const sx = x * T - this.camX;
        const sy = y * T - this.camY;
        // depth: darker away from the shore
        let edge = 0;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (!this.world.isWater(x + dx, y + dy)) edge++;
        if (edge === 0) {
          ctx.fillStyle = COLORS.waterDeep;
          ctx.fillRect(sx, sy, T, T);
        }
        if (!this.world.isWater(x, y - 1)) {
          ctx.fillStyle = 'rgba(20,40,50,0.35)';
          ctx.fillRect(sx, sy, T, 2);
        }
        // slow moving glints
        const r = hash(x, y, 77);
        const phase = (s.time * 0.25 + (r % 1000) / 1000) % 1;
        if (phase < 0.45) {
          const len = 3 + (r % 4);
          const gx = (r >> 4) % (T - len);
          const gy = (r >> 8) % 14 + 1;
          ctx.fillStyle = s.daylight > 0.3 ? COLORS.waterLight : 'rgba(200,210,240,0.5)';
          ctx.globalAlpha = Math.sin((phase / 0.45) * Math.PI) * 0.8;
          ctx.fillRect(sx + gx + Math.round(phase * 3), sy + gy, len, 1);
          ctx.globalAlpha = 1;
        }
        // stars reflected on clear nights
        if (s.daylight < 0.2 && s.weather.kind === 'clear' && hash01(x, y, 9) < 0.25) {
          const tw = 0.5 + 0.5 * Math.sin(s.time * 1.3 + (r % 100));
          ctx.fillStyle = `rgba(240,240,255,${0.5 * tw})`;
          ctx.fillRect(sx + (r % 15), sy + ((r >> 5) % 15), 1, 1);
        }
        // rain rings
        if (s.weather.kind === 'rain') {
          const rp = (s.time * 0.9 + (r % 997) / 997) % 1;
          if (rp < 0.5) {
            ctx.strokeStyle = `rgba(200,220,235,${0.5 - rp})`;
            ctx.beginPath();
            ctx.arc(sx + (r % 12) + 2, sy + ((r >> 6) % 12) + 2, 1 + rp * 5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
    }
  }

  private drawFires(s: Scene, x0: number, y0: number, x1: number, y1: number): void {
    const ctx = this.ctx;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (this.world.tile(x, y) !== 'F') continue;
        const b = this.world.buildingAt(x, y);
        if (b && !s.lit.has(b.id)) continue;
        const sx = x * T - this.camX;
        const sy = y * T - this.camY;
        const f = Math.sin(s.time * 9 + x) * 0.5 + 0.5;
        ctx.fillStyle = '#c8501e';
        ctx.fillRect(sx + 4, sy + 8, 8, 5);
        ctx.fillStyle = '#f0a030';
        ctx.fillRect(sx + 5 + Math.round(f), sy + 7 - Math.round(f * 2), 5, 5);
        ctx.fillStyle = '#ffe080';
        ctx.fillRect(sx + 7, sy + 10 - Math.round(f), 2, 2);
      }
    }
  }

  private drawForage(sx: number, sy: number, item: string): void {
    const ctx = this.ctx;
    const dot = (c: string, x: number, y: number, w = 2, h = 2) => {
      ctx.fillStyle = c;
      ctx.fillRect(sx + x, sy + y, w, h);
    };
    switch (item) {
      case 'prugnolo':
      case 'porcino': {
        const cap = item === 'porcino' ? '#7a4a24' : '#ece4d0';
        dot('#e8dcc0', 5, 9, 2, 4);
        dot(cap, 3, 7, 6, 3);
        dot('#e8dcc0', 10, 11, 2, 3);
        dot(cap, 9, 9, 4, 2);
        break;
      }
      case 'fragoline':
      case 'more':
      case 'rosa_canina': {
        const c = item === 'more' ? '#3a1e3a' : '#d0302a';
        dot('#3f6a30', 3, 8, 9, 4);
        dot(c, 4, 9);
        dot(c, 8, 8);
        dot(c, 10, 11);
        break;
      }
      case 'castagne':
        dot('#6a3a1a', 4, 9, 3, 3);
        dot('#6a3a1a', 9, 10, 3, 3);
        dot('#a8b040', 6, 6, 4, 3);
        break;
      case 'sasso':
        dot('#a0a0a8', 5, 10, 6, 2);
        dot('#c0c0c8', 6, 10, 3, 1);
        break;
      default: {
        // herbs
        const c = item === 'tarassaco' ? '#f0d040' : item === 'menta' ? '#7ab07a' : '#4f8a3a';
        dot('#3f7a30', 4, 7, 1, 6);
        dot('#3f7a30', 7, 6, 1, 7);
        dot('#3f7a30', 10, 8, 1, 5);
        dot(c, 3, 6);
        dot(c, 6, 5);
        dot(c, 9, 7);
      }
    }
  }

  private drawTree(x: number, y: number, pal: SeasonPalette): void {
    const ctx = this.ctx;
    const sx = x * T - this.camX;
    const sy = y * T - this.camY;
    const h = hash(x, y, 31);
    const conifer = h % 5 === 0;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(sx + 2, sy + 12, 12, 3);
    ctx.fillStyle = COLORS.trunk;
    ctx.fillRect(sx + 6, sy + 6, 4, 9);
    if (conifer) {
      const c = pal.bareTrees ? '#2f4a36' : shade(pal.canopyDark, 8);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(sx + 8, sy - 10);
      ctx.lineTo(sx + 15, sy + 10);
      ctx.lineTo(sx + 1, sy + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(c, 14);
      ctx.fillRect(sx + 7, sy - 6, 2, 12);
      return;
    }
    if (pal.bareTrees) {
      ctx.strokeStyle = COLORS.trunk;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + 8, sy + 6);
      ctx.lineTo(sx + 3, sy - 4);
      ctx.moveTo(sx + 8, sy + 4);
      ctx.lineTo(sx + 13, sy - 5);
      ctx.moveTo(sx + 8, sy + 6);
      ctx.lineTo(sx + 8, sy - 7);
      ctx.stroke();
      return;
    }
    const col = pal.canopy[h % pal.canopy.length];
    ctx.fillStyle = pal.canopyDark;
    ctx.beginPath();
    ctx.arc(sx + 8, sy + 1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(sx + 7, sy, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(col, 18);
    ctx.fillRect(sx + 4, sy - 3, 3, 2);
    ctx.fillRect(sx + 8, sy - 5, 2, 2);
  }

  private drawBuildingOutside(b: BuildingDef, s: Scene): void {
    const ctx = this.ctx;
    const sx = b.x * T - this.camX;
    const sy = b.y * T - this.camY;
    const w = b.w * T;
    const roofH = (b.h - 1) * T;
    const roof = COLORS.roofs[hash(b.x, b.y) % COLORS.roofs.length];
    // front wall
    ctx.fillStyle = COLORS.plaster;
    ctx.fillRect(sx, sy + roofH, w, T);
    ctx.fillStyle = COLORS.plasterDark;
    ctx.fillRect(sx, sy + roofH + T - 2, w, 2);
    // door
    const dx = (b.door.x - b.x) * T;
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(sx + dx + 3, sy + roofH + 2, 10, T - 2);
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(sx + dx + 4, sy + roofH + 3, 8, T - 3);
    ctx.fillStyle = '#c8a050';
    ctx.fillRect(sx + dx + 10, sy + roofH + 9, 1, 1);
    // windows
    const lit = s.lit.has(b.id) && s.daylight < 0.75;
    for (const x of windowsOf(b)) {
      const wx = (x - b.x) * T + sx + 4;
      const wy = sy + roofH + 4;
      ctx.fillStyle = COLORS.woodDark;
      ctx.fillRect(wx - 1, wy - 1, 10, 8);
      ctx.fillStyle = lit ? COLORS.windowLit : COLORS.window;
      ctx.fillRect(wx, wy, 8, 6);
      ctx.fillStyle = COLORS.woodDark;
      ctx.fillRect(wx + 4, wy, 1, 6);
    }
    // roof, with a little overhang
    ctx.fillStyle = shade(roof, -30);
    ctx.fillRect(sx - 2, sy - 4, w + 4, roofH + 6);
    ctx.fillStyle = roof;
    ctx.fillRect(sx - 1, sy - 3, w + 2, roofH + 3);
    ctx.fillStyle = shade(roof, -14);
    for (let yy = sy + 1; yy < sy + roofH - 1; yy += 4) ctx.fillRect(sx - 1, yy, w + 2, 1);
    ctx.fillStyle = shade(roof, 22);
    ctx.fillRect(sx - 1, sy + Math.floor(roofH / 2) - 2, w + 2, 2);
    // chimney with smoke if someone keeps a fire
    const cx = sx + w - 14;
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx, sy - 6, 6, 8);
    if (s.lit.has(b.id)) {
      for (let i = 0; i < 3; i++) {
        const p = (s.time * 0.3 + i / 3) % 1;
        ctx.fillStyle = `rgba(220,220,220,${0.35 * (1 - p)})`;
        ctx.fillRect(cx + 1 + Math.round(Math.sin(p * 6 + i) * 2 + p * 4), sy - 8 - Math.round(p * 14), 4, 3);
      }
    }
  }

  private drawRod(sx: number, sy: number, facing: Facing, t: number): void {
    const ctx = this.ctx;
    const dir = facing === 'left' ? -1 : 1;
    ctx.strokeStyle = COLORS.woodDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy + 9);
    ctx.lineTo(sx + 8 + dir * 10, sy - 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(230,230,230,0.6)';
    ctx.beginPath();
    ctx.moveTo(sx + 8 + dir * 10, sy - 2);
    ctx.lineTo(sx + 8 + dir * 14, sy + 10 + Math.sin(t * 2) * 0.5);
    ctx.stroke();
  }

  private drawFishingLine(sx: number, sy: number, facing: Facing, f: { bobber: Point; phase: string }, t: number): void {
    const ctx = this.ctx;
    const tip = {
      up: { x: sx + 11, y: sy - 4 },
      down: { x: sx + 12, y: sy + 16 },
      left: { x: sx - 4, y: sy + 2 },
      right: { x: sx + 20, y: sy + 2 },
    }[facing];
    ctx.strokeStyle = COLORS.woodDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy + 9);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    if (f.phase === 'casting') return;
    const bx = f.bobber.x * T - this.camX + 8;
    let by = f.bobber.y * T - this.camY + 8 + Math.sin(t * 1.5) * 0.6;
    if (f.phase === 'bite') by += 2 + Math.sin(t * 30);
    ctx.strokeStyle = 'rgba(235,235,235,0.7)';
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = '#e04030';
    ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 3, 2);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(Math.round(bx) - 1, Math.round(by), 3, 1);
    if (f.phase === 'bite') {
      ctx.fillStyle = 'rgba(220,235,245,0.8)';
      ctx.strokeStyle = 'rgba(220,235,245,0.6)';
      ctx.beginPath();
      ctx.arc(bx, by + 1, 3 + ((t * 8) % 3), 0, Math.PI * 2);
      ctx.stroke();
      // the "!" above the player's head
      ctx.fillStyle = '#fff4c0';
      ctx.fillRect(sx + 7, sy - 9, 2, 5);
      ctx.fillRect(sx + 7, sy - 3, 2, 2);
    }
  }

  /** When the player is indoors, the outdoors fades a little. */
  private dimOutside(b: BuildingDef): void {
    const ctx = this.ctx;
    const sx = b.x * T - this.camX;
    const sy = b.y * T - this.camY;
    ctx.fillStyle = 'rgba(10,10,20,0.4)';
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.rect(sx + b.w * T, sy, -b.w * T, b.h * T);
    ctx.fill('evenodd');
  }

  private drawWeather(s: Scene): void {
    const ctx = this.ctx;
    if (s.weather.kind !== 'clear' && !s.inside) {
      ctx.fillStyle = s.weather.kind === 'rain' ? 'rgba(40,50,70,0.22)' : 'rgba(60,70,90,0.12)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (s.weather.kind === 'rain' && !s.inside) {
      ctx.strokeStyle = 'rgba(190,205,225,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of this.rain) {
        d.y += 5 * d.s;
        d.x -= 1.2 * d.s;
        if (d.y > VIEW_H) {
          d.y = -6;
          d.x = Math.random() * (VIEW_W + 40);
        }
        if (d.x < -4) d.x += VIEW_W + 8;
        ctx.moveTo(Math.round(d.x), Math.round(d.y));
        ctx.lineTo(Math.round(d.x - 1.5 * d.s), Math.round(d.y + 5 * d.s));
      }
      ctx.stroke();
    }
    // morning mist
    const m = s.cal.minute;
    if (s.weather.morningFog && m > 240 && m < 600 && !s.inside) {
      const k = m < 420 ? (m - 240) / 180 : 1 - (m - 420) / 180;
      ctx.fillStyle = `rgba(225,230,235,${0.38 * k})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      for (let i = 0; i < 6; i++) {
        const fx = ((s.time * 4 + i * 97) % (VIEW_W + 160)) - 80;
        const fy = (i * 41) % VIEW_H;
        ctx.fillStyle = `rgba(235,238,240,${0.18 * k})`;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 70, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawLight(s: Scene): void {
    let dark = (1 - s.daylight) * 0.8;
    if (s.weather.kind === 'rain') dark += 0.08 * s.daylight;
    if (dark <= 0.01) {
      return;
    }
    const ctx = this.ctx;
    // warm dusk/dawn tint
    if (s.daylight > 0.05 && s.daylight < 0.95) {
      const k = 1 - Math.abs(s.daylight - 0.5) * 2;
      ctx.fillStyle = `rgba(240,130,60,${0.14 * k})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    const l = this.lctx;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, VIEW_W, VIEW_H);
    const [r, g, b] = COLORS.night;
    l.fillStyle = `rgba(${r},${g},${b},${dark})`;
    l.fillRect(0, 0, VIEW_W, VIEW_H);
    l.globalCompositeOperation = 'destination-out';
    const hole = (x: number, y: number, rad: number, strength: number) => {
      const grad = l.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(0,0,0,${strength})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = grad;
      l.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    };
    const glows: { x: number; y: number; rad: number }[] = [];
    // a little moonlight around the player, so the night is dark but walkable
    const p = this.toScreen(s.player.x + 0.5, s.player.y + 0.5);
    hole(p.x, p.y, s.weather.kind === 'clear' ? 46 : 34, 0.55);
    for (const bd of this.world.buildings) {
      if (!s.lit.has(bd.id) && bd !== s.inside) continue;
      if (bd === s.inside) {
        // indoors: the hearth (or a candle) lights the room
        for (let y = bd.y; y < bd.y + bd.h; y++) {
          for (let x = bd.x; x < bd.x + bd.w; x++) {
            if (this.world.tile(x, y) === 'F' && s.lit.has(bd.id)) {
              const c = this.toScreen(x + 0.5, y + 0.5);
              const flick = 1 + Math.sin(s.time * 7 + x) * 0.04;
              hole(c.x, c.y, 70 * flick, 0.95);
              glows.push({ x: c.x, y: c.y, rad: 50 * flick });
            }
          }
        }
        const c = this.toScreen(bd.x + bd.w / 2, bd.y + bd.h / 2);
        hole(c.x, c.y, Math.max(bd.w, bd.h) * 9, 0.55);
      } else if (s.lit.has(bd.id)) {
        for (const x of windowsOf(bd)) {
          const c = this.toScreen(x + 0.5, bd.y + bd.h - 0.4);
          hole(c.x, c.y + 6, 22, 0.8);
          glows.push({ x: c.x, y: c.y + 6, rad: 16 });
        }
        if (bd.id === 'tavern') {
          const c = this.toScreen(bd.door.x + 0.5, bd.door.y + 1);
          hole(c.x, c.y, 40, 0.9);
          glows.push({ x: c.x, y: c.y, rad: 30 });
        }
      }
    }
    l.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0);
    // warm light, added on top
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of glows) {
      const grad = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.rad);
      grad.addColorStop(0, `rgba(120,70,20,${0.35 * dark})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gl.x - gl.rad, gl.y - gl.rad, gl.rad * 2, gl.rad * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
