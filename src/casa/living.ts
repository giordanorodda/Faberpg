import * as THREE from 'three';
import { HOUSE } from './house';

/**
 * The things that make the house feel alive from one minute to the next:
 * steam from the kettle and the cup, rain outside the windows.
 */

let puffTex: THREE.Texture | null = null;
function puff(): THREE.Texture {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  puffTex = new THREE.CanvasTexture(c);
  return puffTex;
}

/** Wisps of steam rising from a point, curling as they go. */
export class Steam {
  readonly group = new THREE.Group();
  private sprites: { s: THREE.Sprite; age: number; life: number; drift: THREE.Vector3 }[] = [];
  /** 0 = none … 1 = a kettle at the boil. */
  amount = 0;
  private acc = 0;

  constructor(
    readonly at: THREE.Vector3,
    private size = 0.05,
    private max = 24,
  ) {
    this.group.userData.noWonk = true;
  }

  update(dt: number, t: number): void {
    this.acc += dt * this.amount * 14;
    while (this.acc > 1 && this.sprites.length < this.max) {
      this.acc -= 1;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff(), transparent: true, depthWrite: false, opacity: 0 }));
      s.position.copy(this.at);
      s.scale.setScalar(this.size);
      this.group.add(s);
      this.sprites.push({ s, age: 0, life: 1.6 + Math.random() * 1.2, drift: new THREE.Vector3((Math.random() - 0.5) * 0.06, 0.18 + Math.random() * 0.08, (Math.random() - 0.5) * 0.06) });
    }
    if (this.acc > 1) this.acc = 1;
    for (const p of this.sprites) {
      p.age += dt;
      const k = p.age / p.life;
      p.s.position.addScaledVector(p.drift, dt);
      p.s.position.x += Math.sin(t * 2 + p.life * 9) * 0.02 * dt;
      p.s.scale.setScalar(this.size * (1 + k * 3));
      (p.s.material as THREE.SpriteMaterial).opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.35;
    }
    for (const p of this.sprites.filter((q) => q.age > q.life)) {
      this.group.remove(p.s);
      p.s.material.dispose();
    }
    this.sprites = this.sprites.filter((q) => q.age <= q.life);
  }
}

/** Rain falling all round the house (never inside it), as thin streaks. */
export class Rain {
  readonly mesh: THREE.LineSegments;
  private pos: Float32Array;
  private speed: Float32Array;
  on = false;
  private level = 0;

  constructor(count = 2600) {
    this.pos = new Float32Array(count * 6);
    this.speed = new Float32Array(count);
    for (let i = 0; i < count; i++) this.spawn(i, Math.random() * 8);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc8d4e0, transparent: true, opacity: 0, depthWrite: false }));
    this.mesh.frustumCulled = false;
    this.mesh.userData.noWonk = true;
  }

  private spawn(i: number, y: number): void {
    let x = 0;
    let z = 0;
    // anywhere around, outside the walls
    do {
      x = (Math.random() - 0.5) * 18;
      z = (Math.random() - 0.5) * 18;
    } while (Math.abs(x) < HOUSE.w / 2 + 0.5 && Math.abs(z) < HOUSE.d / 2 + 0.5);
    this.speed[i] = 6 + Math.random() * 2;
    this.pos.set([x, y, z, x + 0.02, y + 0.25, z], i * 6);
  }

  update(dt: number): void {
    this.level += ((this.on ? 1 : 0) - this.level) * Math.min(1, dt * 0.8);
    (this.mesh.material as THREE.LineBasicMaterial).opacity = this.level * 0.6;
    this.mesh.visible = this.level > 0.01;
    if (!this.mesh.visible) return;
    const n = this.speed.length;
    for (let i = 0; i < n; i++) {
      const d = this.speed[i] * dt;
      this.pos[i * 6 + 1] -= d;
      this.pos[i * 6 + 4] -= d;
      if (this.pos[i * 6 + 1] < 0) this.spawn(i, 7 + Math.random());
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}

/** Is it raining today? Decided by the date, the same for everyone on the same day (about one day in three). */
export function rainyToday(d = new Date()): boolean {
  const day = Math.floor(d.getTime() / 86400000);
  const h = Math.sin(day * 12.9898) * 43758.5453;
  return h - Math.floor(h) < 0.33;
}
