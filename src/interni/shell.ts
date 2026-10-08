import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { stoneTex } from '../bottega/cartoon-room';
import * as F from '../bottega/fantasy';
import { MAT } from '../bottega/props';
import { bentBox, glass, M, organic, plankFloor, rbox, shadowed, toon, wallSkin } from '../stile/kit';
import type { WallOptions } from '../stile/paint';

/**
 * The bones of a one-room house in the house style: plank floor, plastered
 * walls on a stone plinth with timber framing, beams and boards overhead,
 * windows with shutters, the front door. The room spans x ±w/2, z ±d/2;
 * the front (with the door) is the south wall, z = +d/2.
 */

export interface Opening {
  /** Which wall: n, s, e, w. */
  wall: 'n' | 's' | 'e' | 'w';
  /** Along the wall: x for n/s, z for e/w (world coordinates). */
  a0: number;
  a1: number;
  y0: number;
  y1: number;
  door?: boolean;
}

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Shell {
  group: THREE.Group;
  colliders: Box[];
  stone: THREE.Material;
  /** The front door's leaf (tagged 'uscita'). */
  door: THREE.Object3D;
}

const tag = <T extends THREE.Object3D>(o: T, key: string): T => {
  o.traverse((c) => (c.userData.inspect = key));
  return o;
};

export function buildShell(w: number, d: number, h: number, openings: Opening[], seed: number, opts: { frieze?: number; wallSeed?: number } = {}): Shell {
  Object.assign(MAT, { darkWood: M.beam, midWood: M.wood, paleWood: M.woodPale, brass: M.brass, iron: M.iron, glass: glass(0xdfeee8), string: M.rope, wax: M.wax, cork: M.cork, burlap: M.sack });
  const group = new THREE.Group();
  const colliders: Box[] = [];
  const WALL = 0.38;
  const rnd = makeRng(seed);
  const stone = toon({ map: stoneTex(), rim: 0.1 });
  (stone.map as THREE.Texture).repeat.set(1.8, 1.8);
  const floor = plankFloor(w, d, seed + 3);
  group.add(floor);
  // solid walls around their openings
  const solid = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), M.plaster);
    b.position.set(x, y, z);
    group.add(shadowed(b));
  };
  const walls: Record<Opening['wall'], { len: number; fixed: number; alongX: boolean }> = {
    n: { len: w + WALL * 2, fixed: -d / 2 - WALL / 2, alongX: true },
    s: { len: w + WALL * 2, fixed: d / 2 + WALL / 2, alongX: true },
    e: { len: d, fixed: w / 2 + WALL / 2, alongX: false },
    w: { len: d, fixed: -w / 2 - WALL / 2, alongX: false },
  };
  for (const [k, wl] of Object.entries(walls) as [Opening['wall'], (typeof walls)['n']][]) {
    const ops = openings.filter((o) => o.wall === k).sort((a, b) => a.a0 - b.a0);
    let u = -wl.len / 2;
    const put = (a0: number, a1: number, y0: number, y1: number) => {
      const c = (a0 + a1) / 2;
      if (wl.alongX) solid(c, (y0 + y1) / 2, wl.fixed, a1 - a0, y1 - y0, WALL);
      else solid(wl.fixed, (y0 + y1) / 2, c, WALL, y1 - y0, a1 - a0);
    };
    for (const o of ops) {
      if (o.a0 > u) put(u, o.a0, 0, h + 0.3);
      if (o.y0 > 0) put(o.a0, o.a1, 0, o.y0);
      put(o.a0, o.a1, o.y1, h + 0.3);
      u = o.a1;
    }
    if (u < wl.len / 2) put(u, wl.len / 2, 0, h + 0.3);
  }
  // plaster skins: from inside, u runs left to right
  const skin = (o: WallOptions, s: number, x: number, z: number, ry: number) => {
    const m = wallSkin(o, s);
    m.position.set(x, o.h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  const holes = (k: Opening['wall']) =>
    openings
      .filter((o) => o.wall === k)
      .map((o) =>
        k === 'n'
          ? { x0: o.a0 + w / 2, x1: o.a1 + w / 2, y0: o.y0, y1: o.y1 }
          : k === 's'
            ? { x0: w / 2 - o.a1, x1: w / 2 - o.a0, y0: o.y0, y1: o.y1 }
            : k === 'e'
              ? { x0: o.a0 + d / 2, x1: o.a1 + d / 2, y0: o.y0, y1: o.y1 }
              : { x0: d / 2 - o.a1, x1: d / 2 - o.a0, y0: o.y0, y1: o.y1 },
      );
  const ws = opts.wallSeed ?? seed;
  const fr = opts.frieze ?? 2.3;
  skin({ w, h, frieze: fr, holes: holes('n') }, ws + 1, 0, -d / 2 + 0.012, 0);
  skin({ w, h, frieze: fr, holes: holes('s'), tally: { x: 0.3, y: 1.3 } }, ws + 2, 0, d / 2 - 0.012, Math.PI);
  skin({ w: d, h, frieze: fr, holes: holes('e') }, ws + 3, w / 2 - 0.012, 0, -Math.PI / 2);
  skin({ w: d, h, frieze: fr, holes: holes('w'), cracksFrom: [{ x: 1.2, y: 2.0 }] }, ws + 4, -w / 2 + 0.012, 0, Math.PI / 2);
  // timber framing on the stone plinth
  for (const [k, len, x, z, ry] of [
    ['n', w, 0, -d / 2, 0],
    ['s', w, 0, d / 2, Math.PI],
    ['e', d, w / 2, 0, -Math.PI / 2],
    ['w', d, -w / 2, 0, Math.PI / 2],
  ] as const) {
    const ops = openings
      .filter((o) => o.wall === k)
      .map((o) => (k === 's' ? { x0: -o.a1, x1: -o.a0, y0: o.y0, y1: o.y1 } : k === 'w' ? { x0: -o.a1, x1: -o.a0, y0: o.y0, y1: o.y1 } : { x0: o.a0, x1: o.a1, y0: o.y0, y1: o.y1 }));
    const frame = F.timberFrame(len, h, ops as never, stone);
    frame.position.set(x, 0, z);
    frame.rotation.y = ry;
    group.add(frame);
  }
  // the ceiling: boards on beams, a roof slab above to keep the sun out
  const boards = M.beamH.map!.clone();
  boards.repeat.set(w / 1.5, d / 1.5);
  boards.needsUpdate = true;
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w + WALL * 2, d + WALL * 2), toon({ map: boards, rim: 0 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = h;
  group.add(ceil);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.2, d + 2), M.beam);
  slab.position.y = h + 0.1;
  slab.castShadow = true;
  group.add(slab);
  for (let x = -w / 2 + 0.9, i = 0; x < w / 2 - 0.4; x += 1.25 + rnd() * 0.2, i++) {
    const b = bentBox(d, 0.22, 0.18, M.beamH, 0.012 + rnd() * 0.01, 0.03 * (i % 2 ? 1 : -1));
    b.rotation.y = Math.PI / 2;
    b.position.set(x, h - 0.11, 0);
    group.add(shadowed(b));
  }
  // windows and the door
  let door: THREE.Object3D = new THREE.Group();
  for (const o of openings) {
    const wl = walls[o.wall];
    const along = (o.a0 + o.a1) / 2;
    const ww = o.a1 - o.a0;
    const wh = o.y1 - o.y0;
    const place = (g: THREE.Object3D) => {
      if (wl.alongX) g.position.set(along, 0, wl.fixed);
      else g.position.set(wl.fixed, 0, along);
      g.rotation.y = o.wall === 'n' ? Math.PI : o.wall === 's' ? 0 : o.wall === 'e' ? Math.PI / 2 : -Math.PI / 2;
    };
    if (o.door) {
      // the door, shut; it opens onto the village (E on it to go out)
      const g = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const p = rbox(ww / 5 - 0.004, wh - 0.01, 0.055, i % 2 ? M.wood : M.woodPale, 0.008);
        p.position.set(-ww / 2 + (i + 0.5) * (ww / 5), wh / 2, -WALL / 2 + 0.08);
        g.add(p);
      }
      for (const y of [0.35, wh - 0.35]) {
        const strap = rbox(ww * 0.9, 0.07, 0.014, M.iron, 0.004);
        strap.position.set(0, y, -WALL / 2 + 0.045);
        g.add(strap);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 16), M.iron);
      ring.position.set(ww / 2 - 0.15, 1.0, -WALL / 2 + 0.035);
      g.add(ring);
      for (const s of [-1, 1]) {
        const jamb = rbox(0.09, wh + 0.08, WALL + 0.04, M.beam, 0.01);
        jamb.position.set((s * (ww + 0.08)) / 2, (wh + 0.08) / 2, 0);
        g.add(jamb);
      }
      const lintel = bentBox(ww + 0.3, 0.12, WALL + 0.04, M.beamH, 0.008, 0);
      lintel.position.set(0, wh + 0.06, 0);
      g.add(lintel);
      place(g);
      group.add(tag(organic(shadowed(g), 0.004, 3), 'uscita'));
      door = g;
      continue;
    }
    const g = new THREE.Group();
    for (const [bw, bh, x, y] of [[ww + 0.1, 0.08, 0, wh / 2], [ww + 0.1, 0.08, 0, -wh / 2], [0.08, wh, ww / 2, 0], [0.08, wh, -ww / 2, 0], [0.05, wh, 0, 0], [ww, 0.04, 0, wh * 0.1]] as const) {
      const b = rbox(bw, bh, 0.1, M.wood, 0.015);
      b.position.set(x, y, 0);
      g.add(b);
    }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww - 0.06, wh - 0.06), glass(0xe8f2ea));
    (pane.material as THREE.MeshToonMaterial).opacity = 0.14;
    g.add(pane);
    const sill = rbox(ww + 0.22, 0.06, WALL + 0.14, M.stone, 0.02);
    sill.position.set(0, -wh / 2 - 0.03, 0);
    g.add(sill);
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set((s * ww) / 2, 0, WALL / 2 + 0.02);
      const sh = rbox(ww / 2, wh, 0.04, M.wood, 0.01);
      sh.position.x = (s * ww) / 4;
      hinge.add(sh);
      hinge.rotation.y = s * (1.7 + rnd() * 0.4);
      g.add(hinge);
    }
    const holder = new THREE.Group();
    holder.add(g);
    g.position.y = (o.y0 + o.y1) / 2;
    place(holder);
    group.add(tag(shadowed(holder), 'finestra'));
    pane.castShadow = false;
  }
  return { group, colliders, stone, door };
}
