import * as THREE from 'three';
import { makeRng } from '../core/rng';
import * as F from '../bottega/fantasy';
import * as P from '../bottega/props';
import { barrel, bentBox, glass, lathe, M, organic, plankFloor, rbox, sack, shadowed, toon, toonify, wallSkin } from '../stile/kit';
import { boxCollider, floorCollider, settle } from '../stile/softbody';
import { makeBook } from './books';
import { candle, chair } from './furniture';
import type { Box } from './house';
import { checkTex, preserve } from './kitchen';

/**
 * The room beyond the locked door: a lean-to built against the east wall,
 * shut up for years. First it is a dusty storeroom full of other people's
 * things; once cleaned, it becomes what the player decides: a pantry, a
 * workshop or a study. A module attached to the house: the house does not
 * change to make room for it, it only gains a door.
 */

/** Inside of the annex (the house's east wall is at x = 3, its outer face at 3.4). */
export const ANNEX = { x0: 3.4, x1: 6.0, z0: -2.5, z1: 0.2, hIn: 2.7, hOut: 2.1, wall: 0.3 };
/** The door in the house's east wall, at the foot of the stairs. */
export const ANNEX_DOOR = { z0: -2.45, z1: -1.72, y1: 2.0 };

export type AnnexUse = 'dispensa' | 'laboratorio' | 'studio';
export const ANNEX_USES: { id: AnnexUse; title: string; note: string }[] = [
  { id: 'dispensa', title: 'Una dispensa', note: 'scaffali, botti, il fresco per le conserve' },
  { id: 'laboratorio', title: 'Un laboratorio', note: 'un banco da lavoro, gli attrezzi in fila sul muro' },
  { id: 'studio', title: 'Uno studio', note: 'uno scrittoio sotto la finestra, i libri, l’inchiostro' },
];

export interface Annex {
  group: THREE.Group;
  colliders: Box[];
  /** Rotate to open (0 shut, 1 open). */
  door: THREE.Group;
  /** The things that go when the room is cleaned. */
  dust: THREE.Group;
  shutters: THREE.Object3D[];
  lantern: { at: THREE.Vector3; flame: THREE.Mesh };
  /** Builds the furnishings for a use (once) and shows them. */
  furnish: (use: AnnexUse) => void;
  /** Takes the dust, the sheet and the junk away. */
  clean: () => void;
}

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A cobweb strung across a corner: radial threads and loose spirals, slightly sagging. */
function cobweb(size: number, seed: number): THREE.Mesh {
  const rnd = makeRng(seed);
  const t = tex(256, 256, (g) => {
    g.strokeStyle = 'rgba(240,240,235,0.55)';
    g.lineWidth = 1.2;
    const spokes = 9 + Math.floor(rnd() * 5);
    const angles: number[] = [];
    for (let i = 0; i < spokes; i++) angles.push((i / spokes) * (Math.PI / 2) + (rnd() - 0.5) * 0.1);
    for (const a of angles) {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * 256, Math.sin(a) * 256);
      g.stroke();
    }
    for (let r = 18; r < 250; r += 12 + rnd() * 10) {
      g.beginPath();
      angles.forEach((a, i) => {
        const rr = r * (0.92 + rnd() * 0.1);
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) g.moveTo(x, y);
        else g.quadraticCurveTo(Math.cos(a - 0.08) * rr * 0.96, Math.sin(a - 0.08) * rr * 0.96, x, y);
      });
      g.stroke();
    }
    // a torn bit hanging down
    g.beginPath();
    g.moveTo(140, 120);
    g.quadraticCurveTo(150, 190, 132, 240);
    g.stroke();
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.geometry.translate(size / 2, -size / 2, 0);
  m.userData.noWonk = true;
  return m;
}

/** A grey film of dust on the floor, thicker in the corners, with footprints of a cat that got in somehow. */
function dustFloor(w: number, d: number): THREE.Mesh {
  const rnd = makeRng(12);
  const t = tex(512, 512, (g) => {
    g.fillStyle = 'rgba(200,196,186,0.35)';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(210,205,195,${rnd() * 0.25})`;
      g.beginPath();
      g.arc(rnd() * 512, rnd() * 512, 2 + rnd() * 18, 0, Math.PI * 2);
      g.fill();
    }
    // little paw prints crossing the room
    g.fillStyle = 'rgba(90,70,50,0.35)';
    for (let k = 0; k < 14; k++) {
      const x = 60 + k * 30;
      const y = 380 - k * 18 + (k % 2) * 14;
      g.beginPath();
      g.ellipse(x, y, 4, 5, 0, 0, Math.PI * 2);
      g.fill();
      for (let j = 0; j < 3; j++) {
        g.beginPath();
        g.arc(x - 4 + j * 4, y - 7, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon({ map: t, transparent: true, rim: 0 }));
  (m.material as THREE.Material).depthWrite = false;
  (m.material as THREE.Material).polygonOffset = true;
  (m.material as THREE.Material).polygonOffsetFactor = -2;
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  m.receiveShadow = true;
  m.userData.noWonk = true;
  return m;
}

export function buildAnnex(stone: THREE.Material, colliders: Box[]): Annex {
  const A = ANNEX;
  const group = new THREE.Group();
  const dustBoxes: Box[] = [];
  let collecting: Box[] | null = null;
  const box = (cx: number, cz: number, sx: number, sz: number) => {
    const b: Box = { minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2, level: 0 };
    colliders.push(b);
    collecting?.push(b);
    return b;
  };
  const rnd = makeRng(77);
  const W = A.x1 - A.x0;
  const D = A.z1 - A.z0;
  const roofY = (x: number) => A.hIn + ((x - A.x0) / W) * (A.hOut - A.hIn);

  // ------------------------------------------------------------ shell
  const floor = plankFloor(W, D, 91);
  floor.position.set((A.x0 + A.x1) / 2, 0, (A.z0 + A.z1) / 2);
  floor.userData.noWonk = true;
  group.add(floor);
  const solid = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), stone);
    b.position.set(x, y, z);
    group.add(shadowed(b));
  };
  const win = { x0: 4.25, x1: 5.15, y0: 0.9, y1: 1.65 };
  const winE = { z0: -1.55, z1: -0.85, y0: 0.9, y1: 1.6 };
  // north wall, solid
  solid((A.x0 + A.x1 + A.wall) / 2, A.hIn / 2, A.z0 - A.wall / 2, W + A.wall, A.hIn, A.wall);
  // south wall around its window
  const sz = A.z1 + A.wall / 2;
  solid((A.x0 + win.x0) / 2, A.hIn / 2, sz, win.x0 - A.x0, A.hIn, A.wall);
  solid((win.x1 + A.x1 + A.wall) / 2, A.hIn / 2, sz, A.x1 + A.wall - win.x1, A.hIn, A.wall);
  solid((win.x0 + win.x1) / 2, win.y0 / 2, sz, win.x1 - win.x0, win.y0, A.wall);
  solid((win.x0 + win.x1) / 2, (win.y1 + A.hIn) / 2, sz, win.x1 - win.x0, A.hIn - win.y1, A.wall);
  // east wall (low, under the eaves) around its window
  const ex = A.x1 + A.wall / 2;
  solid(ex, A.hOut / 2, (A.z0 + winE.z0) / 2, A.wall, A.hOut, winE.z0 - A.z0);
  solid(ex, A.hOut / 2, (winE.z1 + A.z1) / 2, A.wall, A.hOut, A.z1 - winE.z1);
  solid(ex, winE.y0 / 2, (winE.z0 + winE.z1) / 2, A.wall, winE.y0, winE.z1 - winE.z0);
  solid(ex, (winE.y1 + A.hOut) / 2, (winE.z0 + winE.z1) / 2, A.wall, A.hOut - winE.y1, winE.z1 - winE.z0);
  // plaster skins, old and patched
  const skin = (o: Parameters<typeof wallSkin>[0], seed: number, x: number, z: number, ry: number) => {
    const s = wallSkin(o, seed);
    s.position.set(x, o.h / 2, z);
    s.rotation.y = ry;
    group.add(s);
  };
  skin({ w: W, h: A.hIn, cracksFrom: [{ x: 1.4, y: 2.2 }] }, 31, (A.x0 + A.x1) / 2, A.z0 + 0.012, 0);
  skin({ w: W, h: A.hIn, holes: [{ x0: A.x1 - win.x1, x1: A.x1 - win.x0, y0: win.y0, y1: win.y1 }], tally: { x: 2.2, y: 1.2 } }, 32, (A.x0 + A.x1) / 2, A.z1 - 0.012, Math.PI);
  skin({ w: D, h: A.hOut, holes: [{ x0: winE.z0 - A.z0, x1: winE.z1 - A.z0, y0: winE.y0, y1: winE.y1 }] }, 33, A.x1 - 0.012, (A.z0 + A.z1) / 2, -Math.PI / 2);
  // the lean-to roof: a slab with rafters, sloping away from the house
  const slope = Math.atan2(A.hIn - A.hOut, W);
  const len = Math.hypot(W, A.hIn - A.hOut);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(len + 0.8, 0.14, D + A.wall * 2 + 0.4), toon({ map: M.beamH.map!, rim: 0 }));
  slab.position.set((A.x0 + A.x1) / 2 + 0.2, (A.hIn + A.hOut) / 2 + 0.07, (A.z0 + A.z1) / 2);
  slab.rotation.z = -slope;
  group.add(shadowed(slab));
  for (let z = A.z0 + 0.25, i = 0; z < A.z1; z += 0.6, i++) {
    const r = bentBox(len, 0.14, 0.1, M.beamH, 0.01, 0.02 * Math.sin(i));
    r.position.set((A.x0 + A.x1) / 2, (A.hIn + A.hOut) / 2 - 0.07, z);
    r.rotation.z = -slope;
    group.add(shadowed(r));
  }
  // windows: shuttered from outside until the room is cleaned
  const shutters: THREE.Object3D[] = [];
  const windowAt = (ww: number, wh: number, place: (g: THREE.Group) => void) => {
    const g = new THREE.Group();
    for (const [bw, bh, x, y] of [[ww + 0.1, 0.08, 0, wh / 2], [ww + 0.1, 0.08, 0, -wh / 2], [0.08, wh, ww / 2, 0], [0.08, wh, -ww / 2, 0], [0.05, wh, 0, 0]] as const) {
      const b = rbox(bw, bh, 0.1, M.wood, 0.015);
      b.position.set(x, y, 0);
      g.add(b);
    }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww - 0.06, wh - 0.06), glass(0xd8dcd0));
    (pane.material as THREE.MeshToonMaterial).opacity = 0.3;
    pane.castShadow = false;
    g.add(pane);
    const sill = rbox(ww + 0.2, 0.06, A.wall + 0.12, M.stone, 0.02);
    sill.position.set(0, -wh / 2 - 0.03, 0);
    g.add(sill);
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set((s * ww) / 2, 0, -A.wall / 2 - 0.02);
      const sh = rbox(ww / 2, wh, 0.04, M.beam, 0.01);
      sh.position.x = (-s * ww) / 4;
      hinge.add(sh);
      hinge.userData.side = s;
      g.add(hinge);
      shutters.push(hinge);
    }
    place(g);
    group.add(shadowed(g));
    pane.castShadow = false;
  };
  windowAt(win.x1 - win.x0, win.y1 - win.y0, (g) => {
    g.position.set((win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, sz);
    g.rotation.y = Math.PI;
  });
  windowAt(winE.z1 - winE.z0, winE.y1 - winE.y0, (g) => {
    g.position.set(ex, (winE.y0 + winE.y1) / 2, (winE.z0 + winE.z1) / 2);
    g.rotation.y = -Math.PI / 2;
  });

  // the door, in the house's east wall, hinged on the annex side
  const door = new THREE.Group();
  {
    const dw = ANNEX_DOOR.z1 - ANNEX_DOOR.z0 - 0.04;
    for (let i = 0; i < 4; i++) {
      const p = rbox(0.05, ANNEX_DOOR.y1 - 0.02, dw / 4 - 0.004, i % 2 ? M.wood : M.beam, 0.006);
      p.position.set(0, (ANNEX_DOOR.y1 - 0.02) / 2, -(i + 0.5) * (dw / 4));
      door.add(p);
    }
    for (const y of [0.3, 1.65]) {
      const strap = rbox(0.012, 0.06, dw * 0.85, M.iron, 0.004);
      strap.position.set(-0.03, y, -dw * 0.45);
      door.add(strap);
    }
    const plate = rbox(0.01, 0.12, 0.07, M.iron, 0.004);
    plate.position.set(-0.03, 1.0, -dw + 0.08);
    door.add(plate);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 8), toon({ color: 0x0a0806 }));
    hole.rotation.z = Math.PI / 2;
    hole.position.set(-0.036, 0.98, -dw + 0.08);
    door.add(hole);
    door.position.set(3.33, 0, ANNEX_DOOR.z1 - 0.02);
    group.add(shadowed(door));
  }

  // a lantern hanging from the middle rafter, lit once the room is in use
  const lan = F.lantern();
  toonify(lan);
  const lanAt = new THREE.Vector3(4.6, roofY(4.6) - 0.62, -1.0);
  lan.position.copy(lanAt);
  group.add(lan);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.36, 4), M.rope);
  cord.position.set(lanAt.x, lanAt.y + 0.44, lanAt.z);
  group.add(cord);
  const lflame = candle(5, 0.04).flame;
  lflame.position.copy(lanAt).add(new THREE.Vector3(0, 0.05, 0));
  lflame.scale.setScalar(1.3);
  group.add(lflame);

  // ------------------------------------------------------------ years of dust
  collecting = dustBoxes;
  const dust = new THREE.Group();
  dust.userData.noWonk = true;
  group.add(dust);
  dust.add(dustFloor(W, D).translateX((A.x0 + A.x1) / 2).translateY(-(A.z0 + A.z1) / 2));
  // cobwebs in the corners and between the rafters
  const webs: [number, number, number, number, number][] = [
    [A.x0 + 0.02, 2.5, A.z0 + 0.02, 0.45, Math.PI / 4],
    [A.x1 - 0.02, 1.95, A.z0 + 0.02, 0.4, -Math.PI / 4],
    [A.x1 - 0.02, 1.9, A.z1 - 0.02, 0.35, -Math.PI * 0.75],
    [4.4, 2.3, -0.6, 0.4, Math.PI / 2],
  ];
  webs.forEach(([x, y, z, s, ry], i) => {
    const w = cobweb(s, 40 + i);
    w.position.set(x, y, z);
    w.rotation.set(0, ry, 0);
    dust.add(w);
  });
  // a sheet over something tall, left to fall over it
  {
    const under = rbox(0.9, 1.1, 0.5, M.wood, 0.02);
    under.position.set(A.x0 + 0.7, 0.55, A.z0 + 0.35);
    dust.add(shadowed(under));
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4, 50, 46).rotateX(-Math.PI / 2), toon({ map: checkTex(3, '#b8b0a0'), rim: 0.3, side: THREE.DoubleSide }));
    sheet.position.set(A.x0 + 0.72, 1.3, A.z0 + 0.4);
    sheet.rotation.y = 0.1;
    settle(sheet, {
      colliders: [boxCollider(new THREE.Vector3(A.x0 + 0.25, 0, A.z0 + 0.1), new THREE.Vector3(A.x0 + 1.15, 1.1, A.z0 + 0.6), 0.01), floorCollider(), { resolve: (q) => q.z < A.z0 + 0.01 && (q.z = A.z0 + 0.01) }],
      bend: 0.06,
      steps: 360,
      friction: 0.85,
    });
    dust.add(shadowed(sheet));
    box(A.x0 + 0.7, A.z0 + 0.35, 1.0, 0.6);
  }
  // crates, a broken chair, bottles nobody wanted, a dead plant
  const junk: THREE.Object3D[] = [];
  for (const [x, z, w, h, d, ry] of [[5.6, -2.2, 0.6, 0.45, 0.45, 0.1], [5.65, -2.15, 0.45, 0.35, 0.35, -0.3], [5.55, -0.25, 0.5, 0.4, 0.4, 0.4]] as const) {
    const c = P.crate(w, h, d);
    toonify(c);
    c.position.set(x, z === -2.15 ? 0.45 : 0, z);
    c.rotation.y = ry;
    dust.add(organic(c, 0.01, x));
    junk.push(c);
  }
  box(5.6, -2.2, 0.65, 0.55);
  box(5.55, -0.25, 0.55, 0.5);
  {
    const ch = chair(9);
    ch.position.set(4.2, 0.06, -0.3);
    ch.rotation.set(0.1, 2.4, 1.35);
    dust.add(ch);
    box(4.2, -0.3, 0.6, 0.6);
    const pot = new THREE.Group();
    pot.add(lathe([[0, 0], [0.08, 0], [0.1, 0.14], [0.11, 0.16], [0.095, 0.16]], M.clay, 24));
    const dry = toon({ color: 0x8a7a5a, rim: 0.2 });
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.3, 4), dry);
      st.position.set(Math.cos(i * 1.3) * 0.02, 0.28, Math.sin(i * 1.3) * 0.02);
      st.rotation.set(Math.cos(i * 1.7) * 0.6, 0, Math.sin(i * 1.7) * 0.6);
      pot.add(st);
    }
    pot.position.set(4.7, 0.84, A.z1 - 0.05);
    dust.add(shadowed(pot));
    for (let i = 0; i < 4; i++) {
      const b = lathe([[0, 0], [0.035, 0], [0.036, 0.16], [0.012, 0.21], [0.012, 0.24], [0, 0.24]], glass(0x6a7a5a), 16);
      b.position.set(5.75 + (i % 2) * 0.08, 0.45 + 0.35, -2.1 + i * 0.06);
      if (i === 3) b.rotation.z = Math.PI / 2;
      dust.add(shadowed(b));
    }
  }

  collecting = null;
  // ------------------------------------------------------------ what the room can become
  const uses: Partial<Record<AnnexUse, THREE.Group>> = {};
  const build: Record<AnnexUse, () => THREE.Group> = {
    dispensa: () => {
      const g = new THREE.Group();
      // tall shelves along the north wall, preserves and crocks
      for (const x of [3.75, 4.75]) {
        const sh = P.shelving(0.95, 1.9, 0.35, [0.3, 0.75, 1.2, 1.65]);
        toonify(sh);
        sh.position.set(x + 0.45, 0, A.z0 + 0.2);
        g.add(sh);
      }
      const fills = [0xe08a2a, 0x6a2a4a, 0xc0302a, 0xd8b03a, 0x4a6a2a, 0x8a3a5a, 0xe0a040];
      let k = 0;
      for (const y of [0.3, 0.75, 1.2, 1.65]) {
        let x = 3.82;
        while (x < 5.6) {
          if (rnd() < 0.15) {
            x += 0.12;
            continue;
          }
          const j = preserve(200 + k, fills[k % fills.length]);
          j.position.set(x, y + 0.02, A.z0 + 0.2 + (rnd() - 0.5) * 0.06);
          g.add(j);
          x += 0.12 + rnd() * 0.05;
          k++;
        }
      }
      box(4.7, A.z0 + 0.2, 2.0, 0.4);
      for (const [x, z] of [[5.6, -0.4], [5.6, 0.0]] as const) {
        const b = barrel(20 + x);
        b.position.set(x, 0, z - 0.4);
        g.add(b);
        box(x, z - 0.4, 0.66, 0.66);
      }
      for (let i = 0; i < 3; i++) {
        const s = sack(60 + i, 0.2);
        s.position.set(3.75 + i * 0.45, 0, -0.1);
        s.rotation.y = rnd() * 3;
        g.add(s);
      }
      box(4.2, -0.1, 1.4, 0.5);
      // a ham and cheeses hanging from the rafter
      const ham = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), toon({ color: 0x9a5a3a, rim: 0.4 }));
      ham.scale.set(0.6, 1.1, 0.55);
      ham.position.set(4.3, 1.75, -1.3);
      g.add(organic(shadowed(ham), 0.08, 4));
      for (let i = 0; i < 3; i++) {
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20), toon({ color: 0xe8c878, rim: 0.4 }));
        ch.position.set(4.9 + i * 0.25, 1.8 - i * 0.05, -1.3);
        g.add(organic(shadowed(ch), 0.04, i));
      }
      return g;
    },
    laboratorio: () => {
      const g = new THREE.Group();
      // the workbench under the window, a vice at one end, shavings on the floor
      const top = bentBox(1.8, 0.08, 0.6, M.woodPale, 0.004, 0.01);
      top.position.set(4.7, 0.86, A.z1 - 0.35);
      g.add(top);
      for (const x of [3.9, 5.5]) for (const z of [A.z1 - 0.6, A.z1 - 0.1]) {
        const leg = rbox(0.08, 0.82, 0.08, M.beam, 0.01);
        leg.position.set(x, 0.41, z);
        g.add(leg);
      }
      const shelf = bentBox(1.7, 0.03, 0.5, M.wood, 0.01, 0);
      shelf.position.set(4.7, 0.2, A.z1 - 0.35);
      g.add(shelf);
      const vice = rbox(0.12, 0.14, 0.2, M.iron, 0.01);
      vice.position.set(5.45, 0.97, A.z1 - 0.62);
      g.add(vice);
      const plane = rbox(0.24, 0.07, 0.07, M.wood, 0.02);
      plane.position.set(4.4, 0.935, A.z1 - 0.3);
      plane.rotation.y = 0.3;
      g.add(plane);
      const shav = toon({ color: 0xe8c890, rim: 0.4, side: THREE.DoubleSide });
      for (let i = 0; i < 40; i++) {
        const c = new THREE.Mesh(new THREE.TorusGeometry(0.02 + rnd() * 0.015, 0.004, 3, 10, Math.PI * (1 + rnd())), shav);
        c.position.set(4.2 + rnd() * 1.2, i < 12 ? 0.91 : 0.01, A.z1 - 0.3 - (i < 12 ? 0 : 0.3) - rnd() * 0.4);
        c.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        g.add(c);
      }
      box(4.7, A.z1 - 0.35, 1.9, 0.65);
      // tools on a board on the north wall, each with its outline painted behind it
      const board = rbox(1.6, 0.9, 0.03, M.wood, 0.01);
      board.position.set(4.6, 1.5, A.z0 + 0.02);
      g.add(board);
      const tools: [number, number, number, number][] = [[4.0, 1.6, 0.04, 0.5], [4.25, 1.55, 0.05, 0.42], [4.5, 1.6, 0.18, 0.06], [4.85, 1.5, 0.3, 0.12], [5.2, 1.6, 0.04, 0.4]];
      for (const [x, y, w, h] of tools) {
        const t = rbox(w, h, 0.03, rnd() < 0.5 ? M.iron : M.beam, 0.005);
        t.position.set(x, y, A.z0 + 0.06);
        t.rotation.z = (rnd() - 0.5) * 0.2;
        g.add(t);
      }
      const saw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.004), M.iron);
      saw.position.set(4.7, 1.2, A.z0 + 0.06);
      g.add(saw);
      for (const [x, z] of [[5.6, -2.2]] as const) {
        const c = P.crate(0.55, 0.4, 0.45);
        toonify(c);
        c.position.set(x, 0, z);
        g.add(c);
      }
      return g;
    },
    studio: () => {
      const g = new THREE.Group();
      // the writing desk under the window, a chair, a candle, ink, papers
      const desk = new THREE.Group();
      const top = bentBox(1.2, 0.05, 0.6, M.wood, 0.004, 0.01);
      top.position.y = 0.76;
      desk.add(top);
      for (const x of [-0.55, 0.55]) for (const z of [-0.25, 0.25]) {
        const leg = lathe([[0, 0], [0.025, 0], [0.03, 0.2], [0.022, 0.5], [0.028, 0.74], [0, 0.74]], M.beam, 10);
        leg.position.set(x, 0, z);
        desk.add(leg);
      }
      desk.position.set(4.7, 0, A.z1 - 0.38);
      g.add(organic(shadowed(desk), 0.006, 2));
      box(4.7, A.z1 - 0.38, 1.25, 0.65);
      const ch = chair(12);
      ch.position.set(4.6, 0, A.z1 - 0.95);
      ch.rotation.y = 0.15;
      g.add(ch);
      const ink = P.inkwell();
      toonify(ink);
      ink.position.set(5.0, 0.785, A.z1 - 0.25);
      g.add(ink);
      const paper = toon({ color: 0xf0e6cc, rim: 0.1 });
      for (let i = 0; i < 5; i++) {
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.28), paper);
        sh.rotation.set(-Math.PI / 2, 0, (rnd() - 0.5) * 0.6);
        sh.position.set(4.5 + (rnd() - 0.5) * 0.2, 0.787 + i * 0.001, A.z1 - 0.4 + (rnd() - 0.5) * 0.1);
        g.add(sh);
      }
      const c = candle(33, 0.1);
      c.group.position.set(4.2, 0.785, A.z1 - 0.2);
      g.add(c.group);
      // books in piles on the floor and a low shelf, the map on the wall
      for (let p = 0; p < 3; p++) {
        let y = 0;
        for (let i = 0; i < 4 + p; i++) {
          const b = makeBook(700 + p * 10 + i, { h: 0.22, t: 0.035 + rnd() * 0.02 });
          b.rotation.set(0, rnd() * 0.6, Math.PI / 2);
          b.position.set(3.75 + p * 0.25, y + 0.02, A.z0 + 0.35 + (p % 2) * 0.1);
          y += 0.045;
          g.add(b);
        }
      }
      box(4.0, A.z0 + 0.4, 0.8, 0.4);
      const map = F.woodsMap();
      toonify(map);
      map.position.set(4.9, 1.5, A.z0 + 0.03);
      map.rotation.x = Math.PI / 2;
      g.add(map);
      return g;
    },
  };
  const clean = () => {
    dust.visible = false;
    for (const b of dustBoxes) colliders.splice(colliders.indexOf(b), 1);
    dustBoxes.length = 0;
  };
  const furnish = (use: AnnexUse) => {
    for (const [k, g] of Object.entries(uses)) if (g) g.visible = k === use;
    if (!uses[use]) {
      const g = build[use]();
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      g.traverse((o) => (o.userData.inspect = use));
      uses[use] = g;
      group.add(g);
    }
  };

  dust.traverse((o) => (o.userData.inspect = 'polvere'));
  door.traverse((o) => (o.userData.inspect = 'porta-stanza'));
  return { group, colliders, door, dust, shutters, lantern: { at: lanAt, flame: lflame }, furnish, clean };
}
