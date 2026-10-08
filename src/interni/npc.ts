import * as THREE from 'three';
import { LOOKS } from './looks';
import { Person } from './person';
import { whereIs, type Nav, type Now } from './routine';
import type { Character, Spot } from './types';

export { whereIs, type Nav, type Now };

/**
 * Someone living their day in a house: where they should be follows from
 * the clock (nothing about it is saved, as in the village), and they walk
 * there along the paths of the room. When you talk to them they stop and
 * turn to you; when you are near, they mutter about their work.
 */

function path(nav: Nav, from: THREE.Vector2, to: THREE.Vector2): THREE.Vector2[] {
  const ids = Object.keys(nav.nodes);
  if (!ids.length) return [to];
  const v = (id: string) => new THREE.Vector2(...nav.nodes[id]);
  const nearest = (p: THREE.Vector2) => ids.reduce((a, b) => (v(a).distanceTo(p) < v(b).distanceTo(p) ? a : b));
  const start = nearest(from);
  const goal = nearest(to);
  // Dijkstra over a handful of nodes
  const dist: Record<string, number> = { [start]: 0 };
  const prev: Record<string, string> = {};
  const open = new Set(ids);
  while (open.size) {
    let u = '';
    for (const id of open) if (dist[id] !== undefined && (u === '' || dist[id] < dist[u])) u = id;
    if (u === '' || u === goal) break;
    open.delete(u);
    for (const [a, b] of nav.edges) {
      const n = a === u ? b : b === u ? a : null;
      if (!n || !open.has(n)) continue;
      const alt = dist[u] + v(u).distanceTo(v(n));
      if (dist[n] === undefined || alt < dist[n]) {
        dist[n] = alt;
        prev[n] = u;
      }
    }
  }
  const out: THREE.Vector2[] = [to];
  for (let n = goal; n && n !== start; n = prev[n]) out.unshift(v(n));
  out.unshift(v(start));
  return out;
}

export class Npc {
  readonly person: Person;
  readonly pos = new THREE.Vector2();
  private yaw = 0;
  private route: THREE.Vector2[] = [];
  /** The spot they are at or heading to, in this house; null if they are out. */
  spotId: string | null = null;
  doing = '';
  present = false;
  talking = false;
  private leaving = false;
  private barkT = 10 + Math.random() * 20;

  constructor(
    readonly c: Character,
    private houseId: string,
    private spots: Record<string, Spot>,
    private nav: Nav,
    private doorNode: string,
  ) {
    this.person = new Person(LOOKS[c.id]);
    this.person.root.traverse((o) => (o.userData.npc = c.id));
  }

  private spot(): Spot | null {
    return this.spotId ? this.spots[this.spotId] ?? null : null;
  }

  private placeAt(s: Spot): void {
    this.pos.set(...s.at);
    this.yaw = s.yaw;
    this.person.setSeat(s.seat ?? 0.46);
    this.person.setPose(s.pose);
  }

  /** Puts them where the clock says, at once (when the page opens, or the time is changed by hand). */
  snap(now: Now): void {
    const w = whereIs(this.c, now);
    this.doing = w.doing;
    this.present = w.house === this.houseId && w.spot !== 'fuori' && !!this.spots[w.spot];
    this.spotId = this.present ? w.spot : null;
    this.route = [];
    this.leaving = false;
    if (this.present) {
      this.placeAt(this.spots[w.spot]);
      this.person.root.position.set(this.pos.x, 0, this.pos.y);
      this.person.root.rotation.y = this.yaw;
      this.person.root.updateMatrixWorld(true);
      this.person.settle();
    }
    this.person.root.visible = this.present;
  }

  /** Called every frame. Returns a line to say aloud, sometimes, when the player is near. */
  update(dt: number, t: number, now: Now, player: THREE.Vector3): string | null {
    const w = whereIs(this.c, now);
    const shouldBe = w.house === this.houseId && w.spot !== 'fuori' && !!this.spots[w.spot];
    const door = new THREE.Vector2(...this.nav.nodes[this.doorNode]);
    if (!this.talking) {
      if (shouldBe && (!this.present || this.leaving)) {
        // coming home: in through the door
        if (!this.present) this.pos.copy(door);
        this.present = true;
        this.leaving = false;
        this.person.root.visible = true;
        this.spotId = w.spot;
        this.route = path(this.nav, this.pos, new THREE.Vector2(...this.spots[w.spot].at));
      } else if (shouldBe && w.spot !== this.spotId) {
        this.spotId = w.spot;
        this.route = path(this.nav, this.pos, new THREE.Vector2(...this.spots[w.spot].at));
      } else if (!shouldBe && this.present && !this.leaving) {
        // going out: to the door, then gone
        this.leaving = true;
        this.spotId = null;
        this.route = path(this.nav, this.pos, door);
      }
      this.doing = w.doing;
    }
    // walking
    let speed = 0;
    if (this.route.length && !this.talking) {
      const next = this.route[0];
      const d = next.clone().sub(this.pos);
      const len = d.length();
      speed = 0.95;
      if (len < 0.06) {
        this.route.shift();
        if (!this.route.length) {
          if (this.leaving) {
            this.present = false;
            this.leaving = false;
            this.person.root.visible = false;
          } else if (this.spot()) this.placeAt(this.spot()!);
        }
      } else {
        this.pos.addScaledVector(d.normalize(), Math.min(len, speed * dt));
        const want = Math.atan2(d.x, d.y);
        let dy = want - this.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        this.yaw += dy * Math.min(1, dt * 8);
        this.person.setPose('walk');
      }
    }
    const s = this.spot();
    // talking: stop, and turn towards you if standing
    if (this.talking) {
      const standing = !s || s.pose === 'stand' || s.pose === 'work' || s.pose === 'stir' || s.pose === 'look' || s.pose === 'sweep' || this.person.pose === 'walk';
      if (standing) {
        this.person.setPose('stand');
        const want = Math.atan2(player.x - this.pos.x, player.z - this.pos.y);
        let dy = want - this.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        this.yaw += dy * Math.min(1, dt * 5);
      }
    } else if (!this.route.length && s) this.person.setPose(s.pose);
    this.person.root.position.set(this.pos.x, 0, this.pos.y);
    this.person.root.rotation.y = this.yaw;
    const near = this.present && player.distanceTo(new THREE.Vector3(this.pos.x, 1.5, this.pos.y)) < 3.2;
    this.person.lookTarget = near || this.talking ? player : null;
    this.person.update(dt, t, speed);
    // now and then, a word to no one in particular
    if (near && !this.talking && this.person.pose !== 'sleep') {
      this.barkT -= dt;
      if (this.barkT < 0) {
        this.barkT = 25 + Math.random() * 35;
        return 'bark';
      }
    }
    return null;
  }
}
