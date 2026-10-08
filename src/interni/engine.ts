import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { formatClock, WEEKDAY_NAMES } from '../core/time';
import { WEATHER_NAMES } from '../core/weather';
import { tickFlames } from '../casa/furniture';
import { Rain } from '../casa/living';
import { HouseSound } from '../casa/sound';
import { buildCountryside, buildSky } from '../stile/sky';
import { CHAT, END, type Character, type Spot } from './types';
import { FreeTalk, hasKey, keyStorage, MODELS, saveKey } from './chat';
import { presetFor, PRESET_TIMES, WorldClock } from './clock';
import { bark, Conversation, type Step } from './dialogue';
import { PeopleMemory } from './memory';
import { Npc, type Nav } from './npc';
import type { Box } from './shell';
import { TalkUi } from './ui';
import { BUILDINGS } from '../data/map';

/**
 * A house you can walk into from the village, with the people who live
 * there going about their day. Light, sky and weather follow the shared
 * clock; the door leads back out to the 2D village at the right spot.
 */

export interface Built {
  group: THREE.Group;
  colliders: Box[];
  /** Inner walls of the room. */
  bounds: { x0: number; x1: number; z0: number; z1: number };
  lights: { at: THREE.Vector3; flames: THREE.Mesh[]; kind: 'fire' | 'candle' }[];
  spots: Record<string, Spot>;
  nav: Nav;
  /** The nav node by the front door. */
  doorNode: string;
  spawn: { x: number; z: number; yaw: number };
}

export interface PlaceDef {
  id: string;
  /** The village building this is the inside of (for the way out). */
  building: string;
  /** Where to appear outside, on the village map (the tile below the door). */
  outside: { x: number; y: number };
  title: string;
  build(): Built;
  people: Character[];
  inspect: Record<string, string>;
}

/** The village tile just outside a building's door, where you appear on leaving. */
export function outsideOf(building: string): { x: number; y: number } {
  const b = BUILDINGS.find((x) => x.id === building);
  return b ? { x: b.door.x, y: b.door.y + 1 } : { x: 10, y: 29 };
}

export function runPlace(def: PlaceDef): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.rotation.order = 'YXZ';
  const EYE = 1.6;
  const built = def.build();
  scene.add(built.group);
  const sky = buildSky();
  scene.add(sky.mesh);
  scene.add(buildCountryside(new THREE.Vector2(0, 0), 8));
  const rain = new Rain(1800);
  scene.add(rain.mesh);
  camera.position.set(built.spawn.x, EYE, built.spawn.z);
  camera.rotation.y = built.spawn.yaw;

  // ------------------------------------------------------------------ light
  const sun = new THREE.DirectionalLight(0xfff0d2, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 60 });
  scene.add(sun, sun.target);
  sun.target.position.set(0, 1.2, 0);
  const hemi = new THREE.HemisphereLight(0xa8c8ff, 0xd8a870, 1.0);
  scene.add(hemi);
  const bounces = [new THREE.Vector3(-1, 1.2, 0.5), new THREE.Vector3(1.2, 1.1, -0.6)].map((p) => {
    const l = new THREE.PointLight(0xffd8a0, 1, 6, 1.5);
    l.position.copy(p);
    scene.add(l);
    return l;
  });
  const flames = built.lights.map((L) => {
    const fire = L.kind === 'fire';
    const l = new THREE.PointLight(fire ? 0xff9a48 : 0xffb46a, 0, fire ? 9 : 4.5, fire ? 1.3 : 1.6);
    l.position.copy(L.at);
    l.castShadow = true;
    l.shadow.mapSize.set(fire ? 1024 : 512, fire ? 1024 : 512);
    l.shadow.radius = fire ? 5 : 3;
    l.shadow.bias = -0.002;
    l.shadow.camera.near = 0.05;
    scene.add(l);
    return { def: L, light: l };
  });
  const PRESETS = [
    { az: 100, el: 7, sun: 2.2, sunColor: 0xffb888, sky: 0.55, skyColor: 0xc0b0e0, ground: 0xb08870, top: 0x7a9ad0, horizon: 0xf2c098, stars: 0.12, clouds: 0.6, glow: 1, night: false },
    { az: 125, el: 30, sun: 3.2, sunColor: 0xfff0d2, sky: 0.9, skyColor: 0xb8c8f0, ground: 0xd8a870, top: 0x5d9fd8, horizon: 0xcfe6f0, stars: 0, clouds: 1, glow: 0.5, night: false },
    { az: 215, el: 30, sun: 3.0, sunColor: 0xffe2b0, sky: 0.9, skyColor: 0xb0c8f0, ground: 0xd8a870, top: 0x5a98d0, horizon: 0xd8e6e8, stars: 0, clouds: 0.9, glow: 0.6, night: false },
    { az: 255, el: 5, sun: 2.2, sunColor: 0xff9050, sky: 0.4, skyColor: 0x8a80b8, ground: 0x906050, top: 0x48589a, horizon: 0xf2985a, stars: 0.15, clouds: 0.5, glow: 1.3, night: false },
    { az: 165, el: 30, sun: 0.8, sunColor: 0x8aa4e0, sky: 0.22, skyColor: 0x3a4a8a, ground: 0x1a1a2a, top: 0x070c22, horizon: 0x1a2650, stars: 1, clouds: 0, glow: 0, night: true },
  ];
  const clock = new WorldClock();
  const params = new URLSearchParams(location.search);
  const ora = params.get('ora');
  if (ora) clock.override = PRESET_TIMES[['alba', 'mattina', 'pomeriggio', 'tramonto', 'notte'].indexOf(ora)] ?? null;
  let preset = -1;
  let raining = false;
  const dirOf = (az: number, el: number) => {
    const a = THREE.MathUtils.degToRad(az);
    const e = THREE.MathUtils.degToRad(el);
    return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
  };
  const grey = (hex: number, k: number, to: number) => new THREE.Color(hex).lerp(new THREE.Color(to), k).getHex();
  function applyLight(i: number, wet: boolean): void {
    preset = i;
    raining = wet;
    const p = PRESETS[i];
    const dir = dirOf(p.az, p.el);
    sun.position.copy(dir).multiplyScalar(30).add(sun.target.position);
    sun.intensity = p.sun * (wet ? 0.16 : 1);
    sun.color.setHex(p.sunColor);
    hemi.intensity = p.sky;
    hemi.color.setHex(wet ? grey(p.skyColor, 0.7, 0x8a9098) : p.skyColor);
    hemi.groundColor.setHex(p.ground);
    for (const b of bounces) b.intensity = p.night ? 0 : (wet ? 0.6 : 1) * p.sky;
    sky.set({
      top: wet ? grey(p.top, 0.75, p.night ? 0x10141c : 0x6a7280) : p.top,
      horizon: wet ? grey(p.horizon, 0.75, p.night ? 0x1a2028 : 0x9aa0a8) : p.horizon,
      stars: wet ? 0 : p.stars,
      clouds: wet ? (p.night ? 0 : 1) : p.clouds,
      sunDir: p.night ? new THREE.Vector3(0, -1, 0) : dir,
      sunGlow: p.glow * (wet ? 0.2 : 1),
      sunColor: p.sunColor,
      moonDir: p.night ? dir : dirOf(p.az + 160, 20),
      moon: wet ? 0 : p.night ? 1 : 0,
    });
    rain.on = wet;
  }

  // ------------------------------------------------------------------ post
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.3, thickness: 1, samples: 16 });
  gtao.blendIntensity = 0.85;
  composer.addPass(gtao);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.9));
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, night: { value: 0 }, fade: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float night, fade; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.3, 0.59, 0.11));
        c = mix(vec3(l), c, 1.08); c *= mix(vec3(0.95, 0.97, 1.04), vec3(1.04, 1.0, 0.94), smoothstep(0.1, 0.8, l));
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

  // ------------------------------------------------------------------ people
  const memory = new PeopleMemory();
  const npcs = def.people.map((c) => {
    const n = new Npc(c, def.id, built.spots, built.nav, built.doorNode);
    scene.add(n.person.root);
    return n;
  });
  const nowOf = () => {
    const cal = clock.calendar();
    return { minute: clock.minuteOfDay(), weekday: cal.weekday, weather: clock.weather() };
  };
  for (const n of npcs) n.snap(nowOf());

  // ------------------------------------------------------------------ controls and HUD
  const hud = {
    intro: document.getElementById('intro')!,
    time: document.getElementById('time')!,
    toast: document.getElementById('toast')!,
    cross: document.getElementById('cross')!,
  };
  const ui = new TalkUi();
  const sound = new HouseSound();
  const controls = new PointerLockControls(camera, document.body);
  hud.intro.addEventListener('click', () => controls.lock());
  controls.addEventListener('lock', () => {
    hud.intro.classList.add('hidden');
    sound.start();
  });
  controls.addEventListener('unlock', () => {
    if (talk) endTalk();
    hud.intro.classList.remove('hidden');
  });
  let toastT = 0;
  const say = (t: string) => {
    hud.toast.textContent = t;
    hud.toast.classList.add('show');
    window.clearTimeout(toastT);
    toastT = window.setTimeout(() => hud.toast.classList.remove('show'), 6500);
  };

  // ------------------------------------------------------------------ talking
  interface Talk {
    npc: Npc;
    conv: Conversation;
    step: Step | null;
    page: number;
    free: FreeTalk | null;
    waiting: boolean;
  }
  let talk: Talk | null = null;
  const momentOf = (n: Npc) => ({ phase: clock.calendar().phase, weather: clock.weather(), doing: n.doing, day: clock.calendar().day });
  function startTalk(n: Npc): void {
    if (n.person.pose === 'sleep') {
      say(`${n.c.name.split(' ')[0]} dorme. Meglio non ${n.c.id === 'corvino' ? 'svegliarlo' : 'svegliarla'}.`);
      return;
    }
    n.talking = true;
    controls.enabled = false;
    const conv = new Conversation(n.c, memory, momentOf(n));
    talk = { npc: n, conv, step: conv.start(), page: 0, free: null, waiting: false };
    ui.open(n.c.name, n.c.epithet);
    showPage();
  }
  function showPage(): void {
    if (!talk?.step) return endTalk();
    const st = talk.step;
    const page = st.pages[talk.page] ?? '';
    talk.npc.person.talking = true;
    const last = talk.page >= st.pages.length - 1;
    ui.say(page, () => {
      if (!talk) return;
      talk.npc.person.talking = false;
      if (last) ui.choices(st.choices, CHAT);
      else ui.more();
    });
  }
  function advance(): void {
    if (!talk || talk.free) return;
    if (ui.busy) return ui.finish();
    if (talk.step && talk.page < talk.step.pages.length - 1) {
      talk.page++;
      showPage();
    }
  }
  function choose(i: number): void {
    if (!talk || talk.free || !talk.step || ui.busy || talk.page < talk.step.pages.length - 1) return;
    const ch = talk.step.choices[i];
    if (!ch) return;
    if (ch.to === END) return endTalk();
    if (ch.to === CHAT) return void openFree();
    talk.step = talk.conv.go(ch.to);
    talk.page = 0;
    if (!talk.step) return endTalk();
    showPage();
  }
  async function openFree(): Promise<void> {
    if (!talk) return;
    const t = talk;
    if (!(await hasKey())) {
      ui.askKey(
        keyStorage(),
        async (key, model) => {
          await saveKey(key, model);
          void openFree();
        },
        () => {
          t.step = t.conv.go('argomenti');
          t.page = 0;
          showPage();
        },
        MODELS,
      );
      return;
    }
    t.free = new FreeTalk(t.npc.c, memory.npc(t.npc.c.id), memory.flags());
    const first = t.npc.c.name.split(' ')[0];
    ui.chatMode(
      (text) => void sendFree(text),
      () => {
        t.free = null;
        memory.save();
        t.step = t.conv.go('argomenti');
        t.page = 0;
        showPage();
      },
    );
    ui.addLine(first, '(Ti guarda, in attesa.)');
  }
  async function sendFree(text: string): Promise<void> {
    if (!talk?.free || talk.waiting) return;
    const t = talk;
    const first = t.npc.c.name.split(' ')[0];
    ui.addLine('Tu', text, true);
    const p = ui.addLine(first, '');
    t.waiting = true;
    ui.setInputEnabled(false);
    t.npc.person.talking = true;
    const cal = clock.calendar();
    try {
      let got = false;
      const answer = await t.free!.say(text, { time: `${WEEKDAY_NAMES[cal.weekday]}, ore ${formatClock(clock.minuteOfDay())}`, weather: WEATHER_NAMES[clock.weather()].toLowerCase(), doing: t.npc.doing }, (chunk) => {
        got = true;
        ui.grow(p, chunk);
      });
      if (!got) ui.grow(p, answer);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      ui.grow(p, msg.includes('401') || msg.toLowerCase().includes('auth') ? '(Non ti sente. La chiave delle API non funziona: controllala.)' : '(Non ti sente bene: qualcosa si è inceppato. Riprova fra un momento.)');
      console.warn('Conversazione libera:', e);
    }
    memory.save();
    t.waiting = false;
    t.npc.person.talking = false;
    ui.setInputEnabled(true);
  }
  function endTalk(): void {
    if (!talk) return;
    talk.npc.talking = false;
    talk.npc.person.talking = false;
    memory.save();
    talk = null;
    ui.close();
    controls.enabled = true;
  }

  // ------------------------------------------------------------------ input
  const keys = new Set<string>();
  const ray = new THREE.Raycaster();
  ray.far = 2.6;
  function looked(): THREE.Object3D | undefined {
    camera.updateMatrixWorld();
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    return ray.intersectObjects(scene.children, true).find((h) => h.object.visible && (h.object.userData.npc || h.object.userData.inspect || !h.object.userData.noRay))?.object;
  }
  function interact(): void {
    const o = looked();
    if (!o) return;
    if (o.userData.npc) {
      const n = npcs.find((x) => x.c.id === o.userData.npc);
      if (n) startTalk(n);
      return;
    }
    const key = o.userData.inspect as string | undefined;
    if (!key) return;
    if (key === 'uscita') return leave();
    say(def.inspect[key] ?? '');
  }
  function leave(): void {
    let t = 0;
    const step = () => {
      t += 1 / 30;
      grade.uniforms.fade.value = Math.min(1, t / 0.6);
      if (t < 0.7) requestAnimationFrame(step);
      else {
        clock.save(def.outside);
        location.href = `index.html?porta=${def.building}`;
      }
    };
    requestAnimationFrame(step);
  }
  window.addEventListener('keydown', (e) => {
    if (talk) {
      if (talk.free) return; // the text box has the keys
      if (e.code === 'Escape') return endTalk();
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') return advance();
      if (e.code.startsWith('Digit')) choose(Number(e.code.slice(5)) - 1);
      return;
    }
    keys.add(e.code);
    if (e.code === 'KeyE') interact();
    // for testing: the number keys move the clock to a time of day
    if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5)) - 1;
      if (n >= 0 && n < 5) {
        clock.override = PRESET_TIMES[n];
        for (const x of npcs) x.snap(nowOf());
      }
      if (n === 5) raining = !raining;
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  document.addEventListener('mousedown', (e) => {
    if (talk && !talk.free && e.button === 0) advance();
  });
  ui.el.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest('li');
    if (li?.dataset.i) choose(Number(li.dataset.i));
  });

  const R = 0.25;
  const free = (x: number, z: number) => {
    const b = built.bounds;
    if (x < b.x0 + R || x > b.x1 - R || z < b.z0 + R || z > b.z1 - R) return false;
    if (built.colliders.some((c) => x > c.minX - R && x < c.maxX + R && z > c.minZ - R && z < c.maxZ + R)) return false;
    // people are solid too
    return !npcs.some((n) => n.present && Math.hypot(n.pos.x - x, n.pos.y - z) < 0.45);
  };
  let bob = 0;
  function move(dt: number): void {
    if (talk || !controls.isLocked) return;
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    if (!f && !s) {
      camera.position.y += (EYE - camera.position.y) * Math.min(1, dt * 8);
      return;
    }
    const yaw = camera.rotation.y;
    const v = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(f).add(new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(s)).normalize().multiplyScalar(1.4 * dt);
    if (free(camera.position.x + v.x, camera.position.z)) camera.position.x += v.x;
    if (free(camera.position.x, camera.position.z + v.z)) camera.position.z += v.z;
    const before = Math.floor(bob / Math.PI);
    bob += dt * 7;
    if (Math.floor(bob / Math.PI) !== before) sound.step('wood');
    camera.position.y = EYE + Math.sin(bob) * 0.014;
  }

  // ------------------------------------------------------------------ loop
  const timer = new THREE.Timer();
  let crossT = 0;
  let hudT = 0;
  let shadowT = 0;
  function frame(): void {
    timer.update();
    const dt = Math.min(0.05, timer.getDelta());
    const t = timer.getElapsed();
    const minute = clock.minuteOfDay();
    const want = presetFor(minute);
    const wet = clock.weather() === 'rain' || raining;
    if (want !== preset || wet !== (preset >= 0 && rain.on)) applyLight(want, wet);
    const p = PRESETS[preset];
    move(dt);
    tickFlames(t);
    sky.update(t);
    rain.update(dt);
    for (const f of flames) {
      const fire = f.def.kind === 'fire';
      const lit = fire || p.night || preset === 3;
      for (const m of f.def.flames) m.visible = lit;
      const flick = 1 + Math.sin(t * 9.3 + f.def.at.x) * 0.06 + Math.sin(t * 23.1 + f.def.at.z) * 0.04 + (fire ? Math.sin(t * 3.7) * 0.08 : 0);
      f.light.intensity = lit ? (fire ? (p.night ? 3 : 1.4) : 1.3) * flick : 0;
    }
    // shadows from the fire and the two nearest candles only: a room full of
    // shadow-casting flames would bring a modest computer to its knees
    shadowT -= dt;
    if (shadowT < 0) {
      shadowT = 0.5;
      const lit = flames.filter((f) => f.light.intensity > 0);
      const candles = lit.filter((f) => f.def.kind === 'candle').sort((a, b) => a.light.position.distanceToSquared(camera.position) - b.light.position.distanceToSquared(camera.position));
      const casting = new Set([...lit.filter((f) => f.def.kind === 'fire'), ...candles.slice(0, 2)]);
      for (const f of flames) f.light.castShadow = casting.has(f);
    }
    grade.uniforms.night.value += ((p.night ? 1 : 0) - grade.uniforms.night.value) * Math.min(1, dt * 2);
    const now = nowOf();
    for (const n of npcs) {
      if (n.update(dt, t, now, camera.position) === 'bark') {
        const line = bark(n.c, n.doing);
        if (line) ui.bark(n.c.name.split(' ')[0], line);
      }
    }
    // while talking, the eyes go to the face of whoever is speaking
    if (talk) {
      const head = talk.npc.person.root.position.clone().add(new THREE.Vector3(0, talk.npc.person.pose.startsWith('sit') ? 1.15 : 1.55, 0));
      const d = head.sub(camera.position);
      const yaw = Math.atan2(-d.x, -d.z);
      const pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      let dy = yaw - camera.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      camera.rotation.y += dy * Math.min(1, dt * 3);
      camera.rotation.x += (pitch - camera.rotation.x) * Math.min(1, dt * 3);
    }
    const fireNear = flames.find((f) => f.def.kind === 'fire');
    sound.setScene(fireNear ? Math.pow(Math.max(0, 1 - camera.position.distanceTo(fireNear.light.position) / 7), 1.4) : 0, p.night, 0);
    sound.update();
    sound.rain(rain.on ? 0.6 : 0);
    hudT -= dt;
    if (hudT < 0) {
      hudT = 1;
      const cal = clock.calendar();
      hud.time.textContent = `${WEEKDAY_NAMES[cal.weekday]} · ${formatClock(minute)}${wet ? ' · piove' : ''}`;
    }
    crossT += dt;
    if (crossT > 0.15) {
      crossT = 0;
      const o = looked();
      hud.cross.classList.toggle('active', !!(o?.userData.npc || o?.userData.inspect));
    }
    composer.render(dt);
    requestAnimationFrame(frame);
  }
  applyLight(presetFor(clock.minuteOfDay()), clock.weather() === 'rain');
  requestAnimationFrame(frame);
  // somebody absent: a word on the door, so the room does not feel broken
  window.setTimeout(() => {
    const away = npcs.filter((n) => !n.present);
    if (away.length === npcs.length && npcs.length) say(`Non c’è nessuno. ${away.map((n) => n.c.name.split(' ')[0]).join(' e ')} ${away.length > 1 ? 'sono' : 'è'} fuori.`);
  }, 1200);

  // for tests and screenshots
  (window as unknown as Record<string, unknown>).interno = {
    view(x: number, z: number, yawDeg: number, pitchDeg = 0) {
      camera.position.set(x, EYE, z);
      camera.rotation.set(THREE.MathUtils.degToRad(pitchDeg), THREE.MathUtils.degToRad(yawDeg), 0, 'YXZ');
      hud.intro.style.display = 'none';
    },
    time(i: number) {
      clock.override = PRESET_TIMES[i];
      for (const n of npcs) n.snap(nowOf());
    },
    /** Any minute of the day, and optionally a weekday (0 Monday … 6 Sunday). */
    at(minute: number, weekday?: number) {
      clock.override = minute;
      if (weekday !== undefined) {
        clock.dayOverride = null;
        const cal = clock.calendar();
        clock.dayOverride = cal.day + ((weekday - cal.weekday + 7) % 7);
      }
      for (const n of npcs) n.snap(nowOf());
      return npcs.map((n) => ({ id: n.c.id, present: n.present, spot: n.spotId, doing: n.doing }));
    },
    talk(id: string) {
      const n = npcs.find((x) => x.c.id === id);
      if (n) startTalk(n);
      return talk?.step;
    },
    choose(i: number) {
      if (talk) {
        talk.page = talk.step ? talk.step.pages.length - 1 : 0;
        ui.finish();
      }
      choose(i);
      return talk?.step;
    },
    npcs,
    clock,
  };
}
