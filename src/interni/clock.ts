import { TIME_SPEEDS } from '../config';
import { loadFrom, saveTo } from '../core/save';
import { newGame, type GameState } from '../core/state';
import { calendarOf, type Calendar } from '../core/time';
import { weatherFor, type WeatherKind } from '../core/weather';

/**
 * The world's clock, shared with the 2D village: the 3D interiors read the
 * same save (faberpg.save), so the hour, the day and the weather are the
 * same indoors and out, and time keeps running while you are inside.
 */
export class WorldClock {
  state: GameState;
  private startReal = Date.now();
  private startMinutes: number;
  /** For testing: a fixed time of day (minutes since midnight) instead of the running clock. */
  override: number | null = null;

  constructor() {
    const loaded = loadFrom(localStorage);
    const now = new Date();
    this.state = loaded ?? newGame((Math.random() * 2 ** 32) >>> 0, now.getHours() * 60 + now.getMinutes());
    // the world went on since the save was written
    const away = loaded ? Math.max(0, (Date.now() - loaded.savedAtReal) / 60000) * this.speed : 0;
    this.startMinutes = this.state.minutes + away;
  }

  get speed(): number {
    return TIME_SPEEDS[this.state.settings?.speedIndex ?? 0] ?? 1;
  }

  /** Game minutes since the world began. */
  minutes(): number {
    const m = this.startMinutes + ((Date.now() - this.startReal) / 60000) * this.speed;
    if (this.override === null) return m;
    const day = Math.floor(m / 1440);
    return day * 1440 + this.override;
  }

  calendar(): Calendar {
    return calendarOf(this.minutes());
  }

  minuteOfDay(): number {
    return Math.floor(this.minutes()) % 1440;
  }

  weather(): WeatherKind {
    return weatherFor(this.state.seed, this.calendar().day).kind;
  }

  /** Writes the clock (and, if given, where the player will appear outside) back to the shared save. */
  save(playerAt?: { x: number; y: number }): void {
    this.state.minutes = this.minutes();
    if (playerAt) this.state.player = { ...this.state.player, x: playerAt.x, y: playerAt.y, facing: 'down' };
    saveTo(localStorage, this.state);
  }
}

/** Which of the five light moods fits a time of day (0 dawn … 4 night). */
export function presetFor(minuteOfDay: number): number {
  const h = minuteOfDay / 60;
  if (h >= 5 && h < 7) return 0;
  if (h >= 7 && h < 12) return 1;
  if (h >= 12 && h < 17) return 2;
  if (h >= 17 && h < 20.5) return 3;
  return 4;
}

/** A representative time for each light mood, used when testing with the number keys. */
export const PRESET_TIMES = [6 * 60, 9 * 60 + 30, 14 * 60 + 30, 18 * 60 + 45, 23 * 60];
