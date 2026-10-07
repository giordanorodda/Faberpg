import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BOTTEGA_INSPECT } from '../data/bottega';
import { buildOutside, buildRoom, ROOM, type Collider } from './room';

// ------------------------------------------------------------------ renderer

const canvas = document.getElementById('view') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 2000);
const EYE = 1.62;
camera.position.set(1.4, EYE, 1.6);
camera.rotation.order = 'YXZ';
camera.rotation.y = 0.55;

const room = buildRoom();
scene.add(room.group);
scene.add(buildOutside());

const sky = new Sky();
sky.scale.setScalar(1500);
scene.add(sky);
const skyU = sky.material.uniforms;
skyU.rayleigh.value = 1.6;
skyU.mieCoefficient.value = 0.005;
skyU.mieDirectionalG.value = 0.8;

// ------------------------------------------------------------------ lights

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9;
sun.shadow.camera.bottom = -9;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(sun, sun.target);

const hemi = new THREE.HemisphereLight(0xbfd4e8, 0x6a4a30, 0.4);
scene.add(hemi);

// Skylight coming in through the openings (no shadows, soft).
const skyLights = [
  { light: new THREE.RectAreaLight(0xcfe0f0, 2, 1.4, 1.2), pos: new THREE.Vector3(-1.65, 1.52, ROOM.d / 2 - 0.05), look: new THREE.Vector3(-1.65, 1.0, 0) },
  { light: new THREE.RectAreaLight(0xcfe0f0, 2, 1.0, 2.1), pos: new THREE.Vector3(1.6, 1.1, ROOM.d / 2 - 0.05), look: new THREE.Vector3(1.6, 0.6, 0) },
  { light: new THREE.RectAreaLight(0xcfe0f0, 2, 0.8, 0.8), pos: new THREE.Vector3(ROOM.w / 2 - 0.05, 1.52, -0.55), look: new THREE.Vector3(0, 1.0, -0.55) },
];
for (const s of skyLights) {
  s.light.position.copy(s.pos);
  s.light.lookAt(s.look);
  scene.add(s.light);
}

// A faint warm bounce, standing in for the light reflected by the floor and walls.
const bounce = new THREE.PointLight(0xffd8a8, 0.6, 12, 1.2);
bounce.position.set(0, 2.2, 0.5);
scene.add(bounce);

const lamp = new THREE.PointLight(0xffb060, 0, 9, 1.6);
lamp.position.copy(room.lampAnchors[0]);
lamp.castShadow = true;
lamp.shadow.mapSize.set(512, 512);
lamp.shadow.bias = -0.002;
lamp.shadow.radius = 4;
scene.add(lamp);
const candle = new THREE.PointLight(0xffa850, 0, 4, 1.8);
candle.position.copy(room.candleAnchor);
scene.add(candle);

// ------------------------------------------------------------------ light shafts and dust

const shaftMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  uniforms: { color: { value: new THREE.Color(1, 0.9, 0.7) }, strength: { value: 0.1 } },
  // Faces seen edge-on fade out, so the beam has soft borders instead of hard lines.
  vertexShader: `attribute float along; varying float vAlong; varying vec3 vN; varying vec3 vV;
    void main(){ vAlong = along; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 color; uniform float strength; varying float vAlong; varying vec3 vN; varying vec3 vV;
    void main(){ float facing = pow(abs(dot(normalize(vN), normalize(vV))), 2.5);
      float a = strength * facing * pow(1.0 - vAlong, 1.4) * smoothstep(0.0, 0.08, vAlong); gl_FragColor = vec4(color * a, 1.0); }`,
});
const shafts = new THREE.Group();
scene.add(shafts);

/** A volume from each opening along the sun direction down to the floor: the dusty beam of light. */
function rebuildShafts(dirToSun: THREE.Vector3): void {
  shafts.clear();
  if (dirToSun.y <= 0.02) return;
  const down = dirToSun.clone().negate();
  for (const win of room.windows) {
    const normalIn = win[0].z > ROOM.d / 2 - 0.01 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(-1, 0, 0);
    if (down.dot(normalIn) <= 0.05) continue; // the sun is on the other side
    const near = win.map((p) => p.clone().addScaledVector(normalIn, 0.05));
    const far = near.map((p) => p.clone().addScaledVector(down, Math.max(0.1, p.y / -down.y)));
    const pts = [...near, ...far];
    const quads = [
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
    ];
    const pos: number[] = [];
    const along: number[] = [];
    for (const q of quads) {
      for (const i of [q[0], q[1], q[2], q[0], q[2], q[3]]) {
        pos.push(pts[i].x, pts[i].y, pts[i].z);
        along.push(i < 4 ? 0 : 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
    g.computeVertexNormals();
    shafts.add(new THREE.Mesh(g, shaftMat));
  }
}

function dotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
const DUST = 700;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * ROOM.w;
  dustPos[i * 3 + 1] = Math.random() * ROOM.h;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * ROOM.d;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.PointsMaterial({ size: 0.012, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0d0, opacity: 0.5 });
const dust = new THREE.Points(dustGeo, dustMat);
scene.add(dust);

// ------------------------------------------------------------------ time of day

interface Preset {
  name: string;
  azimuth: number; // degrees from north, clockwise
  elevation: number;
  sunColor: number;
  sunIntensity: number;
  sky: number; // skylight multiplier
  lamps: boolean;
  turbidity: number;
  exposure: number;
}

const PRESETS: Preset[] = [
  { name: 'Alba', azimuth: 105, elevation: 7, sunColor: 0xffb07a, sunIntensity: 3.2, sky: 0.55, lamps: false, turbidity: 6, exposure: 1.1 },
  { name: 'Mattina', azimuth: 135, elevation: 26, sunColor: 0xfff0dc, sunIntensity: 5.5, sky: 1, lamps: false, turbidity: 3, exposure: 1.05 },
  { name: 'Pomeriggio', azimuth: 215, elevation: 24, sunColor: 0xffe2b8, sunIntensity: 5.2, sky: 0.9, lamps: false, turbidity: 4, exposure: 1.05 },
  { name: 'Tramonto', azimuth: 262, elevation: 5, sunColor: 0xff8a4a, sunIntensity: 2.4, sky: 0.35, lamps: true, turbidity: 8, exposure: 1.0 },
  { name: 'Notte', azimuth: 200, elevation: 35, sunColor: 0x8aa0d0, sunIntensity: 0.12, sky: 0.04, lamps: true, turbidity: 2, exposure: 1.1 },
];
let presetIndex = 1;
const dirToSun = new THREE.Vector3();

function applyPreset(i: number): void {
  presetIndex = i;
  const p = PRESETS[i];
  const az = THREE.MathUtils.degToRad(p.azimuth);
  const el = THREE.MathUtils.degToRad(p.elevation);
  dirToSun.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  sun.position.copy(dirToSun).multiplyScalar(30);
  sun.target.position.set(0, 0, 0);
  sun.color.setHex(p.sunColor);
  sun.intensity = p.sunIntensity;
  const night = i === 4;
  // At night the "sun" is the moon, and the sky dome is replaced by a deep blue.
  skyU.sunPosition.value.copy(night ? new THREE.Vector3(0, -1, 0) : dirToSun);
  skyU.turbidity.value = p.turbidity;
  sky.visible = !night;
  scene.background = night ? new THREE.Color(0x0a1022) : null;
  hemi.intensity = 0.9 * p.sky + 0.04;
  hemi.color.setHex(night ? 0x34406a : 0xbfd4e8);
  for (const s of skyLights) {
    s.light.intensity = 7 * p.sky;
    s.light.color.setHex(night ? 0x5a6a9a : i === 3 || i === 0 ? 0xffc8a0 : 0xcfe0f0);
  }
  bounce.intensity = 2.2 * p.sky;
  bounce.color.setHex(i === 3 ? 0xffb080 : 0xffd8a8);
  lamp.intensity = p.lamps ? (night ? 7 : 4) : 0;
  candle.intensity = p.lamps ? 1.6 : 0;
  for (const f of room.lampFlames) f.visible = p.lamps;
  renderer.toneMappingExposure = p.exposure;
  shaftMat.uniforms.strength.value = night ? 0.0 : i === 1 || i === 2 ? 0.045 : 0.07;
  shaftMat.uniforms.color.value.setHex(p.sunColor);
  dustMat.opacity = night ? 0.08 : 0.45;
  rebuildShafts(dirToSun);
  scene.fog = new THREE.Fog(night ? 0x0a1022 : i === 3 ? 0xd09070 : 0xb8c8d8, 25, 120);
  hud.time.textContent = p.name;
}

// ------------------------------------------------------------------ postprocessing

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
gtao.updateGtaoMaterial({ radius: 0.35, distanceFallOff: 1, thickness: 1, scale: 1, samples: 16 });
gtao.blendIntensity = 0.85;
// The light shafts and the dust are transparent: they must not cast ambient occlusion.
const gtaoRender = gtao.render.bind(gtao);
gtao.render = (...args: Parameters<typeof gtao.render>) => {
  shafts.visible = dust.visible = false;
  gtaoRender(...args);
  shafts.visible = dust.visible = true;
};
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.25, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------------ first person

const hud = {
  intro: document.getElementById('intro')!,
  time: document.getElementById('time')!,
  toast: document.getElementById('toast')!,
  cross: document.getElementById('cross')!,
};

const controls = new PointerLockControls(camera, document.body);
hud.intro.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => hud.intro.classList.add('hidden'));
controls.addEventListener('unlock', () => hud.intro.classList.remove('hidden'));

const keys = new Set<string>();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5)) - 1;
    if (n >= 0 && n < PRESETS.length) applyPreset(n);
  }
  if (e.code === 'KeyE') inspect();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

const WALK = 1.5; // m/s: a slow, unhurried pace
const RADIUS = 0.28;
const inner: Collider = { minX: -ROOM.w / 2 + RADIUS, maxX: ROOM.w / 2 - RADIUS, minZ: -ROOM.d / 2 + RADIUS, maxZ: ROOM.d / 2 - RADIUS };

function blocked(x: number, z: number): boolean {
  if (x < inner.minX || x > inner.maxX || z < inner.minZ || z > inner.maxZ) return true;
  return room.colliders.some((c) => x > c.minX - RADIUS && x < c.maxX + RADIUS && z > c.minZ - RADIUS && z < c.maxZ + RADIUS);
}

let bobT = 0;
function move(dt: number): void {
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  if (!controls.isLocked || (f === 0 && s === 0)) {
    camera.position.y += (EYE - camera.position.y) * Math.min(1, dt * 8);
    return;
  }
  const yaw = camera.rotation.y;
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const v = fwd.multiplyScalar(f).add(right.multiplyScalar(s)).normalize().multiplyScalar(WALK * dt);
  // slide along obstacles: try each axis separately
  if (!blocked(camera.position.x + v.x, camera.position.z)) camera.position.x += v.x;
  if (!blocked(camera.position.x, camera.position.z + v.z)) camera.position.z += v.z;
  bobT += dt * 7;
  camera.position.y = EYE + Math.sin(bobT) * 0.018;
}

const ray = new THREE.Raycaster();
ray.far = 2.2;
let toastTimer = 0;
function inspect(): void {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = ray.intersectObjects(room.group.children, true)[0];
  const key = hit?.object.userData.inspect as string | undefined;
  if (!key) return;
  hud.toast.textContent = BOTTEGA_INSPECT[key] ?? '';
  hud.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => hud.toast.classList.remove('show'), 7000);
}

function updateCrosshair(): void {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = ray.intersectObjects(room.group.children, true)[0];
  hud.cross.classList.toggle('active', !!hit?.object.userData.inspect);
}

// ------------------------------------------------------------------ loop

const timer = new THREE.Timer();
let crossT = 0;
function frame(): void {
  timer.update();
  const dt = Math.min(0.05, timer.getDelta());
  const t = timer.getElapsed();
  move(dt);
  // dust drifts slowly, and wraps around the room
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] += Math.sin(t * 0.3 + i) * 0.0006;
    dustPos[i * 3 + 1] += Math.sin(t * 0.2 + i * 1.7) * 0.0004 - 0.0002;
    if (dustPos[i * 3 + 1] < 0) dustPos[i * 3 + 1] = ROOM.h;
  }
  dustGeo.attributes.position.needsUpdate = true;
  // flames flicker
  const flick = 1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 29) * 0.03;
  if (lamp.intensity > 0) {
    lamp.intensity = (presetIndex === 4 ? 7 : 4) * flick;
    candle.intensity = 1.6 * (1 + Math.sin(t * 17 + 1) * 0.08);
  }
  crossT += dt;
  if (crossT > 0.15) {
    crossT = 0;
    updateCrosshair();
  }
  composer.render(dt);
  requestAnimationFrame(frame);
}

// ?ora=tramonto, or by real clock
const params = new URLSearchParams(location.search);
const byName = PRESETS.findIndex((p) => p.name.toLowerCase() === (params.get('ora') ?? '').toLowerCase());
const hour = new Date().getHours();
applyPreset(byName >= 0 ? byName : hour < 7 ? 0 : hour < 13 ? 1 : hour < 18 ? 2 : hour < 21 ? 3 : 4);
requestAnimationFrame(frame);

// For automated screenshots: place the camera without pointer lock.
(window as unknown as Record<string, unknown>).bottega = {
  view(x: number, z: number, yawDeg: number, pitchDeg = 0) {
    camera.position.set(x, EYE, z);
    camera.rotation.set(THREE.MathUtils.degToRad(pitchDeg), THREE.MathUtils.degToRad(yawDeg), 0, 'YXZ');
    hud.intro.style.display = 'none';
  },
  time: applyPreset,
};
