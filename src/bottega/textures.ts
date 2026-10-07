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

export interface Canvases {
  color: HTMLCanvasElement;
  height: HTMLCanvasElement;
  rough: HTMLCanvasElement;
}

/** Renders color, height and roughness from a single per-pixel function. */
function bake(size: number, pixel: Pixel): Canvases {
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
  return { color: cc, height: hc, rough: rc };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Coarse jute for the sacks. */
function burlap(seed: number): Canvases {
  const n = makeFbm(seed, 4, 3);
  return bake(512, (u, v) => {
    const weave = (Math.sin(u * 2 * Math.PI * 40) * Math.sin(v * 2 * Math.PI * 40)) * 0.5 + 0.5;
    const t = 0.8 + weave * 0.15 + n(u, v) * 0.15;
    return { r: 176 * t, g: 148 * t, b: 102 * t, h: weave, rough: 1 };
  });
}

// ------------------------------------------------------------------ hand-painted style

type RGB = [number, number, number];
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
/** Soft posterization: pulls a value towards a few bands, like paint applied in strokes. */
const bands = (x: number, n: number, k = 0.55) => mix(x, Math.round(x * n) / n, k);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * A four-stop color ramp: deep shadow (cool), shadow, base, highlight (warm).
 * Shadows lean to violet and highlights to gold: the classic trick of
 * painted game art, which keeps colors alive instead of greying them out.
 */
function ramp(stops: [RGB, RGB, RGB, RGB], t: number): RGB {
  const x = clamp01(t) * 3;
  const i = Math.min(2, Math.floor(x));
  return lerp3(stops[i], stops[i + 1], x - i);
}

/** Painted floorboards: broad strokes along the grain, a dark line and a lit edge on every board. */
function paintedPlanks(seed: number, opts: { boards: number; stops: [RGB, RGB, RGB, RGB]; size: number; worn?: boolean }): Canvases {
  const streak = makeFbm(seed, 6, 4);
  const blot = makeFbm(seed + 3, 2, 3);
  const rnd = makeRng(seed);
  const tone = Array.from({ length: opts.boards }, () => (rnd() - 0.5) * 0.22);
  const offset = Array.from({ length: opts.boards }, () => rnd());
  const knots = Array.from({ length: opts.boards }, (_, b) => ({ b, v: rnd(), r: 0.012 + rnd() * 0.012, on: rnd() < 0.6 }));
  return bake(opts.size, (u, v) => {
    const bu = u * opts.boards;
    const b = Math.floor(bu);
    const x = bu - b;
    const jv = (v + offset[b]) % 1;
    // streaks stretched along the board, then banded like brush strokes
    const st = streak(u * 3 + b * 0.31, v * 0.35 + offset[b]);
    let t = 0.55 + tone[b] + (st - 0.5) * 0.7;
    t = bands(t, 5);
    // painted lighting across the board: lit left edge, shaded right edge
    t += x < 0.12 ? (0.12 - x) * 1.6 : 0;
    t -= x > 0.8 ? (x - 0.8) * 1.2 : 0;
    // knots: a dark painted swirl
    const kn = knots[b];
    if (kn.on) {
      const d = Math.hypot((x - 0.5) * 0.6, (jv - kn.v) * opts.boards * 0.25);
      if (d < kn.r * 6) t -= 0.35 * (1 - d / (kn.r * 6)) * (0.6 + 0.4 * Math.sin(d * 400));
    }
    if (opts.worn) t += Math.max(0, blot(u, v) - 0.55) * 0.6;
    const edge = x < 0.03 || x > 0.985 || Math.abs(jv - 0.5) < 0.004;
    if (edge) return { r: 38, g: 22, b: 18, h: 0, rough: 1 };
    const [r, g, bl] = ramp(opts.stops, t);
    return { r, g, b: bl, h: 0.6 + Math.min(x, 1 - x) * 0.8, rough: 0.92 };
  });
}

/** Painted lime plaster: warm cream, soft blotches of peach and grey, visible brushwork. */
function paintedPlaster(seed: number): Canvases {
  const blot = makeFbm(seed, 3, 4);
  const brush = makeFbm(seed + 9, 14, 3);
  const cracks = makeFbm(seed + 23, 6, 3);
  const mask = makeFbm(seed + 29, 2, 2);
  const stops: [RGB, RGB, RGB, RGB] = [
    [150, 128, 120],
    [205, 182, 150],
    [236, 218, 178],
    [252, 238, 200],
  ];
  return bake(1024, (u, v) => {
    let t = 0.62 + (blot(u, v) - 0.5) * 0.7 + (brush(u * 1.6 + v * 0.4, v) - 0.5) * 0.25;
    t = bands(t, 6, 0.4);
    const c = cracks(u, v);
    const crack = mask(u, v) > 0.6 && Math.abs(c - 0.5) < 0.006;
    const rim = mask(u, v) > 0.6 && Math.abs(c - 0.5) < 0.012 && c > 0.5;
    if (crack) t = 0.15;
    else if (rim) t += 0.15;
    const [r, g, b] = ramp(stops, t);
    return { r, g, b, h: 0.5 + brush(u, v) * 0.3 - (crack ? 0.4 : 0), rough: 0.95 };
  });
}

/** Painted stones: each one lit from above, with a warm mortar between. */
function paintedStone(seed: number, size: number, cells: number): Canvases {
  const n = makeFbm(seed, 8, 3);
  const rnd = makeRng(seed);
  const palettes: [RGB, RGB, RGB, RGB][] = [
    [[60, 58, 78], [112, 108, 120], [156, 150, 150], [206, 196, 176]],
    [[70, 60, 66], [124, 112, 104], [170, 156, 134], [214, 200, 168]],
    [[58, 64, 76], [100, 112, 118], [146, 156, 154], [196, 204, 190]],
  ];
  const pts = Array.from({ length: cells * cells }, (_, i) => ({
    x: ((i % cells) + 0.2 + rnd() * 0.6) / cells,
    y: (Math.floor(i / cells) + 0.2 + rnd() * 0.6) / cells,
    p: palettes[Math.floor(rnd() * palettes.length)],
    t: (rnd() - 0.5) * 0.25,
  }));
  return bake(size, (u, v) => {
    let d1 = 9;
    let d2 = 9;
    let best = pts[0];
    let dy = 0;
    for (const p of pts) {
      for (const ox of [-1, 0, 1]) {
        for (const oy of [-1, 0, 1]) {
          const d = Math.hypot(u - p.x - ox, (v - p.y - oy) * 1.3);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            best = p;
            dy = v - p.y - oy;
          } else if (d < d2) d2 = d;
        }
      }
    }
    const gap = d2 - d1;
    if (gap < 0.018) return { r: 74, g: 58, b: 48, h: 0, rough: 1 };
    // light painted from above: top of each stone bright, bottom dark
    let t = 0.55 + best.t - dy * cells * 0.9 + (n(u, v) - 0.5) * 0.3;
    if (gap < 0.035) t -= 0.18; // darker rim near the mortar
    t = bands(t, 4, 0.5);
    const [r, g, b] = ramp(best.p, t);
    return { r, g, b, h: clamp01(gap * 12), rough: 0.95 };
  });
}

/** Painted furniture wood: long banded strokes, no gaps. */
function paintedWood(seed: number, stops: [RGB, RGB, RGB, RGB]): Canvases {
  const streak = makeFbm(seed, 5, 4);
  const fine = makeFbm(seed + 2, 40, 2);
  return bake(512, (u, v) => {
    let t = 0.55 + (streak(u * 2.5, v * 0.4) - 0.5) * 0.8 + (fine(u * 3, v * 0.5) - 0.5) * 0.12;
    t = bands(t, 5);
    const [r, g, b] = ramp(stops, t);
    return { r, g, b, h: 0.5 + (t - 0.5) * 0.5, rough: 0.9 };
  });
}

const WOOD_DARK: [RGB, RGB, RGB, RGB] = [
  [34, 20, 28],
  [70, 40, 30],
  [112, 66, 40],
  [160, 104, 60],
];
const WOOD_MID: [RGB, RGB, RGB, RGB] = [
  [52, 30, 34],
  [104, 62, 38],
  [150, 96, 54],
  [204, 146, 84],
];
const WOOD_PALE: [RGB, RGB, RGB, RGB] = [
  [80, 56, 52],
  [150, 108, 70],
  [196, 152, 98],
  [236, 200, 140],
];
const FLOOR: [RGB, RGB, RGB, RGB] = [
  [46, 26, 30],
  [98, 56, 36],
  [146, 92, 50],
  [200, 140, 80],
];

/**
 * Every material of the shop, by name. Generating them takes seconds, so
 * they are baked once into image files (npm run bake) under
 * public/textures/, and the game only loads the images. To use a real
 * photographed material instead, replace the three files of a name.
 */
export const RECIPES: Record<string, () => Canvases> = {
  floor: () => paintedPlanks(7, { boards: 5, stops: FLOOR, size: 1024, worn: true }),
  ceiling: () => paintedPlanks(17, { boards: 6, stops: WOOD_DARK, size: 1024 }),
  plaster: () => paintedPlaster(3),
  threshold: () => paintedStone(5, 512, 4),
  plinth: () => paintedStone(9, 1024, 6),
  woodDark: () => paintedWood(31, WOOD_DARK),
  woodMid: () => paintedWood(32, WOOD_MID),
  woodPale: () => paintedWood(33, WOOD_PALE),
  staves: () => paintedWood(51, WOOD_MID),
  burlap: () => burlap(41),
};

const loader = new THREE.TextureLoader();

/** Loads a baked material by name, tiled `repeat` times. */
export function texSet(name: string, repeat: [number, number] = [1, 1]): TextureSet {
  const load = (kind: 'color' | 'height' | 'rough', srgb: boolean) => {
    const t = loader.load(`${import.meta.env.BASE_URL}textures/${name}_${kind}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: load('color', true), bumpMap: load('height', false), roughnessMap: load('rough', false) };
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
  // Painted surfaces carry their relief in the color: keep the bump subtle.
  return new THREE.MeshStandardMaterial({
    map: set.map,
    bumpMap: set.bumpMap,
    bumpScale: (bump ?? 1.5) * 0.4,
    roughnessMap: set.roughnessMap,
    roughness: 1,
    ...rest,
  });
}
