import * as THREE from 'three';
import { makeRng } from '../../core/rng';
import * as F from '../../bottega/fantasy';
import * as De from '../../casa/details';
import * as Fu from '../../casa/furniture';
import { catModel } from '../../casa/cat';
import { preserve, saucepan } from '../../casa/kitchen';
import { makeBook } from '../../casa/books';
import { bowl, broom, cup, garlicBraid, herbBunch, jug, M, nail, organic, rbox, shadowed, toon, toonify } from '../../stile/kit';
import { ERBE_INSPECT } from '../../data/png/luoghi';
import { YSOLDE } from '../../data/png/ysolde';
import { outsideOf, type Built, type PlaceDef } from '../engine';
import type { Box } from '../shell';
import { buildShell } from '../shell';
import * as Pr from '../props';

/**
 * La Casa delle Erbe: one room under low beams, smelling of everything at
 * once. The hearth on the west wall, the bed in the north-east corner, the
 * bench with the mortar under the north window, the drying rack by the
 * south wall, herbs hanging from every beam.
 */

const W = 6.4;
const D = 5;
const H = 2.6;

const tag = <T extends THREE.Object3D>(o: T, key: string): T => {
  o.traverse((c) => (c.userData.inspect = key));
  return o;
};

function build(): Built {
  const rnd = makeRng(41);
  const shell = buildShell(
    W,
    D,
    H,
    [
      { wall: 's', a0: 1.4, a1: 2.3, y0: 0, y1: 2.0, door: true },
      { wall: 's', a0: -1.6, a1: -0.6, y0: 0.95, y1: 1.85 },
      { wall: 'e', a0: 0.2, a1: 1.15, y0: 0.95, y1: 1.85 },
      { wall: 'n', a0: -0.1, a1: 0.8, y0: 1.05, y1: 1.85 },
    ],
    211,
    { frieze: 2.15 },
  );
  const group = shell.group;
  const colliders: Box[] = shell.colliders;
  const box = (cx: number, cz: number, sx: number, sz: number) => colliders.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });
  const lights: Built['lights'] = [];

  // ------------------------------------------------------------ the hearth, and the pot on it
  const hearth = Fu.hearth(H, shell.stone, M.plaster);
  hearth.group.position.set(-W / 2, 0, -0.6);
  group.add(tag(hearth.group, 'focolare'));
  tag(hearth.kettle, 'focolare');
  box(-W / 2 + 0.45, -0.6, 1.0, 1.6);
  lights.push({ at: hearth.light.clone().add(hearth.group.position), flames: hearth.flames, kind: 'fire' });
  {
    const c = Pr.cauldron(0.16);
    c.position.set(-W / 2 + 0.62, 0.12, -0.38);
    group.add(tag(c, 'paiolo'));
    const sp = saucepan(0.08, 7);
    sp.position.set(-W / 2 + 0.95, 0, 0.4);
    sp.rotation.y = 1.2;
    group.add(sp);
    const fi = De.fireIrons();
    fi.position.set(-W / 2 + 0.75, 0, -1.55);
    group.add(fi);
    const kb = De.kindling();
    kb.position.set(-W / 2 + 0.5, 0, 0.55);
    kb.rotation.y = 0.4;
    group.add(tag(kb, 'legna'));
    // the cat, Brace, on the warm stones, as near the fire as a cat dares
    const cat = catModel('curled');
    cat.group.position.set(-W / 2 + 1.2, 0.01, 0.05);
    cat.group.rotation.y = 2.3;
    cat.group.scale.setScalar(0.95);
    group.add(tag(cat.group, 'brace'));
    const rug = Fu.ragRug(0.9, 0.65);
    rug.position.set(-W / 2 + 1.45, 0.006, -0.3);
    group.add(rug);
    // on the mantel: jars, a candle stub, a bundle of something tied with red thread
    const top = 0.98 + 0.12 + 0.07;
    for (let i = 0; i < 5; i++) {
      const j = Pr.herbJar(500 + i, 0.1 + rnd() * 0.06);
      j.position.set(-W / 2 + 0.64 + (rnd() - 0.5) * 0.04, top, -1.25 + i * 0.3);
      group.add(tag(j, 'barattoli'));
    }
    const ca = Fu.candle(501, 0.06);
    ca.group.position.set(-W / 2 + 0.66, top, 0.18);
    group.add(ca.group);
    lights.push({ at: ca.tip.clone().add(ca.group.position), flames: [ca.flame], kind: 'candle' });
  }

  // ------------------------------------------------------------ the armchair by the fire
  const chairAt = new THREE.Vector3(-1.45, 0, 0.55);
  const chairYaw = -2.12;
  {
    const ac = Fu.armchair(7);
    ac.position.copy(chairAt);
    ac.rotation.y = chairYaw;
    group.add(tag(ac, 'poltrona'));
    box(chairAt.x, chairAt.z, 0.9, 0.9);
    const st = Fu.sideTable();
    st.position.set(-0.6, 0, 0.05);
    group.add(st);
    box(-0.6, 0.05, 0.45, 0.45);
    const ca = Fu.candle(502, 0.1);
    ca.group.position.set(-0.66, 0.618, 0.02);
    group.add(tag(ca.group, 'candela'));
    lights.push({ at: ca.tip.clone().add(ca.group.position), flames: [ca.flame], kind: 'candle' });
    // her herbal, fat with pressed leaves
    const herbal = makeBook(503, { h: 0.28, t: 0.09 });
    herbal.rotation.set(0, 0.6, Math.PI / 2);
    herbal.position.set(-0.52, 0.618 + 0.045, 0.12);
    group.add(tag(herbal, 'erbario'));
    const c = cup(504);
    c.position.set(-0.7, 0.618, 0.18);
    group.add(c);
    const shawl = Fu.hangingCloak(505, '#8a3a2e', 0.5, 0.6);
    shawl.position.set(chairAt.x + 0.25, 0.95, chairAt.z + 0.3);
    shawl.rotation.set(0.3, chairYaw, 0);
    shawl.scale.setScalar(0.7);
    group.add(shawl);
  }

  // ------------------------------------------------------------ the bed, in its corner
  {
    const b = Fu.bed();
    b.group.position.set(W / 2 - 1.1, 0, -D / 2 + 0.75);
    b.group.rotation.y = Math.PI;
    group.add(tag(b.group, 'letto'));
    box(W / 2 - 1.1, -D / 2 + 0.75, 2.05, 1.4);
    const ns = Fu.chest();
    ns.position.set(W / 2 - 2.55, 0, -D / 2 + 0.5);
    ns.rotation.y = Math.PI / 2;
    ns.scale.set(0.6, 0.9, 0.6);
    group.add(ns);
    box(W / 2 - 2.55, -D / 2 + 0.5, 0.65, 0.4);
    const lav = herbBunch(506, 0.01, toon({ color: 0x9a8ad0, rim: 0.4, side: THREE.DoubleSide }));
    lav.rotation.z = Math.PI / 2;
    lav.position.set(W / 2 - 2.5, 0.5, -D / 2 + 0.5);
    group.add(tag(lav, 'lavanda'));
    // a curtain on a string, half drawn, to make a room of the corner
    const curtain = Fu.hangingCloak(507, '#b8a46a', 1.1, 1.9);
    curtain.position.set(W / 2 - 2.2, 2.2, -D / 2 + 1.55);
    curtain.rotation.y = 0;
    group.add(curtain);
  }
  // the window towards the wood
  {
    const sill = 1.0;
    for (let i = 0; i < 3; i++) {
      const pot = Pr.herbJar(510 + i, 0.08);
      pot.position.set(W / 2 + 0.05, sill - 0.04, 0.35 + i * 0.28);
      group.add(tag(pot, 'davanzale'));
    }
  }

  // ------------------------------------------------------------ the bench and the mortar
  {
    const t = Fu.table(1.6, 0.68);
    t.position.set(0.35, 0, -D / 2 + 0.4);
    group.add(tag(t, 'banco'));
    box(0.35, -D / 2 + 0.4, 1.65, 0.72);
    const top = 0.775;
    const m = Pr.mortar(3);
    m.position.set(0.3, top, -D / 2 + 0.42);
    group.add(tag(m, 'mortaio'));
    const bk = Pr.gatherBasket(7);
    bk.position.set(-0.2, top, -D / 2 + 0.38);
    group.add(tag(bk, 'cesto'));
    for (let i = 0; i < 4; i++) {
      const j = Pr.herbJar(520 + i, 0.12 + rnd() * 0.06);
      j.position.set(0.75 + i * 0.12, top, -D / 2 + 0.25 + (i % 2) * 0.1);
      group.add(tag(j, 'barattoli'));
    }
    const knife = rbox(0.16, 0.004, 0.02, M.iron, 0.002);
    knife.position.set(0.55, top + 0.004, -D / 2 + 0.6);
    knife.rotation.y = 0.5;
    group.add(knife);
    const ca = Fu.candle(521, 0.09);
    ca.group.position.set(1.0, top, -D / 2 + 0.55);
    group.add(tag(ca.group, 'candela'));
    lights.push({ at: ca.tip.clone().add(ca.group.position), flames: [ca.flame], kind: 'candle' });
    const st = Fu.chair(8);
    st.position.set(0.95, 0, -D / 2 + 1.1);
    st.rotation.y = Math.PI + 0.5;
    group.add(st);
    box(0.95, -D / 2 + 1.1, 0.42, 0.42);
  }

  // ------------------------------------------------------------ the shelves of jars, north wall
  {
    const sh = Pr.wallShelves(
      1.9,
      [0.95, 1.35, 1.75],
      (lv, x) => {
        const r = Math.abs(Math.sin(x * 23 + lv * 7));
        if (r < 0.6) return Pr.herbJar(Math.floor(x * 100) + lv * 17 + 600, 0.1 + r * 0.12);
        if (r < 0.75) return preserve(Math.floor(x * 50) + lv, 0.7);
        if (r < 0.85) return bowl(Math.floor(x * 30) + lv);
        return null;
      },
      9,
    );
    sh.position.set(-1.65, 0, -D / 2);
    group.add(tag(sh, 'barattoli'));
    const bs = Fu.bookshelf(0.9, 1.0, () => null);
    bs.position.set(-1.65, 0, -D / 2 + 0.13);
    bs.rotation.y = -Math.PI / 2;
    group.add(tag(bs, 'libri'));
    box(-1.65, -D / 2 + 0.2, 1.0, 0.36);
  }

  // ------------------------------------------------------------ the table, for one and a guest
  {
    const t = Fu.table(1.1, 0.72);
    t.position.set(0.95, 0, 0.75);
    t.rotation.y = 0.04;
    group.add(tag(t, 'tavola'));
    box(0.95, 0.75, 1.15, 0.78);
    const c1 = Fu.chair(9);
    c1.position.set(0.95, 0, 1.38);
    c1.rotation.y = Math.PI;
    group.add(tag(c1, 'sedia'));
    box(0.95, 1.38, 0.42, 0.42);
    const c2 = Fu.chair(10);
    c2.position.set(0.85, 0, 0.1);
    c2.rotation.y = 0.3;
    group.add(tag(c2, 'sedia'));
    box(0.85, 0.1, 0.42, 0.42);
    const top = 0.775;
    const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: 0xb8803a, rim: 0.3 }));
    loaf.scale.set(1.3, 0.8, 1);
    loaf.position.set(0.8, top, 0.7);
    group.add(tag(organic(shadowed(loaf), 0.06, 3), 'pane'));
    const cheese = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 18, 1, false, 0, Math.PI * 1.6), toon({ color: 0xf0d890, rim: 0.3 }));
    cheese.position.set(1.05, top + 0.03, 0.65);
    group.add(shadowed(cheese));
    const j = jug(530);
    j.scale.setScalar(0.7);
    j.position.set(1.3, top, 0.9);
    group.add(j);
    const bw = bowl(531, M.ceramic);
    bw.position.set(0.95, top, 0.95);
    group.add(bw);
    const ca = Fu.candle(532, 0.12);
    ca.group.position.set(1.2, top, 0.55);
    group.add(tag(ca.group, 'candela'));
    lights.push({ at: ca.tip.clone().add(ca.group.position), flames: [ca.flame], kind: 'candle' });
  }

  // ------------------------------------------------------------ the drying rack, south-west
  {
    const r = Pr.dryingRack(1.25, 11);
    r.position.set(-2.4, 0, D / 2 - 0.35);
    group.add(tag(r, 'essiccatoio'));
    box(-2.4, D / 2 - 0.35, 1.4, 0.5);
    const bk = Pr.gatherBasket(12);
    bk.position.set(-1.6, 0, D / 2 - 0.35);
    group.add(tag(bk, 'cesto'));
  }

  // ------------------------------------------------------------ herbs from every beam
  for (let k = 0; k < 4; k++) {
    const x = -W / 2 + 0.9 + k * 1.3;
    const s = Pr.stringOf(new THREE.Vector3(x + 0.2, H - 0.25, -D / 2 + 0.5), new THREE.Vector3(x + 0.2, H - 0.25, D / 2 - 0.6), 7 + k, 70 + k);
    if (k === 3) s.position.z = 0.9;
    group.add(tag(s, 'mazzi'));
  }
  {
    const n = nail();
    n.position.set(W / 2 - 0.02, 1.95, 1.75);
    n.rotation.y = -Math.PI / 2;
    group.add(n);
    const gb = garlicBraid(540, 7, 2);
    gb.position.set(W / 2 - 0.07, 1.92, 1.75);
    group.add(tag(gb, 'aglio'));
    const br = broom();
    br.position.set(W / 2 - 0.25, 0, D / 2 - 0.3);
    br.rotation.set(0.05, -0.4, 0.12);
    group.add(br);
    const mat = De.doormat(0.8, 0.45);
    mat.position.set(1.85, 0.004, D / 2 - 0.4);
    group.add(mat);
    const bt = De.boots();
    bt.position.set(2.75, 0, D / 2 - 0.45);
    bt.rotation.y = 0.3;
    group.add(tag(bt, 'zoccoli'));
    const ln = F.lantern();
    toonify(ln);
    ln.position.set(2.55, 0, D / 2 - 0.3);
    group.add(ln);
    const df = De.driedFlowers(14);
    df.position.set(1.25, 0.775, 0.85);
    group.add(df);
    const rug = Fu.ragRug(1.0, 0.7);
    rug.position.set(0.9, 0.006, 0.75);
    group.add(rug);
  }

  const spots: Built['spots'] = {
    letto: { at: [W / 2 - 1.05, -D / 2 + 0.72], yaw: -Math.PI / 2, pose: 'sleep', seat: 0.5 },
    focolare: { at: [-W / 2 + 1.25, -0.75], yaw: -Math.PI / 2, pose: 'stir' },
    banco: { at: [0.3, -D / 2 + 1.1], yaw: Math.PI, pose: 'work' },
    tavola: { at: [0.95, 1.32], yaw: Math.PI, pose: 'sit', seat: 0.48 },
    poltrona: { at: [chairAt.x + 0.05, chairAt.z + 0.03], yaw: chairYaw, pose: 'sitRest', seat: 0.47 },
    lettura: { at: [chairAt.x + 0.05, chairAt.z + 0.03], yaw: chairYaw, pose: 'sitRead', seat: 0.47 },
    essiccatoio: { at: [-2.4, D / 2 - 0.95], yaw: 0, pose: 'work' },
    finestra: { at: [W / 2 - 0.55, 0.7], yaw: Math.PI / 2, pose: 'look' },
  };
  const nav: Built['nav'] = {
    nodes: {
      porta: [1.85, D / 2 - 0.7],
      centro: [0.1, 0.2],
      banco: [0.3, -1.2],
      fuoco: [-1.6, -0.75],
      rastrelliera: [-2.2, 1.4],
      tavola: [0.2, 1.4],
      est: [2.4, 0.4],
      letto: [2.2, -1.2],
    },
    edges: [
      ['porta', 'tavola'],
      ['porta', 'est'],
      ['tavola', 'centro'],
      ['tavola', 'rastrelliera'],
      ['centro', 'banco'],
      ['centro', 'fuoco'],
      ['centro', 'est'],
      ['fuoco', 'rastrelliera'],
      ['est', 'letto'],
      ['banco', 'letto'],
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
    spawn: { x: 1.85, z: D / 2 - 0.55, yaw: 0.25 },
  };
}

export const ERBE: PlaceDef = {
  id: 'erbe',
  building: 'erbe',
  outside: outsideOf('erbe'),
  title: 'La Casa delle Erbe',
  build,
  people: [YSOLDE],
  inspect: ERBE_INSPECT,
};
