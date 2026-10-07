import * as THREE from 'three';
import { type Box, HOUSE, type Movable, STAIR, UP } from './house';

/**
 * Picking things up and putting them down. Not a full physics engine: what
 * matters is that things behave credibly. A chair is carried low in front
 * of you and set down where there is room for it, with a little wobble; a
 * cup goes where you look, and if you let it go in mid-air it falls and
 * bounces once. Walking into a chair pushes it along.
 */

const HELD_LAYER = 1;
const tmpBox = new THREE.Box3();

interface Fall {
  m: Movable;
  vy: number;
  floor: number;
  bounced: boolean;
}

export class Carry {
  held: Movable | null = null;
  private yawOffset = 0;
  /** For small things: how far below its origin the object's bottom is. */
  private baseOffset = 0;
  private falls: Fall[] = [];
  private wobbles: { m: Movable; t: number; amp: number; dir: number }[] = [];
  private ray = new THREE.Raycaster();

  constructor(
    private camera: THREE.PerspectiveCamera,
    private world: THREE.Object3D,
    private colliders: Box[],
    private say: (s: string) => void,
  ) {
    camera.layers.enable(HELD_LAYER);
    this.ray.far = 2.4;
  }

  /** The movable under the crosshair, if near enough. */
  target(): Movable | null {
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.ray.far = 2.2;
    const hit = this.ray.intersectObjects(this.world.children, true)[0];
    return (hit?.object.userData.movable as Movable | undefined) ?? null;
  }

  /** Click: take what you look at, or put down what you hold. */
  use(floorY: number): void {
    if (this.held) {
      if (this.held.kind === 'furniture') this.putDownFurniture(floorY);
      else this.putDownSmall();
      return;
    }
    const m = this.target();
    if (!m) return;
    this.falls = this.falls.filter((f) => f.m !== m);
    this.wobbles = this.wobbles.filter((w) => w.m !== m);
    this.held = m;
    this.yawOffset = m.obj.rotation.y - this.camera.rotation.y;
    m.obj.rotation.x = m.obj.rotation.z = 0;
    m.obj.updateMatrixWorld(true);
    tmpBox.setFromObject(m.obj);
    this.baseOffset = m.obj.position.y - tmpBox.min.y;
    m.obj.traverse((o) => o.layers.set(HELD_LAYER));
    if (m.box) {
      // a carried chair no longer blocks your way
      this.colliders.splice(this.colliders.indexOf(m.box), 1);
    }
  }

  rotate(delta: number): void {
    this.yawOffset += delta;
  }

  /** Called every frame. */
  update(dt: number, floorY: number): void {
    const m = this.held;
    const cam = this.camera;
    const yaw = cam.rotation.y;
    if (m) {
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      if (m.kind === 'furniture') {
        // carried low, in front, lifted a hand's breadth off the floor
        const target = cam.position.clone().addScaledVector(fwd, 0.85);
        target.y = floorY + 0.08 + Math.sin(performance.now() / 180) * 0.006;
        target.x = THREE.MathUtils.clamp(target.x, -HOUSE.w / 2 + 0.25, HOUSE.w / 2 - 0.25);
        target.z = THREE.MathUtils.clamp(target.z, -HOUSE.d / 2 + 0.25, HOUSE.d / 2 - 0.25);
        m.obj.position.lerp(target, Math.min(1, dt * 10));
      } else {
        // in the hand: a little below and in front of the eyes, following the gaze
        const dir = new THREE.Vector3();
        cam.getWorldDirection(dir);
        const target = cam.position.clone().addScaledVector(dir, 0.5).add(new THREE.Vector3(0, -0.16, 0));
        m.obj.position.lerp(target, Math.min(1, dt * 14));
      }
      m.obj.rotation.y = yaw + this.yawOffset;
    }
    // falling things: gravity, one small bounce, then rest
    for (const f of this.falls) {
      f.vy -= 9.8 * dt;
      f.m.obj.position.y += f.vy * dt;
      if (f.m.obj.position.y <= f.floor) {
        f.m.obj.position.y = f.floor;
        if (!f.bounced && f.vy < -1.2) {
          f.vy = -f.vy * 0.28;
          f.bounced = true;
          this.wobbles.push({ m: f.m, t: 0, amp: 0.12, dir: Math.random() * Math.PI * 2 });
        } else f.vy = 0;
      }
    }
    this.falls = this.falls.filter((f) => f.vy !== 0 || f.m.obj.position.y > f.floor);
    // a thing set down rocks on its feet before it settles
    for (const w of this.wobbles) {
      w.t += dt;
      const a = w.amp * Math.exp(-w.t * 5) * Math.sin(w.t * 22);
      w.m.obj.rotation.x = Math.cos(w.dir) * a;
      w.m.obj.rotation.z = Math.sin(w.dir) * a;
    }
    this.wobbles = this.wobbles.filter((w) => w.t < 1.5);
  }

  /**
   * The player is walking into furniture: push it along if it has room.
   * Returns true if something moved out of the way.
   */
  push(px: number, pz: number, r: number, vx: number, vz: number, level: 0 | 1): boolean {
    for (const c of this.colliders) {
      if (c.level !== level || !(px > c.minX - r && px < c.maxX + r && pz > c.minZ - r && pz < c.maxZ + r)) continue;
      const m = this.movableOf(c);
      if (!m) return false;
      const moved: Box = { ...c, minX: c.minX + vx, maxX: c.maxX + vx, minZ: c.minZ + vz, maxZ: c.maxZ + vz };
      if (!this.free(moved, c)) return false;
      Object.assign(c, moved);
      m.obj.position.x += vx;
      m.obj.position.z += vz;
      // a pushed chair turns a little, as things do when shoved off-centre
      m.obj.rotation.y += (vx * (pz - (c.minZ + c.maxZ) / 2) - vz * (px - (c.minX + c.maxX) / 2)) * 1.5;
      return true;
    }
    return false;
  }

  private movableOf(b: Box): Movable | null {
    let found: Movable | null = null;
    this.world.traverse((o) => {
      const m = o.userData.movable as Movable | undefined;
      if (m && m.box === b) found = m;
    });
    return found;
  }

  /** Is there room for this footprint? */
  private free(b: Box, ignore?: Box): boolean {
    const { w, d } = HOUSE;
    if (b.minX < -w / 2 + 0.02 || b.maxX > w / 2 - 0.02 || b.minZ < -d / 2 + 0.02 || b.maxZ > d / 2 - 0.02) return false;
    if (b.maxX > STAIR.x1 && b.minX < STAIR.x0 && b.minZ < STAIR.z1) return false;
    return !this.colliders.some((c) => c !== ignore && c.level === b.level && b.minX < c.maxX && b.maxX > c.minX && b.minZ < c.maxZ && b.maxZ > c.minZ);
  }

  private footprint(m: Movable, level: 0 | 1): Box {
    m.obj.updateMatrixWorld(true);
    tmpBox.setFromObject(m.obj);
    const k = 0.04; // legs and edges overhang a little: be generous
    return { minX: tmpBox.min.x + k, maxX: tmpBox.max.x - k, minZ: tmpBox.min.z + k, maxZ: tmpBox.max.z - k, level };
  }

  private putDownFurniture(floorY: number): void {
    const m = this.held!;
    const onStair = floorY > 0.3 && floorY < UP - 0.3;
    const level: 0 | 1 = floorY > UP - 0.3 ? 1 : 0;
    const fp = this.footprint(m, level);
    if (onStair || !this.free(fp)) {
      this.say('Non ci sta.');
      return;
    }
    m.box = fp;
    this.colliders.push(fp);
    this.release(m);
    this.falls.push({ m, vy: 0, floor: level ? UP : 0, bounced: true });
    this.wobbles.push({ m, t: 0, amp: 0.05, dir: Math.random() * Math.PI * 2 });
  }

  private putDownSmall(): void {
    const m = this.held!;
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.ray.far = 2.4;
    const hit = this.ray.intersectObjects(this.world.children, true).find((h) => !h.object.userData.movable || h.object.userData.movable !== m);
    const n = hit?.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : null;
    this.release(m);
    if (hit && n && n.y > 0.6) {
      // set down where you look, from just above it
      m.obj.position.set(hit.point.x, hit.point.y + this.baseOffset + 0.03, hit.point.z);
      this.falls.push({ m, vy: 0, floor: hit.point.y + this.baseOffset, bounced: true });
      this.wobbles.push({ m, t: 0, amp: 0.06, dir: Math.random() * Math.PI * 2 });
      return;
    }
    // let go in mid-air: it falls onto whatever is below
    const down = new THREE.Raycaster(m.obj.position.clone().add(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(0, -1, 0), 0, 5);
    const below = down.intersectObjects(this.world.children, true).find((h) => h.object.userData.movable !== m);
    this.falls.push({ m, vy: 0, floor: (below ? below.point.y : 0) + this.baseOffset, bounced: false });
  }

  private release(m: Movable): void {
    m.obj.traverse((o) => o.layers.set(0));
    this.held = null;
  }
}
