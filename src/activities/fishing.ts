import { FISHING_AMBIENT } from '../data/ambient';
import { FISH } from '../data/items';
import { weightedPick } from '../core/rng';
import type { Calendar } from '../core/time';
import type { WeatherKind } from '../core/weather';

/** Picks what bites, given the moment. */
export function pickFish(cal: Calendar, weather: WeatherKind, r: number): string {
  const options = FISH.filter(
    (f) =>
      (!f.phases || f.phases.includes(cal.phase)) &&
      (!f.seasons || f.seasons.includes(cal.season)) &&
      (!f.weather || f.weather.includes(weather)),
  );
  return weightedPick(options, (f) => f.weight, r)?.item ?? 'alborella';
}

export function pickAmbient(cal: Calendar, weather: WeatherKind, r: number): string | null {
  const options = FISHING_AMBIENT.filter(
    (a) =>
      (!a.phases || a.phases.includes(cal.phase)) &&
      (!a.seasons || a.seasons.includes(cal.season)) &&
      (!a.weather || a.weather.includes(weather)),
  );
  if (options.length === 0) return null;
  return options[Math.floor(r * options.length)].text;
}

export type FishingPhase = 'casting' | 'waiting' | 'bite' | 'done';

export type FishingEvent =
  | { type: 'ambient'; text: string }
  | { type: 'bite' }
  | { type: 'escaped' }
  | { type: 'caught'; item: string };

/**
 * Fishing as the design wants it (§19): choose a place, cast, wait. The
 * wait is in real seconds and can be long; there is no frantic minigame,
 * only a short moment to notice the bite.
 */
export class FishingSession {
  phase: FishingPhase = 'casting';
  private t = 0;
  private waitFor: number;
  private nextAmbient: number;
  /** Seconds the player has to react once the float dips. */
  static readonly BITE_WINDOW = 1.6;

  constructor(private readonly rand: () => number) {
    this.waitFor = FishingSession.rollWait(rand);
    this.nextAmbient = 10 + rand() * 20;
  }

  /** From a few seconds to a minute and a half, skewed towards the short side. */
  static rollWait(rand: () => number): number {
    const r = rand();
    return 5 + 85 * r * r;
  }

  get elapsed(): number {
    return this.t;
  }

  update(dt: number, cal: Calendar, weather: WeatherKind): FishingEvent[] {
    const events: FishingEvent[] = [];
    this.t += dt;
    if (this.phase === 'casting' && this.t > 0.8) {
      this.phase = 'waiting';
      this.t = 0;
    } else if (this.phase === 'waiting') {
      if (this.t >= this.nextAmbient) {
        this.nextAmbient = this.t + 18 + this.rand() * 30;
        const text = pickAmbient(cal, weather, this.rand());
        if (text) events.push({ type: 'ambient', text });
      }
      if (this.t >= this.waitFor) {
        this.phase = 'bite';
        this.t = 0;
        events.push({ type: 'bite' });
      }
    } else if (this.phase === 'bite' && this.t > FishingSession.BITE_WINDOW) {
      this.phase = 'waiting';
      this.t = 0;
      this.waitFor = FishingSession.rollWait(this.rand);
      events.push({ type: 'escaped' });
    }
    return events;
  }

  /** The player pulls the line. */
  pull(cal: Calendar, weather: WeatherKind): FishingEvent | null {
    if (this.phase === 'bite') {
      this.phase = 'done';
      return { type: 'caught', item: pickFish(cal, weather, this.rand()) };
    }
    return null;
  }
}
