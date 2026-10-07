import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { landscapeTex } from '../stile/paint';
import {
  apple,
  BARREL_H,
  barrel,
  bentBox,
  bowl,
  broom,
  cup,
  fallenSack,
  garlicBraid,
  glass,
  herbBunch,
  jug,
  M,
  nail,
  organic,
  plankFloor,
  rbox,
  sack,
  shadowed,
  someBottle,
  straws,
  tableclothOnBarrel,
  toon,
  toonify,
  wallSkin,
} from '../stile/kit';
import { wallCollider } from '../stile/softbody';
import * as F from './fantasy';
import * as P from './props';
import { MAT } from './props';
import { ROOM, type Collider as BoxCollider } from './room';
import { wonkify } from './style';

/**
 * The whole shop in the "natural cartoon" style: same plan and the same
 * things as the first 3D test, rebuilt with the style sketch's care. Every
 * piece is a little irregular, nothing stands in a row, soft things have
 * been left to settle.
 */

export interface CartoonRoom {
  group: THREE.Group;
  colliders: BoxCollider[];
  flames: THREE.Mesh[];
  lights: { lamp: THREE.Vector3; chandelier: THREE.Vector3; candle: THREE.Vector3 };
  fireflies: { update: (t: number, on: number) => void };
  glows: THREE.MeshStandardMaterial[];
  living: THREE.Object3D[];
}

const tag = <T extends THREE.Object3D>(o: T, key: string): T => {
  o.traverse((c) => (c.userData.inspect = key));
  return o;
};

/** A painted fieldstone texture for the plinth: stones of all sizes, soft light from above. */
export function stoneTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const rnd = makeRng(91);
  g.fillStyle = '#8a7058';
  g.fillRect(0, 0, 512, 512);
  // scatter stones of different sizes, larger ones first, smaller ones filling gaps
  const placed: [number, number, number][] = [];
  for (let tries = 0; tries < 900 && placed.length < 70; tries++) {
    const r = placed.length < 25 ? 30 + rnd() * 18 : 12 + rnd() * 16;
    const x = rnd() * 512;
    const y = rnd() * 512;
    if (placed.some(([px, py, pr]) => Math.hypot(px - x, (py - y) * 1.25) < pr + r - 4)) continue;
    placed.push([x, y, r]);
  }
  const tones = ['#b8a890', '#ad9c84', '#bfae94', '#a69680', '#b4a48a'];
  for (const [x, y, r] of placed) {
    for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) {
      g.fillStyle = tones[Math.floor(rnd() * tones.length)];
      g.beginPath();
      g.ellipse(x + ox, y + oy, r * 1.15, r * 0.85, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,244,222,0.16)';
      g.beginPath();
      g.ellipse(x + ox - r * 0.15, y + oy - r * 0.3, r * 0.6, r * 0.3, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(70,46,32,0.12)';
      g.beginPath();
      g.ellipse(x + ox, y + oy + r * 0.5, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildCartoonRoom(): CartoonRoom {
  const { w, d, h, wall } = ROOM;
  // the older props are built with these materials: give them the cartoon ones
  Object.assign(MAT, {
    darkWood: M.beam,
    midWood: M.wood,
    paleWood: M.woodPale,
    brass: M.brass,
    iron: M.iron,
    burlap: M.sack,
    flour: toon({ color: 0xf4ecdc, rim: 0.2 }),
    paper: toon({ color: 0xece2c8, rim: 0.2 }),
    wax: M.wax,
    cork: M.cork,
    glass: glass(0xdfeee8),
    string: M.rope,
  });

  const group = new THREE.Group();
  const colliders: BoxCollider[] = [];
  const box = (cx: number, cz: number, sx: number, sz: number) => colliders.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });
  const rnd = makeRng(2024);
  const living: THREE.Object3D[] = [];

  // ------------------------------------------------------------ shell
  group.add(plankFloor(w, d));

  const front = [
    { x0: -2.4, x1: -0.9, y0: 0.9, y1: 2.15 },
    { x0: 1.05, x1: 2.15, y0: 0, y1: 2.25 },
  ];
  const east = { z0: -1.0, z1: -0.1, y0: 1.1, y1: 1.95 };
  // solid walls (for shadows and thickness), made of plain boxes around the openings
  const solid = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), M.plaster);
    b.position.set(x, y, z);
    group.add(shadowed(b));
  };
  solid(0, h / 2, -d / 2 - wall / 2, w + wall * 2, h, wall);
  solid(-w / 2 - wall / 2, h / 2, 0, wall, h, d);
  // front wall around the window and the door
  const fz = d / 2 + wall / 2;
  solid((-w / 2 - 2.4) / 2, h / 2, fz, -2.4 + w / 2, h, wall);
  solid((-0.9 + 1.05) / 2, h / 2, fz, 1.95, h, wall);
  solid((2.15 + w / 2) / 2, h / 2, fz, w / 2 - 2.15, h, wall);
  solid(-1.65, 0.45, fz, 1.5, 0.9, wall);
  solid(-1.65, (2.15 + h) / 2, fz, 1.5, h - 2.15, wall);
  solid(1.6, (2.25 + h) / 2, fz, 1.1, h - 2.25, wall);
  // east wall around its window
  const ex = w / 2 + wall / 2;
  solid(ex, h / 2, (-d / 2 + east.z0) / 2, wall, h, east.z0 + d / 2);
  solid(ex, h / 2, (east.z1 + d / 2) / 2, wall, h, d / 2 - east.z1);
  solid(ex, east.y0 / 2, (east.z0 + east.z1) / 2, wall, east.y0, east.z1 - east.z0);
  solid(ex, (east.y1 + h) / 2, (east.z0 + east.z1) / 2, wall, h - east.y1, east.z1 - east.z0);

  // painted plaster skins (u runs along the wall as seen from inside)
  const skin = (o: Parameters<typeof wallSkin>[0], seed: number, x: number, z: number, ry: number) => {
    const s = wallSkin(o, seed);
    s.position.set(x, h / 2, z);
    s.rotation.y = ry;
    group.add(s);
  };
  skin({ w, h, frieze: 2.72, patches: [{ x: 6.1, y: 2.3, r: 0.14 }] }, 1, 0, -d / 2 + 0.012, 0);
  skin({ w: d, h, frieze: 2.72, patches: [{ x: 1.1, y: 1.3, r: 0.15 }] }, 2, -w / 2 + 0.012, 0, Math.PI / 2);
  skin(
    {
      w,
      h,
      frieze: 2.72,
      holes: front.map((o) => ({ x0: w / 2 - o.x1, x1: w / 2 - o.x0, y0: o.y0, y1: o.y1 })),
      cracksFrom: [{ x: w / 2 + 0.9, y: 2.15 }, { x: w / 2 + 2.4, y: 0.9 }],
      patches: [{ x: 1.0, y: 1.5, r: 0.12 }],
    },
    3,
    0,
    d / 2 - 0.012,
    Math.PI,
  );
  skin(
    {
      w: d,
      h,
      frieze: 2.72,
      holes: [{ x0: east.z0 + d / 2, x1: east.z1 + d / 2, y0: east.y0, y1: east.y1 }],
      tally: { x: d / 2 - 1.75, y: 1.45 },
    },
    4,
    w / 2 - 0.012,
    0,
    -Math.PI / 2,
  );

  // half-timbering on a stone plinth (the frame builder is shared with the first 3D test)
  const plinth = toon({ map: stoneTex(), rim: 0.1 });
  (plinth.map as THREE.Texture).repeat.set(0.6, 0.6);
  const frontLocal = front.map((o) => ({ ...o, x0: -o.x1, x1: -o.x0 }));
  const eastLocal = [{ x0: east.z0, x1: east.z1, y0: east.y0, y1: east.y1 }];
  for (const [len, x, z, ry, ops] of [
    [w, 0, -d / 2, 0, []],
    [w, 0, d / 2, Math.PI, frontLocal],
    [d, -w / 2, 0, Math.PI / 2, []],
    [d, w / 2, 0, -Math.PI / 2, eastLocal],
  ] as const) {
    const fr = F.timberFrame(len, h, ops as never, plinth);
    fr.position.set(x, 0, z);
    fr.rotation.y = ry;
    group.add(fr);
  }

  // ceiling and beams
  const ceilTex = M.beamH.map!.clone();
  ceilTex.repeat.set(w / 1.5, d / 1.5);
  ceilTex.needsUpdate = true;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w + wall * 2, d + wall * 2), toon({ map: ceilTex, rim: 0 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h;
  ceiling.receiveShadow = true;
  group.add(ceiling);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.2, d + 2), M.beam);
  roof.position.y = h + 0.1;
  roof.castShadow = true;
  group.add(roof);
  const beamXs = [-2.4, -0.8, 0.8, 2.4];
  for (const [i, x] of beamXs.entries()) {
    const b = bentBox(d, 0.24, 0.2, M.beamH, 0.015 + i * 0.004, 0.03 * (i % 2 ? 1 : -1));
    b.rotation.y = Math.PI / 2;
    b.position.set(x, h - 0.12, 0);
    group.add(shadowed(b));
  }

  // ------------------------------------------------------------ windows and door
  const windowAt = (cx: number, cy: number, ww: number, wh: number, place: (g: THREE.Group) => void) => {
    const g = new THREE.Group();
    for (const [bw, bh, x, y] of [
      [ww + 0.1, 0.08, 0, wh / 2],
      [ww + 0.1, 0.08, 0, -wh / 2],
      [0.08, wh, ww / 2, 0],
      [0.08, wh, -ww / 2, 0],
      [0.05, wh, 0, 0],
      [ww, 0.04, 0, wh * 0.08],
    ] as const) {
      const b = rbox(bw, bh, 0.1, M.wood, 0.015);
      b.position.set(x, y, 0);
      g.add(b);
    }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww - 0.06, wh - 0.06), glass(0xe8f2ea));
    (pane.material as THREE.MeshToonMaterial).opacity = 0.18;
    pane.castShadow = false;
    g.add(pane);
    const sill = rbox(ww + 0.22, 0.06, wall + 0.14, M.stone, 0.02);
    sill.position.set(0, -wh / 2 - 0.03, -0.02);
    g.add(sill);
    // shutters, open outwards, each at its own angle
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set((s * ww) / 2, 0, wall / 2 + 0.02);
      const sh = rbox(ww / 2, wh, 0.04, M.wood, 0.01);
      sh.position.x = (s * ww) / 4;
      hinge.add(sh);
      hinge.rotation.y = s * (1.7 + rnd() * 0.5);
      g.add(hinge);
    }
    g.position.set(cx, cy, 0);
    place(g);
    group.add(tag(shadowed(g), 'finestra'));
    (g.children.find((c) => (c as THREE.Mesh).geometry instanceof THREE.PlaneGeometry) as THREE.Mesh).castShadow = false;
  };
  windowAt(-1.65, 1.525, 1.5, 1.25, (g) => {
    g.position.z = d / 2 + wall / 2;
    g.rotation.y = Math.PI;
    g.rotation.z = 0.01;
  });
  windowAt(0, 1.525, 0.9, 0.85, (g) => {
    g.position.set(w / 2 + wall / 2, 1.525, (east.z0 + east.z1) / 2);
    g.rotation.y = -Math.PI / 2;
  });
  // a pot of herbs on the front sill, a cup forgotten on the east one
  {
    const pot = new THREE.Group();
    pot.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.09, 0.12], [0.1, 0.13], [0.1, 0.15], [0.085, 0.15]].map(([r, y]) => new THREE.Vector2(r, y)), 32), M.clay));
    const leaves = herbBunch(5, 0.0, M.leaf);
    leaves.rotation.x = Math.PI;
    leaves.position.y = 0.12;
    pot.add(leaves);
    pot.position.set(-2.0, 0.9, d / 2 - 0.05);
    group.add(organic(shadowed(pot), 0.02, 4));
    living.push(pot);
    const c = cup(31);
    c.position.set(w / 2 - 0.04, 1.1, -0.4);
    group.add(c);
  }
  // the door, open inwards against the wall, and its frame
  {
    const door = new THREE.Group();
    const leaf = rbox(1.08, 2.22, 0.05, M.wood, 0.01);
    leaf.position.set(-0.54, 1.11, 0);
    door.add(leaf);
    for (const y of [0.4, 1.8]) {
      const strap = rbox(0.85, 0.06, 0.012, M.iron, 0.004);
      strap.position.set(-0.5, y, 0.03);
      door.add(strap);
    }
    door.position.set(2.15, 0, d / 2 - 0.02);
    door.rotation.y = 1.15;
    group.add(tag(organic(shadowed(door), 0.006, 5), 'porta'));
    for (const x of [1.01, 2.19]) {
      const jamb = rbox(0.09, 2.3, wall + 0.04, M.beam, 0.01);
      jamb.position.set(x, 1.15, d / 2 + wall / 2);
      group.add(shadowed(jamb));
    }
    const lintel = bentBox(1.3, 0.12, wall + 0.04, M.beamH, 0.008, 0);
    lintel.position.set(1.6, 2.31, d / 2 + wall / 2);
    group.add(shadowed(lintel));
    box(1.6, d / 2 + 0.25, 1.2, 0.3); // for now the shop is the whole world
  }

  // ------------------------------------------------------------ the counter and the shelves
  const counter = P.counter(4.0);
  toonify(counter);
  counter.position.set(-0.7, 0, -1.15);
  group.add(organic(counter, 0.006, 7));
  box(-0.7, -1.15, 4.1, 0.65);
  const sign = P.sign('Si guarda con gli occhi.');
  toonify(sign);
  sign.position.set(-0.7, 0.72, -1.15 + 0.32);
  sign.rotation.z = -0.025; // hung by hand
  group.add(tag(sign, 'cartello'));

  const levels = [0.45, 0.95, 1.45, 1.95, 2.4];
  const shelves = P.shelving(5.6, 2.55, 0.38, levels);
  toonify(shelves);
  shelves.position.set(-0.6, 0, -d / 2 + 0.32);
  group.add(organic(shelves, 0.004, 8));
  box(-0.6, -d / 2 + 0.32, 5.7, 0.45);
  const shelfZ = -d / 2 + 0.34;
  const sx0 = -0.6 - 2.75;

  /**
   * Fills a stretch of shelf the way a person would: small groups, uneven
   * gaps, some things pushed back and some forward, the odd empty stretch.
   */
  const arrange = (y: number, x0: number, x1: number, make: (i: number) => [THREE.Object3D, number, string?] | null) => {
    let x = x0 + 0.03 + rnd() * 0.06;
    let i = 0;
    while (x < x1) {
      const made = make(i++);
      if (!made) break;
      const [obj, width, key] = made;
      if (x + width / 2 > x1) break;
      obj.position.set(x + width / 2, y + 0.018, shelfZ + (rnd() - 0.5) * 0.2);
      obj.rotation.y += rnd() * Math.PI * 2;
      // now and then a bottle has been laid down rather than stood up
      if (key === 'bottiglie' && rnd() < 0.18) {
        obj.rotation.set(0, rnd() * 0.6 - 0.3, Math.PI / 2);
        obj.position.y += 0.045;
        obj.position.x += width * 0.8;
      }
      group.add(key ? tag(obj, key) : obj);
      const gap = rnd() < 0.22 ? 0.16 + rnd() * 0.22 : rnd() < 0.4 ? 0.004 : 0.02 + rnd() * 0.08;
      x += width + gap;
    }
  };
  const glows: THREE.MeshStandardMaterial[] = [];
  const glowList: THREE.MeshToonMaterial[] = [];
  const jarOf = (seed: number, hgt = 0.2 + rnd() * 0.08) => {
    const j = P.jar(seed, hgt);
    toonify(j);
    return organic(j, 0.02, seed);
  };
  // shelf 1: jars of pulses and grains, a crock, candles
  arrange(levels[0], sx0, sx0 + 2.6, (i) => [jarOf(10 + i), 0.18, 'vasi']);
  arrange(levels[0], sx0 + 2.9, sx0 + 5.4, (i) => {
    if (i % 3 === 1) {
      const p = new THREE.Group();
      p.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.09, 0.003], [0.11, 0.1], [0.1, 0.18], [0.08, 0.2], [0.085, 0.215]].map(([r, yy]) => new THREE.Vector2(r, yy)), 32), M.clay));
      return [organic(shadowed(p), 0.03, i), 0.24];
    }
    const c = P.candleBundle();
    toonify(c);
    return [c, 0.18, 'candele'];
  });
  // shelf 2: more jars, folded cloth from Clelia's loom, thread
  arrange(levels[1], sx0, sx0 + 2.4, (i) => [jarOf(40 + i), 0.18, 'vasi']);
  arrange(levels[1], sx0 + 2.7, sx0 + 5.4, (i) => {
    if (i % 2 === 0) {
      const cl = P.cloth([0x2c4a7a, 0xd8c890, 0x3a5a8a, 0xe0d4b8, 0x7a3a2a].slice(i % 3, (i % 3) + 3), i === 0 ? [0x2c4a7a, 0xd8b840] : undefined);
      toonify(cl);
      return [organic(cl, 0.02, i), 0.36, 'stoffe'];
    }
    const sp = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const s = P.spool([0x2c4a8a, 0xd8b840, 0xa83a2a, 0xe8e0d0, 0x4a6a3a][(i + k) % 5]);
      toonify(s);
      s.position.set(k * 0.07 - 0.07, 0, (k % 2) * 0.05);
      sp.add(s);
    }
    return [sp, 0.22, 'filo'];
  });
  // shelf 3: bottles in little groups, and the tinctures that glow a little in the dark
  arrange(levels[2], sx0, sx0 + 3.0, (i) => [someBottle(60 + i), 0.11 + rnd() * 0.04, 'bottiglie']);
  arrange(levels[2], sx0 + 3.3, sx0 + 5.4, (i) => {
    const t = F.tincture(200 + i * 7);
    toonify(t.group);
    t.group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshToonMaterial | undefined;
      if (m && m.emissiveIntensity && m.emissive && m.emissive.getHex() !== 0) glowList.push(m);
    });
    return [t.group, 0.14, 'tinture'];
  });
  // shelf 4: crates, cheese, the jug, more bottles
  arrange(levels[3], sx0, sx0 + 2.0, (i) => [someBottle(90 + i), 0.12, 'bottiglie']);
  arrange(levels[3], sx0 + 2.3, sx0 + 5.4, (i) => {
    if (i === 1) {
      const ch = P.cheeses();
      toonify(ch);
      return [organic(ch, 0.02, 3), 0.5, 'formaggi'];
    }
    if (i === 3) return [jug(17), 0.22];
    const cr = P.crate(0.36, 0.22, 0.3);
    toonify(cr);
    // something put down on the crate and never moved
    if (i % 2 === 0) {
      const b = someBottle(150 + i);
      b.position.set(0.06, 0.22, 0.02);
      cr.add(b);
      if (i === 4) {
        const c2 = cup(160 + i);
        c2.position.set(-0.1, 0.22, -0.03);
        cr.add(c2);
      }
    }
    return [organic(cr, 0.01, i), 0.4];
  });
  // top shelf: paper packets, the dark bottle nobody buys, Bruna's crystals
  arrange(levels[4], sx0, sx0 + 5.4, (i) => {
    if (i === 2) {
      const odd = someBottle(7);
      odd.scale.setScalar(1.25);
      return [odd, 0.12, 'bottiglie'];
    }
    if (i === 5) {
      const cr = F.crystals();
      toonify(cr.group);
      cr.group.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshToonMaterial | undefined;
        if (m && m.emissive && m.emissive.getHex() !== 0) glowList.push(m);
      });
      return [cr.group, 0.22, 'cristalli'];
    }
    if (i > 7) return null;
    const pk = P.packets(14 + i, 2 + (i % 3));
    toonify(pk);
    return [organic(pk, 0.03, i), 0.32, 'pacchetti'];
  });

  // ------------------------------------------------------------ on the counter
  const top = 0.98;
  const onCounter = (o: THREE.Object3D, x: number, z: number, ry: number, key?: string) => {
    o.position.set(x, top, z);
    o.rotation.y = ry;
    group.add(key ? tag(o, key) : o);
  };
  const sc = P.scale();
  toonify(sc);
  onCounter(sc, -2.05, -1.2, 0.3, 'bilancia');
  const led = P.ledger();
  toonify(led);
  onCounter(led, 0.0, -1.1, 0.15, 'registro');
  const ink = P.inkwell();
  toonify(ink);
  onCounter(ink, 0.4, -1.27, 0, 'calamaio');
  const bl = P.bell();
  toonify(bl);
  onCounter(bl, 0.95, -0.98, 0, 'campanello');
  const cs = P.candlestick();
  toonify(cs.group);
  onCounter(cs.group, -1.12, -1.32, 0);
  const map = F.woodsMap();
  toonify(map);
  onCounter(map, -0.62, -1.06, -0.12, 'mappa');
  const jarF = F.fireflyJar();
  jarF.group.scale.setScalar(0.8);
  jarF.group.userData.noWonk = true; // the fireflies move
  toonify(jarF.group);
  onCounter(jarF.group, 0.78, -1.33, 0.4, 'lucciole');
  for (let i = 0; i < 3; i++) onCounter(jarOf(300 + i, 0.17 + i * 0.02), -2.6 + i * 0.16 + rnd() * 0.03, -1.3 + (i % 2) * 0.07, 0, 'vasi');
  const pk2 = P.packets(15, 3);
  toonify(pk2);
  onCounter(organic(pk2, 0.03, 9), -2.55, -1.0, 0.4, 'pacchetti');
  const bw = bowl(41);
  onCounter(bw, -1.55, -1.18, 0.6);
  for (let i = 0; i < 3; i++) {
    const a = apple(500 + i);
    a.position.set(-1.55 + (i - 1) * 0.045, top + 0.05 + (i === 1 ? 0.02 : 0), -1.18 + (i % 2) * 0.03);
    group.add(tag(a, 'mele'));
  }
  const j = jug(18);
  onCounter(j, -1.85, -1.38, 2.2);

  // ------------------------------------------------------------ floor: barrels, sacks, baskets
  const barrels: [number, number][] = [
    [-2.95, 2.2],
    [-2.3, 2.42],
  ];
  barrels.forEach(([x, z], i) => {
    const b = barrel(3 + i);
    b.position.set(x, 0, z);
    b.rotation.set(0.012 * (i ? -1 : 1), rnd() * 3, -0.01);
    group.add(tag(b, 'botte'));
    box(x, z, 0.72, 0.72);
  });
  const clothB = new THREE.Vector3(barrels[0][0], 0, barrels[0][1]);
  group.add(tableclothOnBarrel(clothB, [wallCollider('x', -w / 2 + 0.03)], 1));
  const bb = bowl(42);
  bb.position.set(clothB.x - 0.04, BARREL_H + 0.02, clothB.z + 0.02);
  group.add(bb);
  for (let i = 0; i < 4; i++) {
    const a = apple(600 + i);
    a.position.set(clothB.x - 0.04 + Math.cos(i * 2) * 0.04, BARREL_H + 0.06 + (i === 3 ? 0.03 : 0), clothB.z + 0.02 + Math.sin(i * 2) * 0.04);
    group.add(tag(a, 'mele'));
  }

  const sacks: [number, number, number][] = [
    [-3.05, -0.15, 0.15],
    [-3.08, 0.45, -0.4],
    [-2.6, 0.12, 0.3],
  ];
  sacks.forEach(([x, z, slump], i) => {
    const s = sack(20 + i, slump);
    s.position.set(x, 0, z);
    s.rotation.y = rnd() * Math.PI * 2;
    s.scale.setScalar(0.92 + rnd() * 0.15);
    group.add(tag(s, 'sacchi'));
    box(x, z, 0.55, 0.55);
  });
  const fs = fallenSack(new THREE.Vector3(-2.75, 0, 1.05), 0.35, group, [wallCollider('x', -w / 2 + 0.03)], 13);
  tag(fs, 'sacchi');
  box(-2.75, 1.05, 0.6, 0.6);
  for (const [x, z, kind] of [[-2.25, 1.7, 'mele'], [-1.95, 2.25, 'cipolle']] as const) {
    const bk = P.basket(x * 10, kind);
    toonify(bk);
    bk.position.set(x, 0, z);
    bk.rotation.y = rnd() * 3;
    group.add(tag(organic(bk, 0.02, 3), kind));
    box(x, z, 0.42, 0.42);
  }

  // east side: crates, lantern, rope, broom, a bucket
  const cr1 = P.crate(0.62, 0.42, 0.46);
  toonify(cr1);
  cr1.position.set(3.0, 0, 1.9);
  cr1.rotation.y = 0.2;
  group.add(organic(cr1, 0.01, 1));
  const cr2 = P.crate(0.5, 0.32, 0.4);
  toonify(cr2);
  cr2.position.set(3.02, 0.42, 1.92);
  cr2.rotation.y = -0.15;
  group.add(organic(cr2, 0.01, 2));
  box(3.0, 1.9, 0.75, 0.65);
  const lan = F.lantern();
  toonify(lan);
  lan.position.set(2.98, 0.74, 1.95);
  lan.rotation.y = 0.5;
  group.add(tag(lan, 'lanterna'));
  const rope = F.ropeCoil();
  toonify(rope);
  rope.position.set(3.1, 0, 1.15);
  group.add(tag(organic(rope, 0.04, 4), 'corda'));
  box(3.1, 1.15, 0.32, 0.32);
  const br = broom();
  br.position.set(3.33, 0, 0.6);
  br.rotation.set(0.05, 1.3, -0.15);
  group.add(tag(br, 'scopa'));
  {
    const bucket = new THREE.Group();
    bucket.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.13, 0.002], [0.15, 0.26], [0.155, 0.27], [0.145, 0.27], [0.125, 0.012], [0, 0.012]].map(([r, y]) => new THREE.Vector2(r, y)), 40), M.staves));
    for (const y of [0.05, 0.22]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.14 + y * 0.07, 0.008, 6, 32), M.iron);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y;
      bucket.add(hoop);
    }
    bucket.position.set(2.55, 0, 2.35);
    group.add(organic(shadowed(bucket), 0.02, 6));
    box(2.55, 2.35, 0.32, 0.32);
  }

  // behind the counter: Teresa's stool, the ladder
  const st = P.stool();
  toonify(st);
  st.position.set(0.4, 0, -1.85);
  st.rotation.y = 0.5;
  group.add(tag(organic(st, 0.01, 2), 'sgabello'));
  box(0.4, -1.85, 0.36, 0.36);
  const ld = P.ladder(2.6);
  toonify(ld);
  ld.position.set(1.95, 0, -2.0);
  ld.rotation.set(-0.15, 0.06, 0.01);
  group.add(organic(ld, 0.006, 3));
  box(1.95, -2.05, 0.5, 0.25);

  const rug = P.rug(2.3, 1.25);
  toonify(rug);
  rug.position.set(-0.75, 0.004, -0.1);
  rug.rotation.z = 0.05;
  group.add(rug);

  // ------------------------------------------------------------ on the walls and from the beams
  const ss = F.shieldAndSword();
  toonify(ss);
  ss.position.set(-w / 2 + 0.11, 1.75, -1.2);
  ss.rotation.set(0, Math.PI / 2, 0.04);
  group.add(tag(ss, 'scudo'));
  // garlic braids hanging from nails on the top rail of the west wall
  [1.35, 1.75, 2.1].forEach((z, i) => {
    const n = nail();
    n.rotation.y = Math.PI / 2;
    n.position.set(-w / 2 + 0.12, 2.62, z);
    group.add(n);
    const braid = garlicBraid(70 + i, 7 + i, i === 1 ? 4 : -1);
    braid.position.set(-w / 2 + 0.16, 2.58, z);
    braid.rotation.y = rnd();
    group.add(tag(braid, 'trecce'));
    living.push(braid);
  });
  // bunches of herbs drying from the beams, on strings of different lengths
  for (let i = 0; i < 9; i++) {
    const x = beamXs[i % 2 === 0 ? 0 : 3] + (rnd() - 0.5) * 0.06;
    const z = -1.9 + i * 0.5 + (rnd() - 0.5) * 0.2;
    const hb = herbBunch(80 + i, 0.08 + rnd() * 0.25);
    hb.position.set(x, h - 0.24, z);
    group.add(tag(hb, 'erbe'));
    living.push(hb);
  }

  // lights: the oil lamp over the counter, the iron chandelier, a candle
  const lamp = P.oilLamp();
  toonify(lamp.group);
  lamp.group.position.set(-0.8, h - 0.74, -1.0);
  group.add(tag(lamp.group, 'lampada'));
  const chand = F.chandelier();
  toonify(chand.group);
  chand.group.position.set(0.8, h - 0.24 - 0.72, 0.9);
  chand.group.rotation.z = 0.02;
  group.add(tag(chand.group, 'lampadario'));

  // loose straw where things stand
  group.add(
    straws(
      [
        [-2.9, 0.2, 0.3, 40],
        [-2.5, 1.2, 0.3, 30],
        [3.2, 0.7, 0.18, 25],
        [2.8, 1.6, 0.25, 20],
        [-2.6, 2.0, 0.3, 20],
      ],
      { x0: -3.2, x1: 3.2, z0: -0.7, z1: 2.5, n: 30 },
    ),
  );

  // Everything a little crooked, as if built by hand.
  wonkify(group, 0.6);

  for (const m of glowList) glows.push(m as unknown as THREE.MeshStandardMaterial);
  return {
    group,
    colliders,
    flames: [lamp.flame, cs.flame, ...chand.flames],
    lights: {
      lamp: new THREE.Vector3(-0.8, h - 0.72, -1.0),
      chandelier: new THREE.Vector3(0.8, h - 0.85, 0.9),
      candle: new THREE.Vector3(-1.12, top + 0.2, -1.32),
    },
    fireflies: { update: jarF.update },
    glows,
    living,
  };
}

/** The view from the windows: painted hills and sky, a grassy yard, the road. */
export function buildCartoonOutside(): THREE.Group {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), toon({ color: 0x7aae52, rim: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  g.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 2.6), toon({ color: 0xcaa878, rim: 0 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.02, ROOM.d / 2 + 2.6);
  road.receiveShadow = true;
  g.add(road);
  const tex = landscapeTex();
  for (const [x, z, ry] of [
    [0, ROOM.d / 2 + 12, Math.PI],
    [ROOM.w / 2 + 12, 0, -Math.PI / 2],
  ] as const) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
    m.position.set(x, 4, z);
    m.rotation.y = ry;
    g.add(m);
  }
  return g;
}
