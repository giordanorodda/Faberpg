import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng } from '../core/rng';
import { barrelCollider, floorCollider, settle, wallCollider } from './softbody';
import { clothTex, landscapeTex, plasterTex, tableclothTex, toon, wallTex, woodTex } from './paint';

/**
 * Style sketch: one corner of the shop in a "natural cartoon" look
 * (Ghibli, Breath of the Wild). A barrel, two sacks, a shelf with bottles,
 * garlic hanging from a real nail, a window with herbs and the sun coming in.
 */

const canvas = document.getElementById('view') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; // soft-edged shadows
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2420);
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(1.15, 1.45, 1.35);
const controls = new OrbitControls(camera, canvas);
controls.target.set(-0.75, 0.95, -0.85);
controls.enableDamping = true;
controls.update();

const shadowed = <T extends THREE.Object3D>(o: T): T => {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
};
const lathe = (profile: [number, number][], mat: THREE.Material, seg = 48) =>
  new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
const rbox = (w: number, h: number, d: number, mat: THREE.Material, r = 0.02) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);

/**
 * Nothing made by hand is perfectly round or straight: pushes every vertex
 * a little in or out along its normal, with a smooth pattern unique to the
 * object, scaled to its size. A few percent is enough to stop it looking
 * like it came out of a mould.
 */
function organic<T extends THREE.Object3D>(obj: T, amount = 0.025, seed = 1): T {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry = m.geometry.clone();
    m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere!.radius || 0.1;
    const f = 2.4 / r;
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    const nor = m.geometry.attributes.normal as THREE.BufferAttribute;
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
function bentBox(w: number, h: number, d: number, mat: THREE.Material, sag: number, twist: number): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, h, d, Math.round(w * 20), 2, 2);
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

// ------------------------------------------------------------------ materials

const M = {
  floor: toon({ map: woodTex(1, '#b9875a', '#7a4f30', { planks: 5, knots: 3 }), rim: 0.1 }),
  plaster: toon({ map: plasterTex(2), rim: 0.05 }),
  beam: toon({ map: woodTex(3, '#6e4630', '#3e2618', { knots: 2 }), rim: 0.15 }),
  woodH: toon({ map: rotated(woodTex(9, '#a8744a', '#6a4426', { knots: 1 })), rim: 0.25 }),
  beamH: toon({ map: rotated(woodTex(10, '#6e4630', '#3e2618', { knots: 2 })), rim: 0.15 }),
  wood: toon({ map: woodTex(4, '#a8744a', '#6a4426', { knots: 1 }), rim: 0.25 }),
  staves: toon({ map: woodTex(5, '#b07a4c', '#6a4224', { planks: 14, knots: 4 }), rim: 0.3 }),
  iron: toon({ color: 0x4a4650, rim: 0.5 }),
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
  stone: toon({ color: 0xc8bca8, rim: 0.15 }),
};
function rotated(t: THREE.Texture): THREE.Texture {
  t.center.set(0.5, 0.5);
  t.rotation = Math.PI / 2;
  return t;
}
const glass = (color: number) => toon({ color, transparent: true, opacity: 0.55, rim: 0.9 });
const liquid = (color: number) => toon({ color, transparent: true, opacity: 0.85, rim: 0.4, emissive: color, emissiveIntensity: 0.15 });

// ------------------------------------------------------------------ the corner

/** Things that move a little: a breeze from the window, passing clouds. */
const living: { plant?: THREE.Object3D; braid?: THREE.Object3D; herbs?: THREE.Object3D } = {};
const room = new THREE.Group();
scene.add(room);
const H = 2.6;
const S = 3.2;
// The floor: separate boards of different widths and tones, a few of them
// lifted or sunk by a couple of millimetres, dark gaps between them.
{
  const under = new THREE.Mesh(new THREE.PlaneGeometry(S, S), toon({ color: 0x3a2618, rim: 0 }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.006;
  room.add(under);
  const rnd = makeRng(71);
  let x = -S / 2;
  let k = 0;
  while (x < S / 2) {
    const w = Math.min(S / 2 - x, 0.22 + rnd() * 0.16);
    const tone = new THREE.Color(0xffffff).multiplyScalar(0.86 + rnd() * 0.22);
    tone.r *= 1 + (rnd() - 0.5) * 0.06;
    const tex = woodTex(80 + k, '#b9875a', '#7a4f30', { knots: 1 + Math.floor(rnd() * 3) });
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2; // grain along the board
    tex.repeat.set(S / 1.4, w / 0.5);
    const mat = toon({ map: tex, color: tone.getHex(), rim: 0.1 });
    const plank = bentBox(S, 0.03, w - 0.008, mat, (rnd() - 0.5) * 0.004, (rnd() - 0.5) * 0.01);
    plank.rotation.y = Math.PI / 2;
    plank.rotation.x = (rnd() - 0.5) * 0.004;
    plank.position.set(x + w / 2, -0.015 + (rnd() - 0.5) * 0.004, 0);
    plank.receiveShadow = true;
    room.add(plank);
    x += w;
    k++;
  }
}

// back wall
const back = rbox(S, H, 0.25, M.plaster, 0.01);
back.position.set(0, H / 2, -S / 2 - 0.12);
room.add(shadowed(back));
// left wall, with a window opening (z from -0.55 to 0.35, y from 1.0 to 1.85)
const win = { z0: -0.55, z1: 0.35, y0: 1.0, y1: 1.85 };
const leftPieces: [number, number, number, number][] = [
  [-S / 2, win.z0, 0, H],
  [win.z1, S / 2, 0, H],
  [win.z0, win.z1, 0, win.y0],
  [win.z0, win.z1, win.y1, H],
];
for (const [z0, z1, y0, y1] of leftPieces) {
  const p = rbox(0.3, y1 - y0, z1 - z0, M.plaster, 0.005);
  p.position.set(-S / 2 - 0.15, (y0 + y1) / 2, (z0 + z1) / 2);
  room.add(shadowed(p));
}
// Plaster skins on the inner faces: hand-laid, so never quite flat, and
// painted once for the whole wall (frieze, damp, bare patches, marks).
function wallSkin(w: number, h: number, tex: THREE.Texture, seed: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, h, Math.round(w * 30), Math.round(h * 30));
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const bump = 0.004 * Math.sin(x * 2.1 + seed) * Math.sin(y * 1.9 + seed * 2) + 0.0015 * Math.sin(x * 6.3 + y * 4.1 + seed);
    p.setZ(i, bump);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, toon({ map: tex, rim: 0.05 }));
  (m.material as THREE.MeshToonMaterial).alphaTest = 0.5;
  m.receiveShadow = true;
  return m;
}
const backSkin = wallSkin(S, H, wallTex(61, { w: S, h: H, frieze: 2.38, patches: [{ x: 2.75, y: 0.75, r: 0.16 }], tally: { x: 1.55, y: 1.62 } }), 1);
backSkin.position.set(0, H / 2, -S / 2 + 0.012);
room.add(backSkin);
// left wall: u runs from z = +S/2 (u = 0) to z = -S/2 (u = 1)
const toU = (z: number) => S / 2 - z;
const leftSkin = wallSkin(
  S,
  H,
  wallTex(62, {
    w: S,
    h: H,
    frieze: 2.38,
    holes: [{ x0: toU(win.z1), x1: toU(win.z0), y0: win.y0, y1: win.y1 }],
    patches: [{ x: 0.55, y: 0.5, r: 0.13 }],
    cracksFrom: [{ x: toU(win.z1), y: win.y1 }, { x: toU(win.z0), y: win.y0 }],
  }),
  2,
);
leftSkin.rotation.y = Math.PI / 2;
leftSkin.position.set(-S / 2 + 0.012, H / 2, 0);
room.add(leftSkin);

// ceiling, so the sun only comes through the window
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(S + 1, S + 1), M.beam);
ceil.rotation.x = Math.PI / 2;
ceil.position.y = H;
ceil.receiveShadow = true;
room.add(ceil);

// beams: one along the back wall (for the nail), corner post
const beam = bentBox(S, 0.2, 0.18, M.beamH, 0.012, 0.03); // an old beam is never quite straight
beam.position.set(0, 2.15, -S / 2 + 0.09);
room.add(shadowed(beam));
const post = rbox(0.2, H, 0.2, M.beam, 0.03);
post.position.set(-S / 2 + 0.1, H / 2, -S / 2 + 0.1);
room.add(shadowed(post));
const skirting = rbox(S, 0.12, 0.04, M.beamH, 0.01);
skirting.position.set(0, 0.06, -S / 2 + 0.02);
room.add(shadowed(skirting));

// window: chunky frame, open shutters, deep sill
const winFrame = new THREE.Group();
const fz = (win.z0 + win.z1) / 2;
const fy = (win.y0 + win.y1) / 2;
for (const [w, h, dz, dy] of [
  [win.z1 - win.z0 + 0.12, 0.08, 0, (win.y1 - win.y0) / 2],
  [win.z1 - win.z0 + 0.12, 0.08, 0, -(win.y1 - win.y0) / 2],
  [0.08, win.y1 - win.y0, (win.z1 - win.z0) / 2, 0],
  [0.08, win.y1 - win.y0, -(win.z1 - win.z0) / 2, 0],
  [0.05, win.y1 - win.y0, 0, 0],
] as const) {
  const b = rbox(0.1, h, w, M.wood, 0.015);
  b.position.set(-S / 2 - 0.02, fy + dy, fz + dz);
  winFrame.add(b);
}
const sill = rbox(0.42, 0.06, win.z1 - win.z0 + 0.2, M.stone, 0.02);
sill.position.set(-S / 2 + 0.02, win.y0 - 0.03, fz);
winFrame.add(sill);
for (const s of [-1, 1]) {
  const shutter = rbox(0.04, win.y1 - win.y0, (win.z1 - win.z0) / 2, M.wood, 0.01);
  const hinge = new THREE.Group();
  hinge.position.set(-S / 2 - 0.32, fy, s > 0 ? win.z1 : win.z0);
  shutter.position.z = (s * (win.z1 - win.z0)) / 4;
  hinge.add(shutter);
  hinge.rotation.y = s * -1.9;
  winFrame.add(hinge);
}
winFrame.rotation.x = 0.012; // the window sits slightly out of square
room.add(shadowed(winFrame));
// the landscape outside
const outside = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: landscapeTex() }));
outside.position.set(-S / 2 - 5, 1.6, fz);
outside.rotation.y = Math.PI / 2;
scene.add(outside);

// a terracotta pot of herbs on the sill
{
  const pot = new THREE.Group();
  pot.add(lathe([[0, 0], [0.07, 0], [0.09, 0.12], [0.1, 0.13], [0.1, 0.15], [0.085, 0.15]], M.clay));
  const leaves: THREE.BufferGeometry[] = [];
  const dark: THREE.BufferGeometry[] = [];
  const rnd = makeRng(8);
  for (let i = 0; i < 40; i++) {
    const g = new THREE.SphereGeometry(0.035, 8, 6);
    g.scale(0.5, 1, 0.18);
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 0.07;
    g.rotateZ((rnd() - 0.5) * 1.2);
    g.rotateY(a);
    g.translate(Math.cos(a) * r, 0.17 + rnd() * 0.13, Math.sin(a) * r);
    (i % 3 ? leaves : dark).push(g);
  }
  pot.add(new THREE.Mesh(mergeGeometries(leaves), M.leaf));
  pot.add(new THREE.Mesh(mergeGeometries(dark), M.leafDark));
  pot.position.set(-S / 2 + 0.05, win.y0, fz + 0.12);
  pot.rotation.y = 0.4;
  organic(pot, 0.02, 9);
  room.add(shadowed(pot));
  living.plant = pot;
}

// ------------------------------------------------------------------ the barrel

function barrel(): THREE.Group {
  const g = new THREE.Group();
  const h = 0.92;
  const prof: [number, number][] = [];
  const R = (t: number) => 0.3 + Math.sin(t * Math.PI) * 0.06;
  for (let i = 0; i <= 16; i++) prof.push([R(i / 16), (i / 16) * h]);
  g.add(lathe(prof, M.staves, 56));
  const lid = new THREE.Mesh(new THREE.CircleGeometry(R(1) - 0.012, 48), M.wood);
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = h - 0.03;
  g.add(lid);
  // hoops: rounded bands that sit proud of the staves
  for (const t of [0.07, 0.3, 0.7, 0.93]) {
    const r = R(t) + 0.004;
    const hoop = lathe([[r, -0.022], [r + 0.012, -0.016], [r + 0.014, 0], [r + 0.012, 0.016], [r, 0.022]], M.iron, 56);
    hoop.position.y = t * h;
    if (t < 0.9) hoop.rotation.set(Math.sin(t * 17) * 0.02, 0, Math.cos(t * 13) * 0.02);
    g.add(hoop);
  }
  // a bung and a little spill stain under it, small stories
  const bung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16), M.cork);
  bung.rotation.z = Math.PI / 2;
  bung.position.set(R(0.5) + 0.008, h * 0.5, 0);
  g.add(bung);
  return shadowed(g);
}
const bar = barrel();
bar.position.set(-0.95, 0, -1.0);
bar.rotation.set(0.014, -0.4, -0.01);
organic(bar, 0.012, 3);
room.add(bar);

// ------------------------------------------------------------------ sacks

/**
 * A grain sack: wide flat-ish bottom, a full belly that sags, a neck
 * gathered by a rope, and the cloth above it flaring open in soft folds.
 */
function sack(seed: number, mat: THREE.Material, slump: number, untied = false): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const prof: [number, number][] = [
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
    // folds: deep pleats where the cloth is gathered, soft ones on the belly
    const nearNeck = Math.exp(-Math.pow((y - 0.56) / 0.07, 2));
    const top = y > 0.585 ? (y - 0.585) / 0.11 : 0;
    const pleat = 1 + nearNeck * 0.14 * Math.cos(a * 9 + seed) + top * 0.22 * Math.sin(a * 6 + seed * 2) + 0.025 * Math.sin(a * 3 + y * 8 + seed);
    x *= pleat;
    z *= pleat * 0.82; // a sack is flatter front to back
    // the belly sags and the whole sack leans
    const sag = y < 0.3 ? 1 + 0.06 * (0.3 - y) * 3 : 1;
    x = x * sag + slump * Math.pow(y / 0.7, 2) * 0.16;
    z *= sag;
    if (y > 0.585) y += 0.03 * Math.sin(a * 4 + seed) * top; // the open top flops unevenly
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, mat);
  g.add(body);
  if (untied) return shadowed(g);
  // the rope: a few turns around the neck, and a dangling end with a knot
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
  // a patch sewn on, because this sack has been mended
  if (seed % 2 === 1) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.09), toon({ color: 0x9a7a52, rim: 0.2, side: THREE.DoubleSide }));
    patch.position.set(0.05, 0.22, 0.27 * 0.82 * 1.05);
    patch.rotation.z = 0.15;
    g.add(patch);
  }
  return shadowed(g);
}
const s1 = sack(11, M.sack, 0.2);
s1.position.set(-0.3, 0, -1.15);
s1.rotation.y = 0.5;
room.add(s1);
const s2 = sack(12, M.sack2, -0.6);
s2.position.set(-0.35, 0, -0.55);
s2.rotation.y = 2.4;
s2.scale.setScalar(0.85);
room.add(s2);

// ------------------------------------------------------------------ shelf with bottles

const shelf = new THREE.Group();
const board = bentBox(1.2, 0.05, 0.28, M.woodH, 0.005, 0.0); // bowed a little under the weight
shelf.add(board);
for (const x of [-0.45, 0.45]) {
  // a curled wrought-iron bracket
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.02, -0.12),
    new THREE.Vector3(0, -0.2, -0.13),
    new THREE.Vector3(0, -0.14, 0.02),
    new THREE.Vector3(0, -0.04, 0.1),
  ]);
  const br = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.012, 8), M.iron);
  br.position.x = x;
  shelf.add(br);
}
shelf.position.set(0.25, 1.35, -S / 2 + 0.15);
room.add(shadowed(shelf));

function bottle(profile: [number, number][], g: THREE.Material, liq: THREE.Material | null, fill: number): THREE.Group {
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
const shelfTop = 1.35 + 0.025;
const bottles: [THREE.Group, number][] = [
  [bottle([[0, 0], [0.045, 0.002], [0.045, 0.16], [0.02, 0.22], [0.016, 0.27], [0, 0.27]], glass(0x4a8a5a), liquid(0x3a6a3a), 0.7), -0.22],
  [bottle([[0, 0], [0.06, 0.002], [0.07, 0.06], [0.05, 0.12], [0.02, 0.15], [0.018, 0.19], [0, 0.19]], glass(0x8a5a3a), liquid(0xb0602a), 0.5), -0.05],
  [bottle([[0, 0], [0.035, 0.002], [0.035, 0.2], [0.014, 0.26], [0.012, 0.31], [0, 0.31]], glass(0x5a7aa0), null, 0), 0.08],
];
// Nothing on a used shelf stands in a row: small groups, some in front and
// some behind, uneven gaps, an empty stretch where something was taken.
const shelfSpots: [number, number][] = [
  [-0.16, -1.53], // tall green bottle, at the back
  [0.27, -1.42], // amber flask, in front...
  [0.36, -1.54], // ...of the clear bottle, half hidden behind it
];
bottles.forEach(([b], i) => {
  organic(b, 0.015, 10 + i);
  b.position.set(shelfSpots[i][0], shelfTop, shelfSpots[i][1]);
  b.rotation.y = i * 1.3;
  room.add(b);
});
// a jar with a cloth cap tied with string, and a glazed jug
{
  const jar = new THREE.Group();
  const jg = lathe([[0, 0], [0.06, 0.002], [0.065, 0.1], [0.055, 0.13], [0.055, 0.14], [0, 0.14]], glass(0xd8e8d0), 40);
  jg.castShadow = false;
  jar.add(jg);
  const honey = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.06, 0.09, 32), liquid(0xe0a030));
  honey.position.y = 0.05;
  jar.add(honey);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), toon({ color: 0xc84a3a, rim: 0.3 }));
  cap.position.y = 0.12;
  cap.scale.y = 0.45;
  jar.add(cap);
  const str = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.004, 6, 24), M.rope);
  str.rotation.x = Math.PI / 2;
  str.position.y = 0.128;
  jar.add(str);
  organic(jar, 0.02, 5);
  jar.position.set(0.53, shelfTop + 0.075, -1.47); // sits on the folded cloths
  jar.rotation.y = 0.7;
  room.add(shadowed(jar));
  const jug = new THREE.Group();
  jug.add(lathe([[0, 0], [0.07, 0.003], [0.09, 0.07], [0.085, 0.13], [0.05, 0.19], [0.055, 0.22], [0.05, 0.225]], M.ceramic, 40));
  const band = lathe([[0.091, 0.075], [0.092, 0.09], [0.089, 0.1]], M.ceramicBlue, 40);
  jug.add(band);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 20, Math.PI), M.ceramic);
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.085, 0.13, 0);
  jug.add(handle);
  organic(jug, 0.03, 6);
  jug.position.set(0.79, shelfTop, -1.42); // pushed almost to the edge
  jug.rotation.y = 2.1;
  room.add(shadowed(jug));
}

// ------------------------------------------------------------------ garlic on a nail

{
  const nailX = -0.55;
  const nailY = 2.1;
  const nailZ = -S / 2 + 0.18;
  const nail = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), M.iron);
  shaft.rotation.x = Math.PI / 2;
  nail.add(shaft);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 12), M.iron);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.025;
  nail.add(head);
  nail.position.set(nailX, nailY, nailZ + 0.01);
  room.add(shadowed(nail));
  // the string loop over the nail
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 20), M.rope);
  loop.position.set(nailX, nailY - 0.025, nailZ + 0.015);
  room.add(loop);
  // A braid: two strands of dried stems twisted together, and the heads of
  // garlic hanging from it, cloves showing, roots like a little brush.
  const braid = new THREE.Group();
  for (const ph of [0, Math.PI]) {
    const c = new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.9 + ph) * 0.018, -i * 0.045, Math.cos(i * 0.9 + ph) * 0.012)));
    braid.add(new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.012, 8), M.stem));
  }
  const bulbProfile: [number, number][] = [[0, 0], [0.025, 0.004], [0.045, 0.02], [0.048, 0.04], [0.038, 0.06], [0.018, 0.075], [0.008, 0.088], [0, 0.092]];
  const bulbGeo = new THREE.LatheGeometry(bulbProfile.map(([r, y]) => new THREE.Vector2(r, y)), 48);
  {
    // cloves: gentle lobes around the head
    const bp = bulbGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i);
      const z = bp.getZ(i);
      const y = bp.getY(i);
      const a = Math.atan2(z, x);
      const k = 1 + 0.07 * Math.cos(a * 8) * Math.sin(Math.min(1, y / 0.08) * Math.PI);
      bp.setXYZ(i, x * k, y, z * k);
    }
    bulbGeo.computeVertexNormals();
  }
  const rnd = makeRng(21);
  for (let i = 0; i < 8; i++) {
    if (i === 5) continue; // this one fell (it is on the floor, by the barrel)
    const head = new THREE.Group();
    const bulb = new THREE.Mesh(bulbGeo, M.garlic);
    head.add(bulb);
    // faint purple streaks along the cloves
    for (let k = 0; k < 4; k++) {
      const st = new THREE.Mesh(new THREE.LatheGeometry(bulbProfile.slice(1, -1).map(([r, y]) => new THREE.Vector2(r * 1.06, y)), 3, k * 1.6 + i, 0.12), M.garlicStreak);
      head.add(st);
    }
    // roots: a little dry brush at the bottom
    const roots = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.004, 0.018, 10), M.stem);
    roots.position.y = -0.008;
    head.add(roots);
    // the neck of dried stem that goes up into the braid
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.05, 8), M.stem);
    neck.position.y = 0.11;
    head.add(neck);
    // heads hang down and outwards, alternating sides, lower ones a bit bigger
    const side = i % 2 ? 1 : -1;
    const s2 = 0.85 + i * 0.04 + rnd() * 0.08;
    head.scale.setScalar(s2);
    head.rotation.z = side * (0.5 + rnd() * 0.25);
    head.rotation.y = rnd() * Math.PI * 2;
    head.position.set(side * 0.05, -0.12 - i * 0.055, (rnd() - 0.5) * 0.04);
    braid.add(head);
  }
  braid.position.set(nailX, nailY - 0.05, nailZ + 0.03);
  room.add(shadowed(braid));
  living.braid = braid;
}


// ------------------------------------------------------------------ life and disorder

/** A checked cloth, the warm kind that ends up on every barrel. */
function checkTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#efe4cc';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(178,52,40,0.55)';
  for (let i = 0; i < 8; i++) {
    g.fillRect(i * 32, 0, 16, 256);
    g.fillRect(0, i * 32, 256, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}
const MC = {
  cloth: toon({ map: checkTex(), rim: 0.25, side: THREE.DoubleSide }),
  apple: toon({ color: 0xc8402e, rim: 0.45 }),
  appleGreen: toon({ color: 0xa8b84a, rim: 0.45 }),
  grain: toon({ color: 0xe0c070, rim: 0.2 }),
  straw: toon({ color: 0xe2c47a, rim: 0.2 }),
  cup: toon({ color: 0x8a5a3e, rim: 0.3 }),
  wax: toon({ color: 0xf2e6c8, rim: 0.3 }),
};
const barrelTop = new THREE.Vector3(-0.95, 0.92, -1.0);

// The tablecloth: a square of checked cotton dropped onto the barrel and
// left to fall. The folds are not drawn: they come from the cloth settling.
const barrelRadius = (y: number) => 0.3 + Math.sin(Math.max(0, Math.min(1, y / 0.92)) * Math.PI) * 0.06;
{
  const geo = new THREE.PlaneGeometry(0.98, 0.98, 64, 64);
  geo.rotateX(-Math.PI / 2);
  const cloth = new THREE.Mesh(geo, toon({ map: tableclothTex(), rim: 0.2, side: THREE.DoubleSide }));
  cloth.position.set(barrelTop.x + 0.06, barrelTop.y + 0.06, barrelTop.z + 0.03);
  cloth.rotation.set(0.04, 0.5, -0.03); // thrown, not laid: a little askew
  settle(cloth, {
    colliders: [barrelCollider(new THREE.Vector3(-0.95, 0, -1.0), 0.92, barrelRadius, 0.05), floorCollider(), wallCollider('z', -S / 2 + 0.02)],
    bend: 0.06,
    steps: 420,
  });
  room.add(shadowed(cloth));
}

// a wooden bowl on the barrel with apples, and one that rolled away
function apple(green = false): THREE.Mesh {
  const g = new THREE.SphereGeometry(0.038, 24, 16);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 1 - 0.18 * Math.pow(Math.abs(y) / 0.038, 6); // dimples at the top and bottom
    p.setXYZ(i, p.getX(i) * k, y * 0.9, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, green ? MC.appleGreen : MC.apple);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.02, 5), M.stem);
  stalk.position.y = 0.036;
  stalk.rotation.z = 0.3;
  m.add(stalk);
  return m;
}
{
  const bowl = lathe([[0, 0], [0.06, 0.002], [0.11, 0.03], [0.13, 0.06], [0.125, 0.065], [0.105, 0.035], [0.05, 0.012], [0, 0.012]], M.wood, 40);
  organic(bowl, 0.04, 7);
  bowl.position.copy(barrelTop).add(new THREE.Vector3(-0.06, 0.018, 0.04));
  bowl.rotation.set(0.03, 0.8, -0.02);
  room.add(shadowed(bowl));
  const spots: [number, number, number, boolean][] = [[-0.03, 0.05, 0.0, false], [0.03, 0.05, 0.03, true], [0.0, 0.05, -0.04, false], [0.01, 0.09, 0.0, false]];
  for (const [x, y, z, gr] of spots) {
    const a = apple(gr);
    a.scale.setScalar(0.85 + ((x * 100 + z * 37) % 1 + 1) % 1 * 0.3);
    a.position.copy(bowl.position).add(new THREE.Vector3(x, y, z));
    a.rotation.set(x * 20, z * 30, y * 10);
    room.add(shadowed(a));
  }
  const runaway = apple();
  runaway.position.set(0.15, 0.034, -0.2);
  runaway.rotation.set(1.2, 0, 0.6);
  room.add(shadowed(runaway));
}

// the sack that tipped over, grain spilled across the boards, the scoop left in it
{
  // Untied and knocked over: a bag three-quarters full of grain, left to
  // slump on the boards under its own weight, mouth open and flattened.
  const fallen = sack(13, M.sack2, 0.1, true);
  fallen.rotation.set(0.08, 2.36, Math.PI / 2 - 0.2); // mouth towards the room
  fallen.position.set(0.35, 0.3, -0.95);
  fallen.scale.setScalar(0.8);
  room.add(fallen);
  const body = fallen.children[0] as THREE.Mesh;
  const rimIdx: number[] = [];
  const bp = body.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) if (bp.getY(i) > 0.66) rimIdx.push(i);
  settle(body, {
    colliders: [floorCollider(), wallCollider('z', -S / 2 + 0.03), wallCollider('x', -S / 2 + 0.03)],
    volume: 0.6,
    bend: 0.15,
    steps: 420,
    friction: 0.8,
  });
  // Where the grain went: out of the mouth of the sack, in a fan that
  // thins out, piled in a few lumpy heaps near the sack, with stray grains
  // further away. No circles, no ellipses.
  fallen.updateMatrixWorld(true);
  const mouth = new THREE.Vector3();
  for (const i of rimIdx) mouth.add(body.localToWorld(new THREE.Vector3().fromBufferAttribute(bp, i)));
  mouth.divideScalar(Math.max(1, rimIdx.length));
  const base = body.localToWorld(new THREE.Vector3(0, 0.2, 0));
  const flow = new THREE.Vector2(mouth.x - base.x, mouth.z - base.z).normalize();
  const side = new THREE.Vector2(-flow.y, flow.x);
  const rnd = makeRng(31);
  const at = (along: number, across: number) => new THREE.Vector2(mouth.x + flow.x * along + side.x * across, mouth.z + flow.y * along + side.y * across);
  // heaps: lumpy, flattened, overlapping
  const heaps: { c: THREE.Vector2; r: number; h: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const along = 0.02 + i * 0.07 + rnd() * 0.05;
    heaps.push({ c: at(along, (rnd() - 0.5) * 0.12 * (1 + i * 0.4)), r: 0.11 - i * 0.015 + rnd() * 0.03, h: 0.05 - i * 0.008 });
  }
  const heapHeight = (x: number, z: number) => {
    let hgt = 0;
    for (const hp of heaps) {
      const d = Math.hypot(x - hp.c.x, z - hp.c.y) / hp.r;
      if (d < 1) hgt = Math.max(hgt, hp.h * (1 - d * d) * (0.85 + 0.15 * Math.sin(x * 60) * Math.sin(z * 53)));
    }
    return hgt;
  };
  for (const hp of heaps) {
    const g = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const ang = Math.atan2(z, x);
      const rr = 1 + 0.22 * Math.sin(ang * 3 + hp.c.x * 40) + 0.12 * Math.sin(ang * 7 + hp.c.y * 30); // ragged outline
      p.setXYZ(i, x * hp.r * rr, p.getY(i) * hp.h, z * hp.r * rr * 0.85);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, MC.grain);
    m.position.set(hp.c.x, -0.004, hp.c.y);
    m.rotation.y = rnd() * Math.PI;
    room.add(shadowed(m));
  }
  // grains: dense near the mouth, a fan that widens and thins, some strays
  const N = 1100;
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 6, 4), MC.grain, N);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) {
    const stray = rnd() < 0.08;
    const along = stray ? 0.1 + rnd() * 0.75 : Math.pow(rnd(), 1.6) * 0.55;
    const width = 0.04 + along * 0.55;
    // grains bunch into little drifts across the fan
    const across = (rnd() - 0.5) * width * (stray ? 2.2 : 1) + Math.sin(along * 25) * 0.025;
    const pt = at(along, across);
    const y = heapHeight(pt.x, pt.y) + 0.004;
    q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
    const sz = 0.8 + rnd() * 0.5;
    m4.compose(new THREE.Vector3(pt.x, y, pt.y), q, new THREE.Vector3(1.4 * sz, 0.75 * sz, 0.9 * sz));
    grains.setMatrixAt(i, m4);
  }
  grains.castShadow = false;
  grains.receiveShadow = true;
  room.add(grains);
  const scoop = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.wood);
  cup.rotation.x = Math.PI;
  cup.scale.y = 0.7;
  scoop.add(cup);
  const handle = rbox(0.16, 0.022, 0.03, M.woodH, 0.01);
  handle.position.set(0.12, 0.01, 0);
  scoop.add(handle);
  // the scoop lies half buried in the first heap
  const sp = heaps[1].c;
  scoop.position.set(sp.x, 0.035, sp.y);
  scoop.rotation.set(0.25, 2.1, 0.18);
  organic(scoop, 0.03, 12);
  room.add(shadowed(scoop));
}

// the garlic that fell from the braid
{
  const fallenHead = new THREE.Group();
  const prof: [number, number][] = [[0, 0], [0.025, 0.004], [0.045, 0.02], [0.048, 0.04], [0.038, 0.06], [0.018, 0.075], [0.008, 0.088], [0, 0.092]];
  fallenHead.add(lathe(prof, M.garlic, 40));
  fallenHead.position.set(-0.55, 0.045, -0.55);
  fallenHead.rotation.set(0, 0, 1.4);
  room.add(shadowed(fallenHead));
}

// on the shelf: a bottle laid down, a cup, a bundle of candles leaning on the jug
{
  const lying = bottle([[0, 0], [0.04, 0.002], [0.04, 0.14], [0.018, 0.19], [0.014, 0.23], [0, 0.23]], glass(0x6a8a4a), null, 0);
  lying.rotation.z = Math.PI / 2;
  lying.rotation.y = 0.25;
  lying.position.set(0.1, shelfTop + 0.04, -1.37);
  lying.rotation.y = 0.2;
  room.add(lying);
  const cupM = lathe([[0, 0], [0.035, 0.002], [0.04, 0.06], [0.042, 0.07], [0.038, 0.07], [0.034, 0.008], [0, 0.008]], MC.cup, 32);
  organic(cupM, 0.04, 8);
  cupM.position.set(-0.27, shelfTop, -1.37);
  cupM.rotation.y = 1.1;
  room.add(shadowed(cupM));
  const candles = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.22, 12), MC.wax);
    c.position.set((i % 2) * 0.022 - 0.011, 0.11, Math.floor(i / 2) * 0.022 - 0.011);
    candles.add(c);
  }
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.003, 6, 16), M.rope);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.11;
  candles.add(tie);
  candles.position.set(0.66, shelfTop, -1.5);
  candles.rotation.set(0.05, 0.4, -0.28); // leaning against the jug
  room.add(shadowed(candles));
}

// a little stack of folded cloths (the honey jar sits on it)
{
  const stack = new THREE.Group();
  const cols = [0xd8c8a8, 0x8aa0b8, 0xe8dcc4];
  cols.forEach((c, i) => {
    const f = rbox(0.17 - i * 0.01, 0.024, 0.15 - i * 0.008, toon({ color: c, rim: 0.2 }), 0.01);
    f.position.set((i - 1) * 0.008, 0.012 + i * 0.024, (i % 2) * 0.006);
    f.rotation.y = (i - 1) * 0.08;
    stack.add(f);
  });
  stack.position.set(0.53, shelfTop, -1.47);
  room.add(shadowed(stack));
}

// under the shelf: a mug hanging from a hook, and a bunch of herbs drying
{
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 12, Math.PI * 1.4), M.iron);
  hook.position.set(0.08, 1.35 - 0.045, -1.36);
  hook.rotation.set(0, Math.PI / 2, Math.PI);
  room.add(hook);
  const mug = new THREE.Group();
  mug.add(lathe([[0, 0], [0.04, 0.002], [0.042, 0.08], [0.044, 0.09], [0.04, 0.09], [0.036, 0.01], [0, 0.01]], M.ceramic, 32));
  const mh = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16, Math.PI), M.ceramic);
  mh.rotation.z = -Math.PI / 2;
  mh.position.set(0.04, 0.05, 0);
  mug.add(mh);
  // hanging by its handle: tipped so the handle is at the top
  mug.rotation.z = Math.PI / 2 + 0.15;
  mug.position.set(0.04, 1.35 - 0.11, -1.36);
  room.add(shadowed(mug));
  const herbs = new THREE.Group();
  const leaves: THREE.BufferGeometry[] = [];
  const rnd = makeRng(51);
  for (let i = 0; i < 26; i++) {
    const g = new THREE.SphereGeometry(0.02, 6, 4);
    g.scale(0.45, 1, 0.15);
    const a = rnd() * Math.PI * 2;
    g.rotateZ(Math.PI + (rnd() - 0.5) * 0.8);
    g.rotateY(a);
    g.translate(Math.cos(a) * rnd() * 0.035, -0.06 - rnd() * 0.12, Math.sin(a) * rnd() * 0.03);
    leaves.push(g);
  }
  herbs.add(new THREE.Mesh(mergeGeometries(leaves), toon({ color: 0x8a9a5a, rim: 0.3, side: THREE.DoubleSide })));
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.07, 4), M.rope);
  string.position.y = -0.03;
  herbs.add(string);
  herbs.position.set(-0.24, 1.35 - 0.025, -1.33);
  room.add(shadowed(herbs));
  living.herbs = herbs;
}

// a broom against the wall, bristles worn to one side
{
  const broom = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 1.25, 10), M.wood);
  stick.position.y = 0.8;
  broom.add(stick);
  const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 18, 1, true), MC.straw);
  (bristles.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
  bristles.position.y = 0.17;
  bristles.scale.set(1.1, 1, 0.45);
  bristles.rotation.z = 0.08;
  broom.add(bristles);
  const bind = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16), M.rope);
  bind.rotation.x = Math.PI / 2;
  bind.position.y = 0.33;
  broom.add(bind);
  broom.position.set(-1.4, 0, 0.75);
  broom.rotation.set(0.04, 0.6, -0.16);
  room.add(shadowed(broom));
}

// straw: in clumps where things stand (by the broom, under the sacks), a few stray bits elsewhere
{
  const rnd = makeRng(41);
  const clumps: [number, number, number, number][] = [
    // x, z, radius, count
    [-1.32, 0.62, 0.12, 40],
    [-0.45, -0.75, 0.18, 30],
    [-0.2, -1.25, 0.14, 22],
    [0.2, -0.5, 0.3, 14],
  ];
  const total = clumps.reduce((n, c) => n + c[3], 0) + 16;
  const straws = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 4), MC.straw, total);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  let k = 0;
  const put = (x: number, z: number) => {
    const len = 0.03 + rnd() * 0.11;
    // most lie flat, a few rest on others at a slight angle
    q.setFromEuler(new THREE.Euler(Math.PI / 2 + (rnd() < 0.2 ? (rnd() - 0.5) * 0.4 : 0), rnd() * Math.PI, 0));
    m4.compose(new THREE.Vector3(x, 0.003 + rnd() * 0.004, z), q, new THREE.Vector3(1, len, 1));
    straws.setMatrixAt(k++, m4);
  };
  for (const [cx, cz, r, n] of clumps) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.pow(rnd(), 1.5) * r;
      put(cx + Math.cos(a) * d * 1.3, cz + Math.sin(a) * d);
    }
  }
  for (let i = 0; i < 16; i++) put(-1.4 + rnd() * 2.6, -1.4 + rnd() * 2.6);
  straws.receiveShadow = true;
  room.add(straws);
}

// ------------------------------------------------------------------ light

const sunDir = new THREE.Vector3(-0.62, 0.62, 0.35).normalize();
const sun = new THREE.DirectionalLight(0xfff0d2, 3.0);
sun.position.copy(sunDir).multiplyScalar(12);
sun.target.position.set(-0.6, 0, -0.4);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.blurSamples = 16;
for (const k of ['left', 'bottom'] as const) sun.shadow.camera[k] = -2.6;
for (const k of ['right', 'top'] as const) sun.shadow.camera[k] = 2.6;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 3; // soft, but small objects still draw their shadow
scene.add(sun, sun.target);
// sky light: the shadows take its blue, the classic painted look
scene.add(new THREE.HemisphereLight(0xa8c8ff, 0xd8a870, 1.1));
const bounce = new THREE.PointLight(0xffd8a0, 1.2, 6, 1.5);
bounce.position.set(-0.5, 0.6, -0.2);
scene.add(bounce);

// the sunbeam through the window, and dust floating in it
{
  const corners = [
    new THREE.Vector3(-S / 2, win.y0, win.z0),
    new THREE.Vector3(-S / 2, win.y0, win.z1),
    new THREE.Vector3(-S / 2, win.y1, win.z1),
    new THREE.Vector3(-S / 2, win.y1, win.z0),
  ];
  const down = sunDir.clone().negate();
  const far = corners.map((c) => c.clone().addScaledVector(down, c.y / -down.y));
  const pts = [...corners, ...far];
  const quads = [
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
  ];
  const pos: number[] = [];
  const along: number[] = [];
  for (const q of quads) for (const i of [q[0], q[1], q[2], q[0], q[2], q[3]]) {
    pos.push(pts[i].x, pts[i].y, pts[i].z);
    along.push(i < 4 ? 0 : 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
  g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `attribute float along; varying float vA; varying vec3 vN; varying vec3 vV;
      void main(){ vA = along; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying vec3 vN; varying vec3 vV;
      void main(){ float t = clamp(vA, 0.0, 1.0); float f = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.0);
        float a = 0.035 * f * pow(max(1.0 - t, 0.0), 1.2) * smoothstep(0.0, 0.1, t); gl_FragColor = vec4(vec3(1.0, 0.9, 0.7) * a, 1.0); }`,
  });
  scene.add(new THREE.Mesh(g, mat));
}
const DUST = 300;
const dustPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) dustPos.set([-1.4 + Math.random() * 1.6, Math.random() * 2, -0.9 + Math.random() * 1.4], i * 3);
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.008, color: 0xfff2d0, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(dust);

// ------------------------------------------------------------------ post

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
gtao.updateGtaoMaterial({ radius: 0.3, thickness: 1, samples: 16 });
gtao.blendIntensity = 0.85; // where things touch, a soft shadow: nothing floats
composer.addPass(gtao);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.15, 0.5, 0.9));
composer.addPass(new OutputPass());
composer.addPass(
  new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.3, 0.59, 0.11));
        c = mix(vec3(l), c, 1.08); c *= mix(vec3(0.95, 0.97, 1.04), vec3(1.04, 1.0, 0.94), smoothstep(0.1, 0.8, l));
        vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.45; gl_FragColor = vec4(c, 1.0); }`,
  }),
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();
function frame(): void {
  timer.update();
  const t = timer.getElapsed();
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3 + 1] += Math.sin(t * 0.2 + i) * 0.0004 - 0.00015;
    if (dustPos[i * 3 + 1] < 0) dustPos[i * 3 + 1] = 2;
  }
  dustGeo.attributes.position.needsUpdate = true;
  // a breeze from the window, never quite regular
  const breeze = Math.sin(t * 0.9) * 0.6 + Math.sin(t * 2.3 + 1) * 0.3 + Math.sin(t * 0.37) * 0.4;
  if (living.plant) living.plant.rotation.z = breeze * 0.025;
  if (living.braid) {
    living.braid.rotation.z = breeze * 0.02;
    living.braid.rotation.x = Math.sin(t * 0.7) * 0.01;
  }
  if (living.herbs) living.herbs.rotation.z = breeze * 0.04;
  // clouds passing over the sun: the light breathes, slowly
  sun.intensity = 3.0 * (0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 0.11) * Math.sin(t * 0.047 + 2)));
  controls.update();
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for automated screenshots
(window as unknown as Record<string, unknown>).stile = {
  view(px: number, py: number, pz: number, tx: number, ty: number, tz: number) {
    camera.position.set(px, py, pz);
    controls.target.set(tx, ty, tz);
    controls.update();
  },
};
