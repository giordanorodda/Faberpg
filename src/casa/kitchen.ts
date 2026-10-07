import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { bentBox, bowl, garlicBraid, glass, lathe, M, nail, organic, rbox, sack, shadowed, toon } from '../stile/kit';
import { clothTex } from '../stile/paint';
import { boxCollider, floorCollider, settle, type Collider } from '../stile/softbody';
import type { Box, Movable } from './house';

/**
 * The kitchen corner, beside the hearth where fire and water are near: a
 * long madia against the west wall with a gathered curtain instead of
 * doors, a stone sink under a small north window, copper pans on a rail,
 * preserves on the shelf with cloth caps tied on, bread under a linen
 * cloth, and on the floor the cat's dish.
 *
 * Corner: west wall x = -3, north wall z = -2.5.
 */

export interface KitchenCtx {
  group: THREE.Group;
  box: (cx: number, cz: number, sx: number, sz: number) => Box;
  movable: <T extends THREE.Object3D>(obj: T, kind: Movable['kind'], b?: Box) => T;
  tag: <T extends THREE.Object3D>(obj: T, key: string) => T;
  living: THREE.Object3D[];
  stone: THREE.Material;
}

/** The small window over the sink (north wall, ground floor). */
export const KITCHEN_WINDOW = { x0: -2.25, x1: -1.65, y0: 1.15, y1: 1.75 };

const copper = toon({ color: 0xb87048, rim: 0.55 });
const copperIn = toon({ color: 0xd8a070, rim: 0.3 });

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Red and white check, for curtains and jar caps. */
export const checkTex = (seed: number, col: string) =>
  tex(128, 128, (g) => {
    const rnd = makeRng(seed);
    g.fillStyle = '#efe6d2';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = col;
    g.globalAlpha = 0.55;
    for (let i = 0; i < 128; i += 16) {
      g.fillRect(i, 0, 8, 128);
      g.fillRect(0, i, 128, 8);
    }
    g.globalAlpha = 0.25;
    for (let i = 0; i < 128; i += 16) for (let j = 0; j < 128; j += 16) g.fillRect(i, j, 8, 8);
    g.globalAlpha = 0.08;
    for (let i = 0; i < 30; i++) {
      g.fillStyle = rnd() < 0.5 ? '#000' : '#fff';
      g.fillRect(rnd() * 128, rnd() * 128, 10 + rnd() * 30, 6 + rnd() * 20);
    }
  });

/**
 * A curtain gathered on a rod: the cloth starts pleated in a zigzag whose
 * length is the full width of the fabric, its top held on the rod, and
 * gravity does the rest. Lies in XY facing +z, top edge at y = 0.
 */
export function gatheredCurtain(width: number, height: number, map: THREE.Texture, floorY: number): THREE.Mesh {
  const segX = Math.round(width * 70);
  const geo = new THREE.PlaneGeometry(width, height, segX, Math.round(height * 40));
  const p = geo.attributes.position as THREE.BufferAttribute;
  const lambda = 0.07;
  const amp = (lambda * Math.sqrt(1.5 * 1.5 - 1)) / (2 * Math.PI);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setXYZ(i, x, p.getY(i) - height / 2, amp * Math.sin((2 * Math.PI * x) / lambda));
  }
  const m = new THREE.Mesh(geo, toon({ map, rim: 0.3, side: THREE.DoubleSide }));
  settle(m, {
    colliders: [{ resolve: (q) => q.z < -0.03 && (q.z = -0.03) }, floorCollider(floorY)],
    pinned: (q) => q.y > -0.004,
    bend: 0.05,
    steps: 260,
    friction: 0.6,
  });
  return m;
}

/** A copper saucepan hanging by its handle. Hangs from y = 0. */
function saucepan(r: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const pan = new THREE.Group();
  pan.add(lathe([[0, 0], [r * 0.95, 0.002], [r, r * 0.9], [r * 1.04, r * 0.95], [r * 0.98, r * 0.95], [r * 0.93, 0.01], [0, 0.01]], copper, 32));
  const inside = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 24), copperIn);
  inside.rotation.x = -Math.PI / 2;
  inside.position.y = 0.012;
  pan.add(inside);
  const handle = rbox(0.22, 0.012, 0.025, M.iron, 0.004);
  handle.position.set(r + 0.1, r * 0.85, 0);
  pan.add(handle);
  const hole = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.003, 4, 10), M.iron);
  hole.rotation.x = Math.PI / 2;
  hole.position.set(r + 0.19, r * 0.85, 0);
  pan.add(hole);
  // hung by the handle: the pan turns so the hole is at the top
  pan.rotation.z = Math.PI / 2;
  pan.position.set(r * 0.85, -(r + 0.19), 0);
  g.add(pan);
  return organic(shadowed(g), 0.01, seed);
}

/** A ladle, a skimmer or a wooden spoon, hanging. Hangs from y = 0. */
function utensil(kind: 'ladle' | 'skimmer' | 'spoon'): THREE.Group {
  const g = new THREE.Group();
  const mat = kind === 'spoon' ? M.woodPale : M.iron;
  const len = kind === 'spoon' ? 0.3 : 0.34;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, len, 6), mat);
  stick.position.y = -len / 2 - 0.02;
  g.add(stick);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 4, 10), mat);
  ring.position.y = -0.012;
  g.add(ring);
  const head =
    kind === 'ladle'
      ? new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat)
      : kind === 'skimmer'
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.004, 18), mat)
        : new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), mat);
  if (kind === 'ladle') head.rotation.x = Math.PI / 2;
  if (kind === 'skimmer') head.rotation.x = Math.PI / 2;
  if (kind === 'spoon') head.scale.set(1, 1.5, 0.4);
  head.position.y = -len - 0.04;
  g.add(head);
  return shadowed(g);
}

/** A jar of preserves with a checked cloth cap tied on with string. */
function preserve(seed: number, fill: number): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const h = 0.13 + rnd() * 0.06;
  const r = 0.045 + rnd() * 0.015;
  g.add(lathe([[0, 0], [r, 0.002], [r + 0.004, h * 0.8], [r * 0.85, h * 0.92], [r * 0.85, h], [0, h]], glass(0xe8f0e8), 24));
  const inside = lathe([[0, 0.004], [r - 0.004, 0.006], [r - 0.002, h * 0.75], [0, h * 0.75]], toon({ color: fill, rim: 0.4, emissive: fill, emissiveIntensity: 0.12 }), 20);
  g.add(inside);
  // the cap: a disc of cloth over the mouth, its edge falling in little waves
  const cap = new THREE.CylinderGeometry(r * 0.88, r * 1.25, 0.03, 28, 2, true);
  const p = cap.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i));
    if (p.getY(i) < 0) p.setY(i, p.getY(i) + Math.sin(a * 9 + seed) * 0.005);
  }
  cap.computeVertexNormals();
  const capMat = toon({ map: checkTex(seed, rnd() < 0.5 ? '#a8302a' : '#3a5a8a'), rim: 0.3, side: THREE.DoubleSide });
  const capM = new THREE.Mesh(cap, capMat);
  capM.position.y = h - 0.01;
  g.add(capM);
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 24), capMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = h + 0.005;
  g.add(top);
  const string = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.0025, 4, 24), M.rope);
  string.rotation.x = Math.PI / 2;
  string.position.y = h - 0.004;
  g.add(string);
  // a handwritten label
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.03),
    toon({
      map: tex(64, 40, (c) => {
        c.fillStyle = '#efe4c8';
        c.fillRect(0, 0, 64, 40);
        c.strokeStyle = '#3a2a1a';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(8, 22);
        for (let x = 8; x < 56; x += 5) c.quadraticCurveTo(x + 2, 14 + rnd() * 6, x + 5, 22);
        c.stroke();
      }),
      rim: 0.1,
    }),
  );
  label.position.set(0, h * 0.45, r + 0.006);
  g.add(label);
  return shadowed(g);
}

/** An onion: papery skin, a pointed top, a tuft of roots. */
function onion(seed: number): THREE.Mesh {
  const rnd = makeRng(seed);
  const prof: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    prof.push([Math.sin(t * Math.PI) * (0.035 + rnd() * 0.004) * (t > 0.7 ? 1 - (t - 0.7) * 1.4 : 1), t * 0.07]);
  }
  const m = lathe(prof, toon({ color: [0xc88a4a, 0xb86a3a, 0xd8b07a][seed % 3], rim: 0.5 }), 16);
  return organic(shadowed(m), 0.05, seed);
}

/** A stone mortar with its pestle. */
function mortar(stone: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.06, 0], [0.07, 0.03], [0.068, 0.07], [0.06, 0.075], [0.05, 0.075], [0.045, 0.03], [0, 0.025]], stone, 24));
  const pestle = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.12, 4, 8), M.woodPale);
  pestle.position.set(0.02, 0.09, 0);
  pestle.rotation.z = -0.5;
  g.add(pestle);
  return organic(shadowed(g), 0.02, 3);
}

/** A crock full of wooden spoons and a whisk of twigs. */
function utensilCrock(): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.055, 0.002], [0.065, 0.06], [0.06, 0.14], [0.066, 0.15], [0.058, 0.15], [0.05, 0.01], [0, 0.01]], toon({ color: 0x9a6a3a, rim: 0.4 }), 24));
  const rnd = makeRng(8);
  for (let i = 0; i < 6; i++) {
    const s = utensil('spoon');
    s.scale.setScalar(0.7);
    s.rotation.set(Math.PI + (rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4);
    s.position.set((rnd() - 0.5) * 0.04, 0.27, (rnd() - 0.5) * 0.04);
    g.add(s);
  }
  return organic(shadowed(g), 0.02, 2);
}

/** Bread under a linen cloth, the cloth left to fall over the loaf. */
function breadUnderCloth(top: number): THREE.Group {
  const g = new THREE.Group();
  const crust = toon({ color: 0xb8783a, rim: 0.4 });
  const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), crust);
  loaf.scale.set(1.25, 0.8, 1);
  loaf.position.y = top;
  g.add(organic(shadowed(loaf), 0.06, 4));
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5, 36, 36).rotateX(-Math.PI / 2), toon({ map: clothTex(93, '#efe6d2'), rim: 0.3, side: THREE.DoubleSide }));
  cloth.position.set(0.06, top + 0.2, -0.02);
  cloth.rotation.y = 0.5;
  const sphere: Collider = {
    resolve(q) {
      const dx = (q.x - 0) / 1.25;
      const dy = (q.y - top) / 0.8;
      const dz = q.z;
      const d = Math.hypot(dx, dy, dz);
      if (d < 0.115 && q.y > top - 0.01) {
        const k = 0.115 / Math.max(d, 1e-6);
        q.x = dx * k * 1.25;
        q.y = top + dy * k * 0.8;
        q.z = dz * k;
      }
    },
  };
  settle(cloth, { colliders: [sphere, boxCollider(new THREE.Vector3(-1, top - 0.1, -0.31), new THREE.Vector3(1, top, 1), 0.004)], bend: 0.08, steps: 300, friction: 0.8 });
  g.add(shadowed(cloth));
  return g;
}

export function buildKitchen(k: KitchenCtx): void {
  const { group, box, movable, tag, living, stone } = k;
  const rnd = makeRng(606);
  const W = 6;
  const D = 5;
  const x0 = -W / 2;
  const z0 = -D / 2;
  const TOP = 0.88;

  // ------------------------------------------------------------ the madia along the west wall
  const mz0 = z0 + 0.02;
  const mz1 = -1.08;
  const depth = 0.58;
  {
    const g = new THREE.Group();
    const len = mz1 - mz0;
    const top = bentBox(len + 0.04, 0.06, depth + 0.04, M.woodPale, 0.004, 0.01);
    top.rotation.y = Math.PI / 2;
    top.position.set(x0 + depth / 2, TOP - 0.03, (mz0 + mz1) / 2);
    g.add(top);
    // the frame: legs and a shelf low down
    for (const z of [mz0 + 0.04, (mz0 + mz1) / 2, mz1 - 0.04]) {
      const leg = rbox(0.06, TOP - 0.06, 0.06, M.beam, 0.01);
      leg.position.set(x0 + depth - 0.05, (TOP - 0.06) / 2, z);
      g.add(leg);
    }
    const shelf = bentBox(len, 0.03, depth - 0.06, M.wood, 0.01, 0);
    shelf.rotation.y = Math.PI / 2;
    shelf.position.set(x0 + depth / 2, 0.16, (mz0 + mz1) / 2);
    g.add(shelf);
    // behind the curtain: crocks, a basket, a stack of pans
    for (let i = 0; i < 5; i++) {
      const crock = lathe([[0, 0], [0.08, 0.002], [0.1, 0.1], [0.08, 0.2], [0.085, 0.21], [0, 0.21]], i % 2 ? M.clay : toon({ color: 0x8a6a4a, rim: 0.3 }), 20);
      crock.position.set(x0 + 0.25, 0.175, mz0 + 0.18 + i * 0.27);
      g.add(crock);
    }
    group.add(tag(organic(shadowed(g), 0.006, 3), 'madia'));
    // the gathered curtain under the top, on a cord
    const curtain = gatheredCurtain(len - 0.06, TOP - 0.1, checkTex(51, '#a8302a'), -(TOP - 0.1) + 0.01);
    curtain.position.set(x0 + depth + 0.02, TOP - 0.07, (mz0 + mz1) / 2);
    curtain.rotation.y = Math.PI / 2;
    group.add(tag(shadowed(curtain), 'tenda'));
    box(x0 + depth / 2, (mz0 + mz1) / 2, depth, len);
  }
  // on the madia: board with onions and a knife, mortar, the crock of spoons, bread, eggs
  {
    const bx = x0 + 0.3;
    const board = rbox(0.4, 0.03, 0.26, M.woodPale, 0.012);
    board.position.set(bx, TOP + 0.015, -1.55);
    board.rotation.y = Math.PI / 2 + 0.15;
    group.add(movable(tag(shadowed(board), 'tagliere'), 'small'));
    for (let i = 0; i < 3; i++) {
      const o = onion(10 + i);
      o.position.set(bx + (rnd() - 0.5) * 0.12, TOP + 0.03, -1.6 + i * 0.07);
      group.add(movable(tag(o, 'cipolla'), 'small'));
    }
    // half an onion, cut
    const half = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: 0xf2e8d0, rim: 0.3 }));
    half.position.set(bx + 0.06, TOP + 0.03, -1.43);
    group.add(shadowed(half));
    const blade = rbox(0.18, 0.004, 0.028, M.iron, 0.002);
    blade.position.set(bx - 0.05, TOP + 0.034, -1.45);
    blade.rotation.y = 0.4;
    group.add(shadowed(blade));
    const handle = rbox(0.09, 0.016, 0.02, M.beam, 0.006);
    handle.position.set(bx - 0.17, TOP + 0.038, -1.4);
    handle.rotation.y = 0.4;
    group.add(shadowed(handle));
    const mo = mortar(stone);
    mo.position.set(x0 + 0.22, TOP, -1.22);
    group.add(movable(tag(mo, 'mortaio'), 'small'));
    const cr = utensilCrock();
    cr.position.set(x0 + 0.15, TOP, -2.25);
    group.add(tag(cr, 'mestoli'));
    const br = breadUnderCloth(0);
    br.position.set(x0 + 0.3, TOP, -1.95);
    group.add(tag(br, 'pane'));
    const eggBowl = bowl(91, M.ceramic);
    eggBowl.position.set(x0 + 0.42, TOP, -2.25);
    group.add(eggBowl);
    const egg = toon({ color: 0xf2e2c4, rim: 0.5 });
    for (let i = 0; i < 4; i++) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), egg);
      e.scale.y = 1.3;
      e.position.set(x0 + 0.42 + Math.cos(i * 1.7) * 0.03, TOP + 0.04 + (i === 3 ? 0.02 : 0), -2.25 + Math.sin(i * 1.7) * 0.03);
      group.add(movable(tag(shadowed(e), 'uovo'), 'small'));
    }
  }
  // the rail of pans and utensils on the wall above the madia
  {
    const y = 1.5;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.05, 8), M.iron);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(x0 + 0.06, y, -1.85);
    group.add(shadowed(rail));
    for (const z of [-2.35, -1.35]) {
      const br = rbox(0.06, 0.02, 0.02, M.iron, 0.005);
      br.position.set(x0 + 0.03, y, z);
      group.add(br);
    }
    const hang = (o: THREE.Object3D, z: number) => {
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 4, 10, Math.PI * 1.6), M.iron);
      hook.position.set(x0 + 0.06, y - 0.012, z);
      hook.rotation.y = Math.PI / 2;
      group.add(hook);
      o.position.set(x0 + 0.08, y - 0.025, z);
      o.rotation.y = Math.PI / 2;
      group.add(o);
      living.push(o);
    };
    hang(tag(saucepan(0.09, 1), 'pentole'), -2.25);
    hang(tag(saucepan(0.07, 2), 'pentole'), -2.0);
    hang(tag(utensil('ladle'), 'pentole'), -1.82);
    hang(tag(utensil('skimmer'), 'pentole'), -1.72);
    hang(tag(saucepan(0.06, 3), 'pentole'), -1.55);
  }
  // ------------------------------------------------------------ the sink under the window
  const sx0 = -2.42;
  const sx1 = -1.5;
  const sd = 0.55;
  {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(sx1 - sx0, 0.7, sd - 0.06), stone);
    base.position.set((sx0 + sx1) / 2, 0.35, z0 + (sd - 0.06) / 2);
    g.add(base);
    // the basin: one block of stone hollowed out, the rim worn smooth
    const cx = (sx0 + sx1) / 2;
    const cz = z0 + sd / 2;
    const bw = 0.56;
    const bd = 0.34;
    const bx = cx - 0.08;
    const bz = cz + 0.02;
    const rim = (x: number, z: number, w: number, d: number) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d, Math.max(2, Math.round(w * 12)), 2, Math.max(2, Math.round(d * 12))), M.stone);
      r.position.set(x, 0.79, z);
      g.add(organic(r, 0.01, x * 10 + z));
    };
    const L0 = sx0 - 0.02;
    const L1 = sx1 + 0.02;
    rim((L0 + bx - bw / 2) / 2, cz, bx - bw / 2 - L0, sd);
    rim((bx + bw / 2 + L1) / 2, cz, L1 - bx - bw / 2, sd);
    rim(bx, (z0 + bz - bd / 2) / 2, bw, bz - bd / 2 - z0);
    rim(bx, (bz + bd / 2 + z0 + sd) / 2, bw, z0 + sd - bz - bd / 2);
    // the inside of the basin, darker and wet, the water low in it
    const inside = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.16, bd), toon({ color: 0x8a8476, rim: 0, side: THREE.BackSide }));
    inside.position.set(bx, 0.8, bz);
    g.add(inside);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.01, bd - 0.01), toon({ color: 0x7aa4ac, transparent: true, opacity: 0.6, rim: 0.6 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(bx, 0.77, bz);
    g.add(water);
    // the drain hole and a cork on a string
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.02, 10), M.cork);
    cork.position.set(bx + bw / 2 + 0.05, 0.89, bz + 0.1);
    g.add(cork);
    group.add(tag(shadowed(g), 'acquaio'));
    box((sx0 + sx1) / 2, z0 + sd / 2, sx1 - sx0, sd);
    // a dishcloth over the front edge, caught by its middle
    const rag = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.42, 20, 32), toon({ map: checkTex(7, '#3a5a8a'), rim: 0.3, side: THREE.DoubleSide }));
    rag.position.set(sx1 - 0.18, 0.9, z0 + sd + 0.01);
    rag.rotation.set(-Math.PI / 2 + 0.1, 0, 0.15);
    settle(rag, {
      colliders: [boxCollider(new THREE.Vector3(sx0, 0, z0), new THREE.Vector3(sx1 + 0.02, 0.88, z0 + sd), 0.006), floorCollider()],
      pinned: (q) => Math.abs(q.z - (z0 + sd - 0.08)) < 0.03 && q.y > 0.86,
      bend: 0.06,
      steps: 300,
      friction: 0.8,
    });
    group.add(tag(shadowed(rag), 'strofinaccio'));
    // the draining rack, three plates in it
    const rack = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 5), M.woodPale);
      bar.position.set(i * 0.035, 0.08, 0);
      rack.add(bar);
    }
    const rail = rbox(0.2, 0.015, 0.2, M.woodPale, 0.004);
    rail.position.set(0.09, 0.008, 0);
    rack.add(rail);
    for (let i = 0; i < 3; i++) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.014, 24), M.ceramic);
      plate.rotation.z = Math.PI / 2 - 0.1;
      plate.position.set(0.02 + i * 0.07, 0.1, 0);
      rack.add(plate);
    }
    rack.position.set(sx1 - 0.25, 0.88, z0 + 0.22);
    group.add(shadowed(rack));
    // the bucket of water on the floor beside it
    const bucket = new THREE.Group();
    bucket.add(lathe([[0, 0], [0.13, 0.002], [0.15, 0.28], [0.155, 0.29], [0.145, 0.29], [0.125, 0.012], [0, 0.012]], M.staves, 32));
    for (const y of [0.05, 0.23]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.14 + y * 0.07, 0.007, 6, 30), M.iron);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y;
      bucket.add(hoop);
    }
    const wtr = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), toon({ color: 0x7aa0a8, transparent: true, opacity: 0.7, rim: 0.6 }));
    wtr.rotation.x = -Math.PI / 2;
    wtr.position.y = 0.24;
    bucket.add(wtr);
    const ladle = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), copper);
    ladle.add(cup);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), M.woodPale);
    handle.rotation.z = -0.9;
    handle.position.set(0.1, 0.08, 0);
    ladle.add(handle);
    ladle.position.set(0, 0.26, 0);
    bucket.add(ladle);
    bucket.position.set(-1.32, 0, -2.2);
    group.add(movable(tag(organic(shadowed(bucket), 0.02, 6), 'secchio'), 'furniture', box(-1.32, -2.2, 0.34, 0.34)));
  }
  // the shelf of preserves over the window
  {
    const y = 1.98;
    const shelf = bentBox(1.0, 0.035, 0.22, M.wood, 0.008, 0);
    shelf.position.set(-1.95, y, z0 + 0.12);
    group.add(shadowed(shelf));
    for (const x of [-2.35, -1.55]) {
      const br = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 5, 10, Math.PI / 2), M.beam);
      br.position.set(x, y - 0.1, z0 + 0.02);
      br.rotation.set(0, Math.PI / 2, Math.PI);
      group.add(br);
    }
    const fills = [0xe08a2a, 0x6a2a4a, 0xc0302a, 0xd8b03a, 0x4a6a2a, 0xe08a2a];
    let x = -2.38;
    fills.forEach((f, i) => {
      const j = preserve(70 + i, f);
      j.position.set(x, y + 0.018, z0 + 0.12 + (rnd() - 0.5) * 0.05);
      group.add(movable(tag(j, 'conserve'), 'small'));
      x += 0.13 + rnd() * 0.04;
    });
  }
  // peppers and a salame hanging from the joist
  {
    const n = nail();
    n.rotation.x = Math.PI / 2;
    n.position.set(-2.2, 2.29, -1.9);
    group.add(n);
    const string = new THREE.Group();
    const red = toon({ color: 0xc02a1e, rim: 0.5 });
    for (let i = 0; i < 14; i++) {
      const pep = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.07, 8), red);
      const a = i * 2.1;
      pep.position.set(Math.cos(a) * 0.02, -0.05 - i * 0.022, Math.sin(a) * 0.02);
      pep.rotation.set(Math.PI + Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
      string.add(pep);
    }
    string.position.set(-2.2, 2.28, -1.9);
    group.add(tag(organic(shadowed(string), 0.08, 4), 'peperoncini'));
    living.push(string);
    const sal = new THREE.Group();
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.26, 6, 12), toon({ color: 0x8a3a2e, rim: 0.4 }));
    s.position.y = -0.2;
    s.rotation.z = 0.05;
    sal.add(s);
    for (let i = 0; i < 4; i++) {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.0025, 4, 16), M.rope);
      tie.rotation.x = Math.PI / 2;
      tie.position.y = -0.1 - i * 0.07;
      sal.add(tie);
    }
    const loop = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.06, 4), M.rope);
    loop.position.y = -0.03;
    sal.add(loop);
    sal.position.set(-2.2, 2.28, -1.55);
    group.add(tag(organic(shadowed(sal), 0.05, 5), 'salame'));
    living.push(sal);
    const gb = garlicBraid(161, 6, 2);
    gb.position.set(-2.2, 2.27, -2.25);
    group.add(tag(gb, 'aglio'));
    living.push(gb);
  }
  // ------------------------------------------------------------ the floor of the kitchen
  {
    // a flour sack leaning on the madia's end
    const fl = sack(31, 0.15);
    fl.scale.setScalar(0.75);
    fl.position.set(-2.3, 0, -0.9);
    fl.rotation.y = 0.8;
    group.add(tag(fl, 'farina'));
    box(-2.3, -0.9, 0.4, 0.4);
    // the cat's dish, with a little milk
    const dish = new THREE.Group();
    dish.add(lathe([[0, 0], [0.06, 0.001], [0.075, 0.03], [0.072, 0.034], [0.06, 0.012], [0, 0.012]], M.ceramicBlue, 28));
    const milk = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), toon({ color: 0xf6f0e4, rim: 0.3 }));
    milk.rotation.x = -Math.PI / 2;
    milk.position.y = 0.018;
    dish.add(milk);
    dish.position.set(-2.0, 0, -1.25);
    group.add(movable(tag(shadowed(dish), 'ciotola'), 'small'));
  }
}
