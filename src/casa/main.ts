import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CASA_INSPECT } from '../data/casa';
import { LIBRI } from '../data/libri';
import { buildCountryside, buildSky } from '../stile/sky';
import { ANNEX, ANNEX_DOOR, ANNEX_USES, type AnnexUse } from './annex';
import { Carry } from './carry';
import { tickFlames } from './furniture';
import { Rain, rainyToday, Steam } from './living';
import { HouseMemory } from './memory';
import { Reader } from './reader';
import { HouseSound, type Surface } from './sound';
import { buildHouse, HOUSE, roofAbove, STAIR, UP } from './house';

/**
 * The player's house, walked in first person. Two floors joined by a stair;
 * the hearth always burns; candles are lit and put out by hand. By night
 * the only light comes from them and from the moon through the windows,
 * and every flame casts its own shadows.
 */

const canvas = document.getElementById('view') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// soft filtered shadows that also work for point lights (flames)
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 200);
const EYE = 1.6;
camera.rotation.order = 'YXZ';
camera.position.set(1.0, EYE, 1.9);
camera.rotation.y = 0.9;

const house = buildHouse();
scene.add(house.group);
const sky = buildSky();
scene.add(sky.mesh);
scene.add(buildCountryside(new THREE.Vector2(0, 0), 9));
const rain = new Rain();
scene.add(rain.mesh);
// steam from the kettle when it boils, and from the cup when the tea is hot
const kettleSteam = new Steam(house.spout, 0.035);
const cupSteam = new Steam(new THREE.Vector3(), 0.025, 14);
scene.add(kettleSteam.group, cupSteam.group);

// ------------------------------------------------------------------ light

// the sun by day and the moon by night: one light, so one set of shadows
const sky1 = new THREE.DirectionalLight(0xfff0d2, 3);
sky1.castShadow = true;
sky1.shadow.mapSize.set(2048, 2048);
sky1.shadow.radius = 4;
sky1.shadow.bias = -0.0004;
sky1.shadow.normalBias = 0.02;
Object.assign(sky1.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 60 });
scene.add(sky1, sky1.target);
sky1.target.position.set(0, 1.5, 0);
const hemi = new THREE.HemisphereLight(0xa8c8ff, 0xd8a870, 1.0);
scene.add(hemi);
// daylight bounced around the rooms (there is no real bounce in a rasterizer): it fades with the day
const bounces = [new THREE.Vector3(0.5, 1.2, 0.8), new THREE.Vector3(-1.5, 1.0, -0.5), new THREE.Vector3(0, UP + 1.3, 0.8)].map((p) => {
  const l = new THREE.PointLight(0xffd8a0, 1, 6, 1.5);
  l.position.copy(p);
  scene.add(l);
  return l;
});
// every flame is a light that casts shadows
const flames = house.lights.map((L) => {
  const fire = L.kind === 'fire';
  const l = new THREE.PointLight(fire ? 0xff9a48 : 0xffb46a, 0, fire ? 10 : 4.5, fire ? 1.3 : 1.6);
  l.position.copy(L.at);
  l.castShadow = true;
  l.shadow.mapSize.set(fire ? 1024 : 512, fire ? 1024 : 512);
  l.shadow.radius = fire ? 5 : 3;
  l.shadow.bias = -0.002;
  l.shadow.camera.near = 0.05;
  scene.add(l);
  return { def: L, light: l, lit: true };
});

interface Preset {
  name: string;
  /** The sun (or the moon, at night). */
  az: number;
  el: number;
  sun: number;
  sunColor: number;
  sky: number;
  skyColor: number;
  groundColor: number;
  top: number;
  horizon: number;
  stars: number;
  clouds: number;
  glow: number;
  night: boolean;
  exposure: number;
}
const PRESETS: Preset[] = [
  { name: 'Alba', az: 100, el: 7, sun: 2.2, sunColor: 0xffb888, sky: 0.55, skyColor: 0xc0b0e0, groundColor: 0xb08870, top: 0x7a9ad0, horizon: 0xf2c098, stars: 0.12, clouds: 0.6, glow: 1.0, night: false, exposure: 1.0 },
  { name: 'Mattina', az: 125, el: 30, sun: 3.2, sunColor: 0xfff0d2, sky: 0.9, skyColor: 0xb8c8f0, groundColor: 0xd8a870, top: 0x5d9fd8, horizon: 0xcfe6f0, stars: 0, clouds: 1, glow: 0.5, night: false, exposure: 1.05 },
  { name: 'Pomeriggio', az: 215, el: 30, sun: 3.0, sunColor: 0xffe2b0, sky: 0.9, skyColor: 0xb0c8f0, groundColor: 0xd8a870, top: 0x5a98d0, horizon: 0xd8e6e8, stars: 0, clouds: 0.9, glow: 0.6, night: false, exposure: 1.05 },
  { name: 'Tramonto', az: 255, el: 5, sun: 2.2, sunColor: 0xff9050, sky: 0.4, skyColor: 0x8a80b8, groundColor: 0x906050, top: 0x48589a, horizon: 0xf2985a, stars: 0.15, clouds: 0.5, glow: 1.3, night: false, exposure: 1.05 },
  { name: 'Notte', az: 165, el: 30, sun: 0.8, sunColor: 0x8aa4e0, sky: 0.22, skyColor: 0x3a4a8a, groundColor: 0x1a1a2a, top: 0x070c22, horizon: 0x1a2650, stars: 1, clouds: 0, glow: 0, night: true, exposure: 1.0 },
];
let preset = 1;
let raining = new URLSearchParams(location.search).get('meteo') === 'pioggia' || (new URLSearchParams(location.search).get('meteo') !== 'sereno' && rainyToday());
let current: Preset;
const dirOf = (az: number, el: number) => {
  const a = THREE.MathUtils.degToRad(az);
  const e = THREE.MathUtils.degToRad(el);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
};
/** The lantern in the room beyond burns only once the room is in use. */
function annexLantern(): void {
  for (const f of flames) if (f.def.key === 'lanterna:stanza' && progress.annex !== 'clean') f.lit = false;
}
const grey = (hex: number, k: number, to = 0x8a9098) => new THREE.Color(hex).lerp(new THREE.Color(to), k).getHex();
function applyPreset(i: number): void {
  preset = i;
  const base = PRESETS[i];
  // on a rainy day the sky is grey and low, the sun only a brightness behind it
  const w = raining ? 0.75 : 0;
  const p: Preset = raining
    ? { ...base, sun: base.sun * 0.16, exposure: base.exposure * 0.94, sunColor: grey(base.sunColor, 0.6, 0xd8dce0), sky: base.sky * (base.night ? 1 : 1.1), skyColor: grey(base.skyColor, w), top: grey(base.top, w, base.night ? 0x10141c : 0x6a7280), horizon: grey(base.horizon, w, base.night ? 0x1a2028 : 0x9aa0a8), stars: 0, clouds: base.night ? 0 : 1, glow: base.glow * 0.2 }
    : base;
  current = p;
  const dir = dirOf(p.az, p.el);
  sky1.position.copy(dir).multiplyScalar(30).add(sky1.target.position);
  sky1.intensity = p.sun;
  sky1.color.setHex(p.sunColor);
  hemi.intensity = p.sky;
  hemi.color.setHex(p.skyColor);
  hemi.groundColor.setHex(p.groundColor);
  for (const b of bounces) b.intensity = p.night ? 0 : (raining ? 0.6 : 1.0) * p.sky;
  sky.set({
    top: p.top,
    horizon: p.horizon,
    stars: p.stars,
    clouds: p.clouds,
    sunDir: p.night ? new THREE.Vector3(0, -1, 0) : dir,
    sunGlow: p.glow,
    sunColor: p.sunColor,
    moonDir: p.night ? dir : dirOf(p.az + 160, 20),
    moon: raining ? 0 : p.night ? 1 : i === 0 ? 0.3 : 0,
  });
  rain.on = raining;
  renderer.toneMappingExposure = p.exposure;
  // the candles are lit at dusk and at night, and put out in the day
  for (const f of flames) if (f.def.kind === 'candle') f.lit = p.night || i === 3;
  annexLantern();
  hud.time.textContent = p.name;
}

// ------------------------------------------------------------------ post

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
gtao.updateGtaoMaterial({ radius: 0.3, thickness: 1, samples: 16 });
gtao.blendIntensity = 0.85;
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, night: { value: 0 }, fade: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float night, fade; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.3, 0.59, 0.11));
      c = mix(vec3(l), c, 1.08); c *= mix(vec3(0.95, 0.97, 1.04), vec3(1.04, 1.0, 0.94), smoothstep(0.1, 0.8, l));
      // at night the dark parts go blue (the eye's own moonlight), the lit ones stay warm
      c = mix(c, c * mix(vec3(0.75, 0.85, 1.25), vec3(1.0), smoothstep(0.05, 0.4, l)), night);
      vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * (0.45 + 0.35 * night);
      gl_FragColor = vec4(c * (1.0 - fade), 1.0); }`,
});
composer.addPass(grade);
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
const sound = new HouseSound();
controls.addEventListener('lock', () => {
  hud.intro.classList.add('hidden');
  sound.start();
});
controls.addEventListener('unlock', () => hud.intro.classList.remove('hidden'));

const carry = new Carry(camera, house.group, house.colliders, (t) => say(t));
document.addEventListener('mousedown', (e) => {
  if (controls.isLocked && e.button === 0 && !seated) useCarry();
});
function useCarry(): void {
  const held = carry.held;
  carry.use(floorY);
  memory.touch();
  // set down: a little knock when it lands
  if (held && !carry.held) window.setTimeout(() => sound.thud(held.kind === 'furniture'), held.kind === 'furniture' ? 120 : 180);
}
// the mouse wheel turns what you hold, a little at a time
document.addEventListener('wheel', (e) => {
  if (carry.held) carry.rotate(Math.sign(e.deltaY) * 0.13);
});

const reader = new Reader();
const shelfEl = document.getElementById('shelf')!;
let choosing = false;
function openShelf(): void {
  const mend = progress.toolbox && !progress.shelf;
  openChoice(
    [...LIBRI.map((b) => ({ title: b.titolo, note: b.nota })), ...(mend ? [{ title: 'Rinforzare il terzo scaffale', note: 'con gli attrezzi della cassapanca' }] : [])],
    (i) => {
      if (i < LIBRI.length) startReading(i);
      else
        passTime(() => {
          progress.shelf = true;
          applyProgress();
          memory.touch();
        }, 'Togli i libri, tagli un puntello da un ceppo di faggio, lo torni alla meglio e lo infili sotto lo scaffale con un cuneo. Rimetti i libri. Non piega più. Quasi.');
    },
  );
}
function closeShelf(): void {
  choosing = false;
  shelfEl.classList.remove('open');
}
function startReading(i: number): void {
  closeShelf();
  reader.open(LIBRI[i]);
  controls.enabled = false;
}
function stopReading(): void {
  reader.close();
  controls.enabled = true;
}
controls.addEventListener('unlock', () => {
  if (reader.isOpen) stopReading();
  if (choosing) closeShelf();
});

const keys = new Set<string>();
window.addEventListener('keydown', (e) => {
  // while a book is open, or the shelf is, the keys belong to it
  if (reader.isOpen) {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      reader.turn(-1);
      sound.page();
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      reader.turn(1);
      sound.page();
    }
    if (e.code === 'KeyE') stopReading();
    return;
  }
  if (choosing) {
    const n = Number(e.code.slice(5)) - 1;
    const count = shelfEl.querySelectorAll('li b').length;
    if (e.code.startsWith('Digit') && n >= 0 && n < count && choiceHandler) {
      const h = choiceHandler;
      closeShelf();
      h(n);
    }
    if (e.code === 'KeyE') closeShelf();
    return;
  }
  keys.add(e.code);
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5)) - 1;
    if (n >= 0 && n < PRESETS.length) applyPreset(n);
  }
  if (e.code === 'Digit6') {
    raining = !raining;
    applyPreset(preset);
  }
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyF' && !seated) useCarry();
  if (e.code === 'KeyQ') carry.rotate(0.26);
  if (e.code === 'KeyR') carry.rotate(-0.26);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

const WALK = 1.4;
const R = 0.25;
/** Height of the floor under the player, or null where one cannot stand. */
let floorY = 0;
function floorAt(x: number, z: number, y: number): number | null {
  const { w, d } = HOUSE;
  const inHouse = Math.abs(x) <= w / 2 - R && Math.abs(z) <= d / 2 - R;
  // through the door at the foot of the stairs, once it is open, into the room beyond
  const inDoor = progress.annex !== 'locked' && y < 0.3 && x > w / 2 - R - 0.01 && x < ANNEX.x0 + R && z > ANNEX_DOOR.z0 + R && z < ANNEX_DOOR.z1 - R;
  const inAnnex = progress.annex !== 'locked' && y < 0.3 && x > ANNEX.x0 && x < ANNEX.x1 - R && z > ANNEX.z0 + R && z < ANNEX.z1 - R;
  if (inDoor || inAnnex) {
    if (house.colliders.some((c) => c.level === 0 && x > c.minX - R && x < c.maxX + R && z > c.minZ - R && z < c.maxZ + R)) return null;
    return 0;
  }
  if (!inHouse) return null;
  const inStair = x < STAIR.x0 && x > STAIR.x1 && z < STAIR.z1;
  const options: number[] = [];
  if (inStair) options.push(THREE.MathUtils.clamp((STAIR.x0 - x) / (STAIR.x0 - STAIR.x1), 0, 1) * UP);
  else {
    options.push(0);
    if (roofAbove(x) > 1.72) options.push(UP);
  }
  // you can step up or down a little, not climb a wall
  const best = options.filter((h) => Math.abs(h - y) < 0.4).sort((a, b) => Math.abs(a - y) - Math.abs(b - y))[0];
  if (best === undefined) return null;
  const level = best > UP - 0.3 ? 1 : best < 0.3 ? 0 : -1;
  if (level >= 0 && house.colliders.some((c) => c.level === level && x > c.minX - R && x < c.maxX + R && z > c.minZ - R && z < c.maxZ + R)) return null;
  return best;
}

let seated: { back: THREE.Vector3 } | null = null;
let seatedFor = 0;
let bobT = 0;
let lastStair = -1;
/** What is underfoot here: the stair, the hearthstone, a rug, or the boards. */
function surfaceAt(x: number, z: number): Surface {
  if (x < STAIR.x0 && x > STAIR.x1 && z < STAIR.z1) return 'stair';
  if (floorY < 0.3) {
    if (x < -HOUSE.w / 2 + 0.95 && Math.abs(z) < 0.8) return 'stone';
    if (((x + 1.85) / 1.05) ** 2 + ((z - 0.6) / 0.8) ** 2 < 1) return 'rug';
  } else if (((x + 0.2) / 0.75) ** 2 + ((z - 0.5) / 0.55) ** 2 < 1) return 'rug';
  return 'wood';
}
function footstep(): void {
  const s = surfaceAt(camera.position.x, camera.position.z);
  sound.step(s);
  if (s === 'stair') {
    // the ninth stair creaks, every time, going up or down
    const n = Math.round(UP / 0.19);
    const i = Math.floor(((STAIR.x0 - camera.position.x) / (STAIR.x0 - STAIR.x1)) * n);
    if (i === 8 && lastStair !== 8) sound.creak();
    lastStair = i;
  } else lastStair = -1;
}
function move(dt: number): void {
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  if (reader.isOpen || choosing) return;
  if (seated) {
    if (controls.isLocked && (f !== 0 || s !== 0)) {
      // stand up again; if the cat was on your lap, it keeps the warm chair
      camera.position.copy(seated.back);
      seated = null;
      if (house.cat.spot.name === 'grembo') {
        house.cat.set(house.catSpots.poltrona);
        say('Il gatto scende, offeso, e si prende la poltrona ancora calda.');
      }
    }
    return;
  }
  const eyeY = floorY + EYE;
  if (!controls.isLocked || (f === 0 && s === 0)) {
    camera.position.y += (eyeY - camera.position.y) * Math.min(1, dt * 8);
    return;
  }
  const yaw = camera.rotation.y;
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const v = fwd.multiplyScalar(f).add(right.multiplyScalar(s)).normalize().multiplyScalar((carry.held?.kind === 'furniture' ? 0.7 : 1) * WALK * dt);
  const lvl: 0 | 1 = floorY > UP - 0.3 ? 1 : 0;
  // bumping into a chair shoves it along (more slowly than you walk)
  if (floorAt(camera.position.x + v.x, camera.position.z + v.z, floorY) === null && carry.push(camera.position.x + v.x, camera.position.z + v.z, R, v.x * 0.8, v.z * 0.8, lvl)) memory.touch();
  let h = floorAt(camera.position.x + v.x, camera.position.z, floorY);
  if (h !== null) {
    camera.position.x += v.x;
    floorY = h;
  }
  h = floorAt(camera.position.x, camera.position.z + v.z, floorY);
  if (h !== null) {
    camera.position.z += v.z;
    floorY = h;
  }
  const before = Math.floor(bobT / Math.PI);
  bobT += dt * 7;
  if (Math.floor(bobT / Math.PI) !== before) footstep();
  camera.position.y += (floorY + EYE + Math.sin(bobT) * 0.014 - camera.position.y) * Math.min(1, dt * 12);
}

const ray = new THREE.Raycaster();
ray.far = 2.2;
let toastTimer = 0;
function say(text: string): void {
  hud.toast.textContent = text;
  hud.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => hud.toast.classList.remove('show'), 7000);
}
// ------------------------------------------------------------------ the fire and the tea

/** What has changed in the house over time: the room beyond the door, the mended shelf, what you carry. */
const progress = {
  annex: 'locked' as 'locked' | 'open' | 'clean',
  use: null as AnnexUse | null,
  keys: false,
  toolbox: false,
  shelf: false,
};
let doorOpen = 0;
function applyProgress(): void {
  if (progress.annex === 'clean' && progress.use) {
    house.annex.clean();
    house.annex.furnish(progress.use);
  }
  house.shelfProp.visible = progress.shelf;
  if (progress.keys) house.group.traverse((o) => o.userData.inspect === 'chiavi' && (o.visible = false));
}
/** Time passes: the screen goes dark, the work is done, the light comes back. */
function passTime(done: () => void, after: string): void {
  const t0 = performance.now();
  let did = false;
  const step = () => {
    const t = (performance.now() - t0) / 1000;
    grade.uniforms.fade.value = Math.min(1, t / 1.2) - Math.max(0, (t - 2.6) / 1.2);
    if (t > 1.3 && !did) {
      did = true;
      done();
    }
    if (t < 3.8) requestAnimationFrame(step);
    else {
      grade.uniforms.fade.value = 0;
      say(after);
    }
  };
  requestAnimationFrame(step);
}

/** 1 = a full load of wood, 0 = cold ashes. */
let fireLevel = 1;
type Kettle = 'cold' | 'heating' | 'boil';
const HERBS = [
  { name: 'tiglio', su: 'sul tiglio', color: 0xc8a048, line: 'Tè di tiglio. Sa di estate, di api, di pomeriggi lunghi.' },
  { name: 'menta', su: 'sulla menta', color: 0x9aa050, line: 'Menta, col miele. Ti scalda le mani, e la bocca resta fresca.' },
  { name: 'la miscela di Bruna', su: 'sulla miscela di Bruna', color: 0x8a4a2a, line: 'La miscela di Bruna «per le sere lunghe». Sa di corteccia, di fumo, di qualcosa che non sai nominare.' },
];
const tea = { kettle: 'cold' as Kettle, heat: 0, steep: -1, herb: 0, cup: 'cold' as 'cold' | 'hot' | 'empty' };
function updateTea(dt: number): void {
  if (tea.kettle === 'heating') {
    tea.heat += dt * (0.3 + 0.7 * Math.min(1, fireLevel * 1.5));
    kettleSteam.amount = Math.min(0.5, tea.heat / 60);
    if (tea.heat > 40) {
      tea.kettle = 'boil';
      sound.whistle(true);
      say('Il bollitore comincia a fischiare.');
    }
  } else kettleSteam.amount = tea.kettle === 'boil' ? 1 : 0;
  if (tea.steep >= 0) {
    tea.steep += dt;
    if (tea.steep > 12) {
      tea.steep = -1;
      tea.cup = 'hot';
      const m = house.teaSurface.material as THREE.MeshToonMaterial;
      m.color.setHex(HERBS[tea.herb].color);
      house.teaSurface.visible = true;
      say('Il tè è pronto: ne versi una tazza, sul tavolino accanto alla poltrona.');
    }
  }
  cupSteam.amount = tea.cup === 'hot' ? 0.5 : 0;
  house.teacup.getWorldPosition(cupSteam.at).y += 0.07;
}
let choiceHandler: ((i: number) => void) | null = null;
function openChoice(items: { title: string; note: string }[], pick: (i: number) => void): void {
  choosing = true;
  choiceHandler = pick;
  const ul = shelfEl.querySelector('ul')!;
  ul.innerHTML = '';
  items.forEach((b, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${i + 1}</b>${b.title}<span>${b.note}</span>`;
    ul.append(li);
  });
  const last = document.createElement('li');
  last.innerHTML = '<span>E per lasciar stare</span>';
  ul.append(last);
  shelfEl.classList.add('open');
}

let lastKey = '';
let sleeping = 0;
function interact(forced?: string): void {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const key = forced ?? (ray.intersectObjects(house.group.children, true)[0]?.object.userData.inspect as string | undefined);
  if (!key) return;
  const fl = flames.find((f) => f.def.key === key);
  if (fl) {
    fl.lit = !fl.lit;
    memory.touch();
    sound.candle(fl.lit);
    say(fl.lit ? 'Accendi la candela. La fiamma esita, poi si raddrizza.' : 'Spegni la candela con due dita. Un filo di fumo, odore di sego.');
  } else if (key === 'poltrona' && !seated) {
    seated = { back: camera.position.clone() };
    camera.position.copy(house.seat.at);
    camera.rotation.set(-0.3, house.seat.yaw, 0, 'YXZ');
    say('Ti siedi. Il fuoco scoppietta. (E sul libro per leggere, WASD per alzarti)');
  } else if (key === 'libro') {
    startReading(0);
  } else if (key === 'libreria' || key === 'libri') {
    openShelf();
  } else if (key === 'letto' && lastKey === 'letto' && !sleeping) {
    sleeping = 0.0001;
  } else if (key === 'bollitore') {
    if (fireLevel <= 0.04) say('Il fuoco è spento: prima bisogna accenderlo.');
    else if (tea.kettle === 'cold') {
      tea.kettle = 'heating';
      tea.heat = 0;
      say('Riempi il bollitore col ramaiolo e lo giri sopra il fuoco. Ora si aspetta.');
    } else if (tea.kettle === 'heating') say('L\'acqua comincia appena a mormorare. Non ancora.');
    else say('Bolle. Versa l\'acqua nella teiera (E sulla teiera).');
  } else if (key === 'teiera') {
    if (tea.kettle !== 'boil') say(CASA_INSPECT.teiera);
    else
      openChoice(
        HERBS.map((h) => ({ title: h.name, note: '' })),
        (i) => {
          tea.herb = i;
          tea.kettle = 'cold';
          tea.steep = 0;
          sound.whistle(false);
          say(`Togli il bollitore dal fuoco e versi l'acqua ${HERBS[i].su}. Lasci le foglie in infusione.`);
        },
      );
  } else if (key === 'tazza') {
    if (tea.cup === 'hot') {
      tea.cup = 'empty';
      house.teaSurface.visible = false;
      say(HERBS[tea.herb].line);
    } else if (tea.cup === 'empty') say('La tazza è vuota. Sul fondo, due foglie.');
    else say(CASA_INSPECT.tazza);
  } else if (key === 'legna' || key === 'rametti') {
    if (fireLevel <= 0.04) {
      fireLevel = 0.45;
      say('Rametti, due pigne, una scheggia di resina: il fuoco riprende, prima piano, poi con un sospiro.');
    } else if (fireLevel > 0.85) say('Il fuoco è già carico. Un altro ceppo lo soffocherebbe.');
    else {
      fireLevel = Math.min(1, fireLevel + 0.4);
      say('Metti un ceppo sul fuoco. Scoppietta, si assesta, prende.');
    }
    sound.thud(true);
    memory.touch();
  } else if (key === 'camino' && fireLevel <= 0.04) {
    say('Il fuoco è spento, la cenere è fredda. Ci vogliono i rametti del cesto (E sul cesto).');
  } else if (key === 'chiavi' && !progress.keys) {
    progress.keys = true;
    applyProgress();
    memory.touch();
    say('Prendi il mazzo di chiavi. La quarta è più vecchia delle altre, e più pesante.');
  } else if (key === 'porta-stanza') {
    if (progress.annex !== 'locked') say(progress.annex === 'open' ? 'La porta della stanza di là. Dentro, polvere e cose di altri.' : CASA_INSPECT['porta-stanza']);
    else if (!progress.keys) say('Una porta chiusa a chiave, in fondo alle scale. Nessuna delle chiavi che usi ogni giorno la apre.');
    else {
      progress.annex = 'open';
      memory.touch();
      sound.creak();
      say('La quarta chiave gira, dopo un po\' di insistenza. La porta si apre su una stanza che nessuno apre da anni.');
    }
  } else if (key === 'polvere') {
    openChoice(ANNEX_USES, (i) => {
      const use = ANNEX_USES[i].id;
      passTime(() => {
        progress.annex = 'clean';
        progress.use = use;
        applyProgress();
        memory.touch();
      }, `Ci vuole tutto il pomeriggio: la scopa, tre secchi d'acqua, gli stracci, i teli portati fuori a sbattere. Le cose vecchie le metti da parte: qualcuna servirà. Quando hai finito, la stanza è ${use === 'dispensa' ? 'una dispensa' : use === 'laboratorio' ? 'un laboratorio' : 'uno studio'}, ed è tua.`);
    });
  } else if (key === 'cassapanca' && !progress.toolbox) {
    progress.toolbox = true;
    memory.touch();
    say('Apri la cassapanca. Coperte, un maglione, e in fondo una cassetta di legno: gli attrezzi di chi abitava qui. Martello, chiodi, una sega piccola. Li prendi.');
  } else if (key === 'gatto') {
    say(house.cat.spot.line);
  } else say(CASA_INSPECT[key] ?? '');
  lastKey = key;
}

/** Daylight indoors, by time of day (enough to read by, except at dawn and dusk). */
const i3 = (i: number) => [0.45, 1.0, 1.0, 0.35, 0][i];

// ------------------------------------------------------------------ loop

const timer = new THREE.Timer();
let crossT = 0;
function frame(): void {
  timer.update();
  const dt = Math.min(0.05, timer.getDelta());
  const t = timer.getElapsed();
  move(dt);
  carry.update(dt, floorY);
  memory.update(dt);
  tickFlames(t);
  sky.update(t);
  const p = PRESETS[preset];
  const level = floorY > UP - 0.5 ? 1 : 0;
  for (const f of flames) {
    const fire = f.def.kind === 'fire';
    if (fire) f.lit = fireLevel > 0.04;
    for (const m of f.def.flames) {
      m.visible = f.lit;
      if (fire) m.scale.y = 0.35 + 0.65 * Math.min(1, fireLevel * 1.4);
    }
    // a flame never holds still: two or three rhythms that never line up
    const flick = 1 + Math.sin(t * 9.3 + f.def.at.x) * 0.06 + Math.sin(t * 23.1 + f.def.at.z) * 0.04 + (fire ? Math.sin(t * 3.7) * 0.08 : 0);
    const base = fire ? (p.night ? 3.0 : 1.4) : 1.3;
    f.light.intensity = f.lit ? base * flick * (fire ? 0.3 + 0.7 * Math.min(1, fireLevel * 1.3) : 1) : 0;
    // only the flames on your floor cast shadows (the others cannot reach you anyway)
    f.light.castShadow = f.lit && (fire || f.def.level === level);
    if (fire) f.light.position.set(f.def.at.x + Math.sin(t * 5.1) * 0.03, f.def.at.y + Math.sin(t * 7.3) * 0.02, f.def.at.z + Math.sin(t * 4.3) * 0.04);
  }
  // the fire burns down slowly (a full load lasts about three hours) and the embers dim with it
  fireLevel = Math.max(0, fireLevel - dt / (3 * 3600));
  house.embers.emissiveIntensity = (0.15 + Math.min(1, fireLevel * 2)) * (1.0 + Math.sin(t * 2.3) * 0.25 + Math.sin(t * 5.7) * 0.1);
  updateTea(dt);
  // the door of the room beyond swings open; its shutters open once it is clean
  doorOpen += ((progress.annex !== 'locked' ? 1 : 0) - doorOpen) * Math.min(1, dt * 1.5);
  house.annex.door.rotation.y = -doorOpen * Math.PI * 0.55;
  for (const sh of house.annex.shutters) sh.rotation.y += (((progress.annex === 'clean' ? 1 : 0) * (sh.userData.side as number) * -1.9) - sh.rotation.y) * Math.min(1, dt * 2);
  kettleSteam.update(dt, t);
  cupSteam.update(dt, t);
  rain.update(dt);
  sound.rain(raining ? (level === 1 ? 0.9 : 0.6) : 0);
  // the cat's day, from the clock; it moves only when you are not looking
  {
    if (seated) seatedFor += dt;
    else seatedFor = 0;
    const evening = preset >= 3;
    let want = house.catSpots[['ciotola', 'panca', 'letto', 'poltrona', 'tappeto'][preset]];
    if (want.name === 'poltrona' && seated) want = house.catSpots.tappeto;
    if (evening && seated && seatedFor > 15 && house.cat.spot.name !== 'grembo') {
      house.cat.set(house.catSpots.grembo);
      say('Un peso morbido ti sale sulle ginocchia, gira due volte su se stesso, e si sistema.');
    } else if (house.cat.spot.name !== 'grembo' || !seated) house.cat.update(t, house.cat.spot.name === 'grembo' ? house.catSpots.poltrona : want, camera);
    else house.cat.update(t, house.catSpots.grembo, camera);
  }
  {
    const fireAt = flames.find((f) => f.def.kind === 'fire')!.light.position;
    const df = camera.position.distanceTo(fireAt);
    const fire = level === 1 ? 0.12 : Math.pow(Math.max(0, 1 - df / 7), 1.4);
    const purr = Math.max(0, 1 - camera.position.distanceTo(house.cat.group.position) / 1.5);
    sound.setScene(fire, p.night, purr);
    sound.update();
  }
  house.living.forEach((o, i) => {
    o.rotation.z = (Math.sin(t * 0.7 + i * 1.7) * 0.6 + Math.sin(t * 1.9 + i) * 0.3) * 0.012;
  });
  if (!p.night) sky1.intensity = current.sun * (0.85 + 0.15 * (0.5 + 0.5 * Math.sin(t * 0.11) * Math.sin(t * 0.047 + 2)));
  grade.uniforms.night.value += ((p.night ? 1 : 0) - grade.uniforms.night.value) * Math.min(1, dt * 2);
  // going to sleep: the screen darkens, the night passes, morning comes in through the window
  if (sleeping > 0) {
    sleeping += dt;
    grade.uniforms.fade.value = Math.min(1, sleeping / 1.5) - Math.max(0, (sleeping - 3) / 1.5);
    if (sleeping > 2.2 && sleeping - dt <= 2.2) {
      applyPreset(preset === 4 || preset === 3 ? 0 : 4);
      camera.position.set(house.bedside.at.x, house.bedside.at.y + EYE, house.bedside.at.z);
      camera.rotation.set(0, house.bedside.yaw, 0, 'YXZ');
      floorY = UP;
      seated = null;
    }
    if (sleeping > 4.5) {
      sleeping = 0;
      grade.uniforms.fade.value = 0;
      say(preset === 0 ? 'Ti svegli presto. Il gatto è già sceso.' : 'Hai dormito tutto il giorno. Fuori è buio.');
      lastKey = '';
    }
  }
  if (reader.isOpen) {
    // light on the page: daylight from the windows plus every flame, by its distance
    let l = p.night ? 0.05 : i3(preset);
    for (const f of flames) {
      if (!f.lit) continue;
      const d2 = Math.max(0.15, f.light.position.distanceToSquared(camera.position));
      l += (f.light.intensity / d2) * (f.def.kind === 'fire' ? 0.18 : 0.5);
    }
    reader.setLight(l);
  }
  crossT += dt;
  if (crossT > 0.15) {
    crossT = 0;
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const o = ray.intersectObjects(house.group.children, true)[0]?.object;
    hud.cross.classList.toggle('active', !!(o?.userData.inspect || o?.userData.movable));
  }
  composer.render(dt);
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(location.search);
const byName = PRESETS.findIndex((q) => q.name.toLowerCase() === (params.get('ora') ?? '').toLowerCase());
const hour = new Date().getHours();
applyPreset(byName >= 0 ? byName : hour < 7 ? 0 : hour < 13 ? 1 : hour < 18 ? 2 : hour < 21 ? 3 : 4);
// the cat starts the day where the hour says
house.cat.set(house.catSpots[['ciotola', 'panca', 'letto', 'poltrona', 'tappeto'][preset]]);
// the house remembers where things were left, and which candles were burning
const memory = new HouseMemory(
  house.movables,
  () => Object.fromEntries(flames.filter((f) => f.def.key).map((f) => [f.def.key!, f.lit])),
  () => ({ fire: fireLevel, ...progress }),
);
if (!params.has('nuova')) {
  const saved = memory.restore();
  if (saved) {
    for (const f of flames) if (f.def.key && f.def.key in saved.candles) f.lit = saved.candles[f.def.key];
    // the fire has gone on burning while you were away, and may have gone out
    const ex = (saved.extra ?? {}) as Partial<typeof progress> & { fire?: number };
    Object.assign(progress, { annex: ex.annex ?? 'locked', use: ex.use ?? null, keys: !!ex.keys, toolbox: !!ex.toolbox, shelf: !!ex.shelf });
    applyProgress();
    annexLantern();
    const fire = Number(ex.fire ?? 1);
    const away = saved.savedAt ? (Date.now() - saved.savedAt) / 1000 : 0;
    fireLevel = Math.max(0, fire - away / (3 * 3600));
    if (fireLevel <= 0.04 && away > 600) window.setTimeout(() => say('Il fuoco si è spento mentre eri via. La casa sa di cenere fredda.'), 1500);
  }
}
window.setInterval(() => memory.touch(), 60000);
requestAnimationFrame(frame);

// for automated screenshots: place the camera without pointer lock
(window as unknown as Record<string, unknown>).bottega = {
  view(x: number, z: number, yawDeg: number, pitchDeg = 0, y = 0) {
    floorY = y;
    camera.position.set(x, y + EYE, z);
    camera.rotation.set(THREE.MathUtils.degToRad(pitchDeg), THREE.MathUtils.degToRad(yawDeg), 0, 'YXZ');
    hud.intro.style.display = 'none';
  },
  /** For tests: use a thing by its name, as if looking at it and pressing E. */
  use(key: string) {
    interact(key);
    return hud.toast.textContent;
  },
  progress,
  /** For tests: let time pass for the tea (headless rendering is too slow to wait). */
  tick(sec: number) {
    for (let k = 0; k < sec * 20; k++) updateTea(0.05);
    return hud.toast.textContent;
  },
  choose(i: number) {
    const h = choiceHandler;
    closeShelf();
    h?.(i);
    return hud.toast.textContent;
  },
  read(i = 0) {
    startReading(i);
  },
  sit() {
    camera.position.copy(house.seat.at);
    camera.rotation.set(-0.3, house.seat.yaw, 0, 'YXZ');
    hud.intro.style.display = 'none';
  },
  time: (i: number) => {
    applyPreset(i);
    house.cat.set(house.catSpots[['ciotola', 'panca', 'letto', 'poltrona', 'tappeto'][i]]);
  },
  carry,
  house,
  sound,
};
