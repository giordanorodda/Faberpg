import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { stoneTex } from '../bottega/cartoon-room';
import * as F from '../bottega/fantasy';
import * as P from '../bottega/props';
import { MAT } from '../bottega/props';
import { wonkify } from '../bottega/style';
import { apple, bentBox, bowl, broom, cup, garlicBraid, glass, herbBunch, jug, M, nail, organic, plankFloor, rbox, shadowed, toon, toonify, wallSkin } from '../stile/kit';
import type { WallOptions } from '../stile/paint';
import { flushBookAtlas, makeBook } from './books';
import * as De from './details';
import * as Fu from './furniture';
import { buildKitchen, KITCHEN_WINDOW } from './kitchen';

/**
 * The player's house: two floors under a steep roof. Downstairs the hearth,
 * the armchair, the table and the dresser; a steep wooden stair along the
 * north wall to the bedroom in the attic, under the rafters.
 *
 * World axes: x east, z south, y up. The ground floor spans x ±W/2, z ±D/2.
 */

export const HOUSE = { w: 6, d: 5, h1: 2.5, slab: 0.18, knee: 0.9, ridge: 2.95, wall: 0.4 };
/** Height of the upper floor. */
export const UP = HOUSE.h1 + HOUSE.slab;
/** The stair: climbs from x = x0 (ground) to x = x1 (upper floor), between z0 and z1. */
export const STAIR = { x0: 1.9, x1: -1.3, z0: -HOUSE.d / 2, z1: -1.65 };
/** How high the roof is above the upper floor at a given x. */
export const roofAbove = (x: number) => HOUSE.knee + (HOUSE.w / 2 - Math.abs(x)) * ((HOUSE.ridge - HOUSE.knee) / (HOUSE.w / 2));

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** 0: ground floor, 1: upper floor. */
  level: 0 | 1;
}

export interface Light {
  /** Where the light sits, in world space. */
  at: THREE.Vector3;
  level: 0 | 1;
  flames: THREE.Mesh[];
  /** The inspect key that toggles it (candles), or none (the hearth always burns). */
  key?: string;
  kind: 'fire' | 'candle';
}

/** Something you can pick up and put down: furniture is carried low, small things in the hand. */
export interface Movable {
  /** Stable name for the save: the order things are built in never changes. */
  id: string;
  obj: THREE.Object3D;
  kind: 'furniture' | 'small';
  /** The footprint that blocks walking (furniture only); kept up to date when it moves. */
  box?: Box;
}

export interface House {
  group: THREE.Group;
  movables: Movable[];
  colliders: Box[];
  lights: Light[];
  embers: THREE.MeshToonMaterial;
  living: THREE.Object3D[];
  cat: { breathe: (t: number) => void };
  /** Where the armchair seat is, and which way it faces (yaw). */
  seat: { at: THREE.Vector3; yaw: number };
  bedside: { at: THREE.Vector3; yaw: number };
}

const tag = <T extends THREE.Object3D>(o: T, key: string): T => {
  o.traverse((c) => (c.userData.inspect = key));
  return o;
};

/** Splits a wall face into solid rectangles around its openings (u along the wall, v up). */
function solidParts(len: number, height: number, ops: { u0: number; u1: number; v0: number; v1: number }[]): [number, number, number, number][] {
  const parts: [number, number, number, number][] = [];
  const sorted = [...ops].sort((a, b) => a.u0 - b.u0);
  let u = 0;
  for (const o of sorted) {
    if (o.u0 > u) parts.push([u, o.u0, 0, height]);
    if (o.v0 > 0) parts.push([o.u0, o.u1, 0, o.v0]);
    if (o.v1 < height) parts.push([o.u0, o.u1, o.v1, height]);
    u = o.u1;
  }
  if (u < len) parts.push([u, len, 0, height]);
  return parts;
}

export function buildHouse(): House {
  const { w: W, d: D, h1: H1, knee: KNEE, ridge: RIDGE, wall: WALL } = HOUSE;
  // the older props and the timber frames use these materials: give them the cartoon ones
  Object.assign(MAT, {
    darkWood: M.beam,
    midWood: M.wood,
    paleWood: M.woodPale,
    brass: M.brass,
    iron: M.iron,
    burlap: M.sack,
    paper: toon({ color: 0xece2c8, rim: 0.2 }),
    wax: M.wax,
    cork: M.cork,
    glass: glass(0xdfeee8),
    string: M.rope,
  });
  const group = new THREE.Group();
  const colliders: Box[] = [];
  const box = (cx: number, cz: number, sx: number, sz: number, level: 0 | 1 = 0): Box => {
    const b: Box = { minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2, level };
    colliders.push(b);
    return b;
  };
  const movables: Movable[] = [];
  const movable = <T extends THREE.Object3D>(obj: T, kind: Movable['kind'], b?: Box): T => {
    obj.userData.noWonk = true;
    // named by what it is, so adding something new to the house never mixes up the saved ones
    const base = (obj.userData.inspect as string | undefined) ?? kind;
    const n = movables.filter((x) => x.id.startsWith(`${base}#`)).length;
    const m: Movable = { id: `${base}#${n}`, obj, kind, box: b };
    obj.traverse((c) => (c.userData.movable = m));
    movables.push(m);
    return obj;
  };
  const lights: Light[] = [];
  const living: THREE.Object3D[] = [];
  const rnd = makeRng(1931);
  const stone = toon({ map: stoneTex(), rim: 0.1 });
  (stone.map as THREE.Texture).repeat.set(1.8, 1.8);

  // ------------------------------------------------------------ openings
  const doorS = { x0: 0.55, x1: 1.55, y0: 0, y1: 2.05 };
  const winS = { x0: -2.1, x1: -1.0, y0: 0.85, y1: 1.85 };
  const winS2 = { x0: -0.55, x1: 0.55, y0: UP + 0.7, y1: UP + 1.8 };
  const winE = { z0: 0.15, z1: 1.15, y0: 0.85, y1: 1.8 };
  const winN2 = { x0: -0.35, x1: 0.35, y0: UP + 1.25, y1: UP + 1.85 };
  const winN1 = KITCHEN_WINDOW;

  // ------------------------------------------------------------ solid walls
  const solid = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), M.plaster);
    b.position.set(x, y, z);
    group.add(shadowed(b));
  };
  const gableH = UP + RIDGE + 0.2;
  const sideH = UP + KNEE + 0.1;
  // north and south (gables): u runs with x
  for (const [z, ops] of [
    [-D / 2 - WALL / 2, [winN1, winN2]],
    [D / 2 + WALL / 2, [doorS, winS, winS2]],
  ] as const) {
    const L = W + WALL * 2;
    // openings on different floors are stacked: split the wall into floors to keep the parts simple
    for (const [v0, v1] of [[0, UP], [UP, gableH]] as const) {
      const here = ops.filter((o) => o.y0 >= v0 && o.y1 <= v1).map((o) => ({ u0: o.x0 + L / 2, u1: o.x1 + L / 2, v0: o.y0 - v0, v1: o.y1 - v0 }));
      for (const [u0, u1, a, b] of solidParts(L, v1 - v0, here)) solid(u0 + (u1 - u0) / 2 - L / 2, v0 + (a + b) / 2, z, u1 - u0, b - a, WALL);
    }
  }
  // east and west (under the eaves): u runs with z
  for (const [x, ops] of [
    [W / 2 + WALL / 2, [winE]],
    [-W / 2 - WALL / 2, []],
  ] as const) {
    const here = ops.map((o) => ({ u0: o.z0 + D / 2, u1: o.z1 + D / 2, v0: o.y0, v1: o.y1 }));
    for (const [u0, u1, a, b] of solidParts(D, sideH, here)) solid(x, (a + b) / 2, u0 + (u1 - u0) / 2 - D / 2, WALL, b - a, u1 - u0);
  }

  // ------------------------------------------------------------ ground floor surfaces
  group.add(plankFloor(W, D));
  const skin = (o: WallOptions, seed: number, x: number, y: number, z: number, ry: number) => {
    const s = wallSkin(o, seed);
    s.position.set(x, y + o.h / 2, z);
    s.rotation.y = ry;
    group.add(s);
  };
  // from inside: north u = x + W/2, south u = W/2 - x, east u = z + D/2, west u = D/2 - z
  skin({ w: W, h: H1, frieze: 2.2, patches: [{ x: 4.6, y: 1.9, r: 0.12 }], holes: [{ x0: winN1.x0 + W / 2, x1: winN1.x1 + W / 2, y0: winN1.y0, y1: winN1.y1 }] }, 11, 0, 0, -D / 2 + 0.012, 0);
  skin(
    {
      w: W,
      h: H1,
      frieze: 2.2,
      holes: [doorS, winS].map((o) => ({ x0: W / 2 - o.x1, x1: W / 2 - o.x0, y0: o.y0, y1: o.y1 })),
      cracksFrom: [{ x: W / 2 + 1.0, y: 1.85 }],
      tally: { x: W / 2 - 0.2, y: 1.3 },
    },
    12,
    0,
    0,
    D / 2 - 0.012,
    Math.PI,
  );
  skin({ w: D, h: H1, frieze: 2.2, holes: [{ x0: winE.z0 + D / 2, x1: winE.z1 + D / 2, y0: winE.y0, y1: winE.y1 }] }, 13, W / 2 - 0.012, 0, 0, -Math.PI / 2);
  skin({ w: D, h: H1, frieze: 2.2, patches: [{ x: 4.3, y: 0.6, r: 0.13 }] }, 14, -W / 2 + 0.012, 0, 0, Math.PI / 2);
  // timber framing on a stone plinth, as in the shop
  const southLocal = [doorS, winS].map((o) => ({ x0: -o.x1, x1: -o.x0, y0: o.y0, y1: o.y1 }));
  for (const [len, x, z, ry, ops] of [
    [W, 0, D / 2, Math.PI, southLocal],
    [D, W / 2, 0, -Math.PI / 2, [{ x0: winE.z0, x1: winE.z1, y0: winE.y0, y1: winE.y1 }]],
    [D, -W / 2, 0, Math.PI / 2, [{ x0: -0.8, x1: 0.8, y0: 0, y1: H1 }]],
  ] as const) {
    const fr = F.timberFrame(len, H1, ops as never, stone);
    fr.position.set(x, 0, z);
    fr.rotation.y = ry;
    group.add(fr);
  }

  // the ceiling of the ground floor: the boards of the floor above, on joists
  const slabParts: [number, number, number, number][] = [
    [-W / 2 - WALL, W / 2 + WALL, STAIR.z1, D / 2 + WALL],
    [-W / 2 - WALL, STAIR.x1, -D / 2 - WALL, STAIR.z1],
    [STAIR.x0, W / 2 + WALL, -D / 2 - WALL, STAIR.z1],
  ];
  const boardsTex = M.beamH.map!.clone();
  boardsTex.repeat.set(2, 2);
  boardsTex.needsUpdate = true;
  const boards = toon({ map: boardsTex, rim: 0 });
  for (const [x0, x1, z0, z1] of slabParts) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, HOUSE.slab, z1 - z0), boards);
    s.position.set((x0 + x1) / 2, H1 + HOUSE.slab / 2, (z0 + z1) / 2);
    group.add(shadowed(s));
  }
  for (const [i, x] of [-2.2, -1.1, 0, 1.1, 2.2].entries()) {
    const z0 = x > STAIR.x1 && x < STAIR.x0 ? STAIR.z1 : -D / 2;
    const j = bentBox(D / 2 - z0, 0.2, 0.16, M.beamH, 0.012 + i * 0.003, 0.02 * (i % 2 ? 1 : -1));
    j.rotation.y = Math.PI / 2;
    j.position.set(x, H1 - 0.1, (z0 + D / 2) / 2);
    group.add(shadowed(j));
  }
  // the trimmer that carries the joists cut by the stairwell
  const trimmer = bentBox(STAIR.x0 - STAIR.x1 + 0.2, 0.2, 0.16, M.beamH, 0.006, 0);
  trimmer.position.set((STAIR.x0 + STAIR.x1) / 2, H1 - 0.1, STAIR.z1);
  group.add(shadowed(trimmer));

  // ------------------------------------------------------------ upper floor
  const floorPiece = (x0: number, x1: number, z0: number, z1: number, seed: number) => {
    const f = plankFloor(x1 - x0, z1 - z0, seed);
    f.position.set((x0 + x1) / 2, UP, (z0 + z1) / 2);
    f.userData.noWonk = true; // a floor you walk on stays flat
    group.add(f);
  };
  floorPiece(-W / 2, W / 2, STAIR.z1, D / 2, 73);
  floorPiece(-W / 2, STAIR.x1, -D / 2, STAIR.z1, 74);
  floorPiece(STAIR.x0, W / 2, -D / 2, STAIR.z1, 75);
  // gable walls and the low walls under the eaves
  skin({ w: W, h: RIDGE, holes: [{ x0: winN2.x0 + W / 2, x1: winN2.x1 + W / 2, y0: winN2.y0 - UP, y1: winN2.y1 - UP }] }, 21, 0, UP, -D / 2 + 0.012, 0);
  skin(
    {
      w: W,
      h: RIDGE,
      holes: [{ x0: W / 2 - winS2.x1, x1: W / 2 - winS2.x0, y0: winS2.y0 - UP, y1: winS2.y1 - UP }],
      patches: [{ x: 1.6, y: 0.5, r: 0.1 }],
    },
    22,
    0,
    UP,
    D / 2 - 0.012,
    Math.PI,
  );
  skin({ w: D, h: KNEE }, 23, W / 2 - 0.012, UP, 0, -Math.PI / 2);
  skin({ w: D, h: KNEE }, 24, -W / 2 + 0.012, UP, 0, Math.PI / 2);
  // the roof: two slopes, plastered between the rafters, a ridge beam, collar ties
  const run = W / 2;
  const rise = RIDGE - KNEE;
  const slope = Math.atan2(rise, run);
  const slopeLen = Math.hypot(run, rise);
  const roofPlaster = toon({ map: M.plaster.map!, rim: 0, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    // the slab: its inner face lies on the line from the eaves to the ridge
    const slab = new THREE.Mesh(new THREE.BoxGeometry(slopeLen + 1.0, 0.16, D + WALL * 2 + 0.8), roofPlaster);
    const mid = new THREE.Vector3((s * run) / 2, UP + KNEE + rise / 2, 0);
    const n = new THREE.Vector3(-s * Math.sin(slope), Math.cos(slope), 0); // outward
    slab.position.copy(mid).addScaledVector(n, 0.08).add(new THREE.Vector3(s * Math.cos(slope) * 0.38, -Math.sin(slope) * 0.38, 0));
    slab.rotation.z = -s * slope;
    group.add(shadowed(slab));
    // rafters every 55 cm, each a little different
    for (let z = -D / 2 + 0.12, i = 0; z < D / 2; z += 0.55, i++) {
      const r = bentBox(slopeLen, 0.16, 0.11, M.beamH, 0.012, 0.02 * Math.sin(i * 1.7));
      r.position.copy(mid).addScaledVector(n, -0.08);
      r.position.z = z;
      r.rotation.z = -s * slope;
      group.add(shadowed(r));
      if (s === 1 && i % 2 === 1) {
        // a collar tie across the pair, high enough to walk under
        const y = UP + 2.2;
        const half = run - (2.2 - KNEE) / Math.tan(slope);
        const tie = bentBox(half * 2 + 0.1, 0.13, 0.09, M.beamH, 0.01, 0.02);
        tie.position.set(0, y, z + 0.1);
        group.add(shadowed(tie));
      }
    }
  }
  const ridge = bentBox(D + 0.2, 0.2, 0.16, M.beamH, 0.02, 0.02);
  ridge.rotation.y = Math.PI / 2;
  ridge.position.set(0, UP + RIDGE - 0.08, 0);
  group.add(shadowed(ridge));

  // the stairwell rail upstairs
  {
    const g = new THREE.Group();
    const railLen = STAIR.x0 - STAIR.x1;
    for (let i = 0; i <= 4; i++) {
      const x = STAIR.x1 + 0.15 + (i / 4) * (railLen - 0.2);
      const post = rbox(0.06, 0.92, 0.06, M.beam, 0.01);
      post.position.set(x, UP + 0.46, STAIR.z1 + 0.04);
      g.add(post);
    }
    const rail = bentBox(railLen - 0.05, 0.06, 0.08, M.wood, -0.008, 0);
    rail.position.set((STAIR.x0 + STAIR.x1) / 2 + 0.07, UP + 0.94, STAIR.z1 + 0.04);
    g.add(rail);
    for (let i = 0; i < 3; i++) {
      const bal = rbox(0.05, 0.85, 0.05, M.beam, 0.01);
      bal.position.set(STAIR.x0 + 0.03, UP + 0.43, STAIR.z1 - 0.2 - i * 0.28);
      g.add(bal);
    }
    group.add(shadowed(g));
  }

  // ------------------------------------------------------------ windows and the door
  const windowAt = (ww: number, wh: number, place: (g: THREE.Group) => void, inspect = 'finestra') => {
    const g = new THREE.Group();
    for (const [bw, bh, x, y] of [
      [ww + 0.1, 0.08, 0, wh / 2],
      [ww + 0.1, 0.08, 0, -wh / 2],
      [0.08, wh, ww / 2, 0],
      [0.08, wh, -ww / 2, 0],
      [0.05, wh, 0, 0],
      [ww, 0.04, 0, wh * 0.1],
    ] as const) {
      const b = rbox(bw, bh, 0.1, M.wood, 0.015);
      b.position.set(x, y, 0);
      g.add(b);
    }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww - 0.06, wh - 0.06), glass(0xe8f2ea));
    (pane.material as THREE.MeshToonMaterial).opacity = 0.14;
    g.add(pane);
    const sill = rbox(ww + 0.22, 0.06, WALL + 0.14, M.stone, 0.02);
    sill.position.set(0, -wh / 2 - 0.03, -0.02);
    g.add(sill);
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set((s * ww) / 2, 0, -WALL / 2 - 0.02);
      const sh = rbox(ww / 2, wh, 0.04, M.wood, 0.01);
      sh.position.x = (s * ww) / 4;
      hinge.add(sh);
      hinge.rotation.y = -s * (1.6 + rnd() * 0.5);
      g.add(hinge);
    }
    place(g);
    group.add(tag(shadowed(g), inspect));
    pane.castShadow = false;
  };
  // window groups face -z (outside towards -z in local space) and are turned into place
  windowAt(winS.x1 - winS.x0, winS.y1 - winS.y0, (g) => g.position.set((winS.x0 + winS.x1) / 2, (winS.y0 + winS.y1) / 2, D / 2 + WALL / 2));
  windowAt(winS2.x1 - winS2.x0, winS2.y1 - winS2.y0, (g) => g.position.set(0, (winS2.y0 + winS2.y1) / 2, D / 2 + WALL / 2), 'abbaino');
  windowAt(winE.z1 - winE.z0, winE.y1 - winE.y0, (g) => {
    g.position.set(W / 2 + WALL / 2, (winE.y0 + winE.y1) / 2, (winE.z0 + winE.z1) / 2);
    g.rotation.y = Math.PI / 2;
  });
  windowAt(winN1.x1 - winN1.x0, winN1.y1 - winN1.y0, (g) => {
    g.position.set((winN1.x0 + winN1.x1) / 2, (winN1.y0 + winN1.y1) / 2, -D / 2 - WALL / 2);
    g.rotation.y = Math.PI;
  });
  windowAt(winN2.x1 - winN2.x0, winN2.y1 - winN2.y0, (g) => {
    g.position.set(0, (winN2.y0 + winN2.y1) / 2, -D / 2 - WALL / 2);
    g.rotation.y = Math.PI;
  });
  // the door, shut, with its latch; a lantern on a hook beside it
  {
    const door = new THREE.Group();
    const planks = 5;
    for (let i = 0; i < planks; i++) {
      const p = rbox((doorS.x1 - doorS.x0) / planks - 0.004, doorS.y1 - 0.01, 0.055, i % 2 ? M.wood : M.woodPale, 0.008);
      p.position.set(doorS.x0 + ((i + 0.5) * (doorS.x1 - doorS.x0)) / planks, doorS.y1 / 2, 0);
      door.add(p);
    }
    for (const y of [0.35, 1.7]) {
      const strap = rbox(0.9, 0.07, 0.014, M.iron, 0.004);
      strap.position.set(doorS.x0 + 0.46, y, -0.035);
      door.add(strap);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 16), M.iron);
    ring.position.set(doorS.x0 + 0.15, 1.0, -0.04);
    door.add(ring);
    door.position.z = D / 2 + 0.05;
    group.add(tag(organic(shadowed(door), 0.005, 3), 'porta'));
    for (const x of [doorS.x0 - 0.04, doorS.x1 + 0.04]) {
      const jamb = rbox(0.09, doorS.y1 + 0.08, WALL + 0.04, M.beam, 0.01);
      jamb.position.set(x, (doorS.y1 + 0.08) / 2, D / 2 + WALL / 2);
      group.add(shadowed(jamb));
    }
    const lintel = bentBox(doorS.x1 - doorS.x0 + 0.3, 0.12, WALL + 0.04, M.beamH, 0.008, 0);
    lintel.position.set((doorS.x0 + doorS.x1) / 2, doorS.y1 + 0.06, D / 2 + WALL / 2);
    group.add(shadowed(lintel));
    const lan = F.lantern();
    toonify(lan);
    lan.position.set(doorS.x1 + 0.32, 1.55, D / 2 - 0.12);
    group.add(tag(lan, 'lanterna'));
    const hookN = nail();
    hookN.rotation.y = Math.PI;
    hookN.position.set(doorS.x1 + 0.32, 1.84, D / 2 - 0.02);
    group.add(hookN);
  }
  // a cloak and a hat on the pegs by the door
  {
    const cloak = Fu.hangingCloak(61, '#4a5a3a');
    cloak.position.set(-0.15, 1.78, D / 2 - 0.01);
    cloak.rotation.y = Math.PI;
    group.add(tag(cloak, 'mantello'));
    const peg2 = new THREE.Group();
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.12, 8), M.beam);
    p2.rotation.x = Math.PI / 2 - 0.25;
    p2.position.z = 0.06;
    peg2.add(p2);
    const hat = new THREE.Group();
    const felt = toon({ color: 0x5a4632, rim: 0.4 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.012, 32), felt);
    hat.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.13, 24), felt);
    crown.position.y = 0.06;
    hat.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.101, 0.101, 0.025, 24), toon({ color: 0x8a3a2a }));
    band.position.y = 0.015;
    hat.add(band);
    hat.rotation.set(Math.PI / 2 - 0.2, 0, 0.15);
    hat.position.set(0.02, -0.12, 0.13);
    peg2.add(organic(hat, 0.03, 3));
    peg2.position.set(-0.55, 1.8, D / 2 - 0.01);
    peg2.rotation.y = Math.PI;
    group.add(tag(shadowed(peg2), 'cappello'));
  }

  // ------------------------------------------------------------ the hearth corner
  const hearth = Fu.hearth(H1, stone, M.plaster);
  hearth.group.position.set(-W / 2, 0, 0);
  group.add(tag(hearth.group, 'camino'));
  box(-W / 2 + 0.45, 0, 1.0, 1.6);
  lights.push({ at: hearth.light.clone().add(new THREE.Vector3(-W / 2, 0, 0)), level: 0, flames: hearth.flames, kind: 'fire' });
  // the chimney goes on up through the bedroom
  const stack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.4, 1.2), M.plaster);
  stack.position.set(-W / 2 + 0.27, UP + 1.2, 0);
  group.add(shadowed(stack));
  box(-W / 2 + 0.3, 0, 0.6, 1.3, 1);
  // things on the mantel
  {
    const top = 0.98 + 0.12 + 0.07;
    const mx = -W / 2 + 0.66;
    const j = jug(51);
    j.scale.setScalar(0.72);
    j.position.set(mx, top, -0.55);
    group.add(j);
    const c = cup(52);
    c.position.set(mx + 0.02, top, -0.32);
    group.add(movable(c, 'small'));
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.11, 20), toon({ color: 0x3a6a5a, rim: 0.6 }));
    tin.position.set(mx, top + 0.055, 0.42);
    group.add(movable(tag(shadowed(tin), 'tè'), 'small'));
    const tin2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 20), toon({ color: 0xa8543a, rim: 0.6 }));
    tin2.position.set(mx + 0.03, top + 0.04, 0.53);
    group.add(movable(tag(shadowed(tin2), 'tè'), 'small'));
    const lt = De.letters();
    lt.position.set(mx - 0.06, top, 0.19);
    group.add(tag(lt, 'lettere'));
    const pr = De.framedPortrait();
    pr.position.set(mx - 0.0, top + 0.105, 0.12);
    pr.rotation.set(0, Math.PI / 2, 0);
    pr.rotateX(-0.12);
    group.add(tag(pr, 'ritratto'));
    const hg = De.hourglass();
    hg.position.set(mx + 0.02, top, -0.14);
    group.add(movable(tag(hg, 'clessidra'), 'small'));
    const pp = De.pipe();
    pp.position.set(mx + 0.06, top, 0.27);
    pp.rotation.y = 2.4;
    group.add(movable(tag(pp, 'pipa'), 'small'));
    const df = De.driedFlowers(3);
    df.position.set(mx - 0.03, top, -0.76);
    group.add(tag(df, 'lavanda'));
    living.push(df);
    const ca = Fu.candle(71, 0.07);
    ca.group.position.set(mx, top, 0.0);
    group.add(ca.group);
    ca.flame.visible = false;
  }
  // around the fire: ash, scorch marks, the irons, the bellows, kindling, keys, the calendar
  {
    const hsX = -W / 2 + 0.85;
    const a1 = De.ash(0.5, 1.4, 3);
    a1.position.set(hsX, 0.062, 0);
    group.add(a1);
    const a2 = De.ash(0.7, 1.6, 4, true);
    a2.position.set(hsX + 0.5, 0.004, 0.05);
    group.add(a2);
    const fi = De.fireIrons();
    fi.position.set(-W / 2 + 0.75, 0, -0.98);
    fi.rotation.y = 0.6;
    group.add(movable(tag(fi, 'attizzatoio'), 'furniture', box(-W / 2 + 0.75, -0.98, 0.22, 0.22)));
    const bl = De.bellows();
    bl.position.set(-W / 2 + 0.62, 0.9, -0.62);
    bl.rotation.set(0, Math.PI / 2, 0.06);
    group.add(tag(bl, 'mantice'));
    living.push(bl);
    const kb = De.kindling();
    kb.position.set(-W / 2 + 0.5, 0, 1.0);
    group.add(movable(tag(kb, 'rametti'), 'furniture', box(-W / 2 + 0.5, 1.0, 0.42, 0.42)));
    const ky = De.keys();
    ky.position.set(-W / 2 + 0.62, 1.38, 0.64);
    ky.rotation.y = Math.PI / 2;
    group.add(tag(ky, 'chiavi'));
    living.push(ky);
    const cal = De.calendar();
    cal.position.set(-W / 2 + 0.03, 1.95, -1.2);
    cal.rotation.y = Math.PI / 2;
    group.add(tag(cal, 'calendario'));
  }
  // the kitchen corner, between the hearth and the north wall
  buildKitchen({ group, box: (cx, cz, sx, sz) => box(cx, cz, sx, sz), movable, tag, living, stone });

  // the armchair, turned to the fire, its footstool, the little table with the candle
  const chairAt = new THREE.Vector3(-1.3, 0, 1.1);
  const chairYaw = -2.0;
  {
    const ac = Fu.armchair(3);
    ac.position.copy(chairAt);
    ac.rotation.y = chairYaw;
    group.add(tag(ac, 'poltrona'));
    box(chairAt.x, chairAt.z, 0.95, 0.95);
    const fs = Fu.footstool();
    fs.position.set(-2.15, 0, 0.62);
    fs.rotation.y = 0.5;
    group.add(movable(fs, 'furniture', box(-2.15, 0.62, 0.4, 0.4)));
    const st = Fu.sideTable();
    st.position.set(-2.1, 0, 1.62);
    group.add(st);
    box(-2.1, 1.62, 0.5, 0.5);
    const ca = Fu.candle(72, 0.12);
    ca.group.position.set(-2.18, 0.618, 1.58);
    group.add(tag(ca.group, 'candela:poltrona'));
    lights.push({ at: ca.tip.clone().add(ca.group.position), level: 0, flames: [ca.flame], key: 'candela:poltrona', kind: 'candle' });
    const dl = De.doily(0.17);
    dl.position.set(-2.12, 0.62, 1.6);
    group.add(dl);
    const sc = De.saucer();
    sc.position.set(-1.96, 0.618, 1.48);
    group.add(sc);
    const bs = De.biscuits();
    bs.position.set(-1.92, 0.618, 1.78);
    group.add(movable(tag(bs, 'biscotti'), 'small'));
    const ob = Fu.openBook(5);
    ob.position.set(-2.02, 0.618, 1.7);
    ob.rotation.y = 0.4;
    group.add(movable(tag(ob, 'libro'), 'small'));
    const tc = cup(73);
    tc.position.set(-1.96, 0.624, 1.48);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.034, 16), toon({ color: 0x8a5a22, rim: 0.5 }));
    tea.rotation.x = -Math.PI / 2;
    tea.position.y = 0.058;
    tc.add(tea);
    group.add(movable(tag(tc, 'tazza'), 'small'));
    const rug = Fu.ragRug(1.05, 0.8);
    rug.position.set(-1.85, 0.006, 0.6);
    group.add(rug);
  }
  // the bookshelf on the west wall, past the armchair
  {
    const extras = (shelf: number, z: number) => {
      const r = Math.abs(Math.sin(z * 17 + shelf * 3));
      if (r < 0.3) return Fu.candle(80 + shelf, 0.05).group;
      if (r < 0.55) {
        const j = P.jar(90 + shelf, 0.14);
        toonify(j);
        return j;
      }
      if (r < 0.8) {
        const sh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), toon({ color: 0xe8d8c0, rim: 0.6 }));
        sh.scale.set(1, 0.6, 1.3);
        sh.position.y = 0.025;
        return shadowed(organic(sh, 0.1, 3));
      }
      return cup(95 + shelf);
    };
    const bs = Fu.bookshelf(1.3, 1.8, extras);
    bs.position.set(-W / 2 + 0.13, 0, 1.78);
    group.add(tag(bs, 'libreria'));
    box(-W / 2 + 0.27, 1.78, 0.32, 1.35);
  }
  // herbs drying from the joist nearest the fire
  for (let i = 0; i < 5; i++) {
    const hb = herbBunch(120 + i, 0.06 + rnd() * 0.18);
    hb.position.set(-2.2 + (rnd() - 0.5) * 0.06, H1 - 0.2, -1.6 + i * 0.4 + rnd() * 0.15);
    group.add(tag(hb, 'erbe'));
    living.push(hb);
  }

  // ------------------------------------------------------------ the table and the dresser
  {
    const t = Fu.table(1.45, 0.82);
    t.position.set(1.95, 0, 0.75);
    t.rotation.y = Math.PI / 2 + 0.03;
    group.add(tag(t, 'tavolo'));
    box(1.95, 0.75, 0.9, 1.5);
    const c1 = Fu.chair(1);
    c1.position.set(1.25, 0, 0.45);
    c1.rotation.y = Math.PI / 2 + 0.25;
    group.add(movable(tag(c1, 'sedia'), 'furniture', box(1.25, 0.45, 0.45, 0.45)));
    const c2 = Fu.chair(2);
    c2.position.set(1.1, 0, 1.25);
    c2.rotation.y = Math.PI / 2 - 0.6; // pulled out, left where it was
    group.add(movable(tag(c2, 'sedia'), 'furniture', box(1.1, 1.25, 0.45, 0.45)));
    const b = Fu.bench(1.35);
    b.position.set(2.62, 0, 0.75);
    b.rotation.y = Math.PI / 2;
    group.add(movable(tag(b, 'panca'), 'furniture', box(2.62, 0.75, 0.35, 1.4)));
    const top = 0.775;
    const tp = Fu.teapot();
    tp.position.set(1.85, top, 0.55);
    tp.rotation.y = 2.2;
    group.add(movable(tag(tp, 'teiera'), 'small'));
    for (const [x, z, s] of [[1.7, 0.85, 74], [2.15, 0.35, 75]]) {
      const c = cup(s);
      c.position.set(x, top, z);
      group.add(movable(c, 'small'));
    }
    const bw = bowl(76);
    bw.position.set(2.1, top, 1.15);
    group.add(bw);
    for (let i = 0; i < 4; i++) {
      const a = apple(700 + i);
      a.position.set(2.1 + Math.cos(i * 2.1) * 0.05, top + 0.05 + (i === 3 ? 0.03 : 0), 1.15 + Math.sin(i * 2.1) * 0.05);
      group.add(movable(tag(a, 'mela'), 'small'));
    }
    // half a loaf on its board, the knife beside it
    const board = rbox(0.34, 0.025, 0.22, M.woodPale, 0.01);
    board.position.set(1.95, top + 0.012, 0.1);
    board.rotation.y = 0.3;
    group.add(shadowed(board));
    const crust = toon({ color: 0xb8783a, rim: 0.4 });
    const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI), [crust]);
    loaf.scale.set(1.3, 0.75, 1);
    loaf.rotation.set(0, 0.3 + Math.PI / 2, 0);
    loaf.position.set(1.97, top + 0.025, 0.1);
    group.add(organic(shadowed(loaf), 0.06, 3));
    const crumb = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20, 0, Math.PI), toon({ color: 0xf0dcb0, rim: 0.1 }));
    crumb.scale.set(1.3, 0.75, 1);
    crumb.rotation.y = 0.3 + Math.PI / 2;
    crumb.position.set(1.97, top + 0.025, 0.1);
    group.add(crumb);
    const blade = rbox(0.16, 0.004, 0.025, M.iron, 0.002);
    blade.position.set(1.85, top + 0.03, 0.2);
    blade.rotation.y = -0.5;
    group.add(blade);
    // a jug of wild flowers
    const vase = jug(77);
    vase.position.set(2.2, top, 0.75);
    group.add(vase);
    const stemM = toon({ color: 0x5a8a3a, rim: 0.2 });
    const petalM = [toon({ color: 0xf2e8c8, rim: 0.4 }), toon({ color: 0xe8b83a, rim: 0.4 }), toon({ color: 0x9a6ac8, rim: 0.4 })];
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2;
      const lean = 0.15 + rnd() * 0.35;
      const len = 0.18 + rnd() * 0.12;
      const fl = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, len, 4), stemM);
      stem.position.y = len / 2;
      fl.add(stem);
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012 + rnd() * 0.01, 1), petalM[i % 3]);
      head.position.y = len;
      head.scale.y = 0.6;
      fl.add(head);
      fl.rotation.set(Math.cos(a) * lean, 0, Math.sin(a) * lean);
      fl.position.set(2.2, top + 0.18, 0.75);
      group.add(shadowed(fl));
      living.push(fl);
    }
    const ca = Fu.candle(78, 0.09);
    ca.group.position.set(1.75, top, 1.1);
    group.add(tag(ca.group, 'candela:tavolo'));
    lights.push({ at: ca.tip.clone().add(ca.group.position), level: 0, flames: [ca.flame], key: 'candela:tavolo', kind: 'candle' });
  }
  {
    const dr = Fu.dresser();
    dr.position.set(W / 2, 0, -0.95);
    dr.rotation.y = Math.PI;
    group.add(tag(dr, 'piattaia'));
    box(W / 2 - 0.26, -0.95, 0.55, 1.2);
    const n = nail();
    n.rotation.y = -Math.PI / 2;
    n.position.set(W / 2 - 0.02, 2.05, 0.0);
    group.add(n);
    const gb = garlicBraid(160, 7, 3);
    gb.position.set(W / 2 - 0.07, 2.02, 0.0);
    group.add(tag(gb, 'aglio'));
    living.push(gb);
    const br = broom();
    br.position.set(W / 2 - 0.2, 0, 2.25);
    br.rotation.set(0.05, -0.6, 0.14);
    group.add(tag(br, 'scopa'));
  }

  // ------------------------------------------------------------ the stair, and firewood under it
  {
    const st = Fu.stairs(STAIR.x0 - STAIR.x1, UP, STAIR.z1 - STAIR.z0, -1);
    st.position.set(STAIR.x0, 0, (STAIR.z0 + STAIR.z1) / 2);
    st.rotation.y = Math.PI;
    group.add(tag(st, 'scala'));
    const wood = new THREE.Group();
    const bark = toon({ color: 0x6a4a32, rim: 0.15 });
    const end = toon({ color: 0xc8a070, rim: 0.1 });
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 12 - row * 2; k++) {
        const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.45 + rnd() * 0.1, 8), [bark, end, end]);
        lg.rotation.set(Math.PI / 2, 0, (rnd() - 0.5) * 0.1);
        lg.position.set(k * 0.13 + row * 0.065 + (rnd() - 0.5) * 0.02, 0.065 + row * 0.115, (rnd() - 0.5) * 0.05);
        wood.add(lg);
      }
    }
    wood.position.set(-1.05, 0, -2.18);
    group.add(tag(organic(shadowed(wood), 0.02, 4), 'legna'));
  }

  // ------------------------------------------------------------ the bedroom
  let cat: { breathe: (t: number) => void } = { breathe: () => {} };
  {
    const b = Fu.bed();
    b.group.position.set(-1.95, UP, 1.4);
    group.add(tag(b.group, 'letto'));
    box(-1.95, 1.4, 2.05, 1.4, 1);
    // the cat has found the warmest place on the quilt
    const c = Fu.sleepingCat();
    b.group.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(-1.45, UP + 2, 1.62), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(b.quilt)[0];
    c.group.position.set(-1.45, hit ? hit.point.y - 0.03 : UP + 0.6, 1.62);
    c.group.rotation.y = 2.3;
    group.add(tag(c.group, 'gatto'));
    cat = c;
    const ch = Fu.chest();
    ch.position.set(-0.68, UP, 1.4);
    ch.rotation.y = 0.04;
    group.add(tag(ch, 'cassapanca'));
    box(-0.68, 1.4, 0.5, 0.95, 1);
    // the bedside: a crate stood on end, a candle, a few books, spectacles
    const ns = P.crate(0.38, 0.42, 0.32);
    toonify(ns);
    ns.position.set(-2.55, UP, 2.27);
    ns.rotation.y = 0.2;
    group.add(organic(ns, 0.01, 3));
    const ca = Fu.candle(79, 0.1);
    ca.group.position.set(-2.62, UP + 0.42, 2.22);
    group.add(tag(ca.group, 'candela:letto'));
    lights.push({ at: ca.tip.clone().add(ca.group.position), level: 1, flames: [ca.flame], key: 'candela:letto', kind: 'candle' });
    for (let i = 0; i < 3; i++) {
      const bk = makeBook(400 + i, { h: 0.2 - i * 0.015, t: 0.03 + i * 0.008 });
      bk.rotation.set(0, 0.3 + i * 0.4, Math.PI / 2);
      bk.position.set(-2.45, UP + 0.42 + 0.0175 + i * 0.035, 2.32);
      group.add(movable(tag(bk, 'libri'), 'small'));
    }
    const specs = new THREE.Group();
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0018, 6, 18), M.brass);
      rim.rotation.x = Math.PI / 2;
      rim.position.x = s * 0.022;
      specs.add(rim);
    }
    specs.position.set(-2.45, UP + 0.42 + 0.11, 2.3);
    specs.rotation.y = 0.5;
    group.add(tag(specs, 'occhiali'));
    // the washstand under the eaves, a shirt on the peg
    const ws = Fu.washstand();
    ws.position.set(2.3, UP, 1.0);
    ws.rotation.y = -Math.PI / 2;
    group.add(tag(ws, 'catino'));
    box(2.3, 1.0, 0.5, 0.6, 1);
    const shirt = Fu.hangingCloak(62, '#e8dcc0', 0.5, 0.75);
    shirt.position.set(1.3, UP + 1.55, D / 2 - 0.01);
    shirt.rotation.y = Math.PI;
    group.add(tag(shirt, 'camicia'));
    const rug = Fu.ragRug(0.75, 0.55);
    rug.position.set(-0.2, UP + 0.006, 0.5);
    group.add(rug);
    // a geranium on the sill of the gable window
    const pot = new THREE.Group();
    pot.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.09, 0.12], [0.1, 0.13], [0.1, 0.15], [0.085, 0.15]].map(([r, y]) => new THREE.Vector2(r, y)), 32), M.clay));
    const leaves = herbBunch(9, 0.01, M.leaf);
    leaves.rotation.x = Math.PI;
    leaves.position.y = 0.12;
    pot.add(leaves);
    const red = toon({ color: 0xd8443a, rim: 0.4 });
    for (let i = 0; i < 5; i++) {
      const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 1), red);
      fl.position.set(Math.cos(i * 1.3) * 0.06, 0.24 + (i % 2) * 0.04, Math.sin(i * 1.3) * 0.06);
      pot.add(fl);
    }
    pot.position.set(0.25, winS2.y0 - 0.0, D / 2 - 0.04);
    group.add(tag(organic(shadowed(pot), 0.02, 4), 'geranio'));
    living.push(pot);
  }

  flushBookAtlas();
  // Everything a little crooked, as if built by hand.
  wonkify(group, 0.5);

  const seatAt = chairAt.clone().add(new THREE.Vector3(Math.sin(chairYaw) * 0.08, 1.08, Math.cos(chairYaw) * 0.08));
  return {
    group,
    movables,
    colliders,
    lights,
    embers: hearth.embers,
    living,
    cat,
    seat: { at: seatAt, yaw: chairYaw + Math.PI },
    bedside: { at: new THREE.Vector3(-0.85, UP, 0.55), yaw: Math.PI * 0.6 },
  };
}
