import { hash01 } from './rng';
import { calendarOf, MINUTES_PER_DAY, type Season } from './time';

export type WeatherKind = 'clear' | 'cloudy' | 'rain';

export interface DayWeather {
  kind: WeatherKind;
  /** Mist over the pond and the meadows in the early morning. */
  morningFog: boolean;
}

const BASE: Record<Season, Record<WeatherKind, number>> = {
  0: { clear: 0.5, cloudy: 0.3, rain: 0.2 },
  1: { clear: 0.65, cloudy: 0.25, rain: 0.1 },
  2: { clear: 0.35, cloudy: 0.35, rain: 0.3 },
  3: { clear: 0.35, cloudy: 0.4, rain: 0.25 },
};

function baseWeather(seed: number, day: number): WeatherKind {
  const season = calendarOf(day * MINUTES_PER_DAY).season;
  const p = BASE[season];
  const r = hash01(seed, day, 101);
  if (r < p.rain) return 'rain';
  if (r < p.rain + p.cloudy) return 'cloudy';
  return 'clear';
}

/**
 * Weather for a day, deterministic from the world seed. Bad weather tends
 * to linger: a rainy day makes the next one more likely to be grey.
 */
export function weatherFor(seed: number, day: number): DayWeather {
  let kind = baseWeather(seed, day);
  const yesterday = day > 0 ? baseWeather(seed, day - 1) : 'clear';
  if (yesterday === 'rain' && kind === 'clear' && hash01(seed, day, 202) < 0.45) kind = 'cloudy';
  const season = calendarOf(day * MINUTES_PER_DAY).season;
  const fogChance = season === 2 ? 0.45 : season === 0 ? 0.3 : 0.15;
  return { kind, morningFog: kind !== 'rain' && hash01(seed, day, 303) < fogChance };
}

export const WEATHER_NAMES: Record<WeatherKind, string> = {
  clear: 'sereno',
  cloudy: 'nuvoloso',
  rain: 'pioggia',
};
