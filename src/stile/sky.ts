import * as THREE from 'three';
import { makeRng } from '../core/rng';
import { toon } from './paint';

/**
 * The sky seen from the windows: a painted gradient with soft clouds by day,
 * and by night a deep blue full of stars with the moon. Everything outside
 * (hills, trees) is real geometry lit by the same sun and moon as the room,
 * so it darkens with them instead of glowing like a picture.
 */

export interface SkyState {
  top: number;
  horizon: number;
  /** 0 by day, 1 on a clear night. */
  stars: number;
  clouds: number;
  sunDir: THREE.Vector3;
  sunGlow: number;
  sunColor: number;
  moonDir: THREE.Vector3;
  moon: number;
}

export interface Sky {
  mesh: THREE.Mesh;
  set(s: SkyState): void;
  update(t: number): void;
}

export function buildSky(): Sky {
  const uniforms = {
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    stars: { value: 0 },
    clouds: { value: 1 },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunGlow: { value: 0 },
    sunColor: { value: new THREE.Color() },
    moonDir: { value: new THREE.Vector3(0, 1, 0) },
    moon: { value: 0 },
    time: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 top, horizon, sunColor; uniform float stars, clouds, sunGlow, moon, time;
      uniform vec3 sunDir, moonDir; varying vec3 vDir;
      float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        float a = h31(vec3(i,1.0)), b = h31(vec3(i+vec2(1,0),1.0)), c = h31(vec3(i+vec2(0,1),1.0)), d = h31(vec3(i+vec2(1,1),1.0));
        return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float up = clamp(d.y, 0.0, 1.0);
        vec3 c = mix(horizon, top, pow(up, 0.55));
        // warm glow around the sun, larger when it is low
        float sd = max(dot(d, normalize(sunDir)), 0.0);
        c += sunColor * (pow(sd, 6.0) * 0.35 + pow(sd, 60.0) * 0.6) * sunGlow;
        // soft painted clouds, flattened towards the horizon
        if (clouds > 0.0 && d.y > 0.0) {
          vec2 uv = d.xz / (d.y + 0.25) * 1.6 + vec2(time * 0.004, 0.0);
          float cl = smoothstep(0.52, 0.78, fbm(uv));
          vec3 cc = mix(horizon * 1.05, vec3(1.0, 0.98, 0.95), 0.6 + 0.4 * up) ;
          c = mix(c, cc, cl * clouds * smoothstep(0.0, 0.12, d.y) * 0.85);
        }
        // stars: one per cell at most, of different sizes, twinkling a little
        if (stars > 0.0 && d.y > 0.0) {
          vec3 p = d * 150.0; vec3 cell = floor(p); float h = h31(cell);
          if (h > 0.93) {
            vec3 o = vec3(h31(cell + 7.1), h31(cell + 3.7), h31(cell + 1.3)) - 0.5;
            float r = length(fract(p) - 0.5 - o * 0.6);
            float size = 0.06 + 0.12 * pow(h31(cell + 9.0), 4.0);
            float tw = 0.75 + 0.25 * sin(time * (1.0 + h * 3.0) + h * 40.0);
            c += vec3(1.0, 0.96, 0.88) * smoothstep(size, 0.0, r) * tw * stars * smoothstep(0.0, 0.25, d.y);
          }
          // the milky band, very faint
          float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.5, 0.8))) * 4.0, 2.0));
          c += vec3(0.5, 0.55, 0.75) * band * fbm(d.xy * 9.0) * 0.08 * stars;
        }
        // the moon: a pale disc with a halo
        float md = dot(d, normalize(moonDir));
        c += vec3(0.6, 0.68, 0.9) * pow(max(md, 0.0), 40.0) * 0.25 * moon;
        float disc = smoothstep(0.99955, 0.99975, md);
        float spots = 0.85 + 0.15 * n2(d.xy * 400.0);
        c = mix(c, vec3(1.0, 0.97, 0.88) * spots, disc * moon);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), mat);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return {
    mesh,
    set(s) {
      uniforms.top.value.setHex(s.top);
      uniforms.horizon.value.setHex(s.horizon);
      uniforms.stars.value = s.stars;
      uniforms.clouds.value = s.clouds;
      uniforms.sunDir.value.copy(s.sunDir);
      uniforms.sunGlow.value = s.sunGlow;
      uniforms.sunColor.value.setHex(s.sunColor);
      uniforms.moonDir.value.copy(s.moonDir);
      uniforms.moon.value = s.moon;
    },
    update(t) {
      uniforms.time.value = t;
    },
  };
}

/** Rolling hills all around, a few round trees, a fence: lit like everything else. */
export function buildCountryside(center: THREE.Vector2, clear: number): THREE.Group {
  const g = new THREE.Group();
  const rnd = makeRng(808);
  const grass = toon({ color: 0x7aae52, rim: 0 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 48), grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  g.add(ground);
  // three rings of hills, lighter and bluer with distance
  [
    [70, 9, 0x9ab8a0],
    [52, 6, 0x86b070],
    [36, 3.5, 0x72a656],
  ].forEach(([r, hgt, col], k) => {
    const geo = new THREE.CylinderGeometry(r, r, 1, 128, 6, true);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const top = p.getY(i) > 0;
      const hh = hgt * (0.55 + 0.3 * Math.sin(a * 3 + k * 2) + 0.15 * Math.sin(a * 7 + k) + 0.08 * Math.sin(a * 17));
      p.setY(i, top ? hh : -0.5);
      // lean the top inwards so it reads as a slope rather than a wall
      if (top) {
        p.setX(i, x * (1 - (hh / r) * 0.9));
        p.setZ(i, z * (1 - (hh / r) * 0.9));
      }
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, toon({ color: col, rim: 0, side: THREE.DoubleSide }));
    m.position.set(center.x, 0, center.y);
    g.add(m);
  });
  // round trees, never closer than `clear` to the house
  const trunkM = toon({ color: 0x6a4a32, rim: 0.1 });
  const leafM = [toon({ color: 0x4f8a3e, rim: 0.3 }), toon({ color: 0x5f9a46, rim: 0.3 }), toon({ color: 0x447a38, rim: 0.3 })];
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2;
    const r = clear + rnd() * 22;
    const x = center.x + Math.cos(a) * r;
    const z = center.y + Math.sin(a) * r;
    const t = new THREE.Group();
    const s = 0.7 + rnd() * 0.8;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 1.6 * s, 7), trunkM);
    trunk.position.y = 0.8 * s;
    t.add(trunk);
    for (let k = 0; k < 4; k++) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry((0.7 + rnd() * 0.4) * s, 2), leafM[(i + k) % 3]);
      blob.position.set((rnd() - 0.5) * 0.9 * s, (1.8 + rnd() * 0.8) * s, (rnd() - 0.5) * 0.9 * s);
      t.add(blob);
    }
    t.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    t.position.set(x, 0, z);
    g.add(t);
  }
  return g;
}
