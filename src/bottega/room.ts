import * as THREE from 'three';
import { makeRng } from '../core/rng';
import * as F from './fantasy';
import * as P from './props';
import { box, inspectable, MAT, shadowed } from './props';
import { phMaterial, place, topOf } from './ph';
import { wonkify } from './style';

/** Room size in meters. The front wall (with door and window) faces south, towards +z. */
export const ROOM = { w: 7, d: 5.5, h: 3.1, wall: 0.35 };

export interface Opening {
  /** Wall-local horizontal range and vertical range, in meters. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Room {
  group: THREE.Group;
  colliders: Collider[];
  /** World-space rectangles of the openings the sun can shine through. */
  windows: THREE.Vector3[][];
  lampFlames: THREE.Mesh[];
  /** Candles of the chandelier, lit together with the lamp. */
  chandelierFlames: THREE.Mesh[];
  chandelierAnchor: THREE.Vector3;
  fireflies: { light: THREE.PointLight; update: (t: number, on: number) => void };
  /** Faintly glowing things (tinctures, crystals): brighter in the dark. */
  glows: THREE.MeshStandardMaterial[];
  lampAnchors: THREE.Vector3[];
  candleAnchor: THREE.Vector3;
  windowGlass: THREE.Mesh[];
}

/** A wall with rectangular holes, made of solid boxes around them (so it casts proper shadows). */
function wallWithOpenings(length: number, height: number, thick: number, openings: Opening[], mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const xs = new Set([-length / 2, length / 2]);
  for (const o of openings) {
    xs.add(o.x0);
    xs.add(o.x1);
  }
  const cuts = [...xs].sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    const mid = (a + b) / 2;
    const o = openings.find((op) => mid > op.x0 && mid < op.x1);
    const pieces: [number, number][] = o ? [[0, o.y0], [o.y1, height]] : [[0, height]];
    for (const [y0, y1] of pieces) {
      if (y1 - y0 < 0.001) continue;
      // wall pieces butt against each other: no rounding, or the seams would show
      const m = box(b - a, y1 - y0, thick, mat, 0.6, false);
      m.position.set(mid, (y0 + y1) / 2, 0);
      g.add(m);
    }
  }
  return shadowed(g);
}

function windowFrame(o: Opening, thick: number): { group: THREE.Group; glass: THREE.Mesh[] } {
  const g = new THREE.Group();
  const w = o.x1 - o.x0;
  const h = o.y1 - o.y0;
  const cx = (o.x0 + o.x1) / 2;
  const cy = (o.y0 + o.y1) / 2;
  const t = 0.06;
  for (const [bw, bh, x, y] of [
    [w, t, cx, o.y0 + t / 2],
    [w, t, cx, o.y1 - t / 2],
    [t, h, o.x0 + t / 2, cy],
    [t, h, o.x1 - t / 2, cy],
    [0.035, h, cx, cy],
    [w, 0.035, cx, cy],
  ] as const) {
    const m = box(bw, bh, 0.08, MAT.darkWood, 2);
    m.position.set(x, y, 0);
    g.add(m);
  }
  // sill
  const sill = box(w + 0.16, 0.05, thick + 0.12, MAT.midWood, 2);
  sill.position.set(cx, o.y0 - 0.025, 0.02);
  g.add(sill);
  const glass: THREE.Mesh[] = [];
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), MAT.glass);
  pane.position.set(cx, cy, 0);
  pane.castShadow = false;
  g.add(pane);
  glass.push(pane);
  const lead = F.leadedGlass(w - 0.1, h - 0.1);
  lead.position.set(cx, cy, 0.01);
  g.add(lead);
  shadowed(g);
  pane.castShadow = false;
  lead.castShadow = false;
  return { group: g, glass };
}

export function buildRoom(): Room {
  const { w, d, h, wall } = ROOM;
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const addCollider = (cx: number, cz: number, sx: number, sz: number) =>
    colliders.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });

  // --- floor, walls, ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), phMaterial('old_wood_floor', [w / 2.2, d / 2.2]));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const wallMat = phMaterial('painted_plaster_wall', [0.8, 0.8], { color: 0xf2e2c4 }); // limewash, warm
  const front: Opening[] = [
    { x0: -2.4, x1: -0.9, y0: 0.9, y1: 2.15 },
    { x0: 1.05, x1: 2.15, y0: 0, y1: 2.25 },
  ];
  const east: Opening[] = [{ x0: -1.0, x1: -0.1, y0: 1.1, y1: 1.95 }];

  const back = wallWithOpenings(w + wall * 2, h, wall, [], wallMat);
  back.position.set(0, 0, -d / 2 - wall / 2);
  group.add(back);
  const frontWall = wallWithOpenings(w + wall * 2, h, wall, front, wallMat);
  frontWall.position.set(0, 0, d / 2 + wall / 2);
  group.add(frontWall);
  const westWall = wallWithOpenings(d, h, wall, [], wallMat);
  westWall.rotation.y = Math.PI / 2;
  westWall.position.set(-w / 2 - wall / 2, 0, 0);
  group.add(westWall);
  // east wall: rotated so that local +x points to world +z
  const eastWall = wallWithOpenings(d, h, wall, east, wallMat);
  eastWall.rotation.y = -Math.PI / 2;
  eastWall.position.set(w / 2 + wall / 2, 0, 0);
  group.add(eastWall);

  // skirting of dark wood along the walls
  for (const [len, x, z, ry] of [
    [w, 0, -d / 2 + 0.01, 0],
    [d, -w / 2 + 0.01, 0, Math.PI / 2],
    [d, w / 2 - 0.01, 0, Math.PI / 2],
  ] as const) {
    const s = box(len, 0.14, 0.02, MAT.darkWood, 2);
    s.position.set(x, 0.07, z);
    s.rotation.y = ry;
    group.add(shadowed(s));
  }

  // half-timbered walls on a stone plinth
  const plinthMat = phMaterial('old_stone_wall', [0.3, 0.3]);
  const frontLocal = front.map((o) => ({ ...o, x0: -o.x1, x1: -o.x0 }));
  const frames: [number, number, number, number, number, typeof front][] = [
    // length, x, z, rotationY, (unused), openings in frame-local coordinates
    [w, 0, -d / 2, 0, 0, []],
    [w, 0, d / 2, Math.PI, 0, frontLocal],
    [d, -w / 2, 0, Math.PI / 2, 0, []],
    [d, w / 2, 0, -Math.PI / 2, 0, east],
  ];
  for (const [len, x, z, ry, , ops] of frames) {
    const fr = F.timberFrame(len, h, ops, plinthMat);
    fr.position.set(x, 0, z);
    fr.rotation.y = ry;
    group.add(fr);
  }

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w + wall * 2, d + wall * 2), phMaterial('old_wood_floor', [w / 2.2, d / 2.2], { color: 0x9a8070 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h;
  ceiling.receiveShadow = true;
  group.add(ceiling);
  // a roof above, so no light leaks in from the top
  const roof = box(w + 2, 0.2, d + 2, MAT.darkWood);
  roof.position.y = h + 0.1;
  roof.castShadow = true;
  group.add(roof);
  const beams: number[] = [-2.4, -0.8, 0.8, 2.4];
  for (const x of beams) {
    const b = box(0.2, 0.24, d, MAT.darkWood, 1.5);
    b.position.set(x, h - 0.12, 0);
    group.add(shadowed(b));
  }

  // threshold stone at the door
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, wall + 0.1), phMaterial('old_stone_wall', [0.5, 0.2]));
  sill.position.set(1.6, 0.015, d / 2 + wall / 2);
  sill.receiveShadow = true;
  group.add(sill);

  // --- windows and door
  const windowGlass: THREE.Mesh[] = [];
  const fw = windowFrame(front[0], wall);
  fw.group.position.z = d / 2 + wall / 2;
  group.add(fw.group);
  windowGlass.push(...fw.glass);
  const ew = windowFrame(east[0], wall);
  ew.group.rotation.y = -Math.PI / 2;
  ew.group.position.x = w / 2 + wall / 2;
  group.add(ew.group);
  windowGlass.push(...ew.glass);
  inspectable(fw.group, 'finestra');
  inspectable(ew.group, 'finestra');

  // the door, open inwards
  const door = new THREE.Group();
  const leaf = box(1.08, 2.22, 0.05, MAT.midWood, 1.5);
  leaf.position.set(0.54, 1.11, 0);
  door.add(leaf);
  for (const y of [0.4, 1.8]) {
    const strap = box(0.9, 0.06, 0.01, MAT.iron);
    strap.position.set(0.5, y, 0.03);
    door.add(strap);
  }
  // hinged on the east jamb, swung inwards against the wall
  door.position.set(2.15, 0, d / 2 - 0.02);
  door.rotation.y = 1.92;
  group.add(inspectable(shadowed(door), 'porta'));
  const doorFrameL = box(0.08, 2.3, wall + 0.04, MAT.darkWood);
  doorFrameL.position.set(1.01, 1.15, d / 2 + wall / 2);
  const doorFrameR = doorFrameL.clone();
  doorFrameR.position.x = 2.19;
  const lintel = box(1.26, 0.1, wall + 0.04, MAT.darkWood);
  lintel.position.set(1.6, 2.3, d / 2 + wall / 2);
  group.add(shadowed(doorFrameL), shadowed(doorFrameR), shadowed(lintel));
  // invisible stop at the doorway: for now the shop is the whole world
  addCollider(1.6, d / 2 + 0.25, 1.2, 0.3);

  const windows: THREE.Vector3[][] = [
    [new THREE.Vector3(front[0].x0, front[0].y0, d / 2), new THREE.Vector3(front[0].x1, front[0].y0, d / 2), new THREE.Vector3(front[0].x1, front[0].y1, d / 2), new THREE.Vector3(front[0].x0, front[0].y1, d / 2)],
    [new THREE.Vector3(front[1].x0, 0.02, d / 2), new THREE.Vector3(front[1].x1, 0.02, d / 2), new THREE.Vector3(front[1].x1, front[1].y1, d / 2), new THREE.Vector3(front[1].x0, front[1].y1, d / 2)],
    [new THREE.Vector3(w / 2, east[0].y0, east[0].x0), new THREE.Vector3(w / 2, east[0].y0, east[0].x1), new THREE.Vector3(w / 2, east[0].y1, east[0].x1), new THREE.Vector3(w / 2, east[0].y1, east[0].x0)],
  ];

  // --- furniture
  // counter, across the room, with a passage at the east end
  const ctr = P.counter(4.0);
  ctr.position.set(-0.7, 0, -1.15);
  group.add(ctr);
  addCollider(-0.7, -1.15, 4.1, 0.65);

  // shelving along the back wall
  const shelfLevels = [0.45, 0.95, 1.45, 1.95, 2.4];
  const shelves = P.shelving(5.6, 2.55, 0.38, shelfLevels);
  // set off the wall, clear of the timber frame and the stone plinth
  shelves.position.set(-0.6, 0, -d / 2 + 0.32);
  group.add(shelves);
  addCollider(-0.6, -d / 2 + 0.32, 5.7, 0.45);

  const rnd = makeRng(99);
  const shelfZ = -d / 2 + 0.34;
  const shelfX0 = -0.6 - 2.7;
  // jars on the first two shelves
  for (let level = 0; level < 2; level++) {
    let x = shelfX0 + 0.15;
    while (x < shelfX0 + 2.6) {
      const j = P.jar(level * 50 + Math.floor(x * 100), 0.2 + rnd() * 0.08);
      j.position.set(x, shelfLevels[level] + 0.018, shelfZ + (rnd() - 0.5) * 0.06);
      group.add(inspectable(j, 'vasi'));
      x += 0.2 + rnd() * 0.04;
    }
  }
  // scanned wine bottles on the upper shelves; the dark one nobody buys stays on top
  for (let level = 2; level < 4; level++) {
    for (let k = 0; k < 4; k++) {
      place(group, 'wine_bottles_01', { at: [shelfX0 + 0.35 + k * 0.5, shelfLevels[level] + 0.018, shelfZ], rotY: k * 1.7 + level, inspect: 'bottiglie' });
    }
  }
  const odd = P.bottle(7);
  odd.scale.setScalar(1.25);
  odd.position.set(shelfX0 + 0.5, shelfLevels[4] + 0.018, shelfZ);
  group.add(inspectable(odd, 'bottiglie'));
  place(group, 'vintage_oil_lamp', { at: [shelfX0 + 3.6, shelfLevels[4] + 0.018, shelfZ], rotY: 0.4, inspect: 'lampada' });
  // candles, cloth, thread on the right half
  for (let i = 0; i < 4; i++) {
    const c = P.candleBundle();
    c.position.set(shelfX0 + 3.0 + i * 0.32, shelfLevels[0] + 0.018, shelfZ);
    group.add(inspectable(c, 'candele'));
  }
  const clothStacks: [number[], [number, number] | undefined][] = [
    [[0x2c4a7a, 0x3a5a8a, 0xd8c890, 0x2c4a7a], [0x2c4a7a, 0xd8b840]],
    [[0xe0d4b8, 0xd0c4a4, 0xe6dcc4], undefined],
    [[0x7a3a2a, 0x6a5a3a, 0x8a7a5a], undefined],
  ];
  clothStacks.forEach(([cols, stripes], i) => {
    const c = P.cloth(cols, stripes);
    c.position.set(shelfX0 + 3.15 + i * 0.42, shelfLevels[1] + 0.018, shelfZ);
    group.add(inspectable(c, 'stoffe'));
  });
  const threadColors = [0x2c4a8a, 0xd8b840, 0xa83a2a, 0xe8e0d0, 0x4a6a3a, 0x2c4a8a, 0xd8b840, 0x5a3a2a];
  threadColors.forEach((col, i) => {
    const s = P.spool(col);
    s.position.set(shelfX0 + 3.0 + (i % 8) * 0.17, shelfLevels[2] + 0.018, shelfZ + (i % 2) * 0.08 - 0.04);
    group.add(inspectable(s, 'filo'));
  });
  for (let i = 0; i < 3; i++) {
    const cr = P.crate(0.36, 0.22, 0.3);
    cr.position.set(shelfX0 + 3.1 + i * 0.45, shelfLevels[3] + 0.018, shelfZ);
    group.add(cr);
  }

  // on the counter
  const ctrTop = 0.98;
  const sc = P.scale();
  sc.position.set(-2.0, ctrTop, -1.15);
  group.add(inspectable(sc, 'bilancia'));
  const led = P.ledger();
  led.position.set(0.0, ctrTop, -1.12);
  led.rotation.y = 0.12;
  group.add(inspectable(led, 'registro'));
  const ink = P.inkwell();
  ink.position.set(0.42, ctrTop, -1.25);
  group.add(inspectable(ink, 'calamaio'));
  const bl = P.bell();
  bl.position.set(0.9, ctrTop, -1.0);
  group.add(inspectable(bl, 'campanello'));
  const cs = P.candlestick();
  cs.group.position.set(-1.1, ctrTop, -1.3);
  cs.group.visible = false; // only its flame is used, on top of the scanned candlestick
  group.add(cs.group);
  place(group, 'wooden_candlestick', { at: [-1.1, ctrTop, -1.3], rotY: 0.3 }).then((obj) => {
    cs.group.visible = true;
    cs.group.traverse((o) => {
      if (o !== cs.flame && o !== cs.group) o.visible = false;
    });
    cs.flame.position.y = topOf(obj) - ctrTop + 0.012;
  });
  // crockery on the counter and the shelves
  place(group, 'jug_01', { at: [-2.15, ctrTop, -1.35], rotY: 2.2 });
  place(group, 'wooden_bowl_01', { at: [-1.55, ctrTop, -1.2], rotY: 0.4 });
  place(group, 'ceramic_pot', { at: [shelfX0 + 2.45, shelfLevels[0] + 0.018, shelfZ], rotY: 1 });
  for (let i = 0; i < 3; i++) {
    const j = P.jar(300 + i, 0.18);
    j.position.set(-2.55 + i * 0.17, ctrTop, -1.3);
    group.add(inspectable(j, 'vasi'));
  }

  // behind the counter
  place(group, 'folding_wooden_stool', { at: [0.4, 0, -1.85], rotY: 0.5, inspect: 'sgabello' });
  addCollider(0.4, -1.85, 0.36, 0.36);

  // sacks and barrels along the west wall
  const sacks: [number, number, boolean][] = [
    [-3.05, -0.1, false],
    [-3.05, 0.5, true],
    [-2.55, 0.15, false],
    [-3.05, 1.1, false],
  ];
  sacks.forEach(([x, z, open], i) => {
    const s = P.sack(60 + i, open);
    s.position.set(x, 0, z);
    s.rotation.y = rnd() * Math.PI;
    group.add(inspectable(s, 'sacchi'));
    addCollider(x, z, 0.55, 0.55);
  });
  // scanned barrels and crates (Poly Haven)
  place(group, 'wine_barrel_01', { at: [-3.0, 0, 2.2], rotY: 0.4, inspect: 'botte' });
  place(group, 'wine_barrel_01', { at: [-2.35, 0, 2.35], rotY: 2.6, inspect: 'botte' });
  addCollider(-3.0, 2.2, 0.65, 0.65);
  addCollider(-2.35, 2.35, 0.65, 0.65);
  place(group, 'wooden_crate_01', { at: [3.0, 0, 1.9], rotY: 0.2 });
  place(group, 'wooden_crate_02', { at: [2.95, 0, 2.45], rotY: -0.15 });
  addCollider(3.0, 2.15, 0.75, 1.2);
  place(group, 'wooden_bucket_01', { at: [2.55, 0, 2.35], rotY: 0.6 });

  place(group, 'wooden_broom', { at: [3.32, 0, 0.8], rotZ: 0.12, rotY: 1.2, inspect: 'scopa' });

  // the sign hangs on the front of the counter, right where customers stand
  const sg = P.sign('Si guarda con gli occhi.');
  sg.position.set(-0.7, 0.72, -1.15 + 0.31);
  group.add(inspectable(sg, 'cartello'));

  // dried herbs from the beams
  for (let i = 0; i < 7; i++) {
    const hb = P.herbs(80 + i);
    hb.position.set(-2.4 + (i % 2 ? 0.05 : -0.05), h - 0.24, -1.6 + i * 0.5);
    if (i > 3) hb.position.x = 2.4;
    group.add(inspectable(hb, 'erbe'));
  }

  // the oil lamp above the counter
  const lamp = P.oilLamp();
  lamp.group.position.set(-0.8, h - 0.74, -1.0);
  group.add(inspectable(lamp.group, 'lampada'));

  // --- everyday clutter: what makes a shop look used, not staged
  const rg = P.rug(2.4, 1.3);
  rg.position.set(-0.7, 0.006, -0.12);
  group.add(rg);
  const ladder = P.ladder(2.6);
  ladder.position.set(1.95, 0, -2.05);
  ladder.rotation.x = -0.14;
  group.add(ladder);
  addCollider(1.95, -2.1, 0.5, 0.25);
  // wicker baskets with scanned apples
  for (const [name, x, z] of [['wicker_basket_01', -2.45, 0.9], ['wicker_basket_02', -2.25, 1.5]] as const) {
    place(group, name, { at: [x, 0, z], rotY: x * 3, inspect: 'mele' }).then((basket) => {
      const top = topOf(basket);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        const r = i === 0 ? 0 : 0.07;
        place(group, 'food_apple_01', { at: [x + Math.cos(a) * r, top - 0.06 + (i === 0 ? 0.03 : 0), z + Math.sin(a) * r], rotY: i, inspect: 'mele' });
      }
    });
    addCollider(x, z, 0.45, 0.45);
  }
  for (let i = 0; i < 3; i++) {
    const b = P.braid(90 + i, i !== 1);
    b.position.set(-w / 2 + 0.14, 2.55, 1.5 + i * 0.32);
    group.add(inspectable(b, 'trecce'));
  }
  const ch = P.cheeses();
  ch.position.set(shelfX0 + 4.35, shelfLevels[3] + 0.018, shelfZ - 0.02);
  group.add(inspectable(ch, 'formaggi'));
  const pk = P.packets(14, 6);
  pk.position.set(shelfX0 + 1.0, shelfLevels[4] + 0.018, shelfZ);
  group.add(inspectable(pk, 'pacchetti'));
  const pk2 = P.packets(15, 3);
  pk2.position.set(-2.55, ctrTop, -0.98);
  pk2.rotation.y = 0.3;
  group.add(inspectable(pk2, 'pacchetti'));

  // --- the slow-fantasy things
  const chand = F.chandelier();
  const chandelierAnchor = new THREE.Vector3(0.8, h - 0.24 - 0.72, 0.9);
  chand.group.position.copy(chandelierAnchor);
  group.add(inspectable(chand.group, 'lampadario'));

  const glows: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 5; i++) {
    const t = F.tincture(200 + i * 7);
    t.group.position.set(shelfX0 + 4.5 + i * 0.19, shelfLevels[2] + 0.018, shelfZ + (i % 2) * 0.06 - 0.03);
    group.add(inspectable(t.group, 'tinture'));
    glows.push(t.liquid);
  }
  const cr = F.crystals();
  cr.group.position.set(shelfX0 + 4.6, shelfLevels[4] + 0.018, shelfZ);
  group.add(inspectable(cr.group, 'cristalli'));
  glows.push(cr.mat);

  const jarF = F.fireflyJar();
  jarF.group.position.set(0.8, ctrTop, -1.32);
  jarF.group.scale.setScalar(0.8);
  jarF.group.userData.noWonk = true; // the fireflies move: leave the jar as it is
  group.add(inspectable(jarF.group, 'lucciole'));

  const map = F.woodsMap();
  map.position.set(-0.62, ctrTop, -1.08);
  map.rotation.y = -0.08;
  group.add(inspectable(map, 'mappa'));

  const ss = F.shieldAndSword();
  ss.position.set(-w / 2 + 0.1, 1.72, -1.15);
  ss.rotation.y = Math.PI / 2;
  group.add(inspectable(ss, 'scudo'));

  const rope = F.ropeCoil();
  rope.position.set(3.1, 0, 1.1);
  group.add(inspectable(rope, 'corda'));
  addCollider(3.1, 1.1, 0.3, 0.3);
  const lan = F.lantern();
  lan.position.set(2.5, 0, 1.6);
  group.add(inspectable(lan, 'lanterna'));

  // Everything a little crooked, as if built by hand.
  wonkify(group, 0.5);

  return {
    group,
    colliders,
    chandelierFlames: chand.flames,
    chandelierAnchor,
    fireflies: { light: jarF.light, update: jarF.update },
    glows,
    windows,
    lampFlames: [lamp.flame, cs.flame],
    lampAnchors: [new THREE.Vector3(-0.8, h - 0.72, -1.0)],
    candleAnchor: new THREE.Vector3(-1.1, ctrTop + 0.2, -1.3),
    windowGlass,
  };
}

/** What is seen through the door and the windows: the street, the square, the trees. */
export function buildOutside(): THREE.Group {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), phMaterial('leafy_grass', [80, 80]));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  grass.receiveShadow = true;
  g.add(grass);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 3.2), phMaterial('stony_dirt_path', [20, 1.1]));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.01, ROOM.d / 2 + 3.2);
  road.receiveShadow = true;
  g.add(road);
  // Beyond the road, the panoramic photo takes over (see main.ts).
  return g;
}
