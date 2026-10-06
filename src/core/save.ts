import { SAVE_KEY } from '../config';
import { STATE_VERSION, type GameState } from './state';

/** Minimal storage interface, so tests can use an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Upgrades an older save to the current shape. Each version bump adds one
 * step here, so a long-lived world is never lost to a code change (§40).
 */
const MIGRATIONS: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {
  // 1: (s) => ({ ...s, version: 2, newField: defaultValue }),
};

export function migrate(raw: Record<string, unknown>): GameState {
  let s = raw;
  let v = typeof s.version === 'number' ? s.version : 0;
  if (v > STATE_VERSION) throw new Error(`Salvataggio di una versione più recente (${v}) del gioco.`);
  while (v < STATE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`Nessuna migrazione dalla versione ${v} del salvataggio.`);
    s = step(s);
    v = s.version as number;
  }
  return validate(s);
}

function validate(s: Record<string, unknown>): GameState {
  const st = s as unknown as GameState;
  const ok =
    typeof st.seed === 'number' &&
    typeof st.minutes === 'number' &&
    Number.isFinite(st.minutes) &&
    typeof st.player?.x === 'number' &&
    typeof st.player?.y === 'number' &&
    Array.isArray(st.inventory) &&
    Array.isArray(st.flags) &&
    Array.isArray(st.notebook);
  if (!ok) throw new Error('Salvataggio danneggiato.');
  return st;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(text: string): GameState {
  return migrate(JSON.parse(text) as Record<string, unknown>);
}

export function saveTo(store: KeyValueStore, state: GameState): void {
  const text = serialize({ ...state, savedAtReal: Date.now() });
  // Keep the previous save as a backup: if the new one were ever corrupted,
  // the world can still be recovered from the one before.
  const prev = store.getItem(SAVE_KEY);
  if (prev) store.setItem(`${SAVE_KEY}.prev`, prev);
  store.setItem(SAVE_KEY, text);
}

export function loadFrom(store: KeyValueStore): GameState | null {
  for (const key of [SAVE_KEY, `${SAVE_KEY}.prev`]) {
    const text = store.getItem(key);
    if (!text) continue;
    try {
      return deserialize(text);
    } catch (e) {
      console.warn(`Impossibile leggere il salvataggio "${key}":`, e);
    }
  }
  return null;
}
