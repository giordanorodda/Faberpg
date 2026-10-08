/**
 * What the people remember of you: how well they know you, what you have
 * talked about, a few lines of your last free conversations. Kept in the
 * browser under its own key for now, next to the village save.
 */

const KEY = 'faberpg.persone';

export interface NpcMemory {
  fam: number;
  seen: string[];
  lastDay: number;
  /** The last lines of free conversation, so they remember what you said ("Tu: ...", "Ysolde: ..."). */
  talk: string[];
}

interface Saved {
  v: 1;
  npcs: Record<string, NpcMemory>;
  flags: string[];
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '') as Saved;
    if (s && s.v === 1) return s;
  } catch {
    /* a fresh memory */
  }
  return { v: 1, npcs: {}, flags: [] };
}

export class PeopleMemory {
  private s = load();

  npc(id: string): NpcMemory {
    return (this.s.npcs[id] ??= { fam: 0, seen: [], lastDay: -1, talk: [] });
  }

  has(flag: string): boolean {
    return this.s.flags.includes(flag);
  }

  set(flag: string): void {
    if (!this.has(flag)) this.s.flags.push(flag);
  }

  flags(): string[] {
    return [...this.s.flags];
  }

  save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.s));
    } catch {
      /* without storage they forget, which is sad but harmless */
    }
  }
}
