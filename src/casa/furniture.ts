import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { bentBox, lathe, M, organic, rbox, shadowed, toon } from '../stile/kit';
import { clothTex, woodTex } from '../stile/paint';
import { makeBook } from './books';
import { boxCollider, floorCollider, rollCollider, settle, type Collider } from '../stile/softbody';

/**
 * The furniture of the house. Everything is built by hand in the same
 * spirit as the shop: a little irregular, used, and soft things (blankets,
 * the quilt, a cloak on its peg) are left to fall into place.
 */

// ------------------------------------------------------------------ flames

const flameUniforms = { time: { value: 0 } };
/** Advances every flame in the house. */
export const tickFlames = (t: number) => (flameUniforms.time.value = t);

/**
 * A real flame, not a bulb: a teardrop that is white-yellow at the core,
 * orange towards the tip and transparent at the edges, licking upwards.
 */
export function flame(height = 0.035, seed = 0, color = new THREE.Color(1.0, 0.62, 0.22), strength = 1.25): THREE.Mesh {
  const prof: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    prof.push([Math.sin(Math.pow(t, 0.7) * Math.PI) * (1 - t * 0.55) * height * 0.32, t * height]);
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: flameUniforms.time, seed: { value: seed }, tint: { value: color }, h: { value: height }, strength: { value: strength } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, seed, h; varying vec2 vUv; varying float vEdge;
      void main(){ vUv = uv; vec3 p = position; float t = uv.y;
        // the tip wanders, the body breathes
        p.x += sin(time * 9.0 + seed * 7.0) * 0.12 * h * t * t + sin(time * 23.0 + seed) * 0.04 * h * t;
        p.z += cos(time * 7.0 + seed * 3.0) * 0.1 * h * t * t;
        p.y *= 1.0 + 0.1 * sin(time * 13.0 + seed * 5.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vEdge = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 tint; uniform float strength; varying vec2 vUv; varying float vEdge;
      void main(){ float t = vUv.y;
        vec3 core = vec3(1.0, 0.95, 0.8);
        vec3 c = mix(core, tint, smoothstep(0.15, 0.8, t));
        c = mix(vec3(0.35, 0.45, 1.0), c, smoothstep(0.0, 0.12, t)); // the blue foot of a candle flame
        float a = smoothstep(0.0, 0.6, vEdge) * (1.0 - smoothstep(0.55, 1.0, t)) * 1.4;
        gl_FragColor = vec4(c * a * strength, a); }`,
  });
  const m = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 16), mat);
  m.castShadow = false;
  m.receiveShadow = false;
  m.userData.noWonk = true;
  return m;
}

// ------------------------------------------------------------------ small things

/** A tallow candle burnt down unevenly, with drips, in a clay holder with a finger loop. */
export function candle(seed: number, height = 0.11): { group: THREE.Group; flame: THREE.Mesh; tip: THREE.Vector3 } {
  const rnd = makeRng(seed);
  const g = new THREE.Group();
  const dish = lathe([[0, 0], [0.065, 0.002], [0.075, 0.015], [0.07, 0.022], [0.025, 0.016], [0.022, 0.03], [0, 0.03]], M.clay, 28);
  g.add(dish);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 14), M.clay);
  loop.position.set(0.075, 0.018, 0);
  loop.rotation.y = 0.3;
  g.add(loop);
  // the wax, with a softened, uneven top
  const wax = lathe(
    [
      [0, 0.02],
      [0.017, 0.02],
      [0.017, 0.02 + height * 0.92],
      [0.015, 0.02 + height * 0.97],
      [0.008, 0.02 + height],
      [0, 0.02 + height - 0.004],
    ],
    M.wax,
    18,
  );
  g.add(wax);
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2;
    const len = 0.015 + rnd() * height * 0.5;
    const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, len, 3, 6), M.wax);
    drip.position.set(Math.cos(a) * 0.017, 0.02 + height - len / 2 - 0.004, Math.sin(a) * 0.017);
    g.add(drip);
  }
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.03 + rnd() * 0.012, 14), M.wax);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.012, 0.0185, 0.004);
  g.add(pool);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.012, 4), toon({ color: 0x1a1410 }));
  wick.position.y = 0.02 + height + 0.002;
  wick.rotation.z = 0.2;
  g.add(wick);
  const f = flame(0.034, seed);
  f.position.y = 0.02 + height + 0.003;
  g.add(f);
  return { group: organic(shadowed(g), 0.02, seed), flame: f, tip: new THREE.Vector3(0, 0.02 + height + 0.03, 0) };
}

const bookMats = [0x7a2e2a, 0x2e4a6a, 0x4a5a32, 0x5a3a52].map((c) => toon({ color: c, rim: 0.25 }));
const pages = toon({ color: 0xeee2c4, rim: 0.1 });
/** An open book lying on a table, its pages curling up from the spine. */
export function openBook(seed: number): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(seed);
  const mat = bookMats[Math.floor(rnd() * bookMats.length)];
  for (const s of [-1, 1]) {
    const cover = rbox(0.15, 0.008, 0.22, mat, 0.003);
    cover.position.set(s * 0.076, 0.004, 0);
    cover.rotation.z = s * 0.05;
    g.add(cover);
    const geo = new THREE.BoxGeometry(0.14, 0.014, 0.205, 16, 1, 1);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + 0.07; // 0 at the spine
      p.setY(i, p.getY(i) + Math.sin((x / 0.14) * Math.PI * 0.9) * 0.012 - (x < 0.01 ? 0.005 : 0));
    }
    geo.computeVertexNormals();
    const leaf = new THREE.Mesh(geo, pages);
    leaf.position.set(s * 0.07, 0.016, 0);
    leaf.scale.x = s;
    g.add(leaf);
  }
  return shadowed(g);
}

const copper = toon({ color: 0xc8784a, rim: 0.65, emissive: 0x2a1006, emissiveIntensity: 0.4 });
/** The copper kettle. Spout on +x. */
export function kettle(): THREE.Group {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.09, 0.004], [0.115, 0.05], [0.11, 0.1], [0.07, 0.135], [0.035, 0.145], [0.036, 0.155], [0, 0.158]], copper, 36));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.beam);
  knob.position.y = 0.165;
  g.add(knob);
  const spout = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.09, 0.05, 0), new THREE.Vector3(0.14, 0.09, 0), new THREE.Vector3(0.175, 0.14, 0)]), 10, 0.014, 8),
    copper,
  );
  g.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 24, Math.PI), M.iron);
  handle.position.y = 0.14;
  g.add(handle);
  return organic(shadowed(g), 0.015, 3);
}

/** A round-bellied teapot in glazed clay. */
export function teapot(): THREE.Group {
  const g = new THREE.Group();
  const glaze = toon({ color: 0x5a7a8a, rim: 0.5 });
  g.add(lathe([[0, 0], [0.05, 0.002], [0.075, 0.04], [0.072, 0.08], [0.045, 0.105], [0.04, 0.11], [0, 0.112]], glaze, 32));
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), glaze);
  lid.position.y = 0.118;
  g.add(lid);
  const spout = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.06, 0.04, 0), new THREE.Vector3(0.1, 0.07, 0), new THREE.Vector3(0.12, 0.1, 0)]), 8, 0.01, 6),
    glaze,
  );
  g.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16, Math.PI * 1.2), glaze);
  handle.rotation.z = Math.PI / 2 + 0.3;
  handle.position.set(-0.07, 0.06, 0);
  g.add(handle);
  return organic(shadowed(g), 0.02, 9);
}

// ------------------------------------------------------------------ textures

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

/** A patchwork quilt: squares of old clothes, each with its own little pattern, hand-stitched. */
function quiltTex(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (g) => {
    const rnd = makeRng(77);
    const pal = ['#a8604a', '#c8a468', '#4a6280', '#8a9668', '#e8dcc0', '#9a6a70', '#b8805a', '#6a8070', '#dcc8a0', '#e8dcc0'];
    const n = 8;
    const s = 1024 / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const col = pal[Math.floor(rnd() * pal.length)];
        // squares are cut by hand: never quite the same size
        const jx = (rnd() - 0.5) * 6;
        const jy = (rnd() - 0.5) * 6;
        g.fillStyle = col;
        g.fillRect(x * s + jx, y * s + jy, s + 4, s + 4);
        const k = rnd();
        g.fillStyle = 'rgba(255,248,230,0.55)';
        g.strokeStyle = 'rgba(60,40,30,0.25)';
        if (k < 0.3) {
          for (let i = 0; i < 18; i++) {
            g.beginPath();
            g.arc(x * s + rnd() * s, y * s + rnd() * s, 3 + rnd() * 3, 0, Math.PI * 2);
            g.fill();
          }
        } else if (k < 0.55) {
          g.lineWidth = 6;
          for (let i = 0; i < 5; i++) {
            g.beginPath();
            g.moveTo(x * s + (i + 0.5) * (s / 5), y * s);
            g.lineTo(x * s + (i + 0.5) * (s / 5), y * s + s);
            g.stroke();
          }
        } else if (k < 0.7) {
          g.fillStyle = 'rgba(40,30,30,0.15)';
          for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.fillRect(x * s + i * (s / 4), y * s + j * (s / 4), s / 4, s / 4);
        } else if (k < 0.8) {
          // a little flower embroidered by someone patient
          g.fillStyle = 'rgba(255,240,210,0.8)';
          for (let p = 0; p < 6; p++) {
            const a = (p / 6) * Math.PI * 2;
            g.beginPath();
            g.ellipse(x * s + s / 2 + Math.cos(a) * 14, y * s + s / 2 + Math.sin(a) * 14, 10, 6, a, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = '#d8a83a';
          g.beginPath();
          g.arc(x * s + s / 2, y * s + s / 2, 8, 0, Math.PI * 2);
          g.fill();
        }
        // soft wear in the middle of each square
        const grd = g.createRadialGradient(x * s + s / 2, y * s + s / 2, 0, x * s + s / 2, y * s + s / 2, s * 0.7);
        grd.addColorStop(0, 'rgba(255,250,235,0.08)');
        grd.addColorStop(1, 'rgba(40,20,10,0.12)');
        g.fillStyle = grd;
        g.fillRect(x * s, y * s, s, s);
      }
    }
    // the stitches along the seams
    g.strokeStyle = 'rgba(245,235,210,0.7)';
    g.lineWidth = 2;
    g.setLineDash([7, 6]);
    for (let i = 1; i < n; i++) {
      g.beginPath();
      g.moveTo(i * s + (rnd() - 0.5) * 3, 0);
      g.lineTo(i * s + (rnd() - 0.5) * 3, 1024);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * s + (rnd() - 0.5) * 3);
      g.lineTo(1024, i * s + (rnd() - 0.5) * 3);
      g.stroke();
    }
    g.setLineDash([]);
    // a darker binding all round
    g.strokeStyle = '#6a2e26';
    g.lineWidth = 18;
    g.strokeRect(0, 0, 1024, 1024);
  });
}

/** A braided rag rug: rings of old fabric strips sewn in a spiral. Drawn for a CircleGeometry. */
function ragRugTex(): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (g) => {
    const rnd = makeRng(55);
    const pal = ['#a8543e', '#c8a060', '#5a6a8a', '#7a8a5a', '#d8c8a8', '#8a4a4a', '#b88a5a'];
    g.fillStyle = '#8a6a4a';
    g.fillRect(0, 0, 1024, 1024);
    let col = pal[0];
    for (let r = 505; r > 6; r -= 15) {
      if (rnd() < 0.45) col = pal[Math.floor(rnd() * pal.length)];
      g.strokeStyle = col;
      g.lineWidth = 14;
      g.beginPath();
      g.arc(512, 512, r, 0, Math.PI * 2);
      g.stroke();
      // the braid: short slanted marks along the ring
      g.strokeStyle = 'rgba(30,20,10,0.22)';
      g.lineWidth = 2;
      const steps = Math.floor(r / 3);
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        g.beginPath();
        g.moveTo(512 + Math.cos(a) * (r - 6), 512 + Math.sin(a) * (r - 6));
        g.lineTo(512 + Math.cos(a + 0.02) * (r + 6), 512 + Math.sin(a + 0.02) * (r + 6));
        g.stroke();
      }
    }
  });
}

/** Plates painted with a blue folk border, as from the market in town. */
function plateTex(seed: number): THREE.CanvasTexture {
  return canvasTex(256, 256, (g) => {
    const rnd = makeRng(seed);
    g.fillStyle = '#f2e8d2';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#3a5a9a';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(128, 128, 116, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2;
    g.beginPath();
    g.arc(128, 128, 92, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#3a5a9a';
    const petals = 8 + Math.floor(rnd() * 5);
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      g.beginPath();
      g.ellipse(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104, 7, 4, a, 0, Math.PI * 2);
      g.fill();
    }
    if (rnd() < 0.6) {
      g.fillStyle = 'rgba(58,90,154,0.8)';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.beginPath();
        g.ellipse(128 + Math.cos(a) * 22, 128 + Math.sin(a) * 22, 18, 9, a, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

// ------------------------------------------------------------------ the hearth

/**
 * The fireplace: a chimney breast of fieldstones, a wide oak mantel, the
 * firebox blackened by years of smoke, logs that glow, and the kettle on
 * its hook. Faces +x; its back is at x = 0.
 */
export function hearth(height: number, stone: THREE.Material, plaster: THREE.Material): { group: THREE.Group; light: THREE.Vector3; flames: THREE.Mesh[]; embers: THREE.MeshToonMaterial } {
  const g = new THREE.Group();
  const rnd = makeRng(12);
  const W = 1.5;
  const D = 0.6;
  const soot = toon({ color: 0x2a221e, rim: 0 });
  // the breast, around an opening
  const op = { z0: -0.45, z1: 0.45, y0: 0.18, y1: 0.98 };
  const part = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), plaster);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    g.add(b);
  };
  part(0, D, 0, height, -W / 2, op.z0);
  part(0, D, 0, height, op.z1, W / 2);
  part(0, D, op.y1, height, op.z0, op.z1);
  part(0, D, 0, op.y0, op.z0, op.z1);
  // inside: soot-black back and sides
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, op.y1 - op.y0, op.z1 - op.z0), soot);
  back.position.set(0.06, (op.y0 + op.y1) / 2, 0);
  g.add(back);
  // the opening is framed in rough stones, set by hand around it
  const arch: [number, number][] = [];
  for (let y = op.y0 - 0.1; y < op.y1; y += 0.13 + rnd() * 0.04) arch.push([op.z0 - 0.07, y], [op.z1 + 0.07, y]);
  for (let z = op.z0 - 0.04; z <= op.z1 + 0.05; z += 0.12 + rnd() * 0.03) arch.push([z, op.y1 + 0.05]);
  for (const [z, y] of arch) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075 + rnd() * 0.03, 1), stone);
    s.scale.set(0.45, 0.75 + rnd() * 0.3, 0.9 + rnd() * 0.3);
    s.position.set(D - 0.01, y, z);
    s.rotation.set(rnd() * 0.4, rnd() * 0.4, rnd() * 0.4);
    g.add(s);
  }
  // hearthstone, a little proud of the floor, worn in the middle
  const hs = rbox(0.55, 0.06, W + 0.1, M.stone, 0.02);
  hs.position.set(D + 0.25, 0.03, 0);
  g.add(organic(hs, 0.02, 2));
  // the mantel: one thick beam, bowed
  const mantel = bentBox(W + 0.25, 0.14, 0.24, M.beamH, 0.006, 0.01);
  mantel.rotation.y = Math.PI / 2;
  mantel.position.set(D + 0.06, op.y1 + 0.12, 0);
  g.add(mantel);
  // firedogs and logs
  for (const z of [-0.2, 0.2]) {
    const dog = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), M.iron);
    dog.rotation.z = Math.PI / 2;
    dog.position.set(0.3, op.y0 + 0.06, z);
    g.add(dog);
  }
  const bark = toon({ map: woodTex(31, '#5a3a24', '#2e1e12', { knots: 3 }), rim: 0.1 });
  const embers = toon({ color: 0x3a1a0e, emissive: 0xff5a1a, emissiveIntensity: 1.2, rim: 0 });
  for (const [x, y, z, ry, rz, len] of [
    [0.28, 0.1, 0, 0.1, 0, 0.75],
    [0.36, 0.17, 0.05, -0.35, 0.05, 0.6],
    [0.25, 0.2, -0.08, 0.5, -0.1, 0.55],
  ]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, len, 9), bark);
    log.rotation.set(Math.PI / 2, 0, 0);
    log.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), ry);
    log.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), rz);
    log.position.set(x, op.y0 + y, z);
    g.add(log);
  }
  // the bed of embers under the logs
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), embers);
  bed.rotation.x = -Math.PI / 2;
  bed.scale.set(0.8, 1.2, 1);
  bed.position.set(0.3, op.y0 + 0.01, 0);
  g.add(bed);
  for (let i = 0; i < 18; i++) {
    const coal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02 + rnd() * 0.02, 0), embers);
    coal.position.set(0.2 + rnd() * 0.25, op.y0 + 0.02, (rnd() - 0.5) * 0.5);
    g.add(coal);
  }
  const flames: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const f = flame(0.16 + rnd() * 0.2, i * 1.7, new THREE.Color(1.0, 0.4 + rnd() * 0.15, 0.1), 0.32);
    f.scale.set(1.8 + rnd() * 0.6, 1, 1.4 + rnd() * 0.6);
    f.position.set(0.24 + rnd() * 0.16, op.y0 + 0.12 + rnd() * 0.06, (rnd() - 0.5) * 0.42);
    g.add(f);
    flames.push(f);
  }
  // the crane with the kettle, swung half over the fire
  const crane = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), M.iron);
  post.position.y = 0.3;
  crane.add(post);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 6), M.iron);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.21, 0.55, 0);
  crane.add(arm);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 5), M.iron);
  hook.position.set(0.32, 0.45, 0);
  crane.add(hook);
  const k = kettle();
  k.position.set(0.32, 0.18, 0);
  k.rotation.y = 0.6;
  crane.add(k);
  crane.position.set(0.1, op.y0 + 0.05, op.z0 + 0.06);
  crane.rotation.y = -0.7;
  g.add(crane);
  // the stones above the opening have been blackened by smoke
  const smoke = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), toon({ color: 0x1a1410, transparent: true, opacity: 0.35, rim: 0 }));
  smoke.rotation.y = Math.PI / 2;
  smoke.position.set(D + 0.004, op.y1 + 0.3, 0);
  smoke.userData.noShadow = true;
  g.add(smoke);
  shadowed(g);
  for (const f of flames) f.castShadow = false;
  smoke.castShadow = false;
  return { group: g, light: new THREE.Vector3(0.55, op.y0 + 0.35, 0), flames, embers };
}

// ------------------------------------------------------------------ seats

/**
 * The armchair: old, deep, re-covered more than once. A wool blanket has
 * been thrown over its arm and left there. Faces +z.
 */
export function armchair(seed = 1): THREE.Group {
  const g = new THREE.Group();
  const fabric = toon({ map: clothTex(seed + 40, '#8a4a36'), rim: 0.35 });
  (fabric.map as THREE.Texture).repeat.set(2, 2);
  const legM = M.beam;
  for (const [x, z] of [[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]]) {
    const leg = lathe([[0, 0], [0.025, 0], [0.03, 0.05], [0.022, 0.12], [0.028, 0.14], [0, 0.14]], legM, 10);
    leg.position.set(x, 0, z);
    g.add(leg);
  }
  const base = rbox(0.84, 0.22, 0.78, fabric, 0.06);
  base.position.y = 0.25;
  g.add(base);
  const seat = rbox(0.62, 0.13, 0.66, fabric, 0.06);
  seat.position.set(0, 0.42, 0.04);
  g.add(seat);
  const back = rbox(0.8, 0.72, 0.2, fabric, 0.09);
  back.position.set(0, 0.72, -0.31);
  back.rotation.x = -0.14;
  g.add(back);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.56, 6, 14), fabric);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(s * 0.37, 0.53, 0.02);
    g.add(arm);
    const side = rbox(0.14, 0.24, 0.7, fabric, 0.05);
    side.position.set(s * 0.37, 0.4, 0.02);
    g.add(side);
  }
  organic(g, 0.02, seed);
  // the blanket, thrown over the left arm and left to fall
  const geo = new THREE.PlaneGeometry(0.7, 1.1, 36, 54);
  geo.rotateX(-Math.PI / 2);
  const wool = toon({ map: blanketTex(), rim: 0.35, side: THREE.DoubleSide });
  const blanket = new THREE.Mesh(geo, wool);
  blanket.position.set(-0.36, 0.95, 0.02);
  blanket.rotation.set(0.05, 0.25, 0.25);
  const colliders: Collider[] = [
    rollColliderZ(-0.37, 0.53, -0.32, 0.36, 0.1),
    boxCollider(new THREE.Vector3(-0.44, 0.14, -0.37), new THREE.Vector3(0.44, 0.48, 0.41)),
    boxCollider(new THREE.Vector3(-0.31, 0.35, -0.29), new THREE.Vector3(0.31, 0.49, 0.37)),
    boxCollider(new THREE.Vector3(-0.4, 0.36, -0.45), new THREE.Vector3(0.4, 1.08, -0.2)),
    floorCollider(),
  ];
  settle(blanket, { colliders, bend: 0.1, steps: 360, friction: 0.8 });
  g.add(blanket);
  return shadowed(g);
}

/** A horizontal roll along z at (x, y): an upholstered armrest. */
function rollColliderZ(x: number, y: number, z0: number, z1: number, r: number): Collider {
  return {
    resolve(p) {
      if (p.z < z0 || p.z > z1) return;
      const dx = p.x - x;
      const dy = p.y - y;
      const d = Math.hypot(dx, dy);
      if (d >= r) return;
      const k = r / Math.max(d, 1e-6);
      p.x = x + dx * k;
      p.y = y + dy * k;
    },
  };
}

/** Knitted wool in wide stripes, cream and madder red, with a fringe-coloured border. */
function blanketTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g) => {
    const stripes = ['#e8dcc0', '#a83a2e', '#e8dcc0', '#d8a850', '#e8dcc0', '#a83a2e'];
    stripes.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, (i * 512) / stripes.length, 512, 512 / stripes.length + 1);
    });
    // the knit: little v's everywhere
    g.strokeStyle = 'rgba(40,20,10,0.12)';
    g.lineWidth = 1.5;
    for (let y = 0; y < 512; y += 8) {
      for (let x = 0; x < 512; x += 8) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 4, y + 6);
        g.lineTo(x + 8, y);
        g.stroke();
      }
    }
  });
}

export function footstool(): THREE.Group {
  const g = new THREE.Group();
  const top = rbox(0.42, 0.12, 0.32, toon({ map: clothTex(44, '#8a4a36'), rim: 0.35 }), 0.05);
  top.position.y = 0.3;
  g.add(top);
  for (const [x, z] of [[-0.17, -0.12], [0.17, -0.12], [-0.17, 0.12], [0.17, 0.12]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.25, 8), M.beam);
    leg.position.set(x, 0.125, z);
    leg.rotation.set(z * 0.5, 0, -x * 0.5);
    g.add(leg);
  }
  return organic(shadowed(g), 0.02, 5);
}

const rush = toon({ map: woodTex(51, '#c8a868', '#8a6a3a', { planks: 18 }), rim: 0.2 });
/** A ladder-back chair with a rush seat. Faces +z. */
export function chair(seed: number): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z, hgt] of [[-0.2, 0.19, 0.46], [0.2, 0.19, 0.46], [-0.2, -0.19, 1.0], [0.2, -0.19, 1.0]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, hgt, 8), M.wood);
    leg.position.set(x, hgt / 2, z);
    if (hgt > 0.5) leg.rotation.x = -0.06;
    g.add(leg);
  }
  const seat = rbox(0.44, 0.04, 0.42, rush, 0.012);
  seat.position.y = 0.46;
  g.add(seat);
  for (const y of [0.66, 0.8, 0.94]) {
    const slat = bentBox(0.4, 0.05, 0.016, M.wood, -0.012, 0);
    slat.position.set(0, y, -0.21 - (y - 0.46) * 0.06);
    g.add(slat);
  }
  for (const z of [-0.19, 0.19]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6), M.wood);
    st.rotation.z = Math.PI / 2;
    st.position.set(0, 0.16, z);
    g.add(st);
  }
  return organic(shadowed(g), 0.015, seed);
}

export function bench(len: number): THREE.Group {
  const g = new THREE.Group();
  const top = bentBox(len, 0.05, 0.3, M.woodPale, 0.006, 0.01);
  top.position.y = 0.44;
  g.add(top);
  for (const s of [-1, 1]) {
    const leg = rbox(0.05, 0.42, 0.26, M.woodPale, 0.01);
    leg.position.set((s * len) / 2 - s * 0.12, 0.21, 0);
    leg.rotation.z = s * 0.06;
    g.add(leg);
  }
  return organic(shadowed(g), 0.01, 3);
}

// ------------------------------------------------------------------ tables and storage

/** The kitchen table: thick boards, square legs, a drawer. Length along x. */
export function table(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const boards = 3;
  for (let i = 0; i < boards; i++) {
    const b = bentBox(w, 0.05, d / boards - 0.006, M.wood, 0.004 * (i - 1), 0.01 * (i % 2 ? 1 : -1));
    b.position.set(0, 0.75, -d / 2 + (i + 0.5) * (d / boards));
    g.add(b);
  }
  for (const [x, z] of [[-w / 2 + 0.08, -d / 2 + 0.08], [w / 2 - 0.08, -d / 2 + 0.08], [-w / 2 + 0.08, d / 2 - 0.08], [w / 2 - 0.08, d / 2 - 0.08]]) {
    const leg = rbox(0.07, 0.72, 0.07, M.beam, 0.012);
    leg.position.set(x, 0.36, z);
    g.add(leg);
  }
  const apron = rbox(w - 0.2, 0.1, d - 0.2, M.beam, 0.01);
  apron.position.y = 0.67;
  g.add(apron);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.beam);
  knob.position.set(0.2, 0.67, d / 2 - 0.09);
  g.add(knob);
  return organic(shadowed(g), 0.006, 4);
}

/** A small round table on three legs, by the armchair. */
export function sideTable(): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 28), M.wood);
  top.position.y = 0.6;
  g.add(top);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.62, 8), M.beam);
    leg.position.set(Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12);
    leg.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15);
    g.add(leg);
  }
  return organic(shadowed(g), 0.01, 6);
}

/**
 * The dresser: a cupboard below, an open plate rack above, the good plates
 * standing on their rail, cups on hooks. Faces +x; back at x = 0.
 */
export function dresser(): THREE.Group {
  const g = new THREE.Group();
  const W = 1.15;
  const lower = rbox(0.48, 0.85, W, M.wood, 0.015);
  lower.position.set(0.24, 0.425, 0);
  g.add(lower);
  const top = bentBox(W + 0.06, 0.04, 0.52, M.woodPale, 0.003, 0);
  top.rotation.y = Math.PI / 2;
  top.position.set(0.25, 0.87, 0);
  g.add(top);
  for (const z of [-0.28, 0.28]) {
    const door = rbox(0.02, 0.62, 0.5, M.woodPale, 0.006);
    door.position.set(0.49, 0.43, z);
    g.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), M.iron);
    knob.position.set(0.51, 0.47, z - Math.sign(z) * 0.18);
    g.add(knob);
  }
  // the rack
  const backboard = rbox(0.02, 0.95, W, M.beam, 0.005);
  backboard.position.set(0.01, 1.37, 0);
  g.add(backboard);
  for (const z of [-W / 2 + 0.02, W / 2 - 0.02]) {
    const side = rbox(0.24, 0.98, 0.03, M.wood, 0.006);
    side.position.set(0.12, 1.38, z);
    g.add(side);
  }
  const rnd = makeRng(19);
  const plateGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.016, 28);
  [1.2, 1.55].forEach((y, row) => {
    const shelf = bentBox(W - 0.04, 0.025, 0.22, M.wood, 0.004, 0);
    shelf.rotation.y = Math.PI / 2;
    shelf.position.set(0.12, y - 0.01, 0);
    g.add(shelf);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, W - 0.06, 6), M.wood);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(0.2, y + 0.06, 0);
    g.add(rail);
    // plates leaning against the back, not quite evenly spaced, one missing
    let z = -W / 2 + 0.14 + rnd() * 0.04;
    let i = 0;
    while (z < W / 2 - 0.12) {
      if (!(row === 1 && i === 2)) {
        const mats = [toon({ map: plateTex(row * 10 + i), rim: 0.3 }), M.ceramic, M.ceramic];
        const plate = new THREE.Mesh(plateGeo, mats);
        plate.rotation.set(0, 0, Math.PI / 2 - 0.22 - rnd() * 0.06);
        plate.position.set(0.09, y + 0.1, z);
        g.add(plate);
      }
      z += 0.23 + rnd() * 0.04;
      i++;
    }
  });
  // cups hanging from hooks under the top shelf
  for (let i = 0; i < 4; i++) {
    const cupG = new THREE.Group();
    cupG.add(lathe([[0, 0], [0.035, 0.002], [0.04, 0.06], [0.042, 0.07], [0.038, 0.07], [0.034, 0.008], [0, 0.008]], i % 2 ? M.ceramicBlue : M.ceramic, 24));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12), cupG.children[0] instanceof THREE.Mesh ? (cupG.children[0] as THREE.Mesh).material as THREE.Material : M.ceramic);
    handle.position.set(0.045, 0.04, 0);
    cupG.add(handle);
    cupG.rotation.set(0, 0, Math.PI - 0.4);
    cupG.position.set(0.15, 1.82, -0.38 + i * 0.25 + rnd() * 0.04);
    g.add(cupG);
  }
  const crown = bentBox(W + 0.1, 0.07, 0.28, M.beamH, 0.004, 0);
  crown.rotation.y = Math.PI / 2;
  crown.position.set(0.13, 1.88, 0);
  g.add(crown);
  return organic(shadowed(g), 0.006, 8);
}

/**
 * A bookshelf built from boards that have bowed a little under the books.
 * Books stand, lean, lie in small stacks; a few things live among them.
 * Faces +x; back at x = 0. Width along z.
 */
export function bookshelf(width: number, height: number, extras: (shelf: number, z: number) => THREE.Object3D | null): THREE.Group {
  const g = new THREE.Group();
  const D = 0.3;
  const back = rbox(0.02, height, width, M.beam, 0.005);
  back.position.set(0.01, height / 2, 0);
  g.add(back);
  for (const z of [-width / 2, width / 2]) {
    const side = rbox(D, height, 0.035, M.wood, 0.008);
    side.position.set(D / 2, height / 2, z);
    g.add(side);
  }
  const levels = [0.08, 0.5, 0.9, 1.3, height - 0.03];
  const rnd = makeRng(33);
  levels.forEach((y, li) => {
    const sh = bentBox(width, 0.03, D, M.wood, li < levels.length - 1 ? 0.012 : 0.003, 0);
    sh.rotation.y = Math.PI / 2;
    sh.position.set(D / 2, y, 0);
    g.add(sh);
    if (li === levels.length - 1) return;
    const room = levels[li + 1] - y - 0.04;
    let z = -width / 2 + 0.04 + rnd() * 0.03;
    let k = 0;
    while (z < width / 2 - 0.05) {
      const r = rnd();
      // the sag of the board at this point
      const sag = 0.012 * Math.sin(((z + width / 2) / width) * Math.PI);
      const base = y + 0.015 - sag;
      if (r < 0.06) {
        z += 0.06 + rnd() * 0.1; // a gap
      } else if (r < 0.2) {
        const x = extras(li, z);
        if (x) {
          x.position.set(D / 2, base, z + 0.05);
          g.add(x);
        }
        z += 0.14;
      } else if (r < 0.32) {
        // a little stack lying flat
        const n = 2 + Math.floor(rnd() * 3);
        let yy = base;
        for (let i = 0; i < n; i++) {
          const t = 0.03 + rnd() * 0.03;
          const b = makeBook(li * 100 + k * 10 + i, { h: 0.16 + rnd() * 0.08, t });
          b.rotation.set(0, -Math.PI / 2 + (rnd() - 0.5) * 0.3, Math.PI / 2, 'YXZ');
          b.position.set(D / 2 - 0.02, yy + t / 2, z + 0.1);
          g.add(b);
          yy += t;
        }
        z += 0.24;
      } else {
        // a run of standing books, the last one leaning
        const n = 6 + Math.floor(rnd() * 9);
        for (let i = 0; i < n && z < width / 2 - 0.06; i++) {
          const h = Math.min(room, 0.16 + rnd() * 0.16);
          const t = 0.016 + rnd() * rnd() * 0.06;
          const b = makeBook(li * 100 + k * 10 + i + 5, { h, t });
          b.rotation.y = -Math.PI / 2;
          b.position.set(D / 2 - 0.01 + (rnd() - 0.5) * 0.04, base, z + t / 2);
          const lean = i === n - 1 && rnd() < 0.6;
          if (lean) {
            b.rotation.x = -0.32;
            b.position.z += 0.04;
            z += 0.06;
          }
          g.add(b);
          z += t + 0.002;
        }
        z += 0.01 + rnd() * 0.03;
      }
      k++;
    }
  });
  return organic(g, 0.004, 3);
}

/** Wooden stairs that climb along x from (0,0) to (run, rise), width along z, with a rail on the `railSide` of z. */
export function stairs(run: number, rise: number, width: number, railSide = 1): THREE.Group {
  const g = new THREE.Group();
  const n = Math.round(rise / 0.19);
  const rh = rise / n;
  const rd = run / n;
  const ang = Math.atan2(rise, run);
  const len = Math.hypot(run, rise);
  for (let i = 0; i < n; i++) {
    const tread = bentBox(rd + 0.04, 0.045, width, M.woodPale, 0.003, 0.02 * Math.sin(i * 2.3));
    tread.rotation.y = 0;
    tread.position.set(rd * (i + 0.5), rh * (i + 1) - 0.022, 0);
    g.add(tread);
  }
  for (const z of [-width / 2 + 0.03, width / 2 - 0.03]) {
    const stringer = rbox(len + 0.1, 0.24, 0.05, M.beam, 0.01);
    stringer.rotation.z = ang;
    stringer.position.set(run / 2, rise / 2 - 0.05, z);
    g.add(stringer);
  }
  // the rail on the open side: posts at the bottom and every few steps, a polished handrail
  const railZ = railSide * (width / 2 - 0.03);
  for (let i = 0; i <= n; i += 4) {
    const x = Math.min(run - 0.05, rd * i + 0.06);
    const y = rh * Math.min(n, i + 1);
    const post = rbox(0.06, 0.95, 0.06, M.beam, 0.01);
    post.position.set(x, y + 0.45, railZ);
    g.add(post);
  }
  const rail = bentBox(len, 0.055, 0.07, M.wood, -0.01, 0);
  rail.rotation.z = ang;
  rail.position.set(run / 2 + 0.06, rise / 2 + 0.95, railZ);
  g.add(rail);
  return shadowed(g);
}

// ------------------------------------------------------------------ the bedroom

/**
 * The bed: a plain wooden frame, a mattress stuffed unevenly, two pillows
 * and a patchwork quilt that falls over the sides. Head on -x, width on z.
 */
export function bed(): { group: THREE.Group; quilt: THREE.Mesh } {
  const g = new THREE.Group();
  const L = 1.95;
  const W = 1.3;
  for (const [x, z, h] of [[-L / 2, -W / 2, 0.85], [-L / 2, W / 2, 0.85], [L / 2, -W / 2, 0.55], [L / 2, W / 2, 0.55]] as const) {
    const post = rbox(0.08, h, 0.08, M.beam, 0.015);
    post.position.set(x, h / 2, z);
    g.add(post);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M.beam);
    knob.position.set(x, h + 0.02, z);
    g.add(knob);
  }
  const head = bentBox(W, 0.45, 0.04, M.wood, -0.01, 0);
  head.rotation.y = Math.PI / 2;
  head.position.set(-L / 2, 0.6, 0);
  g.add(head);
  const foot = bentBox(W, 0.2, 0.04, M.wood, -0.005, 0);
  foot.rotation.y = Math.PI / 2;
  foot.position.set(L / 2, 0.4, 0);
  g.add(foot);
  for (const z of [-W / 2, W / 2]) {
    const rail = rbox(L, 0.16, 0.05, M.wood, 0.01);
    rail.position.set(0, 0.28, z);
    g.add(rail);
  }
  const ticking = toon({ map: clothTex(90, '#e8dcc4'), rim: 0.2 });
  const mattress = rbox(L - 0.08, 0.2, W - 0.06, ticking, 0.07);
  mattress.position.y = 0.44;
  g.add(organic(mattress, 0.03, 4));
  const linen = toon({ map: clothTex(91, '#f2ead8'), rim: 0.3 });
  const pillows: THREE.Mesh[] = [];
  for (const [z, ry, s] of [[-0.3, 0.08, 1], [0.28, -0.12, 0.95]] as const) {
    const p = rbox(0.42, 0.13, 0.58, linen, 0.06);
    p.position.set(-L / 2 + 0.3, 0.6, z);
    p.rotation.set(0.04, ry, -0.18);
    p.scale.setScalar(s);
    pillows.push(organic(p, 0.05, z * 10 + 3));
    g.add(p);
  }
  // the quilt, dropped from above and left to settle
  const geo = new THREE.PlaneGeometry(1.9, 1.75, 64, 60);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const rnd = makeRng(8);
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + rnd() * 0.01);
  const quilt = new THREE.Mesh(geo, toon({ map: quiltTex(), rim: 0.25, side: THREE.DoubleSide }));
  quilt.position.set(0.22, 0.78, 0.04);
  quilt.rotation.y = Math.PI / 2 + 0.04;
  const colliders: Collider[] = [
    boxCollider(new THREE.Vector3(-L / 2 + 0.04, 0.3, -W / 2 + 0.03), new THREE.Vector3(L / 2 - 0.04, 0.54, W / 2 - 0.03), 0.035),
    // the pillows lift the quilt where it reaches them
    boxCollider(new THREE.Vector3(-L / 2 + 0.08, 0.5, -0.6), new THREE.Vector3(-L / 2 + 0.48, 0.64, 0.6), 0.01),
    boxCollider(new THREE.Vector3(L / 2 - 0.04, 0, -W / 2 - 0.04), new THREE.Vector3(L / 2 + 0.04, 0.55, W / 2 + 0.04), 0.01),
    rollCollider(0.3, -W / 2, -L / 2, L / 2, 0.06),
    rollCollider(0.3, W / 2, -L / 2, L / 2, 0.06),
    floorCollider(),
  ];
  settle(quilt, { colliders, bend: 0.08, steps: 480, friction: 0.6 });
  g.add(quilt);
  return { group: shadowed(g), quilt };
}

/** A chest at the foot of the bed, iron-bound, for winter things. Length along z. */
export function chest(): THREE.Group {
  const g = new THREE.Group();
  const body = rbox(0.45, 0.42, 0.9, M.wood, 0.015);
  body.position.y = 0.21;
  g.add(body);
  const lid = rbox(0.48, 0.07, 0.93, M.woodPale, 0.02);
  lid.position.y = 0.455;
  g.add(lid);
  for (const z of [-0.3, 0.3]) {
    const band = rbox(0.49, 0.5, 0.04, M.iron, 0.005);
    band.position.set(0, 0.25, z);
    g.add(band);
  }
  const lock = rbox(0.02, 0.08, 0.06, M.brass, 0.005);
  lock.position.set(0.245, 0.37, 0);
  g.add(lock);
  return organic(shadowed(g), 0.008, 2);
}

/** A washstand with its basin and pitcher, a towel on the rail. */
export function washstand(): THREE.Group {
  const g = new THREE.Group();
  const top = rbox(0.5, 0.04, 0.42, M.woodPale, 0.01);
  top.position.y = 0.78;
  g.add(top);
  for (const [x, z] of [[-0.21, -0.17], [0.21, -0.17], [-0.21, 0.17], [0.21, 0.17]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.78, 8), M.wood);
    leg.position.set(x, 0.39, z);
    g.add(leg);
  }
  const shelf = rbox(0.44, 0.025, 0.36, M.woodPale, 0.006);
  shelf.position.y = 0.2;
  g.add(shelf);
  const basin = lathe([[0, 0], [0.09, 0.002], [0.17, 0.07], [0.18, 0.08], [0.17, 0.08], [0.085, 0.012], [0, 0.012]], M.ceramic, 36);
  basin.position.set(0.02, 0.8, 0);
  g.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), toon({ color: 0x9ab8c0, transparent: true, opacity: 0.6, rim: 0.6 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0.02, 0.85, 0);
  g.add(water);
  const pitcher = lathe([[0, 0], [0.07, 0.003], [0.085, 0.08], [0.06, 0.18], [0.065, 0.24], [0.08, 0.26], [0.074, 0.26]], M.ceramicBlue, 32);
  pitcher.position.set(-0.17, 0.2 + 0.0125, 0.06);
  g.add(pitcher);
  return organic(shadowed(g), 0.012, 4);
}

/** A rag rug, braided from old cloth. */
export function ragRug(rx: number, rz: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(1, 64);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getY(i), p.getX(i));
    const k = 1 + 0.025 * Math.sin(a * 5 + 1) + 0.015 * Math.sin(a * 11);
    p.setXY(i, p.getX(i) * k, p.getY(i) * k);
  }
  const rug = new THREE.Mesh(geo, toon({ map: ragRugTex(), rim: 0.1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.scale.set(rx, rz, 1);
  rug.position.y = 0.006;
  rug.receiveShadow = true;
  return rug;
}

/**
 * A cloak hanging from a peg: its top caught on the peg, the rest left to
 * fall against the wall. The wall is the plane z = 0, facing +z.
 */
export function hangingCloak(seed: number, color: string, w = 0.62, h = 1.05): THREE.Group {
  const g = new THREE.Group();
  const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.12, 8), M.beam);
  peg.rotation.x = Math.PI / 2 - 0.25;
  peg.position.set(0, 0, 0.06);
  g.add(peg);
  const geo = new THREE.PlaneGeometry(w, h, 30, 46);
  // gather the top edge onto the peg so the cloth falls in folds
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) - h / 2 + 0.02;
    const t = Math.max(0, (y + h) / h); // 1 at the top
    pos.setXYZ(i, x * (0.25 + 0.75 * (1 - t * t)), y, 0.08 + Math.cos(x * 30) * 0.015 * (1 - t));
  }
  const cloak = new THREE.Mesh(geo, toon({ map: clothTex(seed, color), rim: 0.35, side: THREE.DoubleSide }));
  settle(cloak, {
    colliders: [{ resolve: (p) => p.z < 0.012 && (p.z = 0.012) }, rollColliderZ(0, 0, 0, 0.14, 0.022)],
    pinned: (p) => p.y > -0.005,
    bend: 0.12,
    steps: 300,
    friction: 0.7,
  });
  g.add(cloak);
  return shadowed(g);
}

/**
 * A cat asleep, curled into a loaf with its tail round its paws. For now it
 * only breathes; one day it will have its own day.
 */
export function sleepingCat(): { group: THREE.Group; breathe: (t: number) => void } {
  const g = new THREE.Group();
  // tabby bands that run across the back, soft and uneven
  const furTex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#d4a06a';
    c.fillRect(0, 0, 256, 256);
    const rnd = makeRng(4);
    for (let y = 12; y < 256; y += 22 + rnd() * 10) {
      c.strokeStyle = `rgba(150,84,40,${0.35 + rnd() * 0.2})`;
      c.lineWidth = 5 + rnd() * 6;
      c.beginPath();
      c.moveTo(0, y);
      for (let x = 0; x <= 256; x += 16) c.lineTo(x, y + Math.sin(x * 0.05 + y) * 5);
      c.stroke();
    }
  });
  const fur = toon({ map: furTex, rim: 0.5 });
  const plain = toon({ color: 0xd4a06a, rim: 0.5 });
  const cream = toon({ color: 0xf4e2c8, rim: 0.5 });
  const dark = toon({ color: 0x3a2418 });
  // the body: a sphere turned so its rings run across the spine (x)
  const bodyGeo = new THREE.SphereGeometry(0.16, 32, 20);
  bodyGeo.rotateZ(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, fur);
  body.scale.set(1.3, 0.6, 0.95);
  body.position.y = 0.09;
  g.add(body);
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), fur);
  haunch.scale.set(1, 0.7, 1);
  haunch.position.set(-0.11, 0.08, -0.05);
  g.add(haunch);
  // the head, resting on the front paws, a little turned
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.072, 22, 16), plain);
  skull.scale.set(1, 0.88, 1.05);
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), cream);
  muzzle.scale.set(0.9, 0.7, 1.1);
  muzzle.position.set(0.055, -0.022, 0);
  head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), toon({ color: 0xc87a7a }));
  nose.position.set(0.087, -0.012, 0);
  head.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 3), plain);
    ear.position.set(-0.01, 0.065, s * 0.038);
    ear.rotation.set(s * 0.3, 0, -0.15);
    head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.035, 3), toon({ color: 0xe8b0a0 }));
    inner.position.set(0.006, 0.06, s * 0.038);
    inner.rotation.set(s * 0.3, 0, -0.15);
    head.add(inner);
    // closed eyes: two little dark curves
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0028, 4, 10, Math.PI * 0.8), dark);
    eye.position.set(0.062, 0.012, s * 0.03);
    eye.rotation.set(0, Math.PI / 2 - s * 0.35, Math.PI * 1.1);
    head.add(eye);
  }
  head.position.set(0.2, 0.085, 0.04);
  head.rotation.set(0.25, -0.35, -0.12);
  g.add(head);
  for (const z of [0.0, 0.07]) {
    const paw = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.07, 4, 8), cream);
    paw.rotation.z = Math.PI / 2;
    paw.position.set(0.21, 0.025, z);
    g.add(paw);
  }
  // the tail, wrapped round the front
  const tailPts = [
    new THREE.Vector3(-0.2, 0.05, -0.06),
    new THREE.Vector3(-0.2, 0.035, 0.08),
    new THREE.Vector3(-0.06, 0.03, 0.155),
    new THREE.Vector3(0.1, 0.03, 0.15),
    new THREE.Vector3(0.22, 0.035, 0.12),
  ];
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts), 30, 0.026, 10), fur);
  g.add(tail);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), toon({ color: 0x8a5432, rim: 0.4 }));
  tip.position.copy(tailPts[4]);
  g.add(tip);
  organic(g, 0.03, 6);
  shadowed(g);
  g.userData.noWonk = true;
  return {
    group: g,
    breathe: (t) => {
      const k = 1 + Math.sin(t * 1.6) * 0.03;
      body.scale.set(1.3, 0.6 * k, 0.95 * (1 + (k - 1) * 0.5));
    },
  };
}
