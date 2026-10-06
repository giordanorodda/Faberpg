import { DAYS_PER_SEASON, DAYS_PER_WEEK } from '../config';

export const MINUTES_PER_DAY = 24 * 60;

export const SEASON_NAMES = ['Primavera', 'Estate', 'Autunno', 'Inverno'] as const;
export const WEEKDAY_NAMES = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'] as const;

/** Season index: 0 spring, 1 summer, 2 autumn, 3 winter. */
export type Season = 0 | 1 | 2 | 3;

/** Broad parts of the day, used by routines, dialogue and activities. */
export type Phase = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export interface Calendar {
  /** Days since the world began (0-based). */
  day: number;
  year: number;
  season: Season;
  /** 1-based day within the season. */
  dayOfSeason: number;
  /** 0 = lunedì ... 6 = domenica. */
  weekday: number;
  /** Minute of the day, 0..1439 (fractional). */
  minute: number;
  hour: number;
  phase: Phase;
}

/** Parses 'HH:MM' into minutes since midnight. '24:00' gives 1440. */
export function parseClock(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) throw new Error(`Orario non valido: "${s}"`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) throw new Error(`Orario non valido: "${s}"`);
  return h * 60 + min;
}

export function formatClock(minuteOfDay: number): string {
  const m = Math.floor(minuteOfDay) % MINUTES_PER_DAY;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** True if minuteOfDay is in [from, to). Ranges that cross midnight (e.g. 22:00–06:00) are supported. */
export function inRange(minuteOfDay: number, from: number, to: number): boolean {
  if (from <= to) return minuteOfDay >= from && minuteOfDay < to;
  return minuteOfDay >= from || minuteOfDay < to;
}

export function phaseOf(minuteOfDay: number): Phase {
  const h = minuteOfDay / 60;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 12) return 'morning';
  if (h >= 12 && h < 14) return 'midday';
  if (h >= 14 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

export function calendarOf(totalMinutes: number): Calendar {
  const day = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const minute = totalMinutes - day * MINUTES_PER_DAY;
  const daysPerYear = DAYS_PER_SEASON * 4;
  const year = Math.floor(day / daysPerYear) + 1;
  const dayOfYear = day % daysPerYear;
  const season = Math.floor(dayOfYear / DAYS_PER_SEASON) as Season;
  return {
    day,
    year,
    season,
    dayOfSeason: (dayOfYear % DAYS_PER_SEASON) + 1,
    weekday: day % DAYS_PER_WEEK,
    minute,
    hour: Math.floor(minute / 60),
    phase: phaseOf(minute),
  };
}

/**
 * Sunrise and sunset (minutes since midnight) for a given day.
 * Day length varies smoothly over the year: about 12h at the start of
 * spring, 15h at midsummer, 9h at midwinter. Solar noon is at 13:00.
 */
export function sunTimes(day: number): { sunrise: number; sunset: number } {
  const daysPerYear = DAYS_PER_SEASON * 4;
  const p = (day % daysPerYear) / daysPerYear;
  const length = 720 + 180 * Math.sin(2 * Math.PI * p);
  return { sunrise: 780 - length / 2, sunset: 780 + length / 2 };
}

/** Ambient daylight 0 (deep night) .. 1 (full day), with ~70-minute twilights. */
export function daylight(totalMinutes: number): number {
  const day = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const m = totalMinutes - day * MINUTES_PER_DAY;
  const { sunrise, sunset } = sunTimes(day);
  const twilight = 70;
  const smooth = (t: number) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };
  if (m < sunrise - twilight / 2 || m > sunset + twilight / 2) return 0;
  if (m < sunrise + twilight / 2) return smooth((m - (sunrise - twilight / 2)) / twilight);
  if (m > sunset - twilight / 2) return 1 - smooth((m - (sunset - twilight / 2)) / twilight);
  return 1;
}

export function describeDate(c: Calendar): string {
  return `${SEASON_NAMES[c.season]}, giorno ${c.dayOfSeason} · ${c.year}° anno`;
}
