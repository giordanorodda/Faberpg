import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { flame } from '../casa/furniture';
import { bentBox, glass, herbBunch, lathe, liquid, M, organic, rbox, shadowed, toon } from '../stile/kit';

/**
 * Things that belong to the people of the village rather than to the
 * player's house: the herb-wife's mortar and drying rack, the map-maker's
 * stove, telescope and maps.
 */

const rope = (a: THREE.Vector3, b: THREE.Vector3, r = 0.003) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 5), M.rope);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
};

// ------------------------------------------------------------------ the herb-wife

/** A stone mortar with its pestle leaning in it. */
export function mortar(seed = 1): THREE.Group {
  const g = new THREE.Group();
  const stoneM = toon({ color: 0xa89c8a, rim: 0.2 });
  g.add(lathe([[0, 0], [0.085, 0], [0.095, 0.02], [0.098, 0.08], [0.09, 0.11], [0.075, 0.112], [0.07, 0.05], [0.04, 0.035], [0, 0.034]], stoneM, 28));
  const paste = new THREE.Mesh(new THREE.CircleGeometry(0.06, 18), toon({ color: 0x5a7a3a, rim: 0.2 }));
  paste.rotation.x = -Math.PI / 2;
  paste.position.y = 0.05;
  g.add(paste);
  const pestle = lathe([[0, 0], [0.024, 0.005], [0.026, 0.03], [0.014, 0.06], [0.013, 0.18], [0.018, 0.2], [0, 0.21]], toon({ color: 0xb8ac98, rim: 0.25 }), 14);
  pestle.position.set(0.02, 0.04, 0);
  pestle.rotation.z = -0.45;
  g.add(pestle);
  return organic(shadowed(g), 0.02, seed);
}

/** A three-legged iron pot, the kind that sits in the embers. */
export function cauldron(r = 0.2): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe([[0, 0.06], [r * 0.6, 0.06], [r * 0.95, r * 0.5 + 0.06], [r, r * 0.9 + 0.06], [r * 0.9, r * 1.25 + 0.06], [r * 0.95, r * 1.32 + 0.06], [r * 0.88, r * 1.32 + 0.06], [r * 0.82, r * 1.2 + 0.06], [0, r * 1.2 + 0.06]], M.iron, 28));
  const soup = new THREE.Mesh(new THREE.CircleGeometry(r * 0.84, 22), toon({ color: 0x6a7a3a, rim: 0.3, emissive: 0x1a1a08, emissiveIntensity: 0.3 }));
  soup.rotation.x = -Math.PI / 2;
  soup.position.y = r * 1.12 + 0.06;
  g.add(soup);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.08, 6), M.iron);
    leg.position.set(Math.cos(a) * r * 0.5, 0.04, Math.sin(a) * r * 0.5);
    g.add(leg);
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.95, 0.006, 6, 24, Math.PI), M.iron);
  handle.position.y = r * 1.32 + 0.06;
  handle.rotation.y = 0.4;
  g.add(handle);
  return shadowed(g);
}

/**
 * A drying rack: two uprights and three poles, bunches of herbs hung
 * head down from each, some fresh and green, some already gone to paper.
 */
export function dryingRack(w: number, seed = 5): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(seed);
  for (const s of [-1, 1]) {
    const up = rbox(0.06, 1.9, 0.06, M.wood, 0.012);
    up.position.set((s * w) / 2, 0.95, 0);
    g.add(up);
    const foot = rbox(0.08, 0.06, 0.5, M.wood, 0.012);
    foot.position.set((s * w) / 2, 0.03, 0);
    g.add(foot);
  }
  const fresh = [M.leaf, M.leafDark, M.dryHerb, toon({ color: 0x9a8ab8, rim: 0.3, side: THREE.DoubleSide }), toon({ color: 0xc8b04a, rim: 0.3, side: THREE.DoubleSide })];
  for (const [y, n] of [[1.75, 7], [1.32, 6], [0.9, 5]] as const) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, w + 0.12, 8), M.woodPale);
    pole.rotation.z = Math.PI / 2;
    pole.position.y = y;
    g.add(pole);
    for (let i = 0; i < n; i++) {
      const hb = herbBunch(seed * 31 + y * 10 + i, 0.03 + rnd() * 0.08, fresh[Math.floor(rnd() * fresh.length)]);
      hb.position.set(-w / 2 + 0.12 + ((i + 0.5) / n) * (w - 0.24) + (rnd() - 0.5) * 0.05, y, (rnd() - 0.5) * 0.04);
      hb.rotation.y = rnd() * 3;
      hb.scale.setScalar(0.9 + rnd() * 0.5);
      g.add(hb);
    }
  }
  return organic(shadowed(g), 0.01, seed);
}

/** A jar of something gathered: dried flowers, roots, seeds, a dark tincture. */
export function herbJar(seed: number, h = 0.16): THREE.Group {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const r = 0.045 + rnd() * 0.03;
  const kinds = [0x8a9a5a, 0xc8a04a, 0x7a4a6a, 0x5a3a2a, 0xd8c8a0, 0x4a6a3a, 0xa83a2a];
  const fill = 0.4 + rnd() * 0.5;
  const content = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, h * fill, 14), toon({ color: kinds[Math.floor(rnd() * kinds.length)], rim: 0.2 }));
  content.position.y = (h * fill) / 2 + 0.005;
  g.add(content);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16, 1, true), glass(rnd() < 0.3 ? 0xa8c8a0 : 0xe8eee8));
  jar.position.y = h / 2;
  g.add(jar);
  if (rnd() < 0.6) {
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.75, 0.03, 12), M.cork);
    cork.position.y = h + 0.01;
    g.add(cork);
  } else {
    // a cloth tied over the mouth with string
    const cloth = new THREE.Mesh(new THREE.SphereGeometry(r * 1.15, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), toon({ color: rnd() < 0.5 ? 0xd8c8a8 : 0xb86a4a, rim: 0.3, side: THREE.DoubleSide }));
    cloth.position.y = h - r * 0.4;
    g.add(organic(cloth, 0.1, seed));
  }
  if (rnd() < 0.7) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.1, h * 0.3), toon({ color: 0xf0e4c4, rim: 0.1 }));
    label.position.set(0, h * 0.5, r + 0.002);
    g.add(label);
  }
  return shadowed(g);
}

/** Open shelves on the wall, three boards on brackets. Faces +z. */
export function wallShelves(w: number, levels: number[], fill: (level: number, x: number) => THREE.Object3D | null, seed = 3): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(seed);
  for (const [li, y] of levels.entries()) {
    const b = bentBox(w, 0.03, 0.24, M.woodPale, 0.008, 0);
    b.position.set(0, y, 0.12);
    g.add(b);
    for (const s of [-1, 1]) {
      const br = rbox(0.03, 0.16, 0.18, M.wood, 0.005);
      br.position.set(s * (w / 2 - 0.12), y - 0.09, 0.1);
      g.add(br);
    }
    for (let x = -w / 2 + 0.08; x < w / 2 - 0.08; x += 0.09 + rnd() * 0.07) {
      const o = fill(li, x);
      if (!o) continue;
      o.position.set(x, y + 0.015, 0.12 + (rnd() - 0.5) * 0.06);
      o.rotation.y += (rnd() - 0.5) * 0.6;
      g.add(o);
    }
  }
  return shadowed(g);
}

/** A flat basket of something just picked. */
export function gatherBasket(seed: number): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(seed);
  const wicker = toon({ color: 0xb8925a, rim: 0.3 });
  g.add(lathe([[0, 0], [0.18, 0], [0.22, 0.09], [0.23, 0.1], [0.215, 0.1], [0.17, 0.012], [0, 0.012]], wicker, 24));
  for (let i = 0; i < 26; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), rnd() < 0.7 ? M.leaf : toon({ color: 0xe8d84a, rim: 0.4 }));
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 0.16;
    l.scale.set(1, 0.3, 0.6);
    l.position.set(Math.cos(a) * r, 0.06 + rnd() * 0.03, Math.sin(a) * r);
    l.rotation.set(rnd(), rnd() * 3, rnd());
    g.add(l);
  }
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 20, Math.PI), wicker);
  hoop.position.y = 0.1;
  g.add(hoop);
  return organic(shadowed(g), 0.02, seed);
}

// ------------------------------------------------------------------ the map-maker

/** A pot-bellied iron stove with its pipe going up through the ceiling. */
export function stove(ceiling: number): { group: THREE.Group; light: THREE.Vector3; flames: THREE.Mesh[] } {
  const g = new THREE.Group();
  const iron = toon({ color: 0x3a3638, rim: 0.4 });
  const body = lathe([[0, 0.18], [0.24, 0.18], [0.28, 0.3], [0.29, 0.5], [0.26, 0.68], [0.22, 0.74], [0.24, 0.76], [0.1, 0.8], [0.08, 0.8], [0, 0.8]], iron, 28);
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = lathe([[0, 0], [0.03, 0], [0.02, 0.06], [0.025, 0.18], [0, 0.18]], iron, 8);
    leg.position.set(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18);
    g.add(leg);
  }
  // the little door, open a crack, the fire behind it
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), toon({ color: 0xff8a3a, emissive: 0xff6a1a, emissiveIntensity: 1.4, rim: 0 }));
  glow.position.set(0, 0.42, 0.285);
  g.add(glow);
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 18, 1, false, 0, Math.PI * 2), iron);
  door.rotation.set(Math.PI / 2, 0, 0);
  const hinge = new THREE.Group();
  hinge.position.set(-0.1, 0.42, 0.29);
  door.position.set(0.1, 0, 0);
  hinge.add(door);
  hinge.rotation.y = -1.1;
  g.add(hinge);
  const flames = [flame(0.07, 11), flame(0.05, 12)];
  flames[0].position.set(-0.02, 0.36, 0.2);
  flames[1].position.set(0.04, 0.36, 0.18);
  g.add(...flames);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, ceiling - 0.8, 14), iron);
  pipe.position.y = 0.8 + (ceiling - 0.8) / 2;
  g.add(pipe);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), M.brass);
  collar.position.y = 1.4;
  g.add(collar);
  // a kettle on the top plate
  const kettle = lathe([[0, 0], [0.09, 0], [0.1, 0.05], [0.08, 0.11], [0.03, 0.13], [0, 0.135]], M.brass, 20);
  kettle.position.y = 0.8;
  g.add(kettle);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.1, 8), M.brass);
  spout.position.set(0.1, 0.87, 0);
  spout.rotation.z = -0.9;
  g.add(spout);
  return { group: shadowed(g), light: new THREE.Vector3(0, 0.5, 0.4), flames };
}

/** A brass telescope on a wooden tripod, pointed at the window. Looks along +z. */
export function telescope(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.3, 7), M.wood);
    leg.position.set(Math.sin(a) * 0.2, 0.62, Math.cos(a) * 0.2);
    leg.rotation.set(Math.cos(a) * -0.17, 0, Math.sin(a) * 0.17);
    g.add(leg);
  }
  const head = new THREE.Group();
  head.position.y = 1.27;
  const tube = lathe([[0, -0.45], [0.032, -0.45], [0.034, -0.1], [0.04, -0.1], [0.042, 0.3], [0.05, 0.32], [0.05, 0.36], [0, 0.36]], M.brass, 20);
  tube.rotation.x = Math.PI / 2;
  head.add(tube);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.07, 10), M.beam);
  eye.rotation.x = Math.PI / 2;
  eye.position.z = -0.48;
  head.add(eye);
  for (const z of [-0.2, 0.15]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.005, 6, 20), M.beam);
    band.position.z = z;
    head.add(band);
  }
  head.rotation.x = -0.12;
  g.add(head);
  return shadowed(g);
}

/** A globe on a turned stand, the seas faded to the colour of tea. */
export function globe(): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.16, 0], [0.16, 0.03], [0.05, 0.06], [0.03, 0.4], [0.05, 0.46], [0, 0.48]], M.beam, 18));
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#c8b48a';
  x.fillRect(0, 0, 512, 256);
  const rnd = makeRng(77);
  x.fillStyle = '#9a8a5a';
  for (let i = 0; i < 9; i++) {
    x.beginPath();
    const cx = rnd() * 512;
    const cy = 50 + rnd() * 160;
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const r = 20 + rnd() * 40;
      x.lineTo(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r);
    }
    x.fill();
  }
  x.strokeStyle = 'rgba(80,50,30,0.35)';
  for (let i = 0; i <= 8; i++) {
    x.beginPath();
    x.moveTo((i / 8) * 512, 0);
    x.lineTo((i / 8) * 512, 256);
    x.stroke();
  }
  for (let i = 1; i < 6; i++) {
    x.beginPath();
    x.moveTo(0, (i / 6) * 256);
    x.lineTo(512, (i / 6) * 256);
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 18), toon({ map: tex, rim: 0.4 }));
  ball.position.y = 0.66;
  ball.rotation.z = 0.41;
  g.add(ball);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.007, 6, 36), M.brass);
  ring.position.y = 0.66;
  ring.rotation.set(0, Math.PI / 2, 0.41);
  g.add(ring);
  return shadowed(g);
}

/**
 * A hand-drawn map: coasts and rivers, little hills in rows, woods as
 * clusters of circles, names in a slanting hand that cannot quite be read,
 * a compass rose in a corner. Each seed draws a different country.
 */
export function mapTex(seed: number, w = 1024, h = 720, unfinished = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;
  const rnd = makeRng(seed);
  const g = x.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, '#efe2bf');
  g.addColorStop(1, '#cdb184');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) {
    x.fillStyle = `rgba(140,100,50,${0.03 + rnd() * 0.05})`;
    x.beginPath();
    x.arc(rnd() * w, rnd() * h, 10 + rnd() * 60, 0, Math.PI * 2);
    x.fill();
  }
  const ink = 'rgba(60,40,25,0.85)';
  x.strokeStyle = ink;
  x.lineCap = 'round';
  // the coast, along one side
  x.lineWidth = 2.5;
  x.beginPath();
  let cx = w * (0.62 + rnd() * 0.15);
  for (let y = -10; y < h + 10; y += 14) {
    cx += (rnd() - 0.5) * 30;
    x.lineTo(cx, y);
  }
  x.stroke();
  for (let k = 1; k < 4; k++) {
    x.globalAlpha = 0.4 / k;
    x.translate(k * 8, 0);
    x.stroke();
    x.translate(-k * 8, 0);
  }
  x.globalAlpha = 1;
  // rivers wandering to the sea
  x.lineWidth = 1.6;
  for (let r = 0; r < 3; r++) {
    x.beginPath();
    let px = rnd() * w * 0.3;
    let py = rnd() * h;
    x.moveTo(px, py);
    while (px < cx - 10) {
      px += 8 + rnd() * 10;
      py += (rnd() - 0.5) * 24;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  // hills, in little rows
  x.lineWidth = 1.4;
  for (let i = 0; i < 40; i++) {
    const hx = rnd() * (cx - 60);
    const hy = rnd() * h;
    const s = 8 + rnd() * 8;
    x.beginPath();
    x.moveTo(hx - s, hy);
    x.quadraticCurveTo(hx, hy - s * 1.4, hx + s, hy);
    x.stroke();
  }
  // woods
  for (let k = 0; k < 4; k++) {
    const wx = rnd() * (cx - 120) + 40;
    const wy = rnd() * h;
    for (let i = 0; i < 26; i++) {
      x.beginPath();
      x.arc(wx + (rnd() - 0.5) * 110, wy + (rnd() - 0.5) * 70, 5 + rnd() * 3, 0, Math.PI * 2);
      x.stroke();
    }
  }
  // villages, and names nobody can read
  x.fillStyle = ink;
  x.font = 'italic 18px Georgia, serif';
  for (let i = 0; i < 7; i++) {
    const vx = rnd() * (cx - 80) + 30;
    const vy = rnd() * (h - 60) + 30;
    x.fillRect(vx - 3, vy - 3, 6, 6);
    let word = '';
    for (let j = 0; j < 5 + rnd() * 6; j++) word += 'mnuvwrlecoai'[Math.floor(rnd() * 12)];
    x.save();
    x.translate(vx + 8, vy - 6);
    x.rotate(-0.12);
    x.fillText(word, 0, 0);
    x.restore();
  }
  // the compass rose
  const rx = w * 0.88;
  const ry = h * 0.82;
  x.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const L = i % 2 ? 26 : 50;
    x.beginPath();
    x.moveTo(rx, ry);
    x.lineTo(rx + Math.sin(a) * L, ry - Math.cos(a) * L);
    x.stroke();
  }
  x.beginPath();
  x.arc(rx, ry, 18, 0, Math.PI * 2);
  x.stroke();
  x.font = 'bold 20px Georgia, serif';
  x.fillText('N', rx - 7, ry - 56);
  // the border, ruled twice
  x.lineWidth = 3;
  x.strokeRect(16, 16, w - 32, h - 32);
  x.lineWidth = 1;
  x.strokeRect(24, 24, w - 48, h - 48);
  if (unfinished) {
    // the night map: a blank corner with only pencilled guesses, and a question mark
    x.fillStyle = 'rgba(239,226,191,0.92)';
    x.beginPath();
    x.moveTo(w * 0.55, 0);
    x.quadraticCurveTo(w * 0.5, h * 0.4, w, h * 0.45);
    x.lineTo(w, 0);
    x.fill();
    x.strokeStyle = 'rgba(90,80,70,0.35)';
    x.setLineDash([6, 8]);
    x.beginPath();
    x.moveTo(w * 0.6, h * 0.05);
    x.bezierCurveTo(w * 0.7, h * 0.15, w * 0.75, h * 0.3, w * 0.95, h * 0.35);
    x.stroke();
    x.setLineDash([]);
    x.font = 'italic 60px Georgia, serif';
    x.fillStyle = 'rgba(60,40,25,0.5)';
    x.fillText('?', w * 0.8, h * 0.2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A sheet of map paper, lying flat, its corners curling up a little. */
export function mapSheet(w: number, d: number, tex: THREE.Texture): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, d, 16, 12);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const u = Math.abs(p.getX(i)) / (w / 2);
    const v = Math.abs(p.getZ(i)) / (d / 2);
    p.setY(i, Math.pow(Math.max(u, v), 6) * 0.025 + Math.pow(u * v, 4) * 0.02);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, toon({ map: tex, rim: 0.1, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}

/** A map pinned to the wall, one corner come loose. Faces +z. */
export function pinnedMap(w: number, h: number, tex: THREE.Texture, seed = 1): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(w, h, 12, 10);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / (w / 2);
    const v = p.getY(i) / (h / 2);
    p.setZ(i, Math.pow(Math.max(0, u) * Math.max(0, -v), 3) * 0.06 + Math.sin(u * 3 + seed) * 0.004);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, toon({ map: tex, rim: 0.1, side: THREE.DoubleSide }));
  g.add(m);
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1]]) {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), M.brass);
    pin.position.set(sx * (w / 2 - 0.02), sy * (h / 2 - 0.02), 0.006);
    g.add(pin);
  }
  return g;
}

/** A pair of brass dividers, lying open. */
export function dividers(): THREE.Group {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.0015, 0.14, 6), M.brass);
    leg.rotation.set(Math.PI / 2, 0, s * 0.25);
    leg.position.set(s * 0.017, 0.004, 0.07);
    g.add(leg);
  }
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 10), M.brass);
  head.position.y = 0.004;
  g.add(head);
  return g;
}

/** Maps rolled up and stood in a barrel, some tied with string. */
export function rolledMaps(seed = 4): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(seed);
  g.add(lathe([[0, 0], [0.18, 0], [0.2, 0.3], [0.19, 0.6], [0.175, 0.6], [0.185, 0.3], [0.165, 0.012], [0, 0.012]], M.staves, 24));
  for (const y of [0.08, 0.52]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.19 + (y > 0.3 ? -0.005 : 0.0), 0.008, 6, 24), M.iron);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
    g.add(hoop);
  }
  const papers = [0xefe2bf, 0xe2d2a8, 0xd8c498, 0xf2e8d0];
  for (let i = 0; i < 9; i++) {
    const r = 0.025 + rnd() * 0.02;
    const len = 0.6 + rnd() * 0.45;
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12, 1, true), toon({ color: papers[i % 4], rim: 0.3, side: THREE.DoubleSide }));
    const a = rnd() * Math.PI * 2;
    const d = rnd() * 0.11;
    roll.position.set(Math.cos(a) * d, len / 2 + 0.02, Math.sin(a) * d);
    roll.rotation.set((rnd() - 0.5) * 0.35, 0, (rnd() - 0.5) * 0.35);
    g.add(roll);
    if (rnd() < 0.5) {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(r + 0.002, 0.002, 4, 12), toon({ color: 0x8a2a2a, rim: 0.3 }));
      tie.rotation.x = Math.PI / 2;
      tie.position.y = len * 0.25;
      roll.add(tie);
    }
  }
  return organic(shadowed(g), 0.01, seed);
}

/** A game board between two players, the pieces mid-game. */
export function gameBoard(): THREE.Group {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      x.fillStyle = (i + j) % 2 ? '#5a3a22' : '#d8b886';
      x.fillRect(i * 32, j * 32, 32, 32);
    }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = rbox(0.36, 0.025, 0.36, [M.wood, M.wood, toon({ map: tex, rim: 0.2 }), M.wood, M.wood, M.wood] as never, 0.006);
  board.position.y = 0.0125;
  g.add(board);
  const rnd = makeRng(9);
  const light = toon({ color: 0xf0e4c8, rim: 0.5 });
  const dark = toon({ color: 0x2a1e18, rim: 0.5 });
  for (let k = 0; k < 18; k++) {
    const i = Math.floor(rnd() * 8);
    const j = Math.floor(rnd() * 8);
    if ((i + j) % 2 === 0) continue;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.012, 14), j < 4 ? dark : light);
    p.position.set(-0.158 + (i + 0.5) * 0.0395 + 0.0, 0.031, -0.158 + (j + 0.5) * 0.0395);
    g.add(p);
  }
  // two pieces already taken, by the board
  for (const [px, m] of [[0.22, light], [0.24, dark]] as const) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.012, 14), m);
    p.position.set(px, 0.006, 0.12 - px * 0.3);
    g.add(p);
  }
  return shadowed(g);
}

/** A magnifying lens on a stand, for the small work on the instrument bench. */
export function lens(): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.05, 0], [0.05, 0.015], [0.01, 0.025], [0, 0.025]], M.iron, 16));
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6), M.brass);
  arm.position.set(0, 0.12, 0);
  g.add(arm);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.005, 6, 20), M.brass);
  ring.position.set(0, 0.22, 0.03);
  ring.rotation.x = -0.6;
  g.add(ring);
  const pane = new THREE.Mesh(new THREE.CircleGeometry(0.038, 18), glass(0xe8f0f0));
  pane.position.copy(ring.position);
  pane.rotation.copy(ring.rotation);
  g.add(pane);
  return shadowed(g);
}

/** A compass in pieces: the case, the needle, the glass, a tiny screwdriver. */
export function brokenCompass(): THREE.Group {
  const g = new THREE.Group();
  const cs = lathe([[0, 0], [0.045, 0], [0.048, 0.015], [0.044, 0.02], [0.04, 0.008], [0, 0.008]], M.brass, 22);
  g.add(cs);
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.06, 4), toon({ color: 0xa83a2a, rim: 0.4 }));
  needle.rotation.set(Math.PI / 2, 0, 0.6);
  needle.position.set(0.08, 0.003, 0.02);
  g.add(needle);
  const gl = new THREE.Mesh(new THREE.CircleGeometry(0.04, 18), glass(0xeef4f4));
  gl.rotation.x = -Math.PI / 2;
  gl.position.set(-0.07, 0.002, 0.04);
  g.add(gl);
  const sd = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 6), M.iron);
  sd.rotation.set(0, 0.4, Math.PI / 2);
  sd.position.set(0.02, 0.004, 0.08);
  g.add(sd);
  return shadowed(g);
}

/** An astrolabe hung on a nail: rings in rings. Faces +z. */
export function astrolabe(): THREE.Group {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.008, 32), M.brass);
  plate.rotation.x = Math.PI / 2;
  g.add(plate);
  for (const r of [0.1, 0.07]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 6, 32), M.beam);
    ring.position.z = 0.006;
    g.add(ring);
  }
  const rule = rbox(0.22, 0.012, 0.004, M.beam, 0.002);
  rule.position.z = 0.01;
  rule.rotation.z = 0.7;
  g.add(rule);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 6, 12), M.brass);
  loop.position.y = 0.135;
  g.add(loop);
  return shadowed(g);
}

/** A glass with a stub of candle stuck in its own wax, for long nights. */
export function nightCandle(): { group: THREE.Group; flame: THREE.Mesh } {
  const g = new THREE.Group();
  const plate = lathe([[0, 0], [0.06, 0], [0.065, 0.012], [0.055, 0.012], [0, 0.008]], M.iron, 18);
  g.add(plate);
  const wax = lathe([[0, 0.008], [0.03, 0.008], [0.026, 0.03], [0.018, 0.06], [0, 0.06]], M.wax, 14);
  g.add(organic(wax, 0.1, 3));
  for (let i = 0; i < 3; i++) {
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), M.wax);
    drip.scale.set(1, 2, 1);
    drip.position.set(Math.cos(i * 2) * 0.024, 0.03, Math.sin(i * 2) * 0.024);
    g.add(drip);
  }
  const f = flame(0.03, 21);
  f.position.y = 0.07;
  g.add(f);
  return { group: shadowed(g), flame: f };
}

/** Tie a rope between two points: used for strings of herbs across a beam. */
export function stringOf(a: THREE.Vector3, b: THREE.Vector3, n: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  g.add(rope(a, b));
  const rnd = makeRng(seed);
  const greens = [M.dryHerb, M.leafDark, toon({ color: 0xb8a04a, rim: 0.3, side: THREE.DoubleSide }), toon({ color: 0x8a6a9a, rim: 0.3, side: THREE.DoubleSide })];
  for (let i = 0; i < n; i++) {
    const hb = herbBunch(seed * 7 + i, 0.02 + rnd() * 0.12, greens[Math.floor(rnd() * greens.length)]);
    hb.position.copy(a).lerp(b, (i + 0.5) / n);
    hb.position.y -= Math.sin(((i + 0.5) / n) * Math.PI) * 0.05;
    hb.rotation.y = rnd() * 3;
    g.add(hb);
  }
  return g;
}

export const ink = liquid(0x1a1a2a);
