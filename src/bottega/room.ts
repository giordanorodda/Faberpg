import * as THREE from 'three';
import { makeRng } from '../core/rng';
import * as P from './props';
import { box, inspectable, MAT, shadowed } from './props';
import { material, planks, plaster, stone } from './textures';

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
      const m = box(b - a, y1 - y0, thick, mat, 0.6);
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
  shadowed(g);
  pane.castShadow = false;
  return { group: g, glass };
}

export function buildRoom(): Room {
  const { w, d, h, wall } = ROOM;
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const addCollider = (cx: number, cz: number, sx: number, sz: number) =>
    colliders.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });

  // --- floor, walls, ceiling
  const floorTex = planks(7, { base: [150, 104, 64], boards: 6, worn: true });
  for (const t of [floorTex.map, floorTex.bumpMap, floorTex.roughnessMap]) t.repeat.set(w / 1.2, d / 2.4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material(floorTex, { bump: 2.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const wallMat = material(plaster(3, [1, 1]), { bump: 1.2 });
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

  const ceilTex = planks(17, { base: [96, 66, 42], boards: 8 });
  for (const t of [ceilTex.map, ceilTex.bumpMap, ceilTex.roughnessMap]) t.repeat.set(w / 1.6, d / 3);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w + wall * 2, d + wall * 2), material(ceilTex));
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
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, wall + 0.1), material(stone(5, [1, 0.4])));
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
  shelves.position.set(-0.6, 0, -d / 2 + 0.2);
  group.add(shelves);
  addCollider(-0.6, -d / 2 + 0.2, 5.7, 0.45);

  const rnd = makeRng(99);
  const shelfZ = -d / 2 + 0.22;
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
  // bottles, top right shelves
  for (let level = 2; level < 4; level++) {
    let x = shelfX0 + 0.2;
    while (x < shelfX0 + 2.2) {
      const b = P.bottle(level * 31 + Math.floor(x * 77));
      b.position.set(x, shelfLevels[level] + 0.018, shelfZ + (rnd() - 0.5) * 0.08);
      group.add(inspectable(b, 'bottiglie'));
      x += 0.12 + rnd() * 0.06;
    }
  }
  // the dark bottle nobody buys, on the top shelf
  const odd = P.bottle(7);
  odd.scale.setScalar(1.25);
  odd.position.set(shelfX0 + 0.5, shelfLevels[4] + 0.018, shelfZ);
  group.add(inspectable(odd, 'bottiglie'));
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
  group.add(cs.group);
  for (let i = 0; i < 3; i++) {
    const j = P.jar(300 + i, 0.18);
    j.position.set(-2.55 + i * 0.17, ctrTop, -1.3);
    group.add(inspectable(j, 'vasi'));
  }

  // behind the counter
  const st = P.stool();
  st.position.set(0.4, 0, -1.85);
  group.add(inspectable(st, 'sgabello'));
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
  const barrels: [number, number][] = [
    [-3.0, 2.2],
    [-2.4, 2.35],
  ];
  for (const [x, z] of barrels) {
    const b = P.barrel();
    b.position.set(x, 0, z);
    group.add(inspectable(b, 'botte'));
    addCollider(x, z, 0.65, 0.65);
  }
  const crates = P.crate(0.6, 0.4, 0.45);
  crates.position.set(3.0, 0, 1.9);
  crates.rotation.y = 0.2;
  group.add(crates);
  const crate2 = P.crate(0.5, 0.32, 0.4);
  crate2.position.set(3.0, 0.4, 1.9);
  crate2.rotation.y = -0.1;
  group.add(crate2);
  addCollider(3.0, 1.9, 0.75, 0.65);

  const br = P.broom();
  br.position.set(3.3, 0, 0.8);
  group.add(inspectable(br, 'scopa'));

  // the sign on the east wall, above the window... no: on the west wall, where customers look
  const sg = P.sign('Si guarda con gli occhi.');
  sg.position.set(-w / 2 + 0.02, 1.85, 0.3);
  sg.rotation.y = Math.PI / 2;
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

  return {
    group,
    colliders,
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
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x5f8a44, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  grass.receiveShadow = true;
  g.add(grass);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 3.2), new THREE.MeshStandardMaterial({ color: 0xa48a62, roughness: 1 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.01, ROOM.d / 2 + 3.2);
  road.receiveShadow = true;
  g.add(road);
  // the tavern across the road
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9a4a32, roughness: 0.9 });
  const house = (x: number, z: number, w: number, d: number, hh: number) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), plasterMat);
    body.position.set(x, hh / 2, z);
    const roofGeo = new THREE.CylinderGeometry(0.01, d * 0.72, w + 0.6, 4, 1);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.x = Math.PI / 4;
    roof.scale.set(1, 1, 0.55);
    roof.position.set(x, hh + d * 0.2, z);
    const doorM = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshStandardMaterial({ color: 0x5a3c22 }));
    doorM.position.set(x, 1.0, z - d / 2 - 0.01);
    doorM.rotation.y = Math.PI;
    return shadowed(new THREE.Group().add(body, roof, doorM));
  };
  g.add(house(-1, ROOM.d / 2 + 10, 9, 5, 3.4));
  g.add(house(10, ROOM.d / 2 + 8, 5, 5, 3));
  // trees
  const rnd = makeRng(3);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f6a32, roughness: 1, flatShading: true });
  const trunk = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const x = -30 + rnd() * 60;
    const z = ROOM.d / 2 + 14 + rnd() * 25;
    if (Math.abs(x) < 6 && z < ROOM.d / 2 + 14) continue;
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6), trunk);
    tr.position.y = 1.1;
    const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + rnd() * 0.8, 0), leaf);
    cr.position.y = 3 + rnd() * 0.6;
    t.add(tr, cr);
    t.position.set(x, 0, z);
    g.add(shadowed(t));
  }
  // east side: a hedge and the start of the meadow
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), leaf);
    b.position.set(ROOM.w / 2 + 4 + rnd(), 0.5, -3 + i * 1.3);
    g.add(shadowed(b));
  }
  return g;
}
