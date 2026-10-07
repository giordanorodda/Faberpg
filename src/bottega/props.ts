import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { burlap, material, wood, writing } from './textures';

/**
 * Builders for the objects in the shop. Everything is made of simple
 * primitives and lathed profiles: modest geometry, with the care put into
 * proportions, materials and light (§24).
 */

export const MAT = {
  darkWood: material(wood(31, [92, 62, 38]), { bump: 1 }),
  midWood: material(wood(32, [128, 88, 52]), { bump: 1 }),
  paleWood: material(wood(33, [170, 130, 86]), { bump: 1 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 1, roughness: 0.32 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2c2a28, metalness: 0.85, roughness: 0.6 }),
  burlap: material(burlap(41), { bump: 2 }),
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

/** A box whose UVs follow its real size, so textures keep the same scale everywhere. */
export function box(w: number, h: number, d: number, mat: THREE.Material, texelsPerMeter = 1): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // faces: +x, -x, +y, -y, +z, -z (4 vertices each)
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] * texelsPerMeter, uv.getY(k) * dims[f][1] * texelsPerMeter);
    }
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
  const staves = wood(51, [120, 82, 48]);
  staves.map.repeat.set(8, 1);
  staves.bumpMap.repeat.set(8, 1);
  staves.roughnessMap.repeat.set(8, 1);
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

export function herbs(seed: number): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const greens = [0x5a6a3a, 0x6a7040, 0x7a6a40, 0x4a5a34];
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 4), MAT.string);
  string.position.y = -0.15;
  g.add(string);
  const bunch = new THREE.Mesh(new THREE.ConeGeometry(0.06 + rnd() * 0.03, 0.28, 7), new THREE.MeshStandardMaterial({ color: greens[Math.floor(rnd() * greens.length)], roughness: 1, flatShading: true }));
  bunch.position.y = -0.42;
  g.add(bunch);
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
