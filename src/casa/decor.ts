import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { blanketTex, quiltTex, ragRugTex } from './furniture';
import { checkTex } from './kitchen';

/**
 * The house as the player makes it: the colour of the limewash, the cloth
 * of the curtains, the cover on the bed, the rug by the fire. Each change
 * is a small piece of work done by hand (an evening with needle and
 * thread, a day with the lime bucket), never a menu of furniture.
 */

export interface Choice {
  id: string;
  title: string;
  note: string;
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------------ limewash

/** How each colour of lime shifts the painted walls (they are warm cream underneath). */
export const WALLS: (Choice & { tint: [number, number, number] })[] = [
  { id: 'paglia', title: 'Calce color paglia', note: 'com’era quando sei arrivato', tint: [1, 1, 1] },
  { id: 'bianca', title: 'Calce bianca', note: 'luminosa, da rifare spesso', tint: [1.08, 1.12, 1.24] },
  { id: 'rosa', title: 'Rosa antico', note: 'con un pugno di terra rossa', tint: [1.12, 0.86, 0.84] },
  { id: 'azzurro', title: 'Azzurro polvere', note: 'come le case dei pescatori', tint: [0.76, 0.92, 1.22] },
  { id: 'salvia', title: 'Verde salvia', note: 'con l’ossido di rame di Ottavio', tint: [0.86, 1.04, 0.78] },
];

// ------------------------------------------------------------------ curtains

function linen(): THREE.CanvasTexture {
  return canvasTex(128, 256, (g) => {
    g.fillStyle = '#efe6d4';
    g.fillRect(0, 0, 128, 256);
    g.fillStyle = 'rgba(0,0,0,0.035)';
    for (let i = 0; i < 128; i += 3) g.fillRect(i, 0, 1, 256);
    g.strokeStyle = '#4a6a9a';
    g.lineWidth = 2;
    for (const y of [222, 232]) {
      g.beginPath();
      for (let x = 0; x <= 128; x += 8) g.lineTo(x, y + (x % 16 ? 4 : 0));
      g.stroke();
    }
  });
}
function sprigs(base: string, ink: string, seed: number): THREE.CanvasTexture {
  return canvasTex(256, 256, (g) => {
    const rnd = makeRng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    for (let y = 16; y < 256; y += 32) {
      for (let x = (y / 32) % 2 ? 0 : 16; x < 256; x += 32) {
        g.fillStyle = ink;
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          g.beginPath();
          g.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.5, 2, a, 0, Math.PI * 2);
          g.fill();
        }
        g.strokeStyle = '#5a7a4a';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x, y + 5);
        g.quadraticCurveTo(x + 3 + rnd() * 3, y + 10, x + 1, y + 13);
        g.stroke();
      }
    }
  });
}
function saffron(): THREE.CanvasTexture {
  return canvasTex(128, 256, (g) => {
    g.fillStyle = '#e0b04a';
    g.fillRect(0, 0, 128, 256);
    g.fillStyle = 'rgba(120,60,10,0.08)';
    for (let i = 0; i < 128; i += 3) g.fillRect(i, 0, 1, 256);
    g.fillStyle = '#a8502a';
    g.fillRect(0, 226, 128, 6);
    g.fillRect(0, 238, 128, 3);
  });
}
export const CURTAINS: (Choice & { tex: () => THREE.Texture })[] = [
  { id: 'lino', title: 'Lino grezzo', note: 'con l’orlo di punto blu', tex: linen },
  { id: 'quadretti', title: 'Quadretti rossi', note: 'come la tenda della madia', tex: () => checkTex(91, '#a8302a') },
  { id: 'fiorellini', title: 'Fiorellini blu', note: 'una pezza di Clelia, dal telaio di casa Monti', tex: () => sprigs('#efe6d4', '#3e5a8e', 4) },
  { id: 'zafferano', title: 'Giallo zafferano', note: 'tinta con lo zafferano, sbiadirà al sole', tex: saffron },
];

// ------------------------------------------------------------------ the bed

function crochet(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (g) => {
    // granny squares: rings of colour in cream, joined in a grid
    const rnd = makeRng(21);
    const pal = ['#c8503a', '#e0b04a', '#4a6a9a', '#7a9a5a', '#9a5a7a', '#d88a4a'];
    g.fillStyle = '#efe6d2';
    g.fillRect(0, 0, 1024, 1024);
    const n = 8;
    const s = 1024 / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const cx = x * s + s / 2;
        const cy = y * s + s / 2;
        for (let r = 4; r >= 1; r--) {
          g.fillStyle = r === 4 ? '#efe6d2' : pal[Math.floor(rnd() * pal.length)];
          const w = (r / 4) * s * 0.44;
          g.fillRect(cx - w, cy - w, w * 2, w * 2);
        }
        g.fillStyle = 'rgba(40,30,20,0.25)';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          g.beginPath();
          g.arc(cx - s * 0.33 + i * s * 0.22, cy - s * 0.33 + j * s * 0.22, 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  });
}
function indigo(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#2e4a72';
    g.fillRect(0, 0, 512, 512);
    // resist-dyed dots and lines, white on indigo
    g.fillStyle = 'rgba(240,236,224,0.85)';
    for (let y = 16; y < 512; y += 32) for (let x = (y / 32) % 2 ? 0 : 16; x < 512; x += 32) {
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(240,236,224,0.6)';
    g.lineWidth = 3;
    for (let y = 0; y < 512; y += 128) {
      g.beginPath();
      g.moveTo(0, y + 64);
      for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + 64 + Math.sin(x * 0.05) * 6);
      g.stroke();
    }
  });
}
export const QUILTS: (Choice & { tex: () => THREE.Texture })[] = [
  { id: 'patchwork', title: 'La trapunta di pezze', note: 'quella che c’era già', tex: quiltTex },
  { id: 'lana', title: 'La coperta di lana a righe', note: 'pesante, per l’inverno', tex: blanketTex },
  { id: 'uncinetto', title: 'La coperta all’uncinetto', note: 'quadrati di tutti i colori, fatti da qualcuno con pazienza', tex: crochet },
  { id: 'indaco', title: 'La coperta indaco', note: 'tinta a riserva, venuta da lontano', tex: indigo },
];

// ------------------------------------------------------------------ the rug

function stripedRug(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (g) => {
    const pal = ['#8a3a2a', '#d8b878', '#4a5a6a', '#d8b878', '#6a7a4a', '#d8b878'];
    for (let i = 0; i < 24; i++) {
      g.fillStyle = pal[i % pal.length];
      g.fillRect(0, i * (1024 / 24), 1024, 1024 / 24 + 1);
    }
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 1024; i += 4) g.fillRect(i, 0, 2, 1024);
  });
}
function redOval(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (g) => {
    g.fillStyle = '#8a2a22';
    g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = '#d8b06a';
    g.lineWidth = 18;
    for (const r of [470, 400]) {
      g.beginPath();
      g.arc(512, 512, r, 0, Math.PI * 2);
      g.stroke();
    }
    // a star of eight points in the middle, as on the rugs from the south
    g.fillStyle = '#d8b06a';
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 ? 90 : 220;
      g.lineTo(512 + Math.cos(a) * r, 512 + Math.sin(a) * r);
    }
    g.fill();
    g.fillStyle = '#2e3a5a';
    g.beginPath();
    g.arc(512, 512, 60, 0, Math.PI * 2);
    g.fill();
  });
}
export const RUGS: (Choice & { tex: (() => THREE.Texture) | null })[] = [
  { id: 'intrecciato', title: 'Il tappeto di stracci intrecciati', note: 'quello di sempre', tex: ragRugTex },
  { id: 'righe', title: 'Il tappeto a righe', note: 'tessuto al telaio, robusto', tex: stripedRug },
  { id: 'rosso', title: 'Il tappeto rosso con la stella', note: 'il più bello, e il più delicato', tex: redOval },
  { id: 'nessuno', title: 'Nessun tappeto', note: 'arrotolato in un angolo, il pavimento nudo', tex: null },
];

const texCache = new Map<string, THREE.Texture>();
const cached = (id: string, make: () => THREE.Texture) => {
  let t = texCache.get(id);
  if (!t) {
    t = make();
    texCache.set(id, t);
  }
  return t;
};

export interface DecorState {
  wall: string;
  curtain: string;
  quilt: string;
  rug: string;
}
export const DEFAULT_DECOR: DecorState = { wall: 'paglia', curtain: 'lino', quilt: 'patchwork', rug: 'intrecciato' };

/** Puts the chosen colours and cloths on the house. */
export function applyDecor(root: THREE.Object3D, d: { curtains: THREE.Mesh[]; quilt: THREE.Mesh; rug: THREE.Mesh; rolled: THREE.Object3D }, s: DecorState): void {
  const wall = WALLS.find((w) => w.id === s.wall) ?? WALLS[0];
  root.traverse((o) => {
    if (o.userData.wall) ((o as THREE.Mesh).material as THREE.MeshToonMaterial).color.setRGB(...wall.tint);
  });
  const cur = CURTAINS.find((c) => c.id === s.curtain) ?? CURTAINS[0];
  for (const m of d.curtains) {
    const mat = m.material as THREE.MeshToonMaterial;
    mat.map = cached(`c:${cur.id}`, cur.tex);
    mat.needsUpdate = true;
  }
  const q = QUILTS.find((c) => c.id === s.quilt) ?? QUILTS[0];
  const qm = d.quilt.material as THREE.MeshToonMaterial;
  qm.map = cached(`q:${q.id}`, q.tex);
  qm.needsUpdate = true;
  const r = RUGS.find((c) => c.id === s.rug) ?? RUGS[0];
  d.rug.visible = r.tex !== null;
  d.rolled.visible = r.tex === null;
  if (r.tex) {
    const rm = d.rug.material as THREE.MeshToonMaterial;
    rm.map = cached(`r:${r.id}`, r.tex);
    rm.needsUpdate = true;
  }
}
