import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { shadowed, toon } from '../stile/kit';

/**
 * The cat of the house: a ginger tabby. Its body is modelled like clay,
 * overlapping spheres melted into one smooth surface (marching cubes),
 * coloured from the spheres (ginger, cream chest and paws, a darker tail
 * tip) with tabby bands painted across the spine. Two poses: curled up
 * asleep, and the "loaf", sitting with its paws tucked under, eyes shut.
 */

export type CatPose = 'curled' | 'loaf';

const GINGER = new THREE.Color(0xd8924e);
const CREAM = new THREE.Color(0xf2dcb8);
const DARK = new THREE.Color(0xa05a2a);
const STRIPE = 0.68;

interface Ball {
  p: THREE.Vector3;
  r: number;
  col: THREE.Color;
}

interface Layout {
  balls: Ball[];
  /** The spine, from tail root to neck: the tabby bands run across it. */
  spine: THREE.Curve<THREE.Vector3>;
  head: THREE.Vector3;
  /** Which way the face looks (horizontal), and how much the head is rolled. */
  face: THREE.Vector3;
  roll: number;
  /** A lying body is flatter than round: modelled taller, then squashed. */
  squash: number;
}

const arc = (deg: number, r: number, y: number) => new THREE.Vector3(Math.cos((deg * Math.PI) / 180) * r, y, Math.sin((deg * Math.PI) / 180) * r);

function curled(): Layout {
  const balls: Ball[] = [];
  const b = (p: THREE.Vector3, r: number, col = GINGER) => balls.push({ p, r, col });
  const spineDeg: [number, number][] = [[198, 0.095], [215, 0.09], [235, 0.085], [255, 0.08], [275, 0.078], [295, 0.08], [315, 0.082], [335, 0.08], [355, 0.074], [12, 0.066]];
  for (const [a, r] of spineDeg) b(arc(a, 0.115, 0.07), r * 0.9);
  b(arc(195, 0.07, 0.065), 0.075);
  b(arc(165, 0.09, 0.03), 0.04);
  b(arc(150, 0.1, 0.02), 0.028, CREAM);
  b(arc(18, 0.09, 0.05), 0.058, CREAM);
  b(arc(300, 0.06, 0.035), 0.05, CREAM);
  b(arc(250, 0.06, 0.035), 0.045, CREAM);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const p = arc(22 + k * 14, 0.095 - k * 0.012, 0.024);
      p.x += side * 0.012;
      p.z += side * 0.018;
      b(p, 0.024, CREAM);
    }
  }
  const head = arc(48, 0.075, 0.068);
  const face = new THREE.Vector3(Math.cos((150 * Math.PI) / 180), 0, Math.sin((150 * Math.PI) / 180));
  headBalls(b, head, face);
  const tail = new THREE.CatmullRomCurve3([arc(205, 0.15, 0.04), arc(175, 0.175, 0.03), arc(140, 0.17, 0.028), arc(105, 0.155, 0.028), arc(80, 0.13, 0.03), arc(68, 0.105, 0.035)]);
  tailBalls(b, tail);
  const spine = new THREE.CatmullRomCurve3(spineDeg.map(([a]) => arc(a, 0.115, 0.07)));
  return { balls, spine, head, face, roll: 0.3, squash: 0.78 };
}

function loaf(): Layout {
  const balls: Ball[] = [];
  const b = (p: THREE.Vector3, r: number, col = GINGER) => balls.push({ p, r, col });
  // a body like a loaf of bread along x, haunch at the back, chest at the front
  const spinePts = [new THREE.Vector3(-0.11, 0.09, 0), new THREE.Vector3(-0.05, 0.105, 0), new THREE.Vector3(0.01, 0.108, 0), new THREE.Vector3(0.06, 0.104, 0), new THREE.Vector3(0.1, 0.1, 0)];
  const radii = [0.09, 0.095, 0.094, 0.088, 0.078];
  spinePts.forEach((p, i) => b(p.clone(), radii[i]));
  // the body is broad: flanks on either side of the spine
  for (const s of [-1, 1]) for (const x of [-0.06, 0.02]) b(new THREE.Vector3(x, 0.075, s * 0.045), 0.075);
  for (const s of [-1, 1]) b(new THREE.Vector3(-0.1, 0.068, s * 0.055), 0.07); // haunches
  b(new THREE.Vector3(0.12, 0.07, 0), 0.068, CREAM); // chest
  b(new THREE.Vector3(0.0, 0.04, 0), 0.07, CREAM); // belly, tucked
  for (const s of [-1, 1]) b(new THREE.Vector3(0.17, 0.022, s * 0.032), 0.025, CREAM); // the tips of the front paws peeping out
  const head = new THREE.Vector3(0.165, 0.178, 0);
  const face = new THREE.Vector3(1, 0, 0);
  b(new THREE.Vector3(0.135, 0.14, 0), 0.055); // neck
  headBalls(b, head, face);
  const tail = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.16, 0.045, 0.02), new THREE.Vector3(-0.15, 0.025, 0.1), new THREE.Vector3(-0.06, 0.022, 0.135), new THREE.Vector3(0.05, 0.022, 0.13), new THREE.Vector3(0.14, 0.026, 0.1)]);
  tailBalls(b, tail);
  return { balls, spine: new THREE.CatmullRomCurve3(spinePts), head, face, roll: 0.05, squash: 0.92 };
}

function headBalls(b: (p: THREE.Vector3, r: number, col?: THREE.Color) => void, head: THREE.Vector3, face: THREE.Vector3): void {
  const side = new THREE.Vector3(-face.z, 0, face.x);
  b(head.clone(), 0.054);
  for (const s of [-1, 1]) b(head.clone().addScaledVector(face, 0.022).addScaledVector(side, s * 0.03).add(new THREE.Vector3(0, -0.018, 0)), 0.028);
  b(head.clone().addScaledVector(face, 0.045).add(new THREE.Vector3(0, -0.02, 0)), 0.022, CREAM);
  b(head.clone().addScaledVector(face, 0.03).add(new THREE.Vector3(0, -0.036, 0)), 0.02, CREAM);
}

function tailBalls(b: (p: THREE.Vector3, r: number, col?: THREE.Color) => void, tail: THREE.Curve<THREE.Vector3>): void {
  const n = 26;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    b(tail.getPointAt(t), 0.03 - 0.009 * t, t > 0.86 ? DARK : GINGER);
  }
}

/** Melts the balls into one surface and colours it. */
function bake(lay: Layout): THREE.BufferGeometry {
  const SQ = lay.squash;
  const L = 0.56;
  const MIN = new THREE.Vector3(-L / 2, -0.04, -L / 2);
  const SUB = 170; // a sharp falloff: the spheres melt together only where they touch
  const mc = new MarchingCubes(76, new THREE.MeshBasicMaterial(), false, false, 60000);
  mc.isolation = 80;
  mc.reset();
  for (const { p, r } of lay.balls) {
    const n = new THREE.Vector3(p.x, p.y / SQ, p.z).sub(MIN).divideScalar(L);
    const rn = r / L;
    mc.addBall(n.x, n.y, n.z, rn * rn * (80 + SUB), SUB);
  }
  mc.update();
  const src = mc.geometry;
  const count = src.drawRange.count === Infinity ? src.attributes.position.count : src.drawRange.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sp = src.attributes.position.array as Float32Array;
  const sn = src.attributes.normal.array as Float32Array;
  for (let i = 0; i < count; i++) {
    pos[i * 3] = MIN.x + ((sp[i * 3] + 1) / 2) * L;
    pos[i * 3 + 1] = (MIN.y + ((sp[i * 3 + 1] + 1) / 2) * L) * SQ;
    pos[i * 3 + 2] = MIN.z + ((sp[i * 3 + 2] + 1) / 2) * L;
    const n = new THREE.Vector3(sn[i * 3], sn[i * 3 + 1] / SQ, sn[i * 3 + 2]).normalize();
    nor.set([n.x, n.y, n.z], i * 3);
  }
  // samples of the spine, to know where along it each point lies
  const spineS = Array.from({ length: 41 }, (_, k) => lay.spine.getPointAt(k / 40));
  const spineLen = lay.spine.getLength();
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    v.fromArray(pos, i * 3);
    c.setRGB(0, 0, 0);
    let wsum = 0;
    for (const bl of lay.balls) {
      const d = v.distanceTo(bl.p) / bl.r;
      const w = Math.exp(-d * d * 6);
      c.r += bl.col.r * w;
      c.g += bl.col.g * w;
      c.b += bl.col.b * w;
      wsum += w;
    }
    if (wsum > 0) c.multiplyScalar(1 / wsum);
    else c.copy(GINGER);
    // tabby bands: across the spine, on the back and flanks only, not on the cream or the face
    let best = 0;
    let bestD = Infinity;
    spineS.forEach((q, k) => {
      const d = q.distanceToSquared(v);
      if (d < bestD) {
        bestD = d;
        best = k / 40;
      }
    });
    // bands spaced by real length along the spine, wavering, broken here and there like a mackerel tabby
    const along = best * spineLen + Math.sin(v.y * 40 + v.x * 25) * 0.006;
    const broken = 0.55 + 0.45 * Math.sin(v.x * 71 + v.z * 53 + v.y * 41) * Math.sin(v.x * 31 - v.z * 47 + 1.3);
    const band = THREE.MathUtils.smoothstep(Math.sin((along / 0.042) * Math.PI * 2 + Math.sin(along * 90) * 0.7), 0.15, 0.85) * THREE.MathUtils.smoothstep(broken, -0.15, 0.35);
    const up = THREE.MathUtils.smoothstep(nor[i * 3 + 1], -0.2, 0.4);
    const ginger = THREE.MathUtils.smoothstep(c.r - c.b, 0.12, 0.25);
    const offHead = THREE.MathUtils.smoothstep(v.distanceTo(lay.head), 0.05, 0.075);
    let dark = band * up * ginger * offHead * Math.min(1, Math.sqrt(bestD) / 0.03);
    // three short lines on the forehead
    const hp = v.clone().sub(lay.head);
    if (hp.length() < 0.07 && hp.y > 0.02) {
      const side = new THREE.Vector3(-lay.face.z, 0, lay.face.x);
      const lat = hp.dot(side);
      dark = Math.max(dark, (Math.abs(lat) < 0.004 || Math.abs(Math.abs(lat) - 0.014) < 0.003 ? 0.8 : 0) * ginger);
    }
    c.multiplyScalar(1 - (1 - STRIPE) * dark);
    col.set([c.r, c.g, c.b], i * 3);
  }
  src.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function furMaterial(): THREE.MeshToonMaterial {
  const fur = toon({ rim: 0.65 });
  fur.vertexColors = true;
  const base = fur.onBeforeCompile;
  fur.onBeforeCompile = (sh, r) => {
    base.call(fur, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nfloat hh(vec3 p){ p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }')
      .replace('#include <color_fragment>', '#include <color_fragment>\n      diffuseColor.rgb *= 0.95 + 0.1 * hh(floor(vLocal * 900.0));');
  };
  return fur;
}

/** Ears, closed eyes with their pale lids, nose and whiskers, placed on the real surface of the face. */
function features(g: THREE.Group, body: THREE.Mesh, lay: Layout): void {
  const frame = new THREE.Group();
  frame.position.copy(lay.head);
  frame.rotation.order = 'YXZ';
  frame.rotation.y = Math.atan2(-lay.face.z, lay.face.x);
  frame.rotation.x = lay.roll;
  g.add(frame);
  const furM = toon({ color: 0xc8864a, rim: 0.6 });
  const pink = toon({ color: 0xd88a86, rim: 0.3 });
  const dark = toon({ color: 0x3a2214, rim: 0 });
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.044, 3, 1), furM);
    ear.scale.set(1, 1, 0.5);
    ear.position.set(-0.014, 0.05 * lay.squash, s * 0.032);
    ear.rotation.set(s * 0.35, 0, -0.2);
    frame.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.03, 3, 1), pink);
    inner.scale.set(1, 1, 0.4);
    inner.position.set(-0.003, 0.048 * lay.squash, s * 0.032);
    inner.rotation.set(s * 0.35, 0, -0.2);
    frame.add(inner);
    for (let k = 0; k < 3; k++) {
      const w = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.06, -0.016 - k * 0.003, s * 0.016),
            new THREE.Vector3(0.072, -0.016 - k * 0.006, s * (0.055 + k * 0.006)),
            new THREE.Vector3(0.07, -0.026 - k * 0.012, s * (0.095 + k * 0.01)),
          ),
          8,
          0.0006,
          3,
        ),
        toon({ color: 0xfff6e8, rim: 0.8 }),
      );
      w.castShadow = false;
      frame.add(w);
    }
  }
  g.updateMatrixWorld(true);
  const onFace = (dir: THREE.Vector3) => {
    const d = dir.clone().normalize().applyQuaternion(frame.quaternion);
    const from = frame.position.clone().addScaledVector(d, 0.11);
    const hit = new THREE.Raycaster(from, d.clone().negate(), 0, 0.11).intersectObject(body).find((h) => h.point.distanceTo(frame.position) < 0.08);
    return hit?.face ? { p: hit.point, n: hit.face.normal.clone() } : null;
  };
  for (const s of [-1, 1]) {
    const at = onFace(new THREE.Vector3(0.8, 0.28, s * 0.42));
    if (!at) continue;
    const lid = new THREE.Mesh(new THREE.CircleGeometry(0.012, 14), toon({ color: 0xe8b47e, rim: 0.2 }));
    lid.position.copy(at.p).addScaledVector(at.n, 0.0015);
    lid.lookAt(lid.position.clone().add(at.n));
    lid.scale.set(1.3, 0.8, 1);
    g.add(lid);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0026, 5, 14, Math.PI * 0.8), dark);
    eye.position.copy(at.p).addScaledVector(at.n, 0.002);
    eye.lookAt(eye.position.clone().add(at.n));
    eye.rotateZ(-Math.PI / 2 - Math.PI * 0.4 + s * 0.25);
    g.add(eye);
  }
  const nAt = onFace(new THREE.Vector3(1, -0.05, 0));
  if (nAt) {
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 6), pink);
    nose.scale.set(1.2, 0.7, 0.8);
    nose.position.copy(nAt.p);
    nose.lookAt(nose.position.clone().add(nAt.n));
    g.add(nose);
  }
}

export interface CatModel {
  group: THREE.Group;
  breathe: (t: number) => void;
}

export function catModel(pose: CatPose): CatModel {
  const lay = pose === 'curled' ? curled() : loaf();
  const g = new THREE.Group();
  const body = new THREE.Mesh(bake(lay), furMaterial());
  g.add(body);
  features(g, body, lay);
  shadowed(g);
  g.traverse((o) => {
    if ((o as THREE.Mesh).geometry instanceof THREE.TubeGeometry) o.castShadow = false;
  });
  g.userData.noWonk = true;
  return {
    group: g,
    breathe: (t) => {
      const k = Math.sin(t * 1.5) * 0.02;
      body.scale.set(1 + k * 0.3, 1 + k, 1 + k * 0.3);
    },
  };
}

/** A place where the cat likes to be, at a time of day. */
export interface CatSpot {
  name: string;
  at: THREE.Vector3;
  yaw: number;
  pose: CatPose;
  /** Said when you look at it there. */
  line: string;
}

/**
 * The cat's day. Where it is follows from the clock (as for the villagers,
 * nothing is saved), but it only moves when nobody is looking: you turn
 * round and it is somewhere else, as cats do.
 */
export class Cat {
  readonly group = new THREE.Group();
  private models: Record<CatPose, CatModel>;
  spot: CatSpot;
  private frustum = new THREE.Frustum();
  private m = new THREE.Matrix4();

  constructor(first: CatSpot) {
    this.models = { curled: catModel('curled'), loaf: catModel('loaf') };
    for (const m of Object.values(this.models)) this.group.add(m.group);
    this.group.userData.noWonk = true;
    this.spot = first;
    this.place(first);
  }

  private place(s: CatSpot): void {
    this.spot = s;
    this.group.position.copy(s.at);
    this.group.rotation.y = s.yaw;
    this.models.curled.group.visible = s.pose === 'curled';
    this.models.loaf.group.visible = s.pose === 'loaf';
  }

  private seen(p: THREE.Vector3, camera: THREE.Camera): boolean {
    this.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.m);
    return this.frustum.containsPoint(p.clone().add(new THREE.Vector3(0, 0.1, 0))) && camera.position.distanceTo(p) < 7;
  }

  /** Moves to `want` if neither the old nor the new place is in view. Returns true if it moved. */
  update(t: number, want: CatSpot, camera: THREE.Camera): boolean {
    this.models[this.spot.pose].breathe(t);
    if (want.name === this.spot.name) return false;
    if (this.seen(this.spot.at, camera) || this.seen(want.at, camera)) return false;
    this.place(want);
    return true;
  }

  /** Forces a place (on loading, or when it jumps onto your lap). */
  set(s: CatSpot): void {
    this.place(s);
  }
}
