import * as THREE from 'three';
import type { Box, Movable } from './house';

/**
 * What the house remembers between visits: where every movable thing was
 * left, and which candles were burning. Kept in the browser for now; when
 * the house joins the game it moves into the saved GameState.
 */

const KEY = 'casa:memoria';
const VERSION = 1;

interface Saved {
  v: number;
  objects: Record<string, { p: [number, number, number]; ry: number }>;
  candles: Record<string, boolean>;
}

function read(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    // future versions migrate here; an unknown shape is ignored, never thrown away
    return s.v === VERSION ? s : null;
  } catch {
    return null;
  }
}

export class HouseMemory {
  private dirty = false;
  private timer = 0;
  constructor(
    private movables: Movable[],
    private candles: () => Record<string, boolean>,
  ) {
    window.addEventListener('beforeunload', () => this.save());
  }

  /** Puts things back where they were left. Returns the candles' state, if remembered. */
  restore(): Record<string, boolean> | null {
    const s = read();
    if (!s) return null;
    const bb = new THREE.Box3();
    for (const m of this.movables) {
      const o = s.objects[m.id];
      if (!o) continue;
      m.obj.position.set(...o.p);
      m.obj.rotation.set(0, o.ry, 0);
      if (m.box) {
        m.obj.updateMatrixWorld(true);
        bb.setFromObject(m.obj);
        const k = 0.04;
        Object.assign(m.box, { minX: bb.min.x + k, maxX: bb.max.x - k, minZ: bb.min.z + k, maxZ: bb.max.z - k, level: bb.min.y > 2 ? 1 : 0 } satisfies Partial<Box>);
      }
    }
    return s.candles;
  }

  touch(): void {
    this.dirty = true;
  }

  /** Called every frame: writes at most every couple of seconds, and only after a change. */
  update(dt: number): void {
    this.timer += dt;
    if (this.dirty && this.timer > 2) this.save();
  }

  save(): void {
    this.timer = 0;
    this.dirty = false;
    const objects: Saved['objects'] = {};
    for (const m of this.movables) {
      const p = m.obj.position;
      objects[m.id] = { p: [p.x, p.y, p.z].map((v) => Math.round(v * 1000) / 1000) as [number, number, number], ry: Math.round(m.obj.rotation.y * 1000) / 1000 };
    }
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: VERSION, objects, candles: this.candles() } satisfies Saved));
    } catch {
      /* without storage the house simply starts fresh next time */
    }
  }
}
