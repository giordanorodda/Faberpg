import * as THREE from 'three';
import { makeRng } from '../core/rng';

/**
 * The "natural cartoon" look (Ghibli, Breath of the Wild): soft toon
 * shading with a few smooth light bands, shadows tinted by the sky, a thin
 * rim of light on silhouettes, and nearly flat textures with only a few
 * hand-drawn marks.
 */

/** Light ramp: dark band, a soft half-tone, full light. Linear filtering keeps the steps soft. */
function rampTexture(): THREE.DataTexture {
  const v = [70, 78, 120, 190, 240, 255, 255, 255];
  const data = new Uint8Array(v.length * 4);
  v.forEach((x, i) => data.set([x, x, x, 255], i * 4));
  const t = new THREE.DataTexture(data, v.length, 1);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
const RAMP = rampTexture();

export interface ToonOptions {
  color?: number;
  map?: THREE.Texture;
  /** Strength of the light rim on silhouettes. */
  rim?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: number;
  emissiveIntensity?: number;
  side?: THREE.Side;
}

export function toon(o: ToonOptions = {}): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({
    color: o.color ?? 0xffffff,
    map: o.map ?? null,
    gradientMap: RAMP,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
  const rim = o.rim ?? 0.35;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.rimStrength = { value: rim };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float rimStrength;')
      .replace(
        '#include <opaque_fragment>',
        `// a warm rim of light where the surface turns away from the eye
        float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        outgoingLight += vec3(1.0, 0.92, 0.78) * rimF * rimStrength * (0.4 + 0.6 * diffuseColor.rgb);
        #include <opaque_fragment>`,
      );
  };
  return m;
}

function canvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function finish(c: HTMLCanvasElement, repeat: [number, number] = [1, 1]): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

/** Wood: an even base color, a few long hand-drawn grain lines, optional plank seams. */
export function woodTex(seed: number, base: string, line: string, opts: { planks?: number; knots?: number } = {}): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  const rnd = makeRng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  // broad, soft value changes, like a light wash of paint
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `rgba(255,240,210,${0.04 + rnd() * 0.05})`;
    g.fillRect(rnd() * 512, 0, 30 + rnd() * 90, 512);
  }
  g.strokeStyle = line;
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    g.globalAlpha = 0.25 + rnd() * 0.3;
    g.lineWidth = 1 + rnd() * 2;
    const x = rnd() * 512;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.012 + i) * (4 + rnd() * 6), y);
    g.stroke();
  }
  for (let k = 0; k < (opts.knots ?? 2); k++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    g.globalAlpha = 0.5;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, y, 6 + rnd() * 5, 14 + rnd() * 8, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;
  if (opts.planks) {
    // boards of slightly different widths and tones, never a perfect grid
    let x = 0;
    const avg = 512 / opts.planks;
    while (x < 512) {
      const w = avg * (0.75 + rnd() * 0.5);
      g.fillStyle = rnd() < 0.5 ? `rgba(255,235,200,${rnd() * 0.12})` : `rgba(60,30,10,${rnd() * 0.12})`;
      g.fillRect(x, 0, w, 512);
      g.fillStyle = line;
      g.fillRect(x, 0, 3 + rnd() * 2, 512);
      x += w;
    }
  }
  return finish(c);
}

/** Lime plaster: warm cream with large soft clouds of light and shade. */
export function plasterTex(seed: number): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  const rnd = makeRng(seed);
  g.fillStyle = '#efe0c2';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 40 + rnd() * 120;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() < 0.5;
    grd.addColorStop(0, light ? 'rgba(255,248,230,0.18)' : 'rgba(190,160,120,0.12)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return finish(c);
}

/** Coarse cloth for the sacks: tan, a faint weave, a seam. */
export function clothTex(seed: number, base: string): THREE.CanvasTexture {
  const [c, g] = canvas(256);
  const rnd = makeRng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  g.globalAlpha = 0.08;
  g.fillStyle = '#3a2a1a';
  for (let i = 0; i < 256; i += 4) {
    g.fillRect(i, 0, 1, 256);
    g.fillRect(0, i, 256, 1);
  }
  g.globalAlpha = 0.12;
  for (let i = 0; i < 12; i++) {
    g.fillStyle = rnd() < 0.5 ? '#fff4e0' : '#5a4028';
    g.fillRect(rnd() * 256, rnd() * 256, 20 + rnd() * 50, 10 + rnd() * 30);
  }
  g.globalAlpha = 0.5;
  g.strokeStyle = '#6a5034';
  g.setLineDash([6, 5]);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(128, 0);
  g.lineTo(128, 256);
  g.stroke();
  return finish(c, [2, 1]);
}

/** What is seen through the window: a painted sky with soft clouds over green hills. */
export function landscapeTex(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 512);
  const sky = g.createLinearGradient(0, 0, 0, 340);
  sky.addColorStop(0, '#5d9fd8');
  sky.addColorStop(1, '#bfe0ee');
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 512);
  const rnd = makeRng(4);
  for (let i = 0; i < 9; i++) {
    const x = rnd() * 1024;
    const y = 60 + rnd() * 150;
    for (let k = 0; k < 7; k++) {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.arc(x + k * 26 - 80, y + Math.sin(k) * 10, 26 + rnd() * 22, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(200,215,235,0.6)';
    g.fillRect(x - 110, y + 16, 200, 14);
  }
  // hills, far to near
  const hill = (y0: number, color: string, amp: number, f: number) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 512);
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y0 + Math.sin(x * f + y0) * amp + Math.sin(x * f * 2.7) * amp * 0.3);
    g.lineTo(1024, 512);
    g.fill();
  };
  hill(330, '#8fbf7a', 18, 0.006);
  hill(370, '#6faa5a', 22, 0.009);
  hill(420, '#5a9a48', 16, 0.013);
  // a few round trees
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 1024;
    const y = 360 + rnd() * 70;
    g.fillStyle = '#3f7a3a';
    g.beginPath();
    g.arc(x, y, 10 + rnd() * 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#5a9a4a';
    g.beginPath();
    g.arc(x - 3, y - 4, 6 + rnd() * 6, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c);
}

export interface WallOptions {
  /** Width and height of the wall in meters (the texture covers it once). */
  w: number;
  h: number;
  /** Rectangles to leave empty (window openings), in meters from the left/bottom. */
  holes?: { x0: number; x1: number; y0: number; y1: number }[];
  /** Places where the plaster has fallen off and the stones show. */
  patches?: { x: number; y: number; r: number }[];
  /** Charcoal tally marks, at this position. */
  tally?: { x: number; y: number };
  /** Height of the stencilled frieze band, in meters. */
  frieze?: number;
  cracksFrom?: { x: number; y: number }[];
}

/**
 * A whole plastered wall, painted once: limewash laid on by hand, damp and
 * grime near the floor, a faded folk stencil frieze, bare patches where the
 * plaster fell, hairline cracks, small marks of the people who live here.
 */
export function wallTex(seed: number, o: WallOptions): THREE.CanvasTexture {
  const PX = 320; // pixels per meter
  const W = Math.round(o.w * PX);
  const H = Math.round(o.h * PX);
  const [c, g] = canvas(W, H);
  const rnd = makeRng(seed);
  const X = (m: number) => m * PX;
  const Y = (m: number) => H - m * PX; // canvas y grows downwards
  g.fillStyle = '#f0d6a8';
  g.fillRect(0, 0, W, H);
  // warm and cool clouds in the limewash
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 60 + rnd() * 260;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const k = rnd();
    const col = k < 0.4 ? 'rgba(255,248,226,0.2)' : k < 0.7 ? 'rgba(226,176,112,0.08)' : k < 0.85 ? 'rgba(214,160,128,0.06)' : 'rgba(180,168,150,0.05)';
    grd.addColorStop(0, col);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // trowel strokes: long, soft, slightly curved
  for (let i = 0; i < 220; i++) {
    g.save();
    g.translate(rnd() * W, rnd() * H);
    g.rotate((rnd() - 0.5) * 1.2);
    g.fillStyle = rnd() < 0.6 ? 'rgba(255,250,235,0.035)' : 'rgba(150,110,70,0.02)';
    g.beginPath();
    g.ellipse(0, 0, 20 + rnd() * 40, 4 + rnd() * 7, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  // a faded stencil frieze: a running vine with little red flowers
  if (o.frieze) {
    const fy = Y(o.frieze);
    g.strokeStyle = 'rgba(110,130,70,0.45)';
    g.lineWidth = 4;
    g.beginPath();
    for (let x = 0; x <= W; x += 6) g.lineTo(x, fy + Math.sin(x * 0.03) * 12);
    g.stroke();
    g.strokeStyle = 'rgba(160,60,40,0.35)';
    g.lineWidth = 3;
    for (const off of [-30, 30]) {
      g.beginPath();
      g.moveTo(0, fy + off);
      g.lineTo(W, fy + off);
      g.stroke();
    }
    for (let x = 30; x < W; x += 105) {
      const y = fy + Math.sin(x * 0.03) * 12;
      // leaves
      g.fillStyle = 'rgba(100,130,60,0.45)';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(x + s * 16, y - s * 6, 13, 6, s * 0.6, 0, Math.PI * 2);
        g.fill();
      }
      // a flower: five petals and a golden heart
      if ((x / 105) % 2 < 1) {
        g.fillStyle = 'rgba(176,58,42,0.5)';
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          g.beginPath();
          g.arc(x + 40 + Math.cos(a) * 9, y + Math.sin(a) * 9, 7, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = 'rgba(220,170,60,0.6)';
        g.beginPath();
        g.arc(x + 40, y, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    // the stencil wore away unevenly: rub some of it out
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(236,217,180,0.55)';
      g.beginPath();
      g.ellipse(rnd() * W, fy + (rnd() - 0.5) * 70, 20 + rnd() * 60, 10 + rnd() * 20, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // damp and grime near the floor, with an uneven top edge
  const damp = g.createLinearGradient(0, H, 0, H - X(0.45));
  damp.addColorStop(0, 'rgba(120,90,60,0.32)');
  damp.addColorStop(0.5, 'rgba(140,105,70,0.12)');
  damp.addColorStop(1, 'rgba(140,105,70,0)');
  g.fillStyle = damp;
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, H - X(0.3) - Math.sin(x * 0.02) * 20 - rnd() * 25);
  g.lineTo(W, H);
  g.fill();
  // bare patches: an irregular hole in the plaster with the stones behind
  for (const p of o.patches ?? []) {
    const cx = X(p.x);
    const cy = Y(p.y);
    const r = X(p.r);
    const pts: [number, number][] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rr = r * (0.65 + rnd() * 0.5);
      pts.push([cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr]);
    }
    g.save();
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    // the plaster edge: a dark lip below, a light lip above
    g.lineWidth = 7;
    g.strokeStyle = 'rgba(255,248,230,0.8)';
    g.stroke();
    g.clip();
    g.fillStyle = '#8a6a50';
    g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
    for (let row = -3; row <= 3; row++) {
      for (let k = -4; k <= 4; k++) {
        const sx = cx + k * 34 + (row % 2) * 17 + (rnd() - 0.5) * 6;
        const sy = cy + row * 22;
        const tones = ['#b4a088', '#a89478', '#c0ac90', '#9c8a74'];
        g.fillStyle = tones[Math.floor(rnd() * tones.length)];
        g.beginPath();
        g.ellipse(sx, sy, 15 + rnd() * 3, 9 + rnd() * 2, (rnd() - 0.5) * 0.3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,240,215,0.35)';
        g.beginPath();
        g.ellipse(sx - 3, sy - 3, 9, 4, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(90,60,40,0.5)';
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + 4) : g.moveTo(x, y + 4)));
    g.closePath();
    g.stroke();
  }
  // hairline cracks
  g.strokeStyle = 'rgba(110,80,55,0.55)';
  g.lineWidth = 1.6;
  for (const cr of o.cracksFrom ?? []) {
    let x = X(cr.x);
    let y = Y(cr.y);
    g.beginPath();
    g.moveTo(x, y);
    const dir = rnd() * Math.PI * 2;
    for (let i = 0; i < 14; i++) {
      x += Math.cos(dir + (rnd() - 0.5) * 1.4) * 9;
      y += Math.sin(dir + (rnd() - 0.5) * 1.4) * 9;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // Teresa counts something, five at a time, in charcoal
  if (o.tally) {
    g.strokeStyle = 'rgba(60,48,40,0.45)';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    let x = X(o.tally.x);
    const y = Y(o.tally.y);
    for (let grp = 0; grp < 4; grp++) {
      const n = grp === 3 ? 2 : 5;
      for (let i = 0; i < Math.min(n, 4); i++) {
        g.beginPath();
        g.moveTo(x + i * 5 + (rnd() - 0.5) * 2, y);
        g.lineTo(x + i * 5 + (rnd() - 0.5) * 2, y + 17);
        g.stroke();
      }
      if (n === 5) {
        g.beginPath();
        g.moveTo(x - 3, y + 13);
        g.lineTo(x + 19, y + 3);
        g.stroke();
      }
      x += 32;
    }
  }
  for (const hole of o.holes ?? []) g.clearRect(X(hole.x0), Y(hole.y1), X(hole.x1 - hole.x0), X(hole.y1 - hole.y0));
  return finish(c);
}

/** A checked tablecloth: soft weave, faded, with a hemmed border. */
export function tableclothTex(): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  g.fillStyle = '#f0e6d0';
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = 'rgba(176,54,42,0.5)';
  for (let i = 0; i < 12; i++) {
    g.fillRect(36 + i * 38, 0, 19, 512);
    g.fillRect(0, 36 + i * 38, 512, 19);
  }
  // weave and a little fading
  g.fillStyle = 'rgba(80,40,30,0.05)';
  for (let i = 0; i < 512; i += 3) {
    g.fillRect(i, 0, 1, 512);
    g.fillRect(0, i, 512, 1);
  }
  const fade = g.createRadialGradient(256, 256, 40, 256, 256, 300);
  fade.addColorStop(0, 'rgba(255,248,230,0.18)');
  fade.addColorStop(1, 'rgba(255,248,230,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, 512, 512);
  // hem: a darker border and a line of stitches
  g.strokeStyle = 'rgba(150,40,32,0.9)';
  g.lineWidth = 14;
  g.strokeRect(7, 7, 498, 498);
  g.strokeStyle = 'rgba(250,240,220,0.9)';
  g.lineWidth = 2;
  g.setLineDash([6, 6]);
  g.strokeRect(20, 20, 472, 472);
  return finish(c);
}
