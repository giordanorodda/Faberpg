import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { box, MAT, shadowed } from './props';

/**
 * The "slow fantasy" layer of the shop: half-timbered walls, leaded windows,
 * an iron chandelier, a few things that come from beyond the woods. Magic
 * here is never a spectacle (§24): a faint glow, a jar of fireflies, a
 * crystal that nobody can explain.
 */

/** A diamond-leaded window pane: transparent, with dark lead cames. */
export function leadedGlass(w: number, h: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.round((256 * h) / w);
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(214,226,200,0.22)';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(40,36,30,1)';
  g.lineWidth = 5;
  const step = 52;
  g.beginPath();
  for (let k = -c.height; k < c.width + c.height; k += step) {
    g.moveTo(k, 0);
    g.lineTo(k + c.height, c.height);
    g.moveTo(k, c.height);
    g.lineTo(k + c.height, 0);
  }
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.2, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.castShadow = false;
  return m;
}

/** Read at use time: the cartoon shop swaps the materials before building. */
const timber = () => MAT.darkWood;

/**
 * Exposed timber frame on the inner face of a wall: posts, a rail above a
 * stone plinth, a top plate and a few diagonal braces. Coordinates are
 * wall-local: x along the wall, y up; the group is placed by the caller.
 */
export function timberFrame(length: number, height: number, openings: { x0: number; x1: number; y0: number; y1: number }[], plinth: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const free = (x: number, y0 = 0, y1 = height) => !openings.some((o) => x > o.x0 - 0.1 && x < o.x1 + 0.1 && y1 > o.y0 && y0 < o.y1);
  const add = (m: THREE.Mesh) => g.add(shadowed(m));
  // stone plinth along the bottom, interrupted by doorways
  let px = -length / 2;
  const doors = openings.filter((op) => op.y0 < 0.8).sort((a, b) => a.x0 - b.x0);
  for (const o of [...doors, { x0: length / 2 + 0.06, x1: length / 2, y0: 0, y1: 0 }]) {
    const end = o.x0 - 0.06;
    if (end - px > 0.05) {
      const seg = box(end - px, 0.8, 0.06, plinth, 2.2);
      seg.position.set((px + end) / 2, 0.4, 0.03);
      add(seg);
    }
    px = o.x1 + 0.06;
  }
  // rail above the plinth and top plate
  for (const y of [0.86, height - 0.32]) {
    let x = -length / 2;
    const stops = openings.filter((o) => y > o.y0 - 0.05 && y < o.y1 + 0.05).sort((a, b) => a.x0 - b.x0);
    for (const o of [...stops, { x0: length / 2, x1: length / 2, y0: 0, y1: 0 }]) {
      const end = o.x0 - 0.04;
      if (end - x > 0.05) {
        const r = box(end - x, 0.14, 0.1, timber(), 1.5);
        r.position.set((x + end) / 2, y, 0.06);
        add(r);
      }
      x = o.x1 + 0.04;
    }
  }
  // posts
  const posts: number[] = [];
  for (let x = -length / 2 + 0.08; x <= length / 2 - 0.07; x += 1.25) posts.push(x);
  posts.push(length / 2 - 0.08);
  for (const o of openings) posts.push(o.x0 - 0.08, o.x1 + 0.08);
  for (const x of posts) {
    if (!free(x, 0.9, height - 0.4) && !openings.some((o) => Math.abs(x - (o.x0 - 0.08)) < 0.01 || Math.abs(x - (o.x1 + 0.08)) < 0.01)) continue;
    const p = box(0.14, height - 0.9, 0.1, timber(), 1.5);
    p.position.set(x, 0.9 + (height - 0.9) / 2 - 0.16, 0.06);
    add(p);
  }
  // diagonal braces in the panels without openings
  const sorted = [...new Set(posts.map((p) => Math.round(p * 100) / 100))].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (b - a < 0.8 || !free((a + b) / 2, 0.9, height - 0.4)) continue;
    const y0 = 0.93;
    const y1 = height - 0.39;
    const len = Math.hypot(b - a - 0.14, y1 - y0);
    const br = box(0.12, len, 0.08, timber(), 1.5);
    br.position.set((a + b) / 2, (y0 + y1) / 2, 0.05);
    br.rotation.z = (i % 2 ? 1 : -1) * Math.atan2(b - a - 0.14, y1 - y0);
    add(br);
  }
  return g;
}

/** Wrought-iron ring chandelier with candles. */
export function chandelier(): { group: THREE.Group; flames: THREE.Mesh[] } {
  const g = new THREE.Group();
  const flames: THREE.Mesh[] = [];
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 8, 40), MAT.iron);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.75, 4), MAT.iron);
    const px = Math.cos(a) * 0.42;
    const pz = Math.sin(a) * 0.42;
    chain.position.set(px / 2, 0.36, pz / 2);
    chain.lookAt(0, 0.72, 0);
    chain.rotateX(Math.PI / 2);
    g.add(chain);
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const x = Math.cos(a) * 0.42;
    const z = Math.sin(a) * 0.42;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.025, 10), MAT.iron);
    cup.position.set(x, 0.02, z);
    g.add(cup);
    const h = 0.08 + ((k * 37) % 5) * 0.012; // candles burnt down unevenly
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, h, 10), MAT.wax);
    c.position.set(x, 0.035 + h / 2, z);
    g.add(c);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd890 }));
    f.scale.y = 2.2;
    f.position.set(x, 0.055 + h, z);
    g.add(f);
    flames.push(f);
  }
  return { group: shadowed(g), flames };
}

const TINCTURES = [0x3a8ad0, 0x5ac070, 0xd08a2a, 0x9a5ad0, 0xc04a4a, 0x40b0b0];

/** A round flask of tincture. The liquid glows faintly: enough to notice it in the dark. */
export function tincture(seed: number): { group: THREE.Group; liquid: THREE.MeshStandardMaterial } {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const r = 0.045 + rnd() * 0.02;
  const color = TINCTURES[Math.floor(rnd() * TINCTURES.length)];
  const liquid = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.2, transparent: true, opacity: 0.9 });
  const fill = new THREE.Mesh(new THREE.SphereGeometry(r * 0.92, 18, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), liquid);
  fill.position.y = r;
  g.add(fill);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), MAT.glass);
  glass.position.y = r;
  g.add(glass);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.32, r * 1.1, 10, 1, true), MAT.glass);
  neck.position.y = r * 2.3;
  g.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.26, r * 0.4, 8), MAT.cork);
  cork.position.y = r * 3;
  g.add(cork);
  shadowed(g);
  glass.castShadow = neck.castShadow = false;
  return { group: g, liquid };
}

/** A jar of fireflies: small lights that wander inside the glass. */
export function fireflyJar(): { group: THREE.Group; light: THREE.PointLight; update: (t: number, on: number) => void } {
  const g = new THREE.Group();
  const r = 0.08;
  const h = 0.22;
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [r, 0.004],
        [r + 0.004, 0.02],
        [r + 0.004, h * 0.85],
        [r * 0.8, h * 0.95],
        [r * 0.78, h],
      ].map(([a, b]) => new THREE.Vector2(a, b)),
      24,
    ),
    MAT.glass,
  );
  g.add(glass);
  const cloth = new THREE.Mesh(new THREE.SphereGeometry(r * 0.85, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 }));
  cloth.position.y = h - 0.01;
  cloth.scale.y = 0.4;
  g.add(cloth);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.004, 6, 20), MAT.string);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = h - 0.012;
  g.add(tie);
  const N = 7;
  const flies: THREE.Mesh[] = [];
  const flyMat = new THREE.MeshBasicMaterial({ color: 0xd8ff7a, transparent: true });
  for (let i = 0; i < N; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 4), flyMat.clone());
    g.add(f);
    flies.push(f);
  }
  const light = new THREE.PointLight(0xc8ff70, 0, 1.6, 2);
  light.position.y = h * 0.5;
  g.add(light);
  const update = (t: number, on: number) => {
    let sum = 0;
    flies.forEach((f, i) => {
      const a = t * (0.3 + i * 0.07) + i * 2.1;
      f.position.set(Math.cos(a) * r * 0.6 * Math.sin(t * 0.21 + i), 0.04 + (h - 0.08) * (0.5 + 0.5 * Math.sin(t * 0.17 + i * 1.3)), Math.sin(a * 1.3) * r * 0.6);
      // each one blinks slowly, at its own pace
      const blink = Math.max(0, Math.sin(t * (0.6 + i * 0.13) + i * 4));
      (f.material as THREE.MeshBasicMaterial).opacity = 0.15 + blink * 0.85;
      sum += blink;
    });
    light.intensity = on * (0.05 + (sum / N) * 0.35);
  };
  return { group: g, light, update };
}

/** A pale crystal cluster brought from beyond the ditch. */
export function crystals(): { group: THREE.Group; mat: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), new THREE.MeshStandardMaterial({ color: 0x6a6660, roughness: 1, flatShading: true }));
  rock.scale.set(1.3, 0.6, 1);
  rock.position.y = 0.04;
  g.add(rock);
  const mat = new THREE.MeshStandardMaterial({ color: 0xbfe0f0, emissive: 0x6ab0e0, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0, flatShading: true, transparent: true, opacity: 0.85 });
  const rnd = makeRng(5);
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.014 + rnd() * 0.01, 0.07 + rnd() * 0.08, 6), mat);
    c.position.set((rnd() - 0.5) * 0.08, 0.07, (rnd() - 0.5) * 0.06);
    c.rotation.set((rnd() - 0.5) * 0.9, 0, (rnd() - 0.5) * 0.9);
    g.add(c);
  }
  return { group: shadowed(g), mat };
}

export function ropeCoil(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xa88a5a, roughness: 1 });
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.13 - i * 0.004, 0.016, 8, 30), mat);
    t.rotation.x = Math.PI / 2;
    t.position.y = 0.016 + i * 0.026;
    g.add(t);
  }
  return shadowed(g);
}

export function lantern(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.025, 6), MAT.iron);
  base.position.y = 0.012;
  g.add(base);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 4), MAT.iron);
    bar.position.set(Math.cos(a) * 0.055, 0.105, Math.sin(a) * 0.055);
    g.add(bar);
  }
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 6, 1, true), MAT.glass);
  glass.position.y = 0.105;
  g.add(glass);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.06, 6), MAT.iron);
  top.position.y = 0.215;
  g.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 12), MAT.iron);
  ring.position.y = 0.26;
  g.add(ring);
  return shadowed(g);
}

/** Gino's shield and short sword, on the wall. Not for sale. */
export function shieldAndSword(): THREE.Group {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32), new THREE.MeshStandardMaterial({ color: 0x6a3a26, roughness: 0.8 }));
  sh.rotation.x = Math.PI / 2;
  g.add(sh);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.014, 8, 40), MAT.iron);
  rim.position.z = 0.012;
  g.add(rim);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.iron);
  boss.rotation.x = Math.PI / 2;
  boss.position.z = 0.015;
  g.add(boss);
  // a faded painted emblem: a heron
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(0,0,0,0)';
  x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(220,200,150,0.55)';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(40, 110);
  x.lineTo(56, 70);
  x.quadraticCurveTo(50, 40, 70, 28);
  x.lineTo(96, 22);
  x.moveTo(56, 70);
  x.quadraticCurveTo(80, 60, 92, 76);
  x.lineTo(60, 80);
  x.moveTo(60, 82);
  x.lineTo(66, 112);
  x.stroke();
  const emb = new THREE.CanvasTexture(c);
  emb.colorSpace = THREE.SRGBColorSpace;
  const em = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshStandardMaterial({ map: emb, transparent: true, roughness: 0.9 }));
  em.position.set(0, 0.06, 0.017);
  g.add(em);
  const sword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.008), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 1, roughness: 0.35 }));
  blade.position.y = 0.36;
  sword.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.03), MAT.brass);
  guard.position.y = 0.04;
  sword.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9 }));
  grip.position.y = -0.03;
  sword.add(grip);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), MAT.brass);
  pommel.position.y = -0.1;
  sword.add(pommel);
  sword.rotation.z = Math.PI / 4;
  sword.position.set(-0.05, -0.12, -0.03);
  g.add(sword);
  return shadowed(g);
}

/** A hand-drawn map of the woods, rolled out on the counter: blank beyond the ditch. */
export function woodsMap(): THREE.Group {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 360;
  const x = c.getContext('2d')!;
  x.fillStyle = '#dcc89a';
  x.fillRect(0, 0, 512, 360);
  const rnd = makeRng(12);
  for (let i = 0; i < 300; i++) {
    x.fillStyle = `rgba(90,60,30,${rnd() * 0.08})`;
    x.fillRect(rnd() * 512, rnd() * 360, 2 + rnd() * 30, 1 + rnd() * 4);
  }
  x.strokeStyle = '#4a3420';
  x.fillStyle = '#4a3420';
  x.lineWidth = 2;
  // trees in the southern half
  for (let i = 0; i < 70; i++) {
    const tx = 20 + rnd() * 470;
    const ty = 170 + rnd() * 170;
    x.beginPath();
    x.moveTo(tx, ty);
    x.lineTo(tx - 6, ty + 12);
    x.lineTo(tx + 6, ty + 12);
    x.closePath();
    x.stroke();
  }
  // the ditch
  x.setLineDash([8, 6]);
  x.beginPath();
  x.moveTo(10, 160);
  x.bezierCurveTo(140, 140, 300, 185, 500, 150);
  x.stroke();
  x.setLineDash([]);
  x.font = 'italic 22px Georgia, serif';
  x.fillText('il fosso', 210, 150);
  x.fillText('Acquaferma', 200, 330);
  x.font = 'italic 18px Georgia, serif';
  x.fillText('?', 250, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.y = 0.004;
  g.add(sheet);
  for (const s of [-1, 1]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 10), new THREE.MeshStandardMaterial({ color: 0xd0bb8a, roughness: 1 }));
    roll.rotation.x = Math.PI / 2;
    roll.position.set(s * 0.25, 0.014, 0);
    g.add(roll);
  }
  return shadowed(g);
}

export { box };
