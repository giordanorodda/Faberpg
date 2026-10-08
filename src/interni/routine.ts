import { inRange, parseClock } from '../core/time';
import type { WeatherKind } from '../core/weather';
import type { Character, Routine } from './types';

/**
 * Where someone is, from the clock alone (as in the village: positions are
 * never saved). Kept apart from the 3D puppet so it can be tested without a
 * browser.
 */

export interface Nav {
  nodes: Record<string, [number, number]>;
  edges: [string, string][];
}

export interface Now {
  minute: number;
  weekday: number;
  weather: WeatherKind;
}

/** Where someone is right now: the routine line that wins, and which house and spot it names. */
export function whereIs(c: Character, now: Now): { house: string; spot: string; doing: string } {
  let hit: Routine | null = null;
  for (const r of c.routine) {
    const to = r.to === '24:00' ? 1440 : parseClock(r.to);
    if (!inRange(now.minute, parseClock(r.from), to)) continue;
    if (r.days && !r.days.includes(now.weekday)) continue;
    if (r.weather && !r.weather.includes(now.weather)) continue;
    hit = r;
  }
  const r = hit ?? c.routine[0];
  const [house, spot] = r.spot.includes(':') ? r.spot.split(':') : [c.house, r.spot];
  return { house, spot, doing: r.doing };
}

