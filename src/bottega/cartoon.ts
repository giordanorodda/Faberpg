import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BOTTEGA_INSPECT } from '../data/bottega';
import { buildCartoonOutside, buildCartoonRoom } from './cartoon-room';
import { ROOM, type Collider } from './room';

/** The whole shop in the "natural cartoon" style, walked in first person. */

const canvas = document.getElementById('view') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 200);
const EYE = 1.62;
camera.position.set(1.4, EYE, 1.6);
camera.rotation.order = 'YXZ';
camera.rotation.y = 0.55;

const room = buildCartoonRoom();
scene.add(room.group);
scene.add(buildCartoonOutside());

// ------------------------------------------------------------------ light

const sun = new THREE.DirectionalLight(0xfff0d2, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.blurSamples = 12;
sun.shadow.radius = 3;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 50 });
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xa8c8ff, 0xd8a870, 1.0);
scene.add(hemi);
// warm light bounced off the floor and the walls (there is no real bounce in a rasterizer)
const bounces = [new THREE.Vector3(-1.5, 1.0, 0.6), new THREE.Vector3(1.5, 1.0, 0.8), new THREE.Vector3(-0.6, 1.4, -1.8)].map((p) => {
  const l = new THREE.PointLight(0xffd8a0, 1, 7, 1.5);
  l.position.copy(p);
  scene.add(l);
  return l;
});
const lamp = new THREE.PointLight(0xffb060, 0, 8, 1.4);
lamp.position.copy(room.lights.lamp);
// (point-light shadows are not available with soft VSM shadows)
scene.add(lamp);
const chandelier = new THREE.PointLight(0xffb868, 0, 8, 1.4);
chandelier.position.copy(room.lights.chandelier);
scene.add(chandelier);
const candle = new THREE.PointLight(0xffa850, 0, 3.5, 1.8);
candle.position.copy(room.lights.candle);
scene.add(candle);

interface Preset {
  name: string;
  az: number;
  el: number;
  sun: number;
  sunColor: number;
  sky: number;
  skyColor: number;
  bg: number;
  lamps: boolean;
  exposure: number;
}
const PRESETS: Preset[] = [
  { name: 'Alba', az: 105, el: 8, sun: 2.4, sunColor: 0xffc090, sky: 0.6, skyColor: 0xc8b8e0, bg: 0xf0c8a0, lamps: false, exposure: 1.0 },
  { name: 'Mattina', az: 140, el: 28, sun: 3.2, sunColor: 0xfff0d2, sky: 0.9, skyColor: 0xb8c8f0, bg: 0xbfe0ee, lamps: false, exposure: 1.05 },
  { name: 'Pomeriggio', az: 215, el: 26, sun: 3.0, sunColor: 0xffe2b0, sky: 0.9, skyColor: 0xb0c8f0, bg: 0xc8e0e8, lamps: false, exposure: 1.05 },
  { name: 'Tramonto', az: 255, el: 6, sun: 2.4, sunColor: 0xff9a5a, sky: 0.45, skyColor: 0x9a90c0, bg: 0xf0a070, lamps: true, exposure: 1.05 },
  { name: 'Notte', az: 200, el: 40, sun: 0.25, sunColor: 0x9ab0e0, sky: 0.12, skyColor: 0x4a5a9a, bg: 0x1a2240, lamps: true, exposure: 1.1 },
];
let preset = 1;
function applyPreset(i: number): void {
  preset = i;
  const p = PRESETS[i];
  const az = THREE.MathUtils.degToRad(p.az);
  const el = THREE.MathUtils.degToRad(p.el);
  sun.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(25);
  sun.intensity = p.sun;
  sun.color.setHex(p.sunColor);
  hemi.intensity = p.sky;
  hemi.color.setHex(p.skyColor);
  for (const b of bounces) b.intensity = 1.1 * p.sky;
  scene.background = new THREE.Color(p.bg);
  for (const f of room.flames) f.visible = p.lamps;
  for (const m of room.glows) m.emissiveIntensity = i === 4 ? 1.1 : i === 3 ? 0.6 : 0.25;
  renderer.toneMappingExposure = p.exposure;
  hud.time.textContent = p.name;
}

// ------------------------------------------------------------------ post

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
gtao.updateGtaoMaterial({ radius: 0.3, thickness: 1, samples: 16 });
gtao.blendIntensity = 0.85;
composer.addPass(gtao);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.18, 0.5, 0.88));
composer.addPass(new OutputPass());
composer.addPass(
  new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.3, 0.59, 0.11));
        c = mix(vec3(l), c, 1.08); c *= mix(vec3(0.95, 0.97, 1.04), vec3(1.04, 1.0, 0.94), smoothstep(0.1, 0.8, l));
        vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.45; gl_FragColor = vec4(c, 1.0); }`,
  }),
);
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

const WALK = 1.5;
const RADIUS = 0.28;
function blocked(x: number, z: number): boolean {
  if (x < -ROOM.w / 2 + RADIUS || x > ROOM.w / 2 - RADIUS || z < -ROOM.d / 2 + RADIUS || z > ROOM.d / 2 - RADIUS) return true;
  return room.colliders.some((c: Collider) => x > c.minX - RADIUS && x < c.maxX + RADIUS && z > c.minZ - RADIUS && z < c.maxZ + RADIUS);
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
  if (!blocked(camera.position.x + v.x, camera.position.z)) camera.position.x += v.x;
  if (!blocked(camera.position.x, camera.position.z + v.z)) camera.position.z += v.z;
  bobT += dt * 7;
  camera.position.y = EYE + Math.sin(bobT) * 0.016;
}

const ray = new THREE.Raycaster();
ray.far = 2.2;
let toastTimer = 0;
function inspect(): void {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const key = ray.intersectObjects(room.group.children, true)[0]?.object.userData.inspect as string | undefined;
  if (!key) return;
  hud.toast.textContent = BOTTEGA_INSPECT[key] ?? '';
  hud.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => hud.toast.classList.remove('show'), 7000);
}

// ------------------------------------------------------------------ loop

const timer = new THREE.Timer();
let crossT = 0;
function frame(): void {
  timer.update();
  const dt = Math.min(0.05, timer.getDelta());
  const t = timer.getElapsed();
  move(dt);
  const lampsOn = PRESETS[preset].lamps;
  const flick = 1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 29) * 0.03;
  lamp.intensity = lampsOn ? (preset === 4 ? 5 : 3) * flick : 0;
  chandelier.intensity = lampsOn ? (preset === 4 ? 4 : 2.2) * (1 + Math.sin(t * 11 + 2) * 0.05) : 0;
  candle.intensity = lampsOn ? 1.4 * (1 + Math.sin(t * 17) * 0.08) : 0;
  room.fireflies.update(t, preset === 4 ? 1 : preset === 3 ? 0.6 : 0.15);
  // a breeze from the door: herbs and garlic sway a little, never in step
  room.living.forEach((o, i) => {
    o.rotation.z = (Math.sin(t * 0.9 + i * 1.7) * 0.6 + Math.sin(t * 2.1 + i) * 0.3) * 0.02;
  });
  // clouds passing: the daylight breathes slowly
  if (!lampsOn || preset === 3) sun.intensity = PRESETS[preset].sun * (0.85 + 0.15 * (0.5 + 0.5 * Math.sin(t * 0.11) * Math.sin(t * 0.047 + 2)));
  crossT += dt;
  if (crossT > 0.15) {
    crossT = 0;
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    hud.cross.classList.toggle('active', !!ray.intersectObjects(room.group.children, true)[0]?.object.userData.inspect);
  }
  composer.render(dt);
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(location.search);
const byName = PRESETS.findIndex((p) => p.name.toLowerCase() === (params.get('ora') ?? '').toLowerCase());
const hour = new Date().getHours();
applyPreset(byName >= 0 ? byName : hour < 7 ? 0 : hour < 13 ? 1 : hour < 18 ? 2 : hour < 21 ? 3 : 4);
requestAnimationFrame(frame);

// for automated screenshots: place the camera without pointer lock
(window as unknown as Record<string, unknown>).bottega = {
  view(x: number, z: number, yawDeg: number, pitchDeg = 0) {
    camera.position.set(x, EYE, z);
    camera.rotation.set(THREE.MathUtils.degToRad(pitchDeg), THREE.MathUtils.degToRad(yawDeg), 0, 'YXZ');
    hud.intro.style.display = 'none';
  },
  time: applyPreset,
};
