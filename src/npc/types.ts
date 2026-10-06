import type { WeatherKind } from '../core/weather';
import type { Season } from '../core/time';

export type Activity = 'sleep' | 'work' | 'eat' | 'rest' | 'chat' | 'fish' | 'play' | 'walk';

/**
 * One line of a routine. For any moment, the *last* matching entry wins:
 * write the ordinary day first, then the exceptions (rain, Sundays...).
 */
export interface ScheduleEntry {
  from: string;
  to: string;
  /** Spot id (see SPOTS in data/map.ts). */
  at: string;
  activity: Activity;
  /** Weekdays (0 = lunedì ... 6 = domenica). */
  days?: number[];
  weather?: WeatherKind[];
  seasons?: Season[];
}

export interface NpcLook {
  skin: string;
  hair: string;
  shirt: string;
  legs: string;
  /** Short/long hair, beard, kerchief... purely visual. */
  hairStyle?: 'short' | 'long' | 'bald' | 'kerchief';
  beard?: boolean;
  /** Children and elders are drawn a little differently. */
  build?: 'child' | 'adult' | 'elder';
}

export interface NpcDef {
  id: string;
  name: string;
  age: number;
  /** Trade or main activity, as the villagers would say it. */
  role: string;
  home: string;
  look: NpcLook;
  traits: string[];
  likes: string[];
  dislikes: string[];
  /** Relations to other villagers: npc id → how they'd describe them. */
  family: Record<string, string>;
  schedule: ScheduleEntry[];
  /** Notes for whoever writes the character; never shown in game. */
  notes?: string;
}
