import { NPC_SPEED } from '../config';
import { findPath } from '../world/pathfinding';
import type { Facing, Point } from '../world/types';
import type { World } from '../world/world';
import type { NpcDef, ScheduleEntry } from './types';

/** The visible, moving body of an NPC. Its goal always comes from the routine. */
export class NpcActor {
  /** Position in tiles (fractional while walking). */
  x: number;
  y: number;
  facing: Facing = 'down';
  entry: ScheduleEntry | null = null;
  path: Point[] = [];
  /** Seconds spent walking, for the step animation. */
  walkTime = 0;
  /** While talking with the player the NPC stops and turns. */
  talking = false;

  constructor(readonly def: NpcDef, start: Point) {
    this.x = start.x;
    this.y = start.y;
  }

  get tileX(): number {
    return Math.round(this.x);
  }

  get tileY(): number {
    return Math.round(this.y);
  }

  get moving(): boolean {
    return this.path.length > 0;
  }

  get asleep(): boolean {
    return this.entry?.activity === 'sleep' && !this.moving;
  }

  /** Sets a new goal. With `snap`, the NPC is simply there (used after a time jump). */
  setEntry(entry: ScheduleEntry, world: World, snap: boolean): void {
    const goal = world.spots[entry.at];
    if (!goal) throw new Error(`Luogo sconosciuto "${entry.at}" nella routine di ${this.def.name}`);
    const changed = this.entry?.at !== entry.at;
    this.entry = entry;
    if (snap) {
      this.x = goal.x;
      this.y = goal.y;
      this.path = [];
      this.facing = 'down';
      return;
    }
    if (!changed) return;
    // Plan from the next tile we're heading to, so we never cut corners mid-step.
    const from = this.path[0] ?? { x: this.tileX, y: this.tileY };
    const path = findPath(from, goal, world.width, world.height, (x, y) => world.walkableForNpc(x, y));
    if (path === null) {
      // Unreachable (should not happen; the tests check every routine): appear there.
      this.x = goal.x;
      this.y = goal.y;
      this.path = [];
      return;
    }
    this.path = this.path.length > 0 ? [this.path[0], ...path] : path;
  }

  update(dt: number, speedFactor: number, blocked: (x: number, y: number) => boolean): void {
    if (this.talking || this.path.length === 0) {
      this.walkTime = 0;
      return;
    }
    const next = this.path[0];
    // Politely wait if the player is standing exactly where we need to go.
    if (blocked(next.x, next.y) && (Math.abs(next.x - this.x) + Math.abs(next.y - this.y) > 0.5)) {
      this.walkTime = 0;
      return;
    }
    const dx = next.x - this.x;
    const dy = next.y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.facing = dy > 0 ? 'down' : 'up';
    const step = NPC_SPEED * speedFactor * dt;
    const dist = Math.hypot(dx, dy);
    if (dist <= step) {
      this.x = next.x;
      this.y = next.y;
      this.path.shift();
      if (this.path.length === 0) this.facing = 'down';
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
    this.walkTime += dt;
  }

  faceTowards(p: Point): void {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else this.facing = dy > 0 ? 'down' : 'up';
  }
}
