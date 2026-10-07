import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { toon } from '../stile/paint';

/**
 * Books, each one different: its own size, binding, colour, wear, and a
 * spine painted by hand with its own title (sometimes legible, often just
 * the shape of writing). Spines are drawn into a shared atlas so a hundred
 * books cost one texture.
 */

const SLOT_W = 64;
const SLOT_H = 256;
const COLS = 32;
const ROWS = 8;

class Atlas {
  canvas = document.createElement('canvas');
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  next = 0;
  constructor() {
    this.canvas.width = SLOT_W * COLS;
    this.canvas.height = SLOT_H * ROWS;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
  }
  full() {
    return this.next >= COLS * ROWS;
  }
  /** Reserves a slot and returns its pixel origin and a texture that shows only that slot. */
  slot(): { x: number; y: number; tex: THREE.Texture } {
    const i = this.next++;
    const x = (i % COLS) * SLOT_W;
    const y = Math.floor(i / COLS) * SLOT_H;
    const t = this.tex.clone();
    t.repeat.set(1 / COLS, 1 / ROWS);
    t.offset.set(x / this.canvas.width, 1 - (y + SLOT_H) / this.canvas.height);
    return { x, y, tex: t };
  }
}
let atlas: Atlas | null = null;
const atlases: Atlas[] = [];
/** Call after building all the books so the atlas pixels are uploaded once. */
export function flushBookAtlas(): void {
  for (const a of atlases) a.tex.needsUpdate = true;
}

const LEATHERS = ['#6a2a22', '#7a3a24', '#4a2a1e', '#5a3a2a', '#8a5a34', '#3a2a22', '#6a4a2a', '#2e3a2a'];
const CLOTHS = ['#2e4a6a', '#3a5a3a', '#7a2a2e', '#a87a3a', '#5a3a5a', '#2a5a5a', '#8a4a2a', '#4a4a5a', '#9a8a5a', '#6a6a3a', '#b0503a', '#3a3a3a', '#c8a050', '#5a6a8a'];
const VELLUM = ['#e8dcc0', '#dccca4', '#efe4c8'];
/** Some titles are legible: books of this world, and a few old friends. */
const TITLES = [
  'Erbario',
  'Almanacco',
  'Cronache di Valle',
  'Dei funghi',
  'Il Lago',
  'Rimedi',
  'Lettere',
  'Salmi',
  'Gargantua',
  'Pantagruele',
  'Viaggi',
  'Del tempo',
  'Canti',
  'Le stelle',
  'Mappe',
  'Ricette',
  'Il giardino',
  'Favole',
  'Poesie',
  'Conti 1890',
  'Diario',
  'Proverbi',
  'Le api',
  'Il bosco',
  'Storie',
  'Grammatica',
  'Il mulino',
  'Ulisse',
  'Cognizione',
];

const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return `#${c.getHexString()}`;
};

/** A line of pretend handwriting or lettering: little strokes that look like words. */
function scribble(g: CanvasRenderingContext2D, x: number, y: number, len: number, size: number, rnd: () => number): void {
  g.beginPath();
  let cx = x;
  while (cx < x + len) {
    const word = 2 + Math.floor(rnd() * 5);
    g.moveTo(cx, y);
    for (let i = 0; i < word && cx < x + len; i++) {
      const up = rnd() < 0.2 ? size * 1.6 : size;
      g.quadraticCurveTo(cx + size * 0.3, y - up, cx + size * 0.6, y);
      cx += size * 0.7;
    }
    cx += size * 0.9;
  }
  g.stroke();
}

interface Spine {
  base: string;
  kind: 'leather' | 'cloth' | 'vellum';
}

/** Paints one spine into the atlas. Canvas is 64 wide (across the spine) and 256 tall (head at the top). */
function paintSpine(g: CanvasRenderingContext2D, ox: number, oy: number, seed: number, sp: Spine): void {
  const rnd = makeRng(seed * 7 + 3);
  const W = SLOT_W;
  const H = SLOT_H;
  g.save();
  g.translate(ox, oy);
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();
  // the ground: a rounded spine catches light in the middle and darkens at the joints
  const grd = g.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, shade(sp.base, 0.7));
  grd.addColorStop(0.45, shade(sp.base, 1.12));
  grd.addColorStop(1, shade(sp.base, 0.72));
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // texture of the material
  if (sp.kind === 'cloth') {
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
  } else if (sp.kind === 'leather') {
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,230,200,0.06)';
      g.beginPath();
      g.ellipse(rnd() * W, rnd() * H, 2 + rnd() * 8, 2 + rnd() * 12, rnd(), 0, Math.PI * 2);
      g.fill();
    }
  }
  // wear: rubbed head and tail, a scuff or two
  g.fillStyle = 'rgba(230,210,170,0.25)';
  g.fillRect(0, 0, W, 3 + rnd() * 4);
  g.fillRect(0, H - 3 - rnd() * 4, W, 8);
  if (rnd() < 0.5) {
    g.fillStyle = 'rgba(220,200,160,0.18)';
    g.beginPath();
    g.ellipse(W * (0.3 + rnd() * 0.4), H * rnd(), 6 + rnd() * 10, 10 + rnd() * 20, 0, 0, Math.PI * 2);
    g.fill();
  }
  const gold = rnd() < 0.15 ? '#c8c8c0' : '#d8b04a';
  const ink = '#2a1e16';
  const style = sp.kind === 'vellum' ? 4 : Math.floor(rnd() * 4);
  const title = TITLES[Math.floor(rnd() * TITLES.length)];
  const legible = rnd() < 0.55;
  const writeVertical = (color: string, size: number, x0: number, y0: number, len: number, font: string) => {
    g.save();
    g.translate(x0, y0);
    g.rotate(Math.PI / 2);
    g.fillStyle = color;
    g.strokeStyle = color;
    g.lineWidth = 1.6;
    if (legible) {
      g.font = `${font} ${size}px Georgia, 'Times New Roman', serif`;
      g.textBaseline = 'middle';
      const w = g.measureText(title).width;
      const s = Math.min(1, len / w);
      g.scale(s, 1);
      g.fillText(title, 0, 0);
    } else scribble(g, 0, size * 0.3, len, size * 0.55, rnd);
    g.restore();
  };
  if (style === 0) {
    // raised bands, a dark title label between the first two
    const bands = 4 + Math.floor(rnd() * 2);
    const ys: number[] = [];
    for (let i = 0; i < bands; i++) ys.push(H * (0.12 + (i / (bands - 1)) * 0.76));
    for (const y of ys) {
      g.fillStyle = shade(sp.base, 0.55);
      g.fillRect(0, y - 4, W, 8);
      g.fillStyle = 'rgba(255,240,210,0.25)';
      g.fillRect(0, y - 4, W, 2);
      g.strokeStyle = gold;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(0, y - 6);
      g.lineTo(W, y - 6);
      g.moveTo(0, y + 6);
      g.lineTo(W, y + 6);
      g.stroke();
    }
    const label = rnd() < 0.7;
    if (label) {
      g.fillStyle = rnd() < 0.5 ? '#2a1a14' : '#6a1e1a';
      g.fillRect(6, ys[0] + 9, W - 12, ys[1] - ys[0] - 18);
    }
    g.fillStyle = gold;
    g.font = `bold 13px Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const short = legible ? title.split(' ')[0].slice(0, 7) : '';
    if (short) {
      const w = g.measureText(short).width;
      g.save();
      g.translate(W / 2, (ys[0] + ys[1]) / 2);
      g.scale(Math.min(1, (W - 16) / w), 1);
      g.fillText(short, 0, 0);
      g.restore();
    } else {
      g.strokeStyle = gold;
      g.lineWidth = 1.5;
      scribble(g, 12, (ys[0] + ys[1]) / 2 + 3, W - 24, 7, rnd);
    }
    // a small tooled flower in the other panels
    for (let i = 1; i < ys.length - 1; i++) {
      const cy = (ys[i] + ys[i + 1]) / 2;
      g.fillStyle = gold;
      for (let p = 0; p < 4; p++) {
        const a = (p / 4) * Math.PI * 2 + 0.78;
        g.beginPath();
        g.ellipse(W / 2 + Math.cos(a) * 4, cy + Math.sin(a) * 4, 3, 1.5, a, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (style === 1) {
    // a paper label, pasted on and written in ink, a bit crooked and stained
    const ly = H * (0.1 + rnd() * 0.15);
    const lh = H * (0.25 + rnd() * 0.2);
    g.save();
    g.translate(W / 2, ly + lh / 2);
    g.rotate((rnd() - 0.5) * 0.06);
    g.fillStyle = rnd() < 0.5 ? '#efe4c8' : '#e2d2a8';
    g.fillRect(-W / 2 + 7, -lh / 2, W - 14, lh);
    g.strokeStyle = 'rgba(80,50,30,0.3)';
    g.strokeRect(-W / 2 + 9, -lh / 2 + 2, W - 18, lh - 4);
    g.restore();
    writeVertical(ink, 15, W / 2 - 6, ly + 8, lh - 16, 'italic');
    if (rnd() < 0.5) {
      g.fillStyle = 'rgba(120,80,40,0.25)';
      g.beginPath();
      g.arc(W * 0.6, ly + lh * 0.7, 8, 0, Math.PI * 2);
      g.fill();
    }
    // a library number at the foot
    g.fillStyle = '#efe4c8';
    g.fillRect(12, H - 34, W - 24, 18);
    g.fillStyle = ink;
    g.font = '11px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(String(1 + Math.floor(rnd() * 99)), W / 2, H - 21);
  } else if (style === 2) {
    // a cloth binding with the title lettered straight on the spine, two rules at head and foot
    g.strokeStyle = gold;
    g.lineWidth = 2;
    for (const y of [10, 16, H - 16, H - 10]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    writeVertical(gold, 18, W / 2 - 7, 30, H - 70, '');
    // the publisher's little mark
    g.fillStyle = gold;
    g.beginPath();
    g.arc(W / 2, H - 32, 4, 0, Math.PI * 2);
    g.fill();
  } else if (style === 3) {
    // a plain old binding, the gilt almost gone: only a ghost of a title and a few bands
    for (let i = 0; i < 3; i++) {
      const y = H * (0.2 + i * 0.3);
      g.strokeStyle = 'rgba(216,176,74,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    g.globalAlpha = 0.45;
    writeVertical(gold, 14, W / 2 - 5, H * 0.24, H * 0.24, '');
    g.globalAlpha = 1;
  } else {
    // vellum, the title handwritten down the spine in brown ink
    writeVertical('#5a3a22', 16, W / 2 - 6, 24, H - 60, 'italic');
    g.strokeStyle = 'rgba(90,60,30,0.3)';
    g.lineWidth = 3;
    for (const y of [H * 0.15, H * 0.85]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y + (rnd() - 0.5) * 4);
      g.stroke();
    }
  }
  g.restore();
}

/** Page edges: fine lines, yellower and darker towards the outside. */
let pageTex: THREE.CanvasTexture | null = null;
function pagesMaterial(seed: number): THREE.Material {
  if (!pageTex) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#eee2c4';
    g.fillRect(0, 0, 64, 128);
    const rnd = makeRng(5);
    for (let x = 0; x < 64; x++) {
      g.fillStyle = `rgba(120,90,50,${0.04 + rnd() * 0.1})`;
      g.fillRect(x, 0, 1, 128);
    }
    pageTex = new THREE.CanvasTexture(c);
    pageTex.colorSpace = THREE.SRGBColorSpace;
  }
  const tones = [0xffffff, 0xf6ead0, 0xeedcb8, 0xe8d4a8];
  return toon({ map: pageTex, color: tones[seed % tones.length], rim: 0.1 });
}

const ribbonColors = [0x9a2a2a, 0x2a4a7a, 0xc89a3a, 0x3a6a3a];

/**
 * A book standing up: spine facing -z, height along y (base at y = 0),
 * thickness along x, depth along z. Every seed gives a different book.
 */
export function makeBook(seed: number, opts: { h?: number; t?: number; d?: number } = {}): THREE.Group {
  const rnd = makeRng(seed * 13 + 1);
  const h = opts.h ?? 0.17 + rnd() * 0.14;
  const t = opts.t ?? 0.018 + rnd() * rnd() * 0.06;
  const d = opts.d ?? h * (0.62 + rnd() * 0.15);
  const r = rnd();
  const sp: Spine =
    r < 0.4 ? { base: LEATHERS[Math.floor(rnd() * LEATHERS.length)], kind: 'leather' } : r < 0.88 ? { base: CLOTHS[Math.floor(rnd() * CLOTHS.length)], kind: 'cloth' } : { base: VELLUM[Math.floor(rnd() * VELLUM.length)], kind: 'vellum' };
  if (!atlas || atlas.full()) {
    atlas = new Atlas();
    atlases.push(atlas);
  }
  const slot = atlas.slot();
  paintSpine(atlas.ctx, slot.x, slot.y, seed, sp);
  const spineMat = toon({ map: slot.tex, rim: sp.kind === 'leather' ? 0.35 : 0.25 });
  const coverCol = new THREE.Color(sp.base).multiplyScalar(0.95);
  const coverMat = toon({ color: coverCol.getHex(), rim: 0.25 });
  const g = new THREE.Group();
  const board = 0.0035;
  const over = 0.004; // the boards stand a little proud of the pages
  // the boards
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(board, h, d - 0.004), coverMat);
    b.position.set(s * (t / 2 - board / 2), h / 2, 0.002);
    g.add(b);
  }
  // the pages, a little recessed
  const pages = new THREE.Mesh(new THREE.BoxGeometry(t - board * 2 - 0.001, h - over * 2, d - over - 0.006), pagesMaterial(seed));
  pages.position.set(0, h / 2, 0.002 - over / 2 + 0.003);
  g.add(pages);
  // the spine: rounded on most books, flat on the cheap ones
  const rounded = rnd() < 0.7 && t > 0.02;
  const spineGeo = rounded ? new THREE.CylinderGeometry(t / 2, t / 2, h, 10, 1, true, -Math.PI / 2, Math.PI) : new THREE.PlaneGeometry(t, h);
  if (rounded) {
    spineGeo.rotateY(Math.PI);
    spineGeo.scale(1, 1, 0.45);
  } else spineGeo.rotateY(Math.PI);
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.set(0, h / 2, -d / 2 + (rounded ? 0.002 : -0.0005));
  g.add(spine);
  // a ribbon hanging from the foot, or a slip of paper standing out of the head
  const extra = rnd();
  if (extra < 0.18) {
    const rib = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.03 + rnd() * 0.03), toon({ color: ribbonColors[Math.floor(rnd() * 4)], rim: 0.3, side: THREE.DoubleSide }));
    rib.position.set((rnd() - 0.5) * t * 0.5, -0.012, -d / 2 + 0.03);
    rib.rotation.set(0.3, Math.PI / 2, 0);
    g.add(rib);
  } else if (extra < 0.32) {
    const slip = new THREE.Mesh(new THREE.PlaneGeometry(0.04 + rnd() * 0.03, 0.03 + rnd() * 0.03), toon({ color: 0xf2e8d0, rim: 0.1, side: THREE.DoubleSide }));
    slip.position.set((rnd() - 0.5) * t * 0.4, h + 0.008, (rnd() - 0.3) * d * 0.5);
    slip.rotation.set(0, Math.PI / 2 + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.2);
    g.add(slip);
  }
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  g.userData.size = { h, t, d };
  return g;
}
