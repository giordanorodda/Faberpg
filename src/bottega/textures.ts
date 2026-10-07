import * as THREE from 'three';
import { makeRng } from '../core/rng';

/**
 * Procedural textures, drawn on a canvas at startup. No image files: every
 * surface is generated from noise, so the look stays coherent and the
 * project has no licensing questions. Real photographed materials can
 * replace these later without touching the rest of the scene.
 */

/** Smooth 2D value noise, tileable over `period` cells. */
function makeNoise(seed: number, period: number) {
  const rnd = makeRng(seed);
  const grid = new Float32Array(period * period).map(() => rnd());
  const at = (x: number, y: number) => grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * xf;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * xf;
    return a + (b - a) * yf;
  };
}

/** Fractal noise in [0, 1], tileable: u, v in [0, 1). */
function makeFbm(seed: number, baseFreq: number, octaves = 4) {
  const layers = Array.from({ length: octaves }, (_, i) => ({ n: makeNoise(seed + i * 101, baseFreq * 2 ** i), f: baseFreq * 2 ** i }));
  return (u: number, v: number) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (const l of layers) {
      sum += l.n(u * l.f, v * l.f) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

export interface TextureSet {
  map: THREE.Texture;
  bumpMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

type Pixel = (u: number, v: number) => { r: number; g: number; b: number; h: number; rough: number };

/** Renders color, height and roughness from a single per-pixel function. */
function bake(size: number, pixel: Pixel, repeat: [number, number] = [1, 1]): TextureSet {
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  };
  const cc = mk();
  const hc = mk();
  const rc = mk();
  const cd = cc.getContext('2d')!.createImageData(size, size);
  const hd = hc.getContext('2d')!.createImageData(size, size);
  const rd = rc.getContext('2d')!.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = pixel(x / size, y / size);
      const i = (y * size + x) * 4;
      cd.data[i] = p.r;
      cd.data[i + 1] = p.g;
      cd.data[i + 2] = p.b;
      cd.data[i + 3] = 255;
      const h = Math.max(0, Math.min(255, p.h * 255));
      hd.data[i] = hd.data[i + 1] = hd.data[i + 2] = h;
      hd.data[i + 3] = 255;
      const r = Math.max(0, Math.min(255, p.rough * 255));
      rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = r;
      rd.data[i + 3] = 255;
    }
  }
  cc.getContext('2d')!.putImageData(cd, 0, 0);
  hc.getContext('2d')!.putImageData(hd, 0, 0);
  rc.getContext('2d')!.putImageData(rd, 0, 0);
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(cc, true), bumpMap: tex(hc, false), roughnessMap: tex(rc, false) };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Floorboards: long planks of slightly different tones, with grain, knots and dark gaps. */
export function planks(seed: number, opts: { base: [number, number, number]; boards: number; worn?: boolean }): TextureSet {
  const grain = makeFbm(seed, 4, 4);
  const fine = makeFbm(seed + 7, 64, 2);
  const rnd = makeRng(seed);
  const boardTone = Array.from({ length: opts.boards }, () => 0.82 + rnd() * 0.3);
  const boardOffset = Array.from({ length: opts.boards }, () => rnd());
  const knots = Array.from({ length: opts.boards * 2 }, () => ({ b: Math.floor(rnd() * opts.boards), v: rnd(), r: 0.006 + rnd() * 0.01 }));
  const wear = makeFbm(seed + 3, 2, 3);
  return bake(1024, (u, v) => {
    const bu = u * opts.boards;
    const b = Math.floor(bu);
    const local = bu - b;
    // Each plank also has an end joint somewhere along its length.
    const joint = Math.abs(((v + boardOffset[b]) % 1) - 0.5) < 0.0025;
    const gap = local < 0.025 || local > 0.975 || joint;
    // grain: stretched noise along the plank
    // grain runs along the plank: lines across the board, gently wavy
    const g = grain(u * 0.5 + b * 0.37, v * 2 + boardOffset[b]);
    const lines = Math.sin((local * 16 + g * 4 + b) * Math.PI) * 0.5 + 0.5;
    let k = 0;
    for (const kn of knots) {
      if (kn.b !== b) continue;
      const d = Math.hypot((local - 0.5) / opts.boards, v - kn.v);
      if (d < kn.r * 2.5) k = Math.max(k, 1 - d / (kn.r * 2.5));
    }
    const tone = boardTone[b] * (0.88 + lines * 0.1 + fine(u, v) * 0.08) * (1 - k * 0.45);
    const w = opts.worn ? Math.max(0, wear(u, v) - 0.45) * 0.5 : 0;
    const [r, gg, bl] = opts.base;
    if (gap) return { r: r * 0.25, g: gg * 0.25, b: bl * 0.25, h: 0, rough: 0.9 };
    return {
      r: mix(r * tone, 200, w),
      g: mix(gg * tone, 180, w),
      b: mix(bl * tone, 150, w),
      h: 0.55 + lines * 0.25 - k * 0.2,
      rough: 0.62 + lines * 0.12 - w * 0.25,
    };
  }, [1, 1]);
}

/** Lime plaster: warm off-white, uneven, with damp stains near the floor. */
export function plaster(seed: number, repeat: [number, number]): TextureSet {
  const big = makeFbm(seed, 3, 4);
  const small = makeFbm(seed + 11, 48, 3);
  const cracks = makeFbm(seed + 23, 12, 3);
  const crackMask = makeFbm(seed + 29, 2, 2);
  return bake(1024, (u, v) => {
    const n = big(u, v);
    const s = small(u, v);
    // hairline cracks, only in a few patches of the wall
    const c = crackMask(u, v) > 0.62 && Math.abs(cracks(u, v) - 0.5) < 0.0022 ? 1 : 0;
    const t = 0.86 + n * 0.12 + s * 0.06 - c * 0.07;
    return { r: 222 * t, g: 210 * t, b: 186 * t, h: 0.5 + s * 0.4 - c * 0.4, rough: 0.92 };
  }, repeat);
}

/** Rough stone flags for the threshold and the hearth. */
export function stone(seed: number, repeat: [number, number]): TextureSet {
  const n = makeFbm(seed, 6, 5);
  const cellN = 5;
  const rnd = makeRng(seed);
  const pts = Array.from({ length: cellN * cellN }, (_, i) => ({ x: ((i % cellN) + 0.2 + rnd() * 0.6) / cellN, y: (Math.floor(i / cellN) + 0.2 + rnd() * 0.6) / cellN, t: 0.8 + rnd() * 0.3 }));
  return bake(512, (u, v) => {
    // Voronoi cells, wrapped so the texture tiles.
    let d1 = 9;
    let d2 = 9;
    let tone = 1;
    for (const p of pts) {
      for (const ox of [-1, 0, 1]) {
        for (const oy of [-1, 0, 1]) {
          const d = Math.hypot(u - p.x - ox, v - p.y - oy);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            tone = p.t;
          } else if (d < d2) d2 = d;
        }
      }
    }
    const edge = d2 - d1 < 0.012;
    const t = tone * (0.75 + n(u, v) * 0.4);
    if (edge) return { r: 70, g: 66, b: 60, h: 0, rough: 1 };
    return { r: 150 * t, g: 144 * t, b: 134 * t, h: 0.6 + n(u, v) * 0.4, rough: 0.85 };
  }, repeat);
}

/** Plain wood for furniture: quieter grain, no gaps. */
export function wood(seed: number, base: [number, number, number], repeat: [number, number] = [1, 1]): TextureSet {
  const grain = makeFbm(seed, 3, 4);
  const fine = makeFbm(seed + 5, 80, 2);
  return bake(512, (u, v) => {
    const g = grain(u * 0.6, v * 1.5);
    const lines = Math.sin((u * 36 + g * 5) * Math.PI) * 0.5 + 0.5;
    const t = 0.84 + lines * 0.07 + fine(u, v) * 0.06 + g * 0.1;
    return { r: base[0] * t, g: base[1] * t, b: base[2] * t, h: 0.5 + lines * 0.3, rough: 0.55 + lines * 0.15 };
  }, repeat);
}

/** Coarse jute for the sacks. */
export function burlap(seed: number): TextureSet {
  const n = makeFbm(seed, 4, 3);
  return bake(256, (u, v) => {
    const weave = (Math.sin(u * 2 * Math.PI * 40) * Math.sin(v * 2 * Math.PI * 40)) * 0.5 + 0.5;
    const t = 0.8 + weave * 0.15 + n(u, v) * 0.15;
    return { r: 176 * t, g: 148 * t, b: 102 * t, h: weave, rough: 1 };
  }, [2, 2]);
}

/** A single texture with text written by hand on wood or paper. */
export function writing(lines: string[], opts: { w: number; h: number; bg: string; ink: string; font: string; lineHeight: number; rotateJitter?: number; seed?: number }): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = opts.w;
  c.height = opts.h;
  const g = c.getContext('2d')!;
  g.fillStyle = opts.bg;
  g.fillRect(0, 0, opts.w, opts.h);
  // a little irregularity in the background
  const rnd = makeRng(opts.seed ?? 1);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(0,0,0,${rnd() * 0.05})`;
    g.fillRect(rnd() * opts.w, rnd() * opts.h, 2 + rnd() * 20, 1 + rnd() * 3);
  }
  g.fillStyle = opts.ink;
  g.font = opts.font;
  g.textBaseline = 'middle';
  lines.forEach((line, i) => {
    g.save();
    g.translate(opts.w * 0.06, opts.lineHeight * (i + 0.8));
    g.rotate((rnd() - 0.5) * (opts.rotateJitter ?? 0));
    g.fillText(line, 0, 0);
    g.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function material(set: TextureSet, opts: THREE.MeshStandardMaterialParameters & { bump?: number } = {}): THREE.MeshStandardMaterial {
  const { bump, ...rest } = opts;
  return new THREE.MeshStandardMaterial({
    map: set.map,
    bumpMap: set.bumpMap,
    bumpScale: bump ?? 1.5,
    roughnessMap: set.roughnessMap,
    roughness: 1,
    ...rest,
  });
}
