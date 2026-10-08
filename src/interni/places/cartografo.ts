import * as THREE from 'three';
import { makeRng } from '../../core/rng';
import * as F from '../../bottega/fantasy';
import * as P from '../../bottega/props';
import * as De from '../../casa/details';
import * as Fu from '../../casa/furniture';
import { makeBook } from '../../casa/books';
import { cup, jug, M, nail, rbox, toon, toonify } from '../../stile/kit';
import { CARTOGRAFO_INSPECT } from '../../data/png/luoghi';
import { CORVINO } from '../../data/png/corvino';
import { YSOLDE } from '../../data/png/ysolde';
import { outsideOf, type Built, type PlaceDef } from '../engine';
import type { Box } from '../shell';
import { buildShell } from '../shell';
import * as Pr from '../props';

/**
 * La casa del Cartografo: one long room that has become a map of its
 * owner. The big table under the north windows, the telescope at the east
 * window, the iron stove in the corner, books on every wall, the little
 * table where on Sundays Ysolde comes to cheat at draughts.
 */

const W = 7;
const D = 5.4;
const H = 2.8;

const tag = <T extends THREE.Object3D>(o: T, key: string): T => {
  o.traverse((c) => (c.userData.inspect = key));
  return o;
};

function build(): Built {
  const rnd = makeRng(57);
  const shell = buildShell(
    W,
    D,
    H,
    [
      { wall: 's', a0: -2.6, a1: -1.7, y0: 0, y1: 2.05, door: true },
      { wall: 's', a0: -0.4, a1: 0.6, y0: 0.95, y1: 1.9 },
      { wall: 'n', a0: 0.0, a1: 1.0, y0: 1.0, y1: 2.0 },
      { wall: 'n', a0: 1.6, a1: 2.6, y0: 1.0, y1: 2.0 },
      { wall: 'e', a0: -1.0, a1: 0.1, y0: 0.9, y1: 2.0 },
    ],
    307,
    { frieze: 2.35 },
  );
  const group = shell.group;
  const colliders: Box[] = shell.colliders;
  const box = (cx: number, cz: number, sx: number, sz: number) => colliders.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });
  const lights: Built['lights'] = [];

  // ------------------------------------------------------------ the stove, north-west
  {
    const s = Pr.stove(H);
    s.group.position.set(-W / 2 + 0.55, 0, -D / 2 + 0.55);
    s.group.rotation.y = Math.PI / 4;
    group.add(tag(s.group, 'stufa'));
    box(-W / 2 + 0.55, -D / 2 + 0.55, 0.7, 0.7);
    const at = s.light.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4).add(s.group.position);
    lights.push({ at, flames: s.flames, kind: 'fire' });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 1.1), toon({ color: 0x8a8278, rim: 0.1 }));
    plate.position.set(-W / 2 + 0.55, 0.01, -D / 2 + 0.55);
    group.add(plate);
    const kb = De.kindling();
    kb.position.set(-W / 2 + 1.35, 0, -D / 2 + 0.3);
    group.add(tag(kb, 'legna'));
    const bl = De.bellows();
    bl.position.set(-W / 2 + 0.2, 0.0, -D / 2 + 1.2);
    bl.rotation.set(0, 0.6, 0);
    group.add(bl);
  }

  // ------------------------------------------------------------ the map table
  {
    const t = Fu.table(2.1, 1.1);
    t.position.set(1.3, 0, -D / 2 + 0.85);
    group.add(tag(t, 'mappe'));
    box(1.3, -D / 2 + 0.85, 2.15, 1.15);
    const top = 0.775;
    const big = Pr.mapSheet(1.5, 0.95, Pr.mapTex(31, 1400, 900, true));
    big.position.set(1.25, top + 0.002, -D / 2 + 0.8);
    big.rotation.y = 0.03;
    group.add(tag(big, 'mappa'));
    const small = Pr.mapSheet(0.5, 0.36, Pr.mapTex(32, 512, 360));
    small.position.set(2.05, top + 0.006, -D / 2 + 1.05);
    small.rotation.y = -0.35;
    group.add(tag(small, 'mappa'));
    // weights on the corners: a stone, an inkwell, a book, an apple core
    const ink = P.inkwell();
    toonify(ink);
    ink.position.set(0.55, top, -D / 2 + 1.2);
    group.add(tag(ink, 'calamaio'));
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.05, 1), toon({ color: 0x8a8a8a, rim: 0.2 }));
    stone.scale.set(1.2, 0.6, 1);
    stone.position.set(1.95, top + 0.03, -D / 2 + 0.38);
    group.add(stone);
    const bk = makeBook(701, { h: 0.24, t: 0.05 });
    bk.rotation.set(0, 0.3, Math.PI / 2);
    bk.position.set(0.55, top + 0.025, -D / 2 + 0.4);
    group.add(tag(bk, 'taccuini'));
    const dv = Pr.dividers();
    dv.position.set(1.4, top + 0.006, -D / 2 + 1.1);
    dv.rotation.y = 0.8;
    group.add(tag(dv, 'compasso'));
    const rule = rbox(0.5, 0.006, 0.035, M.woodPale, 0.002);
    rule.position.set(1.0, top + 0.008, -D / 2 + 0.55);
    rule.rotation.y = -0.2;
    group.add(rule);
    for (let i = 0; i < 4; i++) {
      const q = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.004, 0.2, 5), toon({ color: 0xf0ece0, rim: 0.3 }));
      q.rotation.set(Math.PI / 2, 0, 0.4 + i * 0.15);
      q.position.set(0.7 + i * 0.03, top + 0.006, -D / 2 + 1.25);
      group.add(q);
    }
    const nc = Pr.nightCandle();
    nc.group.position.set(0.7, top, -D / 2 + 0.75);
    group.add(tag(nc.group, 'candela'));
    lights.push({ at: new THREE.Vector3(0.7, top + 0.1, -D / 2 + 0.75), flames: [nc.flame], kind: 'candle' });
    const ca = Fu.candle(702, 0.12);
    ca.group.position.set(2.15, top, -D / 2 + 0.5);
    group.add(tag(ca.group, 'candela'));
    lights.push({ at: ca.tip.clone().add(ca.group.position), flames: [ca.flame], kind: 'candle' });
    const c = Fu.chair(11);
    c.position.set(1.15, 0, -D / 2 + 1.65);
    c.rotation.y = Math.PI;
    group.add(tag(c, 'sedia'));
    box(1.15, -D / 2 + 1.65, 0.42, 0.42);
    const rm = Pr.rolledMaps(5);
    rm.position.set(2.75, 0, -D / 2 + 0.45);
    group.add(tag(rm, 'rotoli'));
    box(2.75, -D / 2 + 0.45, 0.42, 0.42);
  }

  // ------------------------------------------------------------ the telescope at the east window
  {
    const t = Pr.telescope();
    t.position.set(W / 2 - 0.55, 0, -0.45);
    t.rotation.y = Math.PI / 2;
    group.add(tag(t, 'cannocchiale'));
    box(W / 2 - 0.55, -0.45, 0.5, 0.5);
    const gl = Pr.globe();
    gl.position.set(W / 2 - 0.45, 0, 0.75);
    group.add(tag(gl, 'globo'));
    box(W / 2 - 0.45, 0.75, 0.4, 0.4);
  }

  // ------------------------------------------------------------ books, on two walls
  const extras = (shelf: number, z: number) => {
    const r = Math.abs(Math.sin(z * 13 + shelf * 5));
    if (r < 0.12) return Pr.herbJar(Math.floor(z * 90) + shelf, 0.1);
    if (r < 0.2) {
      const h = De.hourglass();
      return h;
    }
    if (r < 0.26) return cup(Math.floor(z * 40) + shelf);
    return null;
  };
  {
    const bs = Fu.bookshelf(1.4, 2.1, extras);
    bs.position.set(-1.2, 0, -D / 2 + 0.13);
    bs.rotation.y = -Math.PI / 2;
    group.add(tag(bs, 'libreria'));
    box(-1.2, -D / 2 + 0.2, 1.5, 0.38);
    const bs2 = Fu.bookshelf(1.2, 1.9, extras);
    bs2.position.set(-W / 2 + 0.13, 0, -0.75);
    group.add(tag(bs2, 'libreria'));
    box(-W / 2 + 0.2, -0.75, 0.38, 1.3);
  }

  // ------------------------------------------------------------ the instrument bench, west wall
  {
    const t = Fu.table(1.3, 0.65);
    t.position.set(-W / 2 + 0.4, 0, 1.0);
    t.rotation.y = Math.PI / 2;
    group.add(tag(t, 'strumenti'));
    box(-W / 2 + 0.4, 1.0, 0.7, 1.35);
    const top = 0.775;
    const bc = Pr.brokenCompass();
    bc.position.set(-W / 2 + 0.45, top, 0.95);
    group.add(tag(bc, 'bussola'));
    const ln = Pr.lens();
    ln.position.set(-W / 2 + 0.3, top, 0.7);
    ln.rotation.y = Math.PI / 2;
    group.add(tag(ln, 'lente'));
    const hg = De.hourglass();
    hg.position.set(-W / 2 + 0.3, top, 1.45);
    group.add(tag(hg, 'clessidra'));
    const ol = P.oilLamp();
    toonify(ol.group);
    ol.group.position.set(-W / 2 + 0.25, top, 1.25);
    group.add(tag(ol.group, 'lume'));
    lights.push({ at: new THREE.Vector3(-W / 2 + 0.25, top + 0.15, 1.25), flames: [ol.flame], kind: 'candle' });
    const st = P.stool();
    toonify(st);
    st.position.set(-W / 2 + 1.05, 0, 1.0);
    group.add(st);
    box(-W / 2 + 1.05, 1.0, 0.35, 0.35);
    const a = Pr.astrolabe();
    a.position.set(-W / 2 + 0.02, 1.6, 1.0);
    a.rotation.y = Math.PI / 2;
    group.add(tag(a, 'astrolabio'));
    const n = nail();
    n.position.set(-W / 2 + 0.02, 1.74, 1.0);
    n.rotation.y = Math.PI / 2;
    group.add(n);
  }

  // ------------------------------------------------------------ the armchair by the stove
  const chairAt = new THREE.Vector3(-1.7, 0, -1.0);
  const chairYaw = -2.3;
  {
    const ac = Fu.armchair(5);
    ac.position.copy(chairAt);
    ac.rotation.y = chairYaw;
    group.add(tag(ac, 'poltrona'));
    box(chairAt.x, chairAt.z, 0.9, 0.9);
    const fs = Fu.footstool();
    fs.position.set(-2.25, 0, -1.55);
    fs.rotation.y = 0.7;
    group.add(fs);
    const pp = De.pipe();
    pp.position.set(-1.15, 0.0, -0.75);
    group.add(pp);
    const books = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const b = makeBook(720 + i, { h: 0.22 + rnd() * 0.05, t: 0.03 + rnd() * 0.03 });
      b.rotation.set(0, rnd() * 0.6, Math.PI / 2);
      b.position.set(0, 0.02 + i * 0.04, 0);
      books.add(b);
    }
    books.position.set(-1.05, 0, -1.45);
    group.add(tag(books, 'pila'));
  }

  // ------------------------------------------------------------ the game table, for Sundays
  {
    const t = Fu.table(0.8, 0.8);
    t.position.set(-0.4, 0, 1.15);
    t.rotation.y = 0.1;
    group.add(tag(t, 'tavolino'));
    box(-0.4, 1.15, 0.85, 0.85);
    const top = 0.775;
    const gb = Pr.gameBoard();
    gb.position.set(-0.42, top, 1.12);
    gb.rotation.y = 0.15;
    group.add(tag(gb, 'dama'));
    const c1 = Fu.chair(12);
    c1.position.set(-0.4, 0, 0.5);
    group.add(tag(c1, 'sedia'));
    box(-0.4, 0.5, 0.42, 0.42);
    const c2 = Fu.chair(13);
    c2.position.set(-0.4, 0, 1.8);
    c2.rotation.y = Math.PI;
    group.add(tag(c2, 'sedia'));
    box(-0.4, 1.8, 0.42, 0.42);
    const j = jug(730);
    j.scale.setScalar(0.6);
    j.position.set(-0.1, top, 1.4);
    group.add(j);
    const c = cup(731);
    c.position.set(-0.7, top, 0.9);
    group.add(c);
  }

  // ------------------------------------------------------------ the bed, south-east
  {
    const b = Fu.bed();
    b.group.position.set(W / 2 - 1.1, 0, D / 2 - 0.75);
    b.group.rotation.y = Math.PI;
    group.add(tag(b.group, 'letto'));
    box(W / 2 - 1.1, D / 2 - 0.75, 2.05, 1.4);
    const ch = Fu.chest();
    ch.position.set(W / 2 - 2.5, 0, D / 2 - 0.7);
    group.add(tag(ch, 'baule'));
    box(W / 2 - 2.5, D / 2 - 0.7, 0.55, 0.95);
    const coat = Fu.hangingCloak(733, '#3a4a7a', 0.6, 1.05);
    coat.position.set(-1.3, 1.85, D / 2 - 0.01);
    coat.rotation.y = Math.PI;
    group.add(tag(coat, 'mantello'));
    const stick = De.walkingStick();
    stick.position.set(-1.0, 0, D / 2 - 0.12);
    group.add(stick);
    const mat = De.doormat(0.8, 0.45);
    mat.position.set(-2.15, 0.004, D / 2 - 0.4);
    group.add(mat);
    const rug = Fu.ragRug(1.3, 0.9);
    rug.position.set(0.3, 0.006, 0.2);
    group.add(rug);
  }

  // ------------------------------------------------------------ maps on the walls
  {
    const m1 = Pr.pinnedMap(1.1, 0.75, Pr.mapTex(41, 900, 620));
    m1.position.set(W / 2 - 0.01, 1.55, 1.7);
    m1.rotation.y = -Math.PI / 2;
    group.add(tag(m1, 'mappa_muro'));
    const m2 = Pr.pinnedMap(0.8, 0.6, Pr.mapTex(42, 700, 520), 2);
    m2.position.set(0.3, 1.65, D / 2 - 0.01);
    m2.rotation.y = Math.PI;
    m2.position.x = 1.6;
    group.add(tag(m2, 'mappa_muro'));
    const m3 = Pr.pinnedMap(0.55, 0.4, Pr.mapTex(43, 512, 380), 3);
    m3.position.set(0.5, 1.5, -D / 2 + 0.01);
    m3.position.x = -0.15;
    group.add(tag(m3, 'mappa_muro'));
    const ln = F.lantern();
    toonify(ln);
    ln.position.set(W / 2 - 0.4, 0, -1.3);
    group.add(ln);
  }

  const spots: Built['spots'] = {
    letto: { at: [W / 2 - 1.05, D / 2 - 0.78], yaw: -Math.PI / 2, pose: 'sleep', seat: 0.5 },
    stufa: { at: [-W / 2 + 1.2, -D / 2 + 1.2], yaw: -Math.PI * 0.75, pose: 'stir' },
    mappe: { at: [1.15, -D / 2 + 1.6], yaw: Math.PI, pose: 'sitWrite', seat: 0.48 },
    tavola: { at: [-0.4, 0.55], yaw: 0, pose: 'sitRead', seat: 0.48 },
    poltrona: { at: [chairAt.x + 0.04, chairAt.z + 0.03], yaw: chairYaw, pose: 'sitRest', seat: 0.47 },
    banco: { at: [-W / 2 + 1.0, 1.0], yaw: -Math.PI / 2, pose: 'work' },
    cannocchiale: { at: [W / 2 - 1.05, -0.45], yaw: Math.PI / 2, pose: 'look' },
    gioco: { at: [-0.4, 0.55], yaw: 0, pose: 'sit', seat: 0.48 },
    ospite: { at: [-0.4, 1.75], yaw: Math.PI, pose: 'sit', seat: 0.48 },
  };
  const nav: Built['nav'] = {
    nodes: {
      porta: [-2.15, D / 2 - 0.7],
      ovest: [-2.2, 0.6],
      stufa: [-2.4, -1.3],
      centro: [0.6, -0.2],
      mappe: [1.2, -0.6],
      est: [2.4, -0.2],
      sud: [0.9, 1.0],
      tavolino: [-1.2, 1.2],
    },
    edges: [
      ['porta', 'ovest'],
      ['porta', 'tavolino'],
      ['ovest', 'stufa'],
      ['ovest', 'centro'],
      ['tavolino', 'centro'],
      ['tavolino', 'sud'],
      ['centro', 'mappe'],
      ['centro', 'est'],
      ['sud', 'est'],
    ],
  };
  return {
    group,
    colliders,
    bounds: { x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2 },
    lights,
    spots,
    nav,
    doorNode: 'porta',
    spawn: { x: -2.15, z: D / 2 - 0.55, yaw: -0.3 },
  };
}

export const CARTOGRAFO: PlaceDef = {
  id: 'cartografo',
  building: 'cartografo',
  outside: outsideOf('cartografo'),
  title: 'La casa del Cartografo',
  build,
  people: [CORVINO, YSOLDE],
  inspect: CARTOGRAFO_INSPECT,
};
