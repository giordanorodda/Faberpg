import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng } from '../core/rng';
import { material, texSet, writing } from './textures';

/**
 * Builders for the objects in the shop. Everything is made of simple
 * primitives and lathed profiles: modest geometry, with the care put into
 * proportions, materials and light (§24).
 */

export const MAT = {
  darkWood: material(texSet('woodDark'), { bump: 1 }),
  midWood: material(texSet('woodMid'), { bump: 1 }),
  paleWood: material(texSet('woodPale'), { bump: 1 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 1, roughness: 0.32 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2c2a28, metalness: 0.85, roughness: 0.6 }),
  burlap: material(texSet('burlap', [2, 2]), { bump: 2 }),
  flour: new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 1 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xe9dfc6, roughness: 0.95 }),
  wax: new THREE.MeshStandardMaterial({ color: 0xefe6cf, roughness: 0.6 }),
  cork: new THREE.MeshStandardMaterial({ color: 0xa0784a, roughness: 0.95 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xdfeee8,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  string: new THREE.MeshStandardMaterial({ color: 0xb8a078, roughness: 1 }),
};

/** Marks an object (and its children) as something the player can look at. */
export function inspectable<T extends THREE.Object3D>(obj: T, key: string): T {
  obj.traverse((o) => (o.userData.inspect = key));
  return obj;
}

export function shadowed<T extends THREE.Object3D>(obj: T): T {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}

/**
 * A box whose UVs follow its real size, so textures keep the same scale
 * everywhere. Edges are slightly rounded: real wood and stone never have
 * perfectly sharp corners, and the thin highlight on a bevel is much of
 * what makes an object read as solid rather than as plastic.
 */
export function box(w: number, h: number, d: number, mat: THREE.Material, texelsPerMeter = 1, rounded = true): THREE.Mesh {
  const minDim = Math.min(w, h, d);
  const g = rounded && minDim > 0.015 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(0.012, minDim * 0.25)) : new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let k = 0; k < uv.count; k++) {
    const ax = Math.abs(n.getX(k));
    const ay = Math.abs(n.getY(k));
    const az = Math.abs(n.getZ(k));
    const [du, dv] = ax >= ay && ax >= az ? [d, h] : ay >= az ? [w, d] : [w, h];
    uv.setXY(k, uv.getX(k) * du * texelsPerMeter, uv.getY(k) * dv * texelsPerMeter);
  }
  return new THREE.Mesh(g, mat);
}

function lathe(profile: [number, number][], mat: THREE.Material, segments = 24): THREE.Mesh {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), mat);
}

export function counter(length: number): THREE.Group {
  const g = new THREE.Group();
  const h = 0.98;
  const d = 0.62;
  const body = box(length, h - 0.06, d - 0.08, MAT.midWood, 1.2);
  body.position.y = (h - 0.06) / 2;
  g.add(body);
  // front panels
  const panels = Math.round(length / 0.7);
  for (let i = 0; i < panels; i++) {
    const p = box(length / panels - 0.12, h - 0.34, 0.03, MAT.darkWood, 1.2);
    p.position.set(-length / 2 + (i + 0.5) * (length / panels), h / 2 - 0.02, (d - 0.08) / 2 + 0.01);
    g.add(p);
  }
  const kick = box(length + 0.02, 0.1, d - 0.04, MAT.darkWood);
  kick.position.y = 0.05;
  g.add(kick);
  const top = box(length + 0.08, 0.06, d, MAT.darkWood, 0.8);
  top.position.y = h - 0.03;
  g.add(top);
  return shadowed(g);
}

export function shelving(width: number, height: number, depth: number, levels: number[]): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-width / 2, width / 2]) {
    const side = box(0.04, height, depth, MAT.darkWood, 1.5);
    side.position.set(x, height / 2, 0);
    g.add(side);
  }
  const back = box(width, height, 0.02, MAT.midWood, 1.2);
  back.position.set(0, height / 2, -depth / 2);
  g.add(back);
  for (const y of levels) {
    const s = box(width, 0.035, depth, MAT.paleWood, 1.5);
    s.position.set(0, y, 0);
    g.add(s);
  }
  const crown = box(width + 0.1, 0.06, depth + 0.06, MAT.darkWood);
  crown.position.set(0, height, 0.02);
  g.add(crown);
  return shadowed(g);
}

const CONTENTS = [
  { color: 0x8a5a32, rough: 1 }, // lentils
  { color: 0xeee6d2, rough: 1 }, // white beans
  { color: 0xc09a5a, rough: 1 }, // spelt
  { color: 0xf4f2ee, rough: 0.7 }, // coarse salt
  { color: 0x6a3020, rough: 1 }, // red beans
  { color: 0xe0b040, rough: 1 }, // polenta
];

export function jar(seed: number, height = 0.24): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const r = 0.07 + rnd() * 0.02;
  const glass = lathe(
    [
      [0, 0],
      [r, 0.005],
      [r + 0.005, 0.02],
      [r + 0.005, height * 0.8],
      [r * 0.75, height * 0.92],
      [r * 0.72, height],
      [0, height],
    ],
    MAT.glass,
  );
  g.add(glass);
  const c = CONTENTS[Math.floor(rnd() * CONTENTS.length)];
  const fill = 0.3 + rnd() * 0.5;
  const content = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.004, r - 0.004, height * 0.8 * fill, 20), new THREE.MeshStandardMaterial({ color: c.color, roughness: c.rough }));
  content.position.y = (height * 0.8 * fill) / 2 + 0.006;
  g.add(content);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.74, r * 0.7, 0.03, 16), MAT.cork);
  lid.position.y = height + 0.012;
  g.add(lid);
  // paper label tied with string
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), MAT.paper);
  label.position.set(0, height * 0.45, r + 0.008);
  label.rotation.z = (rnd() - 0.5) * 0.2;
  g.add(label);
  return shadowed(g);
}

export function bottle(seed: number): THREE.Group {
  const rnd = makeRng(seed);
  const colors = [0x2f4a2a, 0x4a2e18, 0x3a4a3a, 0x24301e];
  const h = 0.28 + rnd() * 0.08;
  const r = 0.04 + rnd() * 0.015;
  const g = new THREE.Group();
  const body = lathe(
    [
      [0, 0],
      [r, 0.003],
      [r, h * 0.6],
      [r * 0.4, h * 0.78],
      [r * 0.3, h * 0.95],
      [r * 0.34, h],
      [0, h],
    ],
    new THREE.MeshPhysicalMaterial({ color: colors[Math.floor(rnd() * colors.length)], roughness: 0.15, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 }),
  );
  g.add(body);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.28, 0.025, 10), MAT.cork);
  cork.position.y = h + 0.008;
  g.add(cork);
  return shadowed(g);
}

export function candleBundle(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.26, 10), MAT.wax);
    c.position.set(Math.cos(a) * 0.022, 0.13, Math.sin(a) * 0.022);
    g.add(c);
  }
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.004, 6, 20), MAT.string);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.13;
  g.add(tie);
  g.rotation.z = Math.PI / 2;
  g.position.y = 0.04;
  const holder = new THREE.Group();
  holder.add(g);
  return shadowed(holder);
}

export function spool(color: number): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 12), MAT.paleWood);
  g.add(core);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.055, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  g.add(thread);
  g.position.y = 0.035;
  const holder = new THREE.Group();
  holder.add(g);
  return shadowed(holder);
}

/** A stack of folded cloth. */
export function cloth(colors: number[], stripes?: [number, number]): THREE.Group {
  const g = new THREE.Group();
  let y = 0;
  colors.forEach((c, i) => {
    let mat: THREE.Material = new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
    if (stripes && i === 0) {
      const tex = document.createElement('canvas');
      tex.width = 64;
      tex.height = 8;
      const t = tex.getContext('2d')!;
      for (let k = 0; k < 8; k++) {
        t.fillStyle = k % 2 ? `#${stripes[0].toString(16).padStart(6, '0')}` : `#${stripes[1].toString(16).padStart(6, '0')}`;
        t.fillRect(k * 8, 0, 8, 8);
      }
      const ct = new THREE.CanvasTexture(tex);
      ct.colorSpace = THREE.SRGBColorSpace;
      mat = new THREE.MeshStandardMaterial({ map: ct, roughness: 1 });
    }
    const h = 0.035;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.34 - i * 0.004, h, 0.24), mat);
    m.position.y = y + h / 2;
    m.rotation.y = (i % 2 ? 1 : -1) * 0.03;
    y += h;
    g.add(m);
  });
  return shadowed(g);
}

export function sack(seed: number, open = false): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const r = 0.24 + rnd() * 0.04;
  const h = 0.62 + rnd() * 0.1;
  const profile: [number, number][] = open
    ? [
        [0, 0],
        [r * 0.85, 0.01],
        [r, 0.12],
        [r * 1.02, h * 0.5],
        [r * 0.95, h * 0.85],
        [r * 1.05, h],
        [r * 1.0, h - 0.02],
      ]
    : [
        [0, 0],
        [r * 0.85, 0.01],
        [r, 0.12],
        [r * 1.02, h * 0.5],
        [r * 0.8, h * 0.82],
        [r * 0.25, h * 0.95],
        [r * 0.32, h * 1.08],
        [0, h * 1.1],
      ];
  const body = lathe(profile, MAT.burlap, 18);
  body.scale.set(1, 1, 0.85 + rnd() * 0.1);
  body.material = MAT.burlap;
  (body.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  g.add(body);
  if (open) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 20), MAT.flour);
    f.rotation.x = -Math.PI / 2;
    f.position.y = h * 0.88;
    f.scale.set(1, 0.88, 1);
    g.add(f);
    const scoop = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.paleWood);
    cup.rotation.x = Math.PI;
    scoop.add(cup);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), MAT.paleWood);
    handle.rotation.z = Math.PI / 2;
    handle.position.x = 0.1;
    scoop.add(handle);
    scoop.position.set(0.02, h * 0.9, 0);
    scoop.rotation.z = -0.4;
    g.add(scoop);
  } else {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(r * 0.27, 0.01, 6, 16), MAT.string);
    tie.rotation.x = Math.PI / 2;
    tie.position.y = h * 0.95;
    g.add(tie);
  }
  return shadowed(g);
}

export function barrel(): THREE.Group {
  const g = new THREE.Group();
  const h = 0.85;
  const staves = texSet('staves', [8, 1]);
  const prof: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    prof.push([0.27 + Math.sin(t * Math.PI) * 0.05, t * h]);
  }
  const body = lathe(prof, material(staves, { bump: 2 }), 28);
  g.add(body);
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.27, 28), MAT.darkWood);
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = h - 0.01;
  g.add(lid);
  for (const t of [0.1, 0.32, 0.68, 0.9]) {
    const rr = 0.27 + Math.sin(t * Math.PI) * 0.05 + 0.004;
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.035, 28, 1, true), MAT.iron);
    hoop.position.y = t * h;
    g.add(hoop);
  }
  return shadowed(g);
}

export function crate(w: number, h: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const b = box(w, h, d, MAT.paleWood, 2);
  b.position.y = h / 2;
  g.add(b);
  for (const y of [0.04, h - 0.04]) {
    for (const z of [-1, 1]) {
      const s = box(w + 0.01, 0.05, 0.015, MAT.midWood, 2);
      s.position.set(0, y, (z * d) / 2);
      g.add(s);
    }
  }
  return shadowed(g);
}

export function scale(): THREE.Group {
  const g = new THREE.Group();
  const base = lathe([[0, 0], [0.09, 0], [0.09, 0.015], [0.05, 0.03], [0.015, 0.04], [0, 0.04]], MAT.brass);
  g.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.32, 10), MAT.brass);
  post.position.y = 0.2;
  g.add(post);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.42, 8), MAT.brass);
  beam.rotation.z = Math.PI / 2 + 0.04;
  beam.position.y = 0.36;
  g.add(beam);
  for (const s of [-1, 1]) {
    const x = s * 0.2;
    const y = 0.36 - s * 0.008;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.2, 4), MAT.brass);
      const px = x + Math.cos(a) * 0.045;
      const pz = Math.sin(a) * 0.045;
      chain.position.set((x + px) / 2, y - 0.1, pz / 2);
      chain.lookAt(px, y - 0.2, pz);
      chain.rotateX(Math.PI / 2);
      g.add(chain);
    }
    const pan = lathe([[0, 0], [0.06, 0.01], [0.065, 0.02], [0.064, 0.021]], MAT.brass);
    pan.position.set(x, y - 0.21, 0);
    g.add(pan);
  }
  // weights in a row, one missing
  [0.03, 0.026, 0.022, 0, 0.015, 0.012].forEach((r, i) => {
    if (r === 0) return;
    const w = lathe([[0, 0], [r, 0], [r, r * 1.2], [r * 0.4, r * 1.5], [r * 0.4, r * 1.9], [0, r * 1.9]], MAT.brass, 14);
    w.position.set(-0.12 + i * 0.05, 0, 0.14);
    g.add(w);
  });
  return shadowed(g);
}

/** Teresa's ledger, open on the counter. */
export function ledger(): THREE.Group {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.012, 0.32), new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.7 }));
  cover.position.y = 0.006;
  g.add(cover);
  const left = writing(
    ['Ada Galli — lenticchie, 2 lb', 'Clelia Monti — filo blu, 3', 'Ottavio — chiodi  ✓', 'Martino — candele, 12', 'Nella — sementi di zucca', 'Bruna — sale grosso', '— — —', 'Pietro — ?'],
    { w: 512, h: 720, bg: '#e8dcc0', ink: '#2a2018', font: 'italic 34px Georgia, serif', lineHeight: 82, rotateJitter: 0.03, seed: 4 },
  );
  const right = writing(['14 · 6 · 9', '3 · 0 · 4', '', '2 · 2 · 0', '0 · 8 · 0', '1 · 0 · 6', '', ''], {
    w: 512,
    h: 720,
    bg: '#e9ddc2',
    ink: '#2a2018',
    font: 'italic 36px Georgia, serif',
    lineHeight: 82,
    rotateJitter: 0.03,
    seed: 5,
  });
  for (const [s, tex] of [
    [-1, left],
    [1, right],
  ] as const) {
    const page = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.018, 0.3), [
      MAT.paper,
      MAT.paper,
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
      MAT.paper,
      MAT.paper,
      MAT.paper,
    ]);
    page.position.set(s * 0.11, 0.02, 0);
    page.rotation.z = -s * 0.06;
    g.add(page);
  }
  return shadowed(g);
}

export function inkwell(): THREE.Group {
  const g = new THREE.Group();
  const pot = lathe([[0, 0], [0.03, 0], [0.032, 0.03], [0.015, 0.045], [0.012, 0.05], [0, 0.05]], new THREE.MeshPhysicalMaterial({ color: 0x1a1a22, roughness: 0.1, clearcoat: 1 }));
  g.add(pot);
  const quill = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.26, 6), MAT.wax);
  shaft.position.y = 0.13;
  quill.add(shaft);
  const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.17), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 1, side: THREE.DoubleSide }));
  vane.position.set(0.012, 0.17, 0);
  quill.add(vane);
  quill.position.y = 0.04;
  quill.rotation.z = -0.45;
  g.add(quill);
  return shadowed(g);
}

export function bell(): THREE.Group {
  const g = new THREE.Group();
  const b = lathe([[0, 0.06], [0.015, 0.058], [0.03, 0.035], [0.04, 0.005], [0.042, 0]], MAT.brass);
  (b.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  g.add(b);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), MAT.darkWood);
  knob.position.y = 0.07;
  g.add(knob);
  return shadowed(g);
}

export function sign(text: string): THREE.Group {
  const tex = writing([text], { w: 1024, h: 220, bg: '#a8885e', ink: '#1e1812', font: 'italic 80px Georgia, serif', lineHeight: 140, rotateJitter: 0.02, seed: 9 });
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.025), [MAT.paleWood, MAT.paleWood, MAT.paleWood, MAT.paleWood, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), MAT.paleWood]);
  g.add(board);
  return shadowed(g);
}

/** A bunch of herbs hung upside down to dry: many thin stems, tied at the top, with leaves. */
export function herbs(seed: number): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const greens = [0x5a6a3a, 0x6a7040, 0x7a6a40, 0x4a5a34, 0x6a6a4a];
  const leafMat = new THREE.MeshStandardMaterial({ color: greens[Math.floor(rnd() * greens.length)], roughness: 1, side: THREE.DoubleSide });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x7a7048, roughness: 1 });
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.26, 4), MAT.string);
  string.position.y = -0.13;
  g.add(string);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 4, 10), MAT.string);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = -0.27;
  g.add(tie);
  // Stems and leaves are merged into two meshes per bunch: hundreds of tiny
  // separate objects would cost far more to draw than they are worth.
  const stems: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 22; i++) {
    // stems fan out downwards from the knot
    const a = rnd() * Math.PI * 2;
    const spread = 0.15 + rnd() * 0.35;
    const len = 0.22 + rnd() * 0.12;
    const stemRot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.cos(a) * spread, 0, Math.sin(a) * spread));
    const base = new THREE.Matrix4().makeTranslation(0, -0.27, 0).multiply(stemRot);
    const st = new THREE.CylinderGeometry(0.0015, 0.002, len, 3);
    st.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -len / 2, 0)).applyMatrix4(base);
    stems.push(st);
    for (let k = 0; k < 4; k++) {
      const l = new THREE.PlaneGeometry(0.018, 0.04);
      q.setFromEuler(new THREE.Euler(rnd() * 0.8, rnd() * Math.PI, (rnd() - 0.5) * 1.2));
      m.compose(new THREE.Vector3((rnd() - 0.5) * 0.02, -len * (0.3 + k * 0.18), (rnd() - 0.5) * 0.02), q, new THREE.Vector3(1, 1, 1));
      l.applyMatrix4(m).applyMatrix4(base);
      leaves.push(l);
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(stems), stemMat));
  g.add(new THREE.Mesh(mergeGeometries(leaves), leafMat));
  return shadowed(g);
}

export function stool(): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 20), MAT.midWood);
  seat.position.y = 0.62;
  g.add(seat);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.04, 20), new THREE.MeshStandardMaterial({ color: 0x7a3a2e, roughness: 1 }));
  cushion.position.y = 0.66;
  cushion.scale.y = 0.8;
  g.add(cushion);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.62, 8), MAT.midWood);
    leg.position.set(Math.cos(a) * 0.12, 0.31, Math.sin(a) * 0.12);
    leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    g.add(leg);
  }
  return shadowed(g);
}

export function broom(): THREE.Group {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.3, 8), MAT.paleWood);
  stick.position.y = 0.85;
  g.add(stick);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.38, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 1, side: THREE.DoubleSide }));
  head.position.y = 0.19;
  head.scale.z = 0.4;
  g.add(head);
  g.rotation.z = 0.14;
  return shadowed(g);
}

/** The oil lamp that hangs from the beam. Returns the group and the flame mesh. */
export function oilLamp(): { group: THREE.Group; flame: THREE.Mesh } {
  const g = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 6), MAT.iron);
  chain.position.y = 0.25;
  g.add(chain);
  const body = lathe([[0, 0], [0.07, 0.01], [0.08, 0.04], [0.03, 0.07], [0.02, 0.08], [0, 0.08]], MAT.brass);
  body.position.y = -0.1;
  g.add(body);
  const chimney = lathe([[0.025, 0], [0.04, 0.05], [0.03, 0.14], [0.022, 0.18]], MAT.glass, 16);
  chimney.position.y = -0.03;
  g.add(chimney);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
  flame.scale.y = 2;
  flame.position.y = 0.01;
  g.add(flame);
  return { group: shadowed(g), flame };
}

export function candlestick(): { group: THREE.Group; flame: THREE.Mesh } {
  const g = new THREE.Group();
  const dish = lathe([[0, 0], [0.06, 0], [0.065, 0.012], [0.02, 0.016], [0.015, 0.03], [0, 0.03]], MAT.brass);
  g.add(dish);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.12, 12), MAT.wax);
  c.position.y = 0.09;
  g.add(c);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd890 }));
  flame.scale.y = 2.2;
  flame.position.y = 0.165;
  g.add(flame);
  return { group: shadowed(g), flame };
}

// ------------------------------------------------------------------ everyday clutter

/** A wicker basket, filled with apples or onions. */
export function basket(seed: number, fruit: 'mele' | 'cipolle'): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const wickerTex = document.createElement('canvas');
  wickerTex.width = wickerTex.height = 64;
  const w = wickerTex.getContext('2d')!;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      w.fillStyle = (x + y) % 2 ? '#9a7a48' : '#b8945a';
      w.fillRect(x * 8, y * 8, 8, 8);
    }
  }
  const t = new THREE.CanvasTexture(wickerTex);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  const wicker = new THREE.MeshStandardMaterial({ map: t, roughness: 1, side: THREE.DoubleSide });
  const body = lathe([[0, 0], [0.13, 0.005], [0.17, 0.06], [0.19, 0.14], [0.195, 0.145]], wicker, 20);
  g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.193, 0.012, 6, 28), wicker);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.145;
  g.add(rim);
  const colors = fruit === 'mele' ? [0xa8302a, 0xc04a2a, 0x9a3a24, 0xb8a03a] : [0xc8a070, 0xb88a5a, 0xd8b88a];
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 0.12;
    const s = fruit === 'mele' ? 0.036 + rnd() * 0.008 : 0.032 + rnd() * 0.01;
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 10), new THREE.MeshStandardMaterial({ color: colors[Math.floor(rnd() * colors.length)], roughness: fruit === 'mele' ? 0.45 : 0.8 }));
    m.scale.y = fruit === 'mele' ? 0.9 : 1.1;
    m.position.set(Math.cos(a) * r, 0.11 + rnd() * 0.04 + (i > 8 ? 0.03 : 0), Math.sin(a) * r);
    g.add(m);
  }
  return shadowed(g);
}

/** A braid of garlic or onions hanging from a nail. */
export function braid(seed: number, garlic = true): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: garlic ? 0xe8e0cc : 0xb8844a, roughness: 0.85 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 1 }));
  stem.position.y = -0.3;
  g.add(stem);
  for (let i = 0; i < 12; i++) {
    const s = garlic ? 0.028 : 0.035;
    const b = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), mat);
    b.scale.y = 0.85;
    b.position.set((i % 2 ? 1 : -1) * (0.025 + rnd() * 0.01), -0.08 - i * 0.042, (rnd() - 0.5) * 0.03);
    g.add(b);
  }
  return shadowed(g);
}

/** Wheels of cheese; one has a wedge cut out. */
export function cheeses(): THREE.Group {
  const g = new THREE.Group();
  const rind = new THREE.MeshStandardMaterial({ color: 0xc89a4a, roughness: 0.7 });
  const paste = new THREE.MeshStandardMaterial({ color: 0xf0dca0, roughness: 0.9 });
  const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 28), rind);
  w1.position.y = 0.045;
  g.add(w1);
  const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 28), rind);
  w2.position.set(0.02, 0.13, 0.01);
  g.add(w2);
  // a cut wheel: most of a cylinder plus the two pale cut faces
  const cut = new THREE.Group();
  const part = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24, 1, false, 0.6, Math.PI * 2 - 0.6), [rind, paste, paste]);
  cut.add(part);
  for (const a of [0.6, 0]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), paste);
    face.position.set(Math.sin(a) * 0.06, 0, Math.cos(a) * 0.06);
    face.rotation.y = a - Math.PI / 2;
    cut.add(face);
  }
  cut.position.set(0.34, 0.04, 0);
  g.add(cut);
  return shadowed(g);
}

/** Paper packets tied with string (salt, sugar, seeds). */
export function packets(seed: number, n = 4): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const papers = [0xe4d8b8, 0xd8c8a0, 0xc8b890, 0xeee4cc];
  for (let i = 0; i < n; i++) {
    const w = 0.08 + rnd() * 0.04;
    const h = 0.11 + rnd() * 0.05;
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), new THREE.MeshStandardMaterial({ color: papers[Math.floor(rnd() * papers.length)], roughness: 0.95 }));
    p.position.set(i * 0.11, h / 2, (rnd() - 0.5) * 0.03);
    p.rotation.y = (rnd() - 0.5) * 0.25;
    g.add(p);
    const s = new THREE.Mesh(new THREE.TorusGeometry(Math.max(w, 0.06) * 0.6, 0.002, 4, 16), MAT.string);
    s.position.copy(p.position);
    s.rotation.copy(p.rotation);
    s.scale.set(1, 1.6, 1);
    g.add(s);
  }
  return shadowed(g);
}

/** A wooden ladder, leaning against the shelves. */
export function ladder(height: number): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.2, 0.2]) {
    const rail = box(0.05, height, 0.04, MAT.paleWood, 2);
    rail.position.set(x, height / 2, 0);
    g.add(rail);
  }
  for (let y = 0.3; y < height - 0.1; y += 0.32) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 8), MAT.paleWood);
    rung.rotation.z = Math.PI / 2;
    rung.position.y = y;
    g.add(rung);
  }
  return shadowed(g);
}

/** A worn rag rug in front of the counter. */
export function rug(w: number, d: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const x = c.getContext('2d')!;
  const rnd = makeRng(21);
  const cols = ['#6a4232', '#4a4e58', '#8a7a5a', '#5a5640', '#7a5a42', '#5e4440', '#8a8270'];
  for (let y = 0; y < 256; y += 6) {
    x.fillStyle = cols[Math.floor(rnd() * cols.length)];
    x.fillRect(0, y, 512, 6);
  }
  // wear: the middle has faded under twenty years of feet
  const grd = x.createRadialGradient(256, 128, 20, 256, 128, 260);
  grd.addColorStop(0, 'rgba(200,180,150,0.35)');
  grd.addColorStop(1, 'rgba(200,180,150,0)');
  x.fillStyle = grd;
  x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4000; i++) {
    x.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`;
    x.fillRect(rnd() * 512, rnd() * 256, 2, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.006;
  m.receiveShadow = true;
  return m;
}
