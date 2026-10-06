import { inRange, parseClock } from '../core/time';
import type { BuildingDef, ForageSpotDef, Point, RegionDef, SpotDef } from './types';

export interface WorldData {
  rows: string[];
  buildings: BuildingDef[];
  spots: Record<string, SpotDef>;
  regions: RegionDef[];
  forage: ForageSpotDef[];
}

/** Tiles anyone can stand on. Doors are handled separately (they can be locked). */
const WALKABLE = new Set(['.', ',', '*', ':', 's', '=', '_', 'o']);

export const TILE_NAMES: Record<string, string> = {
  '~': 'acqua',
  T: 'albero',
  t: 'cespuglio',
  f: 'staccionata',
  '#': 'muro',
  B: 'letto',
  C: 'bancone',
  h: 'tavolo',
  F: 'focolare',
  S: 'scaffale',
  k: 'botte',
  l: 'telaio',
  n: 'panca',
  w: 'pozzo',
  r: 'canne',
};

export class World {
  readonly width: number;
  readonly height: number;
  readonly rows: string[];
  readonly buildings: BuildingDef[];
  readonly spots: Record<string, SpotDef>;
  readonly regions: RegionDef[];
  readonly forage: ForageSpotDef[];
  private readonly buildingGrid: (BuildingDef | null)[];
  private readonly doorHours = new Map<string, [number, number][]>();

  constructor(data: WorldData) {
    this.rows = data.rows;
    this.height = data.rows.length;
    this.width = data.rows[0].length;
    for (const [i, r] of data.rows.entries()) {
      if (r.length !== this.width) throw new Error(`La riga ${i} della mappa ha ${r.length} caratteri invece di ${this.width}`);
    }
    this.buildings = data.buildings;
    this.spots = data.spots;
    this.regions = data.regions;
    this.forage = data.forage;
    this.buildingGrid = new Array(this.width * this.height).fill(null);
    for (const b of this.buildings) {
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) this.buildingGrid[y * this.width + x] = b;
      }
      if (b.hours) this.doorHours.set(b.id, b.hours.map(([a, z]) => [parseClock(a), parseClock(z)]));
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  tile(x: number, y: number): string {
    if (!this.inBounds(x, y)) return 'T';
    return this.rows[y][x];
  }

  /** The building whose footprint (walls included) contains the tile. */
  buildingAt(x: number, y: number): BuildingDef | null {
    if (!this.inBounds(x, y)) return null;
    return this.buildingGrid[y * this.width + x];
  }

  /** The building whose interior (inside the walls) contains the tile. */
  interiorAt(x: number, y: number): BuildingDef | null {
    const b = this.buildingAt(x, y);
    if (!b) return null;
    if (x > b.x && x < b.x + b.w - 1 && y > b.y && y < b.y + b.h - 1) return b;
    return null;
  }

  building(id: string): BuildingDef | undefined {
    return this.buildings.find((b) => b.id === id);
  }

  regionAt(x: number, y: number): RegionDef | null {
    return this.regions.find((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) ?? null;
  }

  /** Whether the player may pass through this building's door at the given minute of the day. */
  isDoorOpen(b: BuildingDef, minuteOfDay: number): boolean {
    if (b.access === 'always') return true;
    if (b.access === 'locked') return false;
    const hours = this.doorHours.get(b.id) ?? [];
    return hours.some(([from, to]) => inRange(minuteOfDay, from, to));
  }

  /**
   * Whether the player can step onto the tile. A locked door can still be
   * crossed from the inside, so nobody is ever shut in.
   */
  walkableForPlayer(x: number, y: number, minuteOfDay: number, from?: Point): boolean {
    const t = this.tile(x, y);
    if (WALKABLE.has(t)) return true;
    if (t === '+') {
      const b = this.buildingAt(x, y);
      if (!b) return true;
      if (from && this.interiorAt(from.x, from.y) === b) return true;
      return this.isDoorOpen(b, minuteOfDay);
    }
    return false;
  }

  /** NPCs have keys to everything, and can lie down in beds. */
  walkableForNpc(x: number, y: number): boolean {
    const t = this.tile(x, y);
    return WALKABLE.has(t) || t === '+' || t === 'B';
  }

  isWater(x: number, y: number): boolean {
    return this.tile(x, y) === '~';
  }
}
