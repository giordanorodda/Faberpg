import { inRange, parseClock, type Calendar } from '../core/time';
import type { WeatherKind } from '../core/weather';
import type { NpcDef, ScheduleEntry } from './types';

/**
 * Where an NPC should be at a given moment. This is a pure function of the
 * calendar and the weather (§32): NPCs are not simulated second by second,
 * we only ask where they ought to be whenever we need to show them.
 */
export function resolveSchedule(npc: NpcDef, cal: Calendar, weather: WeatherKind): ScheduleEntry {
  let found: ScheduleEntry | undefined;
  for (const e of npc.schedule) {
    if (e.days && !e.days.includes(cal.weekday)) continue;
    if (e.weather && !e.weather.includes(weather)) continue;
    if (e.seasons && !e.seasons.includes(cal.season)) continue;
    if (!inRange(cal.minute, parseClock(e.from), parseClock(e.to))) continue;
    found = e;
  }
  if (!found) throw new Error(`La routine di ${npc.name} non copre le ${Math.floor(cal.minute / 60)}:${Math.floor(cal.minute % 60)}`);
  return found;
}
