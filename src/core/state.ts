import type { Facing } from '../world/types';

export interface InventoryEntry {
  id: string;
  qty: number;
}

export interface Relation {
  /** Familiarity: grows by one on each day you talk (§7, §27). */
  fam: number;
  talks: number;
  lastTalkDay: number;
}

export interface NotebookEntry {
  day: number;
  text: string;
}

/**
 * Everything that persists between sessions. NPC positions are *not* here:
 * they are derived from the clock and their routines (§32).
 */
export interface GameState {
  version: number;
  seed: number;
  /** Game minutes since the world began. */
  minutes: number;
  /** Real timestamp (ms) of the last save, to let the world go on while away. */
  savedAtReal: number;
  player: { x: number; y: number; facing: Facing };
  inventory: InventoryEntry[];
  relations: Record<string, Relation>;
  flags: string[];
  /** Keys of `once` lines already said. */
  said: string[];
  saidToday: { day: number; keys: string[] };
  notebook: NotebookEntry[];
  foraged: { day: number; ids: string[] };
  settings: { speedIndex: number; showClock: boolean };
}

export const STATE_VERSION = 1;

/** A brand new world. The clock starts at the player's local time of day, on the first day of spring. */
export function newGame(seed: number, localMinuteOfDay: number): GameState {
  return {
    version: STATE_VERSION,
    seed,
    minutes: localMinuteOfDay,
    savedAtReal: Date.now(),
    player: { x: 10, y: 27, facing: 'down' },
    inventory: [{ id: 'canna', qty: 1 }],
    relations: {},
    flags: [],
    said: [],
    saidToday: { day: 0, keys: [] },
    notebook: [
      {
        day: 0,
        text: 'Sono arrivato ad Acquaferma ieri sera. La casa era della vecchia Agnese; le chiavi me le ha date l\'oste. Dietro la porta c\'era una canna da pesca.',
      },
    ],
    foraged: { day: 0, ids: [] },
    settings: { speedIndex: 0, showClock: true },
  };
}
