import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { glass, lathe, M, organic, rbox, shadowed, toon } from '../stile/kit';

/**
 * The small things that make a corner lived in: the fire irons, the
 * bellows on their nail, a pipe left on the mantel, letters tucked behind
 * a picture, the doily under the candle.
 */

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A flat mark lying on a surface (soot, ash, a stain): never casts shadows, never z-fights. */
function decal(w: number, h: number, map: THREE.Texture, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    toon({ map, transparent: true, opacity, rim: 0 }),
  );
  const mat = m.material as THREE.Material;
  mat.depthWrite = false;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  m.receiveShadow = true;
  m.userData.noWonk = true;
  return m;
}

/** Soot above the fire opening: rising in tongues, thickest at the lintel. Lies in XY, facing +z. */
export function soot(w: number, h: number): THREE.Mesh {
  const t = tex(256, 256, (g) => {
    const rnd = makeRng(17);
    for (let i = 0; i < 60; i++) {
      const x = 128 + (rnd() - 0.5) * 170;
      const y = 256 - rnd() * rnd() * 230;
      const r = 20 + rnd() * 50;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(30,22,18,${0.12 + rnd() * 0.12})`);
      grd.addColorStop(1, 'rgba(30,22,18,0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  return decal(w, h, t);
}

/** Ash and cinders spilled on the hearthstone, and a few scorch marks on the floor in front. Lies flat. */
export function ash(w: number, d: number, seed: number, scorch = false): THREE.Mesh {
  const t = tex(256, 256, (g) => {
    const rnd = makeRng(seed);
    for (let i = 0; i < (scorch ? 10 : 260); i++) {
      const x = rnd() * 256;
      const y = rnd() * 256;
      const edge = Math.min(x, 256 - x, y, 256 - y) / 128;
      if (rnd() > edge * 1.6) continue;
      if (scorch) {
        g.fillStyle = `rgba(30,18,10,${0.25 + rnd() * 0.3})`;
        g.beginPath();
        g.ellipse(x, y, 2 + rnd() * 5, 1 + rnd() * 3, rnd() * 3, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillStyle = rnd() < 0.7 ? `rgba(150,140,130,${0.2 + rnd() * 0.4})` : `rgba(40,30,25,${0.3 + rnd() * 0.4})`;
        g.beginPath();
        g.arc(x, y, 0.8 + rnd() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  const m = decal(w, d, t);
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** The fire irons in their stand: poker, tongs, shovel, brass knobs worn bright. */
export function fireIrons(): THREE.Group {
  const g = new THREE.Group();
  const base = lathe([[0, 0], [0.09, 0], [0.1, 0.015], [0.03, 0.03], [0, 0.03]], M.iron, 20);
  g.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.62, 8), M.iron);
  post.position.y = 0.33;
  g.add(post);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 20), M.iron);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.58;
  g.add(ring);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), M.brass);
  top.position.y = 0.66;
  g.add(top);
  const tool = (a: number, end: (t: THREE.Group) => void) => {
    const t = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.66, 6), M.iron);
    rod.position.y = 0.36;
    t.add(rod);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M.brass);
    knob.scale.y = 1.4;
    knob.position.y = 0.71;
    t.add(knob);
    end(t);
    t.position.set(Math.cos(a) * 0.05, 0.02, Math.sin(a) * 0.05);
    t.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1);
    g.add(t);
  };
  tool(0, (t) => {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 10, Math.PI), M.iron);
    hook.position.set(0.02, 0.04, 0);
    t.add(hook);
  });
  tool(2.1, (t) => {
    const blade = rbox(0.07, 0.09, 0.006, M.iron, 0.003);
    blade.position.y = 0.05;
    t.add(blade);
  });
  tool(4.2, (t) => {
    for (const s of [-1, 1]) {
      const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 5), M.iron);
      jaw.position.set(s * 0.012, 0.06, 0);
      jaw.rotation.z = s * 0.15;
      t.add(jaw);
    }
  });
  return organic(shadowed(g), 0.01, 3);
}

/** Bellows hanging by their handle: two pear-shaped boards, pleated leather, a brass nose. Hangs from y = 0. */
export function bellows(): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.02);
  shape.bezierCurveTo(0.11, -0.02, 0.13, -0.22, 0.02, -0.32);
  shape.lineTo(-0.02, -0.32);
  shape.bezierCurveTo(-0.13, -0.22, -0.11, -0.02, 0, -0.02);
  const boardGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 2 });
  const leather = toon({ color: 0x5a3a26, rim: 0.4 });
  for (const z of [-0.03, 0.03]) {
    const b = new THREE.Mesh(boardGeo, M.wood);
    b.position.z = z - 0.006;
    g.add(b);
  }
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), leather);
  bag.scale.set(0.95, 1.25, 0.28);
  bag.position.y = -0.14;
  g.add(bag);
  // pleats
  for (let i = 0; i < 3; i++) {
    const pleat = new THREE.Mesh(new THREE.TorusGeometry(0.1 - i * 0.004, 0.004, 4, 24), leather);
    pleat.scale.set(0.95, 1.25, 1);
    pleat.position.set(0, -0.14, -0.012 + i * 0.012);
    g.add(pleat);
  }
  const nose = lathe([[0.012, 0], [0.008, 0.08], [0.004, 0.09]], M.brass, 10);
  nose.rotation.z = Math.PI;
  nose.position.y = -0.31;
  g.add(nose);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.004, 6, 12), M.rope);
  loop.position.y = 0.0;
  g.add(loop);
  return organic(shadowed(g), 0.02, 5);
}

/** An hourglass in a turned wooden frame, the sand half run through. */
export function hourglass(): THREE.Group {
  const g = new THREE.Group();
  for (const y of [0, 0.15]) {
    const disc = lathe([[0, 0], [0.04, 0], [0.042, 0.008], [0.04, 0.014], [0, 0.014]], M.wood, 20);
    disc.position.y = y;
    g.add(disc);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const rod = lathe([[0.004, 0], [0.006, 0.03], [0.004, 0.06], [0.006, 0.1], [0.004, 0.136]], M.wood, 8);
    rod.position.set(Math.cos(a) * 0.032, 0.014, Math.sin(a) * 0.032);
    g.add(rod);
  }
  const bulb = lathe([[0.002, 0.014], [0.022, 0.03], [0.025, 0.06], [0.004, 0.082], [0.025, 0.105], [0.022, 0.135], [0.002, 0.15]], glass(0xeef4f0), 20);
  g.add(bulb);
  const sand = toon({ color: 0xe0c48a, rim: 0.2 });
  const low = lathe([[0, 0.016], [0.02, 0.03], [0.012, 0.045], [0, 0.05]], sand, 16);
  g.add(low);
  const high = lathe([[0, 0.084], [0.012, 0.094], [0.02, 0.112], [0, 0.112]], sand, 16);
  g.add(high);
  return shadowed(g);
}

/** A clay pipe left on the mantel, still warm. */
export function pipe(): THREE.Group {
  const g = new THREE.Group();
  const wood = toon({ color: 0x6a3a22, rim: 0.5 });
  const bowl = lathe([[0, 0], [0.014, 0.002], [0.018, 0.03], [0.016, 0.04], [0.012, 0.04], [0.01, 0.008], [0, 0.008]], wood, 14);
  g.add(bowl);
  const stem = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.012, 0.01, 0), new THREE.Vector3(0.06, 0.012, 0), new THREE.Vector3(0.13, 0.03, 0)]), 12, 0.004, 6),
    toon({ color: 0x2a201a, rim: 0.4 }),
  );
  g.add(stem);
  return shadowed(g);
}

/** Two or three letters, folded, one sealed with red wax, tucked upright. */
export function letters(n = 3): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(41);
  const paper = [0xf2e8d0, 0xe8dcbc, 0xf6eedc].map((c) => toon({ color: c, rim: 0.15 }));
  for (let i = 0; i < n; i++) {
    const l = rbox(0.003, 0.1 + rnd() * 0.02, 0.14 + rnd() * 0.03, paper[i % 3], 0.001);
    l.position.set(i * 0.004, 0.055, (rnd() - 0.5) * 0.03);
    l.rotation.set(0, (rnd() - 0.5) * 0.15, (rnd() - 0.5) * 0.12);
    g.add(l);
    if (i === 1) {
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.01, 0.004, 12), toon({ color: 0xa82a22, rim: 0.4 }));
      seal.rotation.z = Math.PI / 2;
      seal.position.set(i * 0.004 + 0.003, 0.06, 0);
      g.add(seal);
    }
  }
  return shadowed(g);
}

/** A framed charcoal drawing, leaning against the wall: a woman laughing, three-quarter view. */
export function framedPortrait(): THREE.Group {
  const g = new THREE.Group();
  const frame = M.beam;
  const W = 0.16;
  const H = 0.21;
  for (const [w, h, x, y] of [[W, 0.02, 0, H / 2], [W, 0.02, 0, -H / 2], [0.02, H, W / 2, 0], [0.02, H, -W / 2, 0]] as const) {
    const b = rbox(w + 0.01, h, 0.018, frame, 0.004);
    b.position.set(x, y, 0);
    g.add(b);
  }
  const t = tex(128, 160, (c) => {
    c.fillStyle = '#e8dcc0';
    c.fillRect(0, 0, 128, 160);
    c.strokeStyle = 'rgba(40,30,25,0.75)';
    c.lineCap = 'round';
    c.lineWidth = 1.6;
    // a face in a few loose strokes: hair, jaw, a laughing eye, the mouth
    c.beginPath();
    c.ellipse(66, 70, 26, 32, 0.15, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(40, 60);
    c.bezierCurveTo(44, 26, 92, 22, 96, 56);
    c.bezierCurveTo(104, 80, 100, 110, 106, 130);
    c.stroke();
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(58, 66, 5, Math.PI * 1.1, Math.PI * 1.9);
    c.arc(78, 66, 5, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke();
    c.beginPath();
    c.arc(68, 86, 9, 0.2, Math.PI - 0.3);
    c.stroke();
    c.beginPath();
    c.moveTo(56, 100);
    c.lineTo(46, 140);
    c.moveTo(82, 100);
    c.lineTo(98, 145);
    c.stroke();
    c.fillStyle = 'rgba(40,30,25,0.12)';
    c.fillRect(0, 0, 128, 160);
  });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.01, H - 0.01), toon({ map: t, rim: 0.05 }));
  pic.position.z = 0.002;
  g.add(pic);
  return shadowed(g);
}

/** Dried lavender and grasses in a small clay jar. */
export function driedFlowers(seed: number): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(seed);
  g.add(lathe([[0, 0], [0.035, 0.002], [0.045, 0.05], [0.03, 0.09], [0.034, 0.1], [0.03, 0.1]], M.clay, 20));
  const stemM = toon({ color: 0x9a9a62, rim: 0.2 });
  const lav = toon({ color: 0x8a72b0, rim: 0.4 });
  const seedM = toon({ color: 0xd8c08a, rim: 0.3 });
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const lean = 0.08 + rnd() * 0.3;
    const len = 0.14 + rnd() * 0.12;
    const s = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0016, len, 4), stemM);
    stem.position.y = len / 2;
    s.add(stem);
    const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.03, 2, 5), i % 3 ? lav : seedM);
    head.position.y = len + 0.012;
    s.add(head);
    s.rotation.set(Math.cos(a) * lean, 0, Math.sin(a) * lean);
    s.position.y = 0.06;
    g.add(s);
  }
  return shadowed(g);
}

/** A bunch of keys on a ring, hung on a nail. Hangs from y = 0. */
export function keys(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0025, 6, 16), M.iron);
  ring.position.y = -0.02;
  g.add(ring);
  const rnd = makeRng(9);
  for (let i = 0; i < 4; i++) {
    const k = new THREE.Group();
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.003, 5, 10), i === 2 ? M.brass : M.iron);
    k.add(bow);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.05 + rnd() * 0.03, 5), i === 2 ? M.brass : M.iron);
    shank.position.y = -0.035;
    k.add(shank);
    const bit = rbox(0.012, 0.01, 0.003, i === 2 ? M.brass : M.iron, 0.001);
    bit.position.set(0.006, -0.06, 0);
    k.add(bit);
    k.position.set(Math.sin(i * 1.7) * 0.01, -0.038, Math.cos(i) * 0.006);
    k.rotation.z = (i - 1.5) * 0.25;
    g.add(k);
  }
  return shadowed(g);
}

/** A crocheted doily: rings of loops and holes, lying flat. */
export function doily(r: number): THREE.Mesh {
  const t = tex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#f4ecdc';
    g.strokeStyle = '#f4ecdc';
    g.beginPath();
    g.arc(128, 128, 30, 0, Math.PI * 2);
    g.fill();
    for (let ring = 0; ring < 4; ring++) {
      const rr = 42 + ring * 22;
      const n = 10 + ring * 6;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(128, 128, rr, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(128 + Math.cos(a) * (rr + 9), 128 + Math.sin(a) * (rr + 9), 9, 0, Math.PI * 2);
        g.stroke();
      }
    }
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), toon({ map: t, rim: 0.1 }));
  (m.material as THREE.Material).alphaTest = 0.5;
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.userData.noWonk = true;
  return m;
}

/** A saucer with a small spoon. */
export function saucer(): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.03, 0.001], [0.06, 0.008], [0.065, 0.012], [0.06, 0.012], [0.03, 0.006], [0, 0.006]], M.ceramic, 32));
  const spoon = new THREE.Group();
  const handle = rbox(0.07, 0.003, 0.007, M.iron, 0.001);
  handle.position.x = 0.035;
  spoon.add(handle);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.iron);
  bowl.scale.set(1.3, 0.4, 1);
  bowl.position.set(-0.005, 0.004, 0);
  spoon.add(bowl);
  spoon.position.set(0.035, 0.012, 0.02);
  spoon.rotation.y = 0.5;
  g.add(spoon);
  return shadowed(g);
}

/** A biscuit on a small plate: one bitten. */
export function biscuits(): THREE.Group {
  const g = new THREE.Group();
  const bake = toon({ color: 0xd8a868, rim: 0.3 });
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.008, 16, 1, false, 0, i ? Math.PI * 1.6 : Math.PI * 2), bake);
    b.position.set(i * 0.02, 0.004 + i * 0.008, i * 0.01);
    b.rotation.set(i * 0.1, i, 0);
    g.add(organic(b, 0.05, i));
  }
  return shadowed(g);
}

/** A basket of kindling: twigs, split sticks, a pine cone or two. */
export function kindling(): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(23);
  const wicker = toon({ color: 0xa8804a, rim: 0.3 });
  g.add(lathe([[0, 0], [0.15, 0.004], [0.19, 0.16], [0.2, 0.17], [0.19, 0.17], [0.14, 0.012], [0, 0.012]], wicker, 22));
  for (let y = 0.03; y < 0.17; y += 0.025) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.15 + y * 0.28, 0.006, 4, 22), toon({ color: 0x8a6438, rim: 0.2 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  const twig = toon({ color: 0x7a5a3a, rim: 0.2 });
  const split = toon({ color: 0xc8a070, rim: 0.2 });
  for (let i = 0; i < 26; i++) {
    const len = 0.2 + rnd() * 0.2;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006 + rnd() * 0.008, 0.008 + rnd() * 0.008, len, 5), rnd() < 0.6 ? twig : split);
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 0.12;
    s.position.set(Math.cos(a) * r, 0.1 + len * 0.35, Math.sin(a) * r);
    s.rotation.set((rnd() - 0.5) * 0.7, rnd() * 3, (rnd() - 0.5) * 0.7);
    g.add(s);
  }
  const cone = toon({ color: 0x8a5a32, rim: 0.3 });
  for (let i = 0; i < 2; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 1), cone);
    c.scale.set(0.8, 1.2, 0.8);
    c.position.set(0.06 - i * 0.1, 0.19, 0.04 * i);
    g.add(c);
  }
  return organic(shadowed(g), 0.02, 4);
}

/** The village calendar on its nail: one sheet per month, this one's corner curled. Lies in XY facing +z. */
export function calendar(): THREE.Group {
  const g = new THREE.Group();
  const t = tex(128, 192, (c) => {
    c.fillStyle = '#efe4c8';
    c.fillRect(0, 0, 128, 192);
    // a woodcut at the top: hills, the sun, a plough
    c.fillStyle = '#3a2a1e';
    c.beginPath();
    c.moveTo(8, 70);
    c.quadraticCurveTo(40, 40, 64, 62);
    c.quadraticCurveTo(90, 44, 120, 66);
    c.lineTo(120, 74);
    c.lineTo(8, 74);
    c.fill();
    c.beginPath();
    c.arc(92, 34, 10, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(92 + Math.cos(a) * 13, 34 + Math.sin(a) * 13);
      c.lineTo(92 + Math.cos(a) * 18, 34 + Math.sin(a) * 18);
      c.stroke();
    }
    c.font = 'italic 14px Georgia, serif';
    c.textAlign = 'center';
    c.fillText('Vendemmiaio', 64, 94);
    // the grid of days, a few marked
    c.font = '9px Georgia, serif';
    for (let d = 0; d < 30; d++) {
      const x = 14 + (d % 6) * 20;
      const y = 112 + Math.floor(d / 6) * 16;
      c.fillStyle = '#3a2a1e';
      c.fillText(String(d + 1), x, y);
      if (d === 6 || d === 19) {
        c.strokeStyle = '#a83a2a';
        c.beginPath();
        c.arc(x, y - 3, 7, 0, Math.PI * 2);
        c.stroke();
      }
    }
  });
  const sheet = new THREE.PlaneGeometry(0.2, 0.3, 8, 12);
  const p = sheet.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // the bottom right corner has curled up from the heat of the fire
    const k = Math.max(0, (x - 0.02) / 0.08) * Math.max(0, (-y - 0.06) / 0.09);
    p.setZ(i, k * k * 0.03 + 0.003 * Math.sin(y * 20));
  }
  sheet.computeVertexNormals();
  const page = new THREE.Mesh(sheet, toon({ map: t, rim: 0.1, side: THREE.DoubleSide }));
  page.position.y = -0.17;
  g.add(page);
  const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6), M.iron);
  nail.rotation.x = Math.PI / 2;
  nail.position.set(0, -0.012, 0.01);
  g.add(nail);
  return shadowed(g);
}
