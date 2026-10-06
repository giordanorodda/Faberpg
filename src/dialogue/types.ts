import type { Phase, Season } from '../core/time';
import type { WeatherKind } from '../core/weather';
import type { Activity } from '../npc/types';

/** When a line can be said. Every field given must match; omitted fields don't matter. */
export interface DialogueCond {
  phase?: Phase[];
  weather?: WeatherKind[];
  season?: Season[];
  days?: number[];
  /** Where the speaker is: a building id, a region id or a spot id. */
  at?: string[];
  activity?: Activity[];
  /** Familiarity with the player (grows by one each day you talk). */
  minFam?: number;
  maxFam?: number;
  /** Only for the very first conversation. */
  first?: boolean;
  flag?: string;
  notFlag?: string;
  /** The player carries this item (or any item of this category, e.g. 'pesce'). */
  playerHas?: string;
}

export interface DialogueLine {
  /** One string per page. Text in parentheses is narration. */
  text: string[];
  when?: DialogueCond;
  /** Said at most once in the whole game. */
  once?: boolean;
  /** World flags set after the line is said. */
  sets?: string[];
  /** Added to the player's notebook the first time. */
  note?: string;
}
