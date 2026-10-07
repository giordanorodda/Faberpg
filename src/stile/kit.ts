import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng } from '../core/rng';
import { clothTex, plasterTex, tableclothTex, toon, wallTex, woodTex, type WallOptions } from './paint';
import { barrelCollider, floorCollider, settle, type Collider } from './softbody';

/**
 * The building blocks of the "natural cartoon" style, shared by the style
 * sketch and the full shop: materials, a few helpers that keep things from
 * looking machine-made, and the props that have their own character.
 */

export { toon };

export const shadowed = <T extends THREE.Object3D>(o: T): T => {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
};

export const lathe = (profile: [number, number][], mat: THREE.Material, seg = 48) =>
  new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);

export const rbox = (w: number, h: number, d: number, mat: THREE.Material, r = 0.02) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);

function rotated(t: THREE.Texture): THREE.Texture {
  t.center.set(0.5, 0.5);
  t.rotation = Math.PI / 2;
  return t;
}

export const M = {
  plaster: toon({ map: plasterTex(2), rim: 0.05 }),
  beam: toon({ map: woodTex(3, '#6e4630', '#3e2618', { knots: 2 }), rim: 0.15 }),
  beamH: toon({ map: rotated(woodTex(10, '#6e4630', '#3e2618', { knots: 2 })), rim: 0.15 }),
  wood: toon({ map: woodTex(4, '#a8744a', '#6a4426', { knots: 1 }), rim: 0.25 }),
  woodH: toon({ map: rotated(woodTex(9, '#a8744a', '#6a4426', { knots: 1 })), rim: 0.25 }),
  woodPale: toon({ map: woodTex(11, '#c89a64', '#8a6438', { knots: 1 }), rim: 0.25 }),
  staves: toon({ map: woodTex(5, '#b07a4c', '#6a4224', { planks: 14, knots: 4 }), rim: 0.3 }),
  iron: toon({ color: 0x4a4650, rim: 0.5 }),
  brass: toon({ color: 0xd0a050, rim: 0.7, emissive: 0x3a2808, emissiveIntensity: 0.4 }),
  sack: toon({ map: clothTex(6, '#cfae7c'), rim: 0.3 }),
  sack2: toon({ map: clothTex(7, '#bca07a'), rim: 0.3 }),
  rope: toon({ color: 0xb8945e, rim: 0.2 }),
  cork: toon({ color: 0xb08050, rim: 0.2 }),
  clay: toon({ color: 0xc8643c, rim: 0.3 }),
  ceramic: toon({ color: 0xeee2c8, rim: 0.35 }),
  ceramicBlue: toon({ color: 0x4a6ea8, rim: 0.3 }),
  garlic: toon({ color: 0xf2e8d6, rim: 0.4 }),
  garlicStreak: toon({ color: 0xc8a0b8, rim: 0.3 }),
  stem: toon({ color: 0xc8b07a, rim: 0.2 }),
  leaf: toon({ color: 0x6aa44a, rim: 0.3, side: THREE.DoubleSide }),
  leafDark: toon({ color: 0x4a8a3a, rim: 0.3, side: THREE.DoubleSide }),
  dryHerb: toon({ color: 0x8a9a5a, rim: 0.3, side: THREE.DoubleSide }),
  stone: toon({ color: 0xc8bca8, rim: 0.15 }),
  apple: toon({ color: 0xc8402e, rim: 0.45 }),
  appleGreen: toon({ color: 0xa8b84a, rim: 0.45 }),
  grain: toon({ color: 0xe0c070, rim: 0.2 }),
  straw: toon({ color: 0xe2c47a, rim: 0.2 }),
  wax: toon({ color: 0xf2e6c8, rim: 0.3 }),
  cup: toon({ color: 0x8a5a3e, rim: 0.3 }),
};
export const glass = (color: number) => toon({ color, transparent: true, opacity: 0.55, rim: 0.9 });
export const liquid = (color: number) => toon({ color, transparent: true, opacity: 0.85, rim: 0.4, emissive: color, emissiveIntensity: 0.15 });

/**
 * Nothing made by hand is perfectly round or straight: pushes every vertex
 * a little in or out along its normal, with a smooth pattern unique to the
 * object, scaled to its size.
 */
export function organic<T extends THREE.Object3D>(obj: T, amount = 0.025, seed = 1): T {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh) return;
    m.geometry = m.geometry.clone();
    m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere!.radius || 0.1;
    const f = 2.4 / r;
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    const nor = m.geometry.attributes.normal as THREE.BufferAttribute | undefined;
    if (!nor) return;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n = Math.sin(x * f + seed) * Math.sin(y * f * 1.3 + seed * 2) * Math.sin(z * f * 0.9 + seed * 3) + 0.4 * Math.sin(x * f * 2.7 + y * f * 1.9 + seed);
      const d = n * r * amount;
      pos.setXYZ(i, x + nor.getX(i) * d, y + nor.getY(i) * d, z + nor.getZ(i) * d);
    }
    m.geometry.computeVertexNormals();
  });
  return obj;
}

/** A long board or beam that bows and twists a little along its length (x). */
export function bentBox(w: number, h: number, d: number, mat: THREE.Material, sag: number, twist: number): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(2, Math.round(w * 20)), 2, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = x / w + 0.5;
    const y = p.getY(i) - sag * Math.sin(t * Math.PI);
    const a = twist * (t - 0.5);
    const z = p.getZ(i);
    p.setXYZ(i, x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a));
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/**
 * Converts every PBR material under `root` into the toon look, keeping
 * colors, maps, transparency and glow. Used on props built by the older 3D
 * code so they join the same visual family.
 */
export function toonify(root: THREE.Object3D): void {
  const cache = new Map<THREE.Material, THREE.Material>();
  const conv = (m: THREE.Material): THREE.Material => {
    if (!(m instanceof THREE.MeshStandardMaterial)) return m;
    let t = cache.get(m);
    if (!t) {
      t = toon({
        color: m.color.getHex(),
        map: m.map ?? undefined,
        transparent: m.transparent,
        opacity: m.opacity,
        emissive: m.emissive.getHex(),
        emissiveIntensity: m.emissiveIntensity,
        side: m.side,
        rim: m.metalness > 0.5 ? 0.7 : 0.3,
      });
      cache.set(m, t);
    }
    return t;
  };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(conv) : conv(mesh.material);
  });
}

// ------------------------------------------------------------------ surfaces

/** Separate floor boards of different widths and tones, a few slightly lifted. */
export function plankFloor(w: number, d: number, seed = 71): THREE.Group {
  const g = new THREE.Group();
  const under = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon({ color: 0x3a2618, rim: 0 }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.006;
  g.add(under);
  const rnd = makeRng(seed);
  let x = -w / 2;
  let k = 0;
  while (x < w / 2) {
    const bw = Math.min(w / 2 - x, 0.22 + rnd() * 0.16);
    const tone = new THREE.Color(0xffffff).multiplyScalar(0.86 + rnd() * 0.22);
    const tex = woodTex(seed + 9 + k, '#b9875a', '#7a4f30', { knots: 1 + Math.floor(rnd() * 3), size: 512 });
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
    tex.repeat.set(d / 1.4, bw / 0.5);
    const plank = bentBox(d, 0.03, bw - 0.008, toon({ map: tex, color: tone.getHex(), rim: 0.1 }), (rnd() - 0.5) * 0.004, (rnd() - 0.5) * 0.01);
    plank.rotation.y = Math.PI / 2;
    plank.rotation.x = (rnd() - 0.5) * 0.004;
    plank.position.set(x + bw / 2, -0.015 + (rnd() - 0.5) * 0.004, 0);
    plank.receiveShadow = true;
    g.add(plank);
    x += bw;
    k++;
  }
  return g;
}

/**
 * A plaster skin for the inner face of a wall: hand-laid, so never quite
 * flat, and painted once for the whole wall. Lies in the XY plane facing +z.
 */
export function wallSkin(o: WallOptions, seed: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(o.w, o.h, Math.round(o.w * 30), Math.round(o.h * 30));
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, 0.004 * Math.sin(x * 2.1 + seed) * Math.sin(y * 1.9 + seed * 2) + 0.0015 * Math.sin(x * 6.3 + y * 4.1 + seed));
  }
  geo.computeVertexNormals();
  const mat = toon({ map: wallTex(60 + seed, o), rim: 0.05 });
  mat.alphaTest = 0.5;
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------ props

const barrelR = (t: number) => 0.3 + Math.sin(t * Math.PI) * 0.06;
export const BARREL_H = 0.92;
/** Barrel radius at height y (meters from its base). */
export const barrelRadius = (y: number) => barrelR(Math.max(0, Math.min(1, y / BARREL_H)));

export function barrel(seed = 3): THREE.Group {
  const g = new THREE.Group();
  const h = BARREL_H;
  const prof: [number, number][] = [];
  for (let i = 0; i <= 16; i++) prof.push([barrelR(i / 16), (i / 16) * h]);
  g.add(lathe(prof, M.staves, 56));
  const lid = new THREE.Mesh(new THREE.CircleGeometry(barrelR(1) - 0.012, 48), M.wood);
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = h - 0.03;
  g.add(lid);
  for (const t of [0.07, 0.3, 0.7, 0.93]) {
    const r = barrelR(t) + 0.004;
    const hoop = lathe([[r, -0.022], [r + 0.012, -0.016], [r + 0.014, 0], [r + 0.012, 0.016], [r, 0.022]], M.iron, 56);
    hoop.position.y = t * h;
    if (t < 0.9) hoop.rotation.set(Math.sin(t * 17 + seed) * 0.02, 0, Math.cos(t * 13 + seed) * 0.02);
    g.add(hoop);
  }
  const bung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16), M.cork);
  bung.rotation.z = Math.PI / 2;
  bung.position.set(barrelR(0.5) + 0.008, h * 0.5, 0);
  g.add(bung);
  return organic(shadowed(g), 0.012, seed);
}

/** A tablecloth dropped onto a barrel standing at `base` and left to settle. */
export function tableclothOnBarrel(base: THREE.Vector3, extra: Collider[] = [], seed = 0): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(0.98, 0.98, 64, 64);
  geo.rotateX(-Math.PI / 2);
  const cloth = new THREE.Mesh(geo, toon({ map: tableclothTex(), rim: 0.2, side: THREE.DoubleSide }));
  const rnd = makeRng(seed + 5);
  cloth.position.set(base.x + 0.06 + (rnd() - 0.5) * 0.08, base.y + BARREL_H + 0.06, base.z + 0.03 + (rnd() - 0.5) * 0.08);
  cloth.rotation.set(0.04, 0.5 + rnd(), -0.03);
  settle(cloth, { colliders: [barrelCollider(base, BARREL_H, barrelRadius, 0.05), floorCollider(), ...extra], bend: 0.06, steps: 420 });
  return shadowed(cloth);
}

/**
 * A grain sack: wide flat-ish bottom, a full belly that sags, a neck
 * gathered by a rope, and the cloth above it flaring open in soft folds.
 */
export function sack(seed: number, slump: number, opts: { untied?: boolean; mat?: THREE.Material } = {}): THREE.Group {
  const rnd = makeRng(seed);
  const mat = opts.mat ?? (seed % 2 ? M.sack : M.sack2);
  const g = new THREE.Group();
  const prof: [number, number][] = opts.untied
    ? // no rope: the neck opens wide, and its cloth folds over the mouth like a flap
      [[0, 0], [0.18, 0.0], [0.24, 0.025], [0.27, 0.12], [0.275, 0.26], [0.26, 0.4], [0.23, 0.5], [0.2, 0.58], [0.2, 0.64], [0.12, 0.68], [0, 0.69]]
    : [
        [0, 0], [0.18, 0.0], [0.24, 0.025], [0.27, 0.12], [0.275, 0.26], [0.255, 0.38],
        [0.2, 0.47], [0.11, 0.535], [0.065, 0.565], [0.07, 0.585], [0.11, 0.625], [0.15, 0.665], [0.16, 0.69], [0.14, 0.695],
      ];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64, 0, Math.PI * 2);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    const a = Math.atan2(z, x);
    const nearNeck = opts.untied ? 0 : Math.exp(-Math.pow((y - 0.56) / 0.07, 2));
    const top = !opts.untied && y > 0.585 ? (y - 0.585) / 0.11 : 0;
    const pleat = 1 + nearNeck * 0.14 * Math.cos(a * 9 + seed) + top * 0.22 * Math.sin(a * 6 + seed * 2) + 0.025 * Math.sin(a * 3 + y * 8 + seed);
    x *= pleat;
    z *= pleat * 0.82;
    const sag = y < 0.3 ? 1 + 0.06 * (0.3 - y) * 3 : 1;
    x = x * sag + slump * Math.pow(y / 0.7, 2) * 0.16;
    z *= sag;
    if (y > 0.585) y += 0.03 * Math.sin(a * 4 + seed) * top;
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, mat));
  if (opts.untied) return shadowed(g);
  for (let k = 0; k < 3; k++) {
    const turn = new THREE.Mesh(new THREE.TorusGeometry(0.072 + k * 0.002, 0.009, 8, 32), M.rope);
    turn.rotation.x = Math.PI / 2 + (rnd() - 0.5) * 0.15;
    turn.position.set(slump * 0.1, 0.56 + k * 0.014, 0);
    g.add(turn);
  }
  const endCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.07 + slump * 0.1, 0.57, 0.02),
    new THREE.Vector3(0.11 + slump * 0.1, 0.52, 0.06),
    new THREE.Vector3(0.12 + slump * 0.1, 0.44, 0.08),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(endCurve, 16, 0.008, 6), M.rope));
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.rope);
  knot.position.copy(endCurve.getPoint(1));
  g.add(knot);
  if (seed % 3 === 1) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.09), toon({ color: 0x9a7a52, rim: 0.2, side: THREE.DoubleSide }));
    patch.position.set(0.05, 0.22, 0.27 * 0.82 * 1.05);
    patch.rotation.z = 0.15;
    g.add(patch);
  }
  return shadowed(g);
}

export function bottle(profile: [number, number][], g: THREE.Material, liq: THREE.Material | null, fill: number): THREE.Group {
  const grp = new THREE.Group();
  const body = lathe(profile, g, 40);
  body.castShadow = false;
  grp.add(body);
  if (liq) {
    const r = profile[2][0] * 0.92;
    const h = profile[2][1] * fill;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), liq);
    l.position.y = h / 2 + 0.004;
    grp.add(l);
  }
  const top = profile[profile.length - 2];
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(top[0] * 0.95, top[0] * 0.85, 0.035, 16), M.cork);
  cork.position.y = top[1] + 0.01;
  grp.add(cork);
  return grp;
}

/** A bottle chosen from a few shapes, with or without something inside. */
export function someBottle(seed: number): THREE.Group {
  const rnd = makeRng(seed);
  const shapes: [number, number][][] = [
    [[0, 0], [0.045, 0.002], [0.045, 0.16], [0.02, 0.22], [0.016, 0.27], [0, 0.27]],
    [[0, 0], [0.06, 0.002], [0.07, 0.06], [0.05, 0.12], [0.02, 0.15], [0.018, 0.19], [0, 0.19]],
    [[0, 0], [0.035, 0.002], [0.035, 0.2], [0.014, 0.26], [0.012, 0.31], [0, 0.31]],
    [[0, 0], [0.05, 0.002], [0.055, 0.1], [0.03, 0.14], [0.016, 0.17], [0.015, 0.21], [0, 0.21]],
  ];
  const glasses = [0x4a8a5a, 0x8a5a3a, 0x5a7aa0, 0x6a8a4a, 0x7a6a3a];
  const liquids = [0x3a6a3a, 0xb0602a, 0x8a3a2a, 0xd0a040, 0x5a3a6a];
  const shape = shapes[Math.floor(rnd() * shapes.length)];
  const hasLiquid = rnd() < 0.7;
  const b = bottle(shape, glass(glasses[Math.floor(rnd() * glasses.length)]), hasLiquid ? liquid(liquids[Math.floor(rnd() * liquids.length)]) : null, 0.3 + rnd() * 0.6);
  return organic(b, 0.015, seed);
}

export function apple(seed: number): THREE.Mesh {
  const rnd = makeRng(seed);
  const g = new THREE.SphereGeometry(0.038, 24, 16);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 1 - 0.18 * Math.pow(Math.abs(y) / 0.038, 6);
    p.setXYZ(i, p.getX(i) * k, y * 0.9, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, rnd() < 0.3 ? M.appleGreen : M.apple);
  m.scale.setScalar(0.85 + rnd() * 0.3);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.02, 5), M.stem);
  stalk.position.y = 0.036;
  stalk.rotation.z = 0.3;
  m.add(stalk);
  m.rotation.set(rnd() * 0.6, rnd() * 6, rnd() * 0.6);
  return shadowed(m);
}

export function bowl(seed: number, mat: THREE.Material = M.wood): THREE.Mesh {
  return organic(shadowed(lathe([[0, 0], [0.06, 0.002], [0.11, 0.03], [0.13, 0.06], [0.125, 0.065], [0.105, 0.035], [0.05, 0.012], [0, 0.012]], mat, 40)), 0.04, seed);
}

export function jug(seed: number): THREE.Group {
  const j = new THREE.Group();
  j.add(lathe([[0, 0], [0.07, 0.003], [0.09, 0.07], [0.085, 0.13], [0.05, 0.19], [0.055, 0.22], [0.05, 0.225]], M.ceramic, 40));
  j.add(lathe([[0.091, 0.075], [0.092, 0.09], [0.089, 0.1]], M.ceramicBlue, 40));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 20, Math.PI), M.ceramic);
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.085, 0.13, 0);
  j.add(handle);
  return organic(shadowed(j), 0.03, seed);
}

export function cup(seed: number): THREE.Mesh {
  return organic(shadowed(lathe([[0, 0], [0.035, 0.002], [0.04, 0.06], [0.042, 0.07], [0.038, 0.07], [0.034, 0.008], [0, 0.008]], M.cup, 32)), 0.04, seed);
}

/** A braid of garlic, heads hanging down and out, cloves and roots showing. `missing` leaves a gap. */
export function garlicBraid(seed: number, heads = 8, missing = -1): THREE.Group {
  const braid = new THREE.Group();
  for (const ph of [0, Math.PI]) {
    const c = new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.9 + ph) * 0.018, -i * 0.045, Math.cos(i * 0.9 + ph) * 0.012)));
    braid.add(new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.012, 8), M.stem));
  }
  const prof: [number, number][] = [[0, 0], [0.025, 0.004], [0.045, 0.02], [0.048, 0.04], [0.038, 0.06], [0.018, 0.075], [0.008, 0.088], [0, 0.092]];
  const bulbGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
  const bp = bulbGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i);
    const z = bp.getZ(i);
    const y = bp.getY(i);
    const k = 1 + 0.07 * Math.cos(Math.atan2(z, x) * 8) * Math.sin(Math.min(1, y / 0.08) * Math.PI);
    bp.setXYZ(i, x * k, y, z * k);
  }
  bulbGeo.computeVertexNormals();
  const rnd = makeRng(seed);
  for (let i = 0; i < heads; i++) {
    if (i === missing) continue;
    const head = new THREE.Group();
    head.add(new THREE.Mesh(bulbGeo, M.garlic));
    for (let k = 0; k < 4; k++) head.add(new THREE.Mesh(new THREE.LatheGeometry(prof.slice(1, -1).map(([r, y]) => new THREE.Vector2(r * 1.06, y)), 3, k * 1.6 + i, 0.12), M.garlicStreak));
    const roots = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.004, 0.018, 10), M.stem);
    roots.position.y = -0.008;
    head.add(roots);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.05, 8), M.stem);
    neck.position.y = 0.11;
    head.add(neck);
    const side = i % 2 ? 1 : -1;
    head.scale.setScalar(0.85 + i * 0.04 + rnd() * 0.08);
    head.rotation.z = side * (0.5 + rnd() * 0.25);
    head.rotation.y = rnd() * Math.PI * 2;
    head.position.set(side * 0.05, -0.12 - i * 0.055, (rnd() - 0.5) * 0.04);
    braid.add(head);
  }
  return shadowed(braid);
}

/** A nail driven into a beam or wall, pointing along +z. */
export function nail(): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), M.iron);
  shaft.rotation.x = Math.PI / 2;
  g.add(shaft);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 12), M.iron);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.025;
  g.add(head);
  return shadowed(g);
}

/** A bunch of herbs hung upside down to dry, on a string of the given length. */
export function herbBunch(seed: number, stringLen = 0.07, mat: THREE.Material = M.dryHerb): THREE.Group {
  const g = new THREE.Group();
  const leaves: THREE.BufferGeometry[] = [];
  const rnd = makeRng(seed);
  for (let i = 0; i < 30; i++) {
    const lg = new THREE.SphereGeometry(0.022, 6, 4);
    lg.scale(0.45, 1, 0.15);
    const a = rnd() * Math.PI * 2;
    lg.rotateZ(Math.PI + (rnd() - 0.5) * 0.8);
    lg.rotateY(a);
    lg.translate(Math.cos(a) * rnd() * 0.04, -stringLen - 0.03 - rnd() * 0.14, Math.sin(a) * rnd() * 0.035);
    leaves.push(lg);
  }
  g.add(new THREE.Mesh(mergeGeometries(leaves), mat));
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, stringLen, 4), M.rope);
  string.position.y = -stringLen / 2;
  g.add(string);
  return shadowed(g);
}

export function broom(): THREE.Group {
  const b = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 1.25, 10), M.wood);
  stick.position.y = 0.8;
  b.add(stick);
  const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 18, 1, true), toon({ color: 0xe2c47a, rim: 0.2, side: THREE.DoubleSide }));
  bristles.position.y = 0.17;
  bristles.scale.set(1.1, 1, 0.45);
  bristles.rotation.z = 0.08;
  b.add(bristles);
  const bind = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16), M.rope);
  bind.rotation.x = Math.PI / 2;
  bind.position.y = 0.33;
  b.add(bind);
  return shadowed(b);
}

/** Loose straws in clumps where things stand, a few stray bits elsewhere. */
export function straws(clumps: [number, number, number, number][], strays: { x0: number; x1: number; z0: number; z1: number; n: number }, seed = 41): THREE.InstancedMesh {
  const rnd = makeRng(seed);
  const total = clumps.reduce((n, c) => n + c[3], 0) + strays.n;
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 4), M.straw, total);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  let k = 0;
  const put = (x: number, z: number) => {
    const len = 0.03 + rnd() * 0.11;
    q.setFromEuler(new THREE.Euler(Math.PI / 2 + (rnd() < 0.2 ? (rnd() - 0.5) * 0.4 : 0), rnd() * Math.PI, 0));
    m4.compose(new THREE.Vector3(x, 0.003 + rnd() * 0.004, z), q, new THREE.Vector3(1, len, 1));
    mesh.setMatrixAt(k++, m4);
  };
  for (const [cx, cz, r, n] of clumps) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.pow(rnd(), 1.5) * r;
      put(cx + Math.cos(a) * d * 1.3, cz + Math.sin(a) * d);
    }
  }
  for (let i = 0; i < strays.n; i++) put(strays.x0 + rnd() * (strays.x1 - strays.x0), strays.z0 + rnd() * (strays.z1 - strays.z0));
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Grain spilled from the mouth of a fallen sack, flowing towards `dir`
 * (unit vector on the floor): lumpy heaps near the mouth, a fan of grains
 * that widens and thins, stray grains further away.
 */
export function grainSpill(mouth: THREE.Vector3, dir: THREE.Vector2, seed = 31): THREE.Group {
  const g = new THREE.Group();
  const side = new THREE.Vector2(-dir.y, dir.x);
  const rnd = makeRng(seed);
  const at = (along: number, across: number) => new THREE.Vector2(mouth.x + dir.x * along + side.x * across, mouth.z + dir.y * along + side.y * across);
  const heaps: { c: THREE.Vector2; r: number; h: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const along = 0.02 + i * 0.07 + rnd() * 0.05;
    heaps.push({ c: at(along, (rnd() - 0.5) * 0.12 * (1 + i * 0.4)), r: 0.11 - i * 0.015 + rnd() * 0.03, h: 0.05 - i * 0.008 });
  }
  const heapHeight = (x: number, z: number) => {
    let hgt = 0;
    for (const hp of heaps) {
      const d = Math.hypot(x - hp.c.x, z - hp.c.y) / hp.r;
      if (d < 1) hgt = Math.max(hgt, hp.h * (1 - d * d));
    }
    return hgt;
  };
  for (const hp of heaps) {
    const sg = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = sg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const ang = Math.atan2(z, x);
      const rr = 1 + 0.22 * Math.sin(ang * 3 + hp.c.x * 40) + 0.12 * Math.sin(ang * 7 + hp.c.y * 30);
      p.setXYZ(i, x * hp.r * rr, p.getY(i) * hp.h, z * hp.r * rr * 0.85);
    }
    sg.computeVertexNormals();
    const m = new THREE.Mesh(sg, M.grain);
    m.position.set(hp.c.x, -0.004, hp.c.y);
    m.rotation.y = rnd() * Math.PI;
    g.add(shadowed(m));
  }
  const N = 1100;
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 6, 4), M.grain, N);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) {
    const stray = rnd() < 0.08;
    const along = stray ? 0.1 + rnd() * 0.75 : Math.pow(rnd(), 1.6) * 0.55;
    const width = 0.04 + along * 0.55;
    const across = (rnd() - 0.5) * width * (stray ? 2.2 : 1) + Math.sin(along * 25) * 0.025;
    const pt = at(along, across);
    q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
    const sz = 0.8 + rnd() * 0.5;
    m4.compose(new THREE.Vector3(pt.x, heapHeight(pt.x, pt.y) + 0.004, pt.y), q, new THREE.Vector3(1.4 * sz, 0.75 * sz, 0.9 * sz));
    grains.setMatrixAt(i, m4);
  }
  grains.receiveShadow = true;
  g.add(grains);
  (g.userData as { heaps: typeof heaps }).heaps = heaps;
  return g;
}

/**
 * A sack knocked over and left to slump on the floor (simulated), with its
 * grain spilled out of the open mouth. `facing` is the direction (on the
 * floor) the mouth should point to.
 */
export function fallenSack(at: THREE.Vector3, facing: number, parent: THREE.Object3D, colliders: Collider[], seed = 13): THREE.Group {
  const g = sack(seed, 0.1, { untied: true });
  // lay it on its side with the mouth towards `facing` (angle on the floor, 0 = +x)
  g.rotation.set(0, -facing, -Math.PI / 2 + 0.2, 'YXZ');
  g.position.set(at.x, 0.3, at.z);
  g.scale.setScalar(0.8);
  parent.add(g);
  const body = g.children[0] as THREE.Mesh;
  const bp = body.geometry.attributes.position as THREE.BufferAttribute;
  const rim: number[] = [];
  for (let i = 0; i < bp.count; i++) if (bp.getY(i) > 0.6) rim.push(i);
  settle(body, { colliders: [floorCollider(), ...colliders], volume: 0.6, bend: 0.15, steps: 420, friction: 0.8 });
  g.updateMatrixWorld(true);
  const mouth = new THREE.Vector3();
  for (const i of rim) mouth.add(body.localToWorld(new THREE.Vector3().fromBufferAttribute(bp, i)));
  mouth.divideScalar(Math.max(1, rim.length));
  const spill = grainSpill(new THREE.Vector3(mouth.x, 0, mouth.z), new THREE.Vector2(Math.cos(facing), Math.sin(facing)), seed + 18);
  parent.add(spill);
  return g;
}
