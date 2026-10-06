import type { Calendar } from '../core/time';
import type { WeatherKind } from '../core/weather';
import type { Activity } from '../npc/types';
import type { DialogueCond, DialogueLine } from './types';

export interface DialogueContext {
  cal: Calendar;
  weather: WeatherKind;
  /** Ids describing where the speaker is (building, region, spot). */
  at: string[];
  activity: Activity;
  familiarity: number;
  firstMeeting: boolean;
  flags: ReadonlySet<string>;
  hasItem: (idOrCategory: string) => boolean;
  /** Line keys already used (for `once`) and already heard today. */
  saidEver: ReadonlySet<string>;
  saidToday: ReadonlySet<string>;
}

export function matches(c: DialogueCond | undefined, ctx: DialogueContext): boolean {
  if (!c) return !ctx.firstMeeting;
  if (c.first !== undefined && c.first !== ctx.firstMeeting) return false;
  // Lines not explicitly written for the first meeting are kept for later.
  if (c.first === undefined && ctx.firstMeeting) return false;
  if (c.phase && !c.phase.includes(ctx.cal.phase)) return false;
  if (c.weather && !c.weather.includes(ctx.weather)) return false;
  if (c.season && !c.season.includes(ctx.cal.season)) return false;
  if (c.days && !c.days.includes(ctx.cal.weekday)) return false;
  if (c.at && !c.at.some((a) => ctx.at.includes(a))) return false;
  if (c.activity && !c.activity.includes(ctx.activity)) return false;
  if (c.minFam !== undefined && ctx.familiarity < c.minFam) return false;
  if (c.maxFam !== undefined && ctx.familiarity > c.maxFam) return false;
  if (c.flag && !ctx.flags.has(c.flag)) return false;
  if (c.notFlag && ctx.flags.has(c.notFlag)) return false;
  if (c.playerHas && !ctx.hasItem(c.playerHas)) return false;
  return true;
}

/** How specific a line is: more conditions means it fits the moment better. */
export function specificity(c: DialogueCond | undefined): number {
  if (!c) return 0;
  return Object.keys(c).length;
}

export const lineKey = (npcId: string, index: number) => `${npcId}#${index}`;

/**
 * Chooses what an NPC says. Among the lines that fit, it prefers lines not
 * heard today, then `once` lines (small revelations), then the most specific.
 * Returns the index of the line in `lines`, or -1 if nothing fits.
 */
export function chooseLine(npcId: string, lines: DialogueLine[], ctx: DialogueContext, rand: () => number): number {
  const candidates: { i: number; score: number }[] = [];
  lines.forEach((line, i) => {
    const key = lineKey(npcId, i);
    if (line.once && ctx.saidEver.has(key)) return;
    if (!matches(line.when, ctx)) return;
    let score = specificity(line.when);
    if (line.once) score += 2;
    if (ctx.saidToday.has(key)) score -= 100;
    candidates.push({ i, score });
  });
  if (candidates.length === 0) return -1;
  const best = Math.max(...candidates.map((c) => c.score));
  // Don't always pick the single most specific line: anything within one
  // point of the best can come up, so conversations don't feel scripted.
  const pool = candidates.filter((c) => c.score >= best - 1 && c.score > -50);
  const from = pool.length > 0 ? pool : candidates.filter((c) => c.score === best);
  return from[Math.floor(rand() * from.length)].i;
}
