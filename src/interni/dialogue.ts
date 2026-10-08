import type { Phase } from '../core/time';
import type { WeatherKind } from '../core/weather';
import type { PeopleMemory } from './memory';
import { CHAT, END, type Character, type Choice, type Cond, type Line, type Node } from './types';

/**
 * Walks a character's written dialogue: picks the line that fits the moment
 * (the hour, the weather, what they are doing, how well they know you, what
 * has been said before), offers the choices that make sense, remembers.
 */

export interface Moment {
  phase: Phase;
  weather: WeatherKind;
  doing: string;
  day: number;
}

export interface Step {
  pages: string[];
  choices: { text: string; to: string }[];
}

export class Conversation {
  private node = 'saluto';
  readonly first: boolean;
  readonly firstToday: boolean;

  constructor(
    private c: Character,
    private mem: PeopleMemory,
    private m: Moment,
  ) {
    const me = mem.npc(c.id);
    this.first = me.seen.length === 0;
    this.firstToday = me.lastDay !== m.day;
    if (this.firstToday) {
      // a little more familiar with every day you stop to talk
      me.fam = Math.min(100, me.fam + 2);
      me.lastDay = m.day;
    }
  }

  private ok(w: Cond | undefined): boolean {
    if (!w) return true;
    const me = this.mem.npc(this.c.id);
    if (w.phase && !w.phase.includes(this.m.phase)) return false;
    if (w.weather && !w.weather.includes(this.m.weather)) return false;
    if (w.doing && !w.doing.some((d) => this.m.doing.includes(d))) return false;
    if (w.famMin !== undefined && me.fam < w.famMin) return false;
    if (w.famMax !== undefined && me.fam > w.famMax) return false;
    if (w.flag && !this.mem.has(w.flag)) return false;
    if (w.notFlag && this.mem.has(w.notFlag)) return false;
    if (w.seen && !me.seen.includes(w.seen)) return false;
    if (w.notSeen && me.seen.includes(w.notSeen)) return false;
    if (w.first !== undefined && w.first !== this.first) return false;
    if (w.firstToday !== undefined && w.firstToday !== this.firstToday) return false;
    return true;
  }

  private pick(lines: Line[]): Line | null {
    // conditional lines first, in order; otherwise one of the plain ones at random
    const cond = lines.filter((l) => l.when && this.ok(l.when));
    if (cond.length) return cond[0];
    const plain = lines.filter((l) => !l.when);
    return plain.length ? plain[Math.floor(Math.random() * plain.length)] : null;
  }

  /** Moves to a node and returns what to show. `null` means the conversation is over (or a free chat starts). */
  go(to: string): Step | null {
    if (to === END || to === CHAT) return null;
    const n: Node | undefined = this.c.dialogue[to];
    if (!n) return this.go('argomenti');
    this.node = to;
    const me = this.mem.npc(this.c.id);
    const firstTime = !me.seen.includes(to);
    if (firstTime) {
      me.seen.push(to);
      if (n.fam) me.fam = Math.min(100, me.fam + n.fam);
    }
    for (const f of n.set ?? []) this.mem.set(f);
    const line = this.pick(n.say);
    const pages = line ? (Array.isArray(line.text) ? line.text : [line.text]) : [];
    const choices = (n.choices ?? this.c.dialogue.argomenti?.choices ?? [])
      .filter((ch: Choice) => this.ok(ch.when) && !(ch.once && me.seen.includes(ch.to)) && ch.to !== to)
      .map((ch) => ({ text: ch.text, to: ch.to }));
    // a node with no choices of its own flows on to `next`, or back to the topics
    if (!n.choices && n.next) return { pages, choices: [{ text: '…', to: n.next }] };
    this.mem.save();
    return { pages, choices };
  }

  start(): Step {
    return this.go('saluto')!;
  }

  get at(): string {
    return this.node;
  }
}

/** A line said aloud while working, if one fits what they are doing. */
export function bark(c: Character, doing: string): string | null {
  const fits = c.barks.filter(([words]) => words.some((w) => doing.includes(w)) || words.length === 0);
  if (!fits.length) return null;
  const lines = fits[Math.floor(Math.random() * fits.length)][1];
  return lines[Math.floor(Math.random() * lines.length)];
}
