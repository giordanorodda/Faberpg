import { describe, expect, it } from 'vitest';
import { DIALOGUE } from '../src/data/dialogue';
import { ITEMS } from '../src/data/items';
import { BUILDINGS, REGIONS, SPOTS } from '../src/data/map';
import { NPCS } from '../src/data/npcs';
import { calendarOf } from '../src/core/time';
import { chooseLine, lineKey, matches, type DialogueContext } from '../src/dialogue/dialogue';
import type { DialogueLine } from '../src/dialogue/types';

function ctx(over: Partial<DialogueContext> = {}): DialogueContext {
  return {
    cal: calendarOf(10 * 60),
    weather: 'clear',
    at: [],
    activity: 'work',
    familiarity: 1,
    firstMeeting: false,
    flags: new Set(),
    hasItem: () => false,
    saidEver: new Set(),
    saidToday: new Set(),
    ...over,
  };
}

describe('i dialoghi', () => {
  it('esistono per ogni abitante, con una battuta per il primo incontro', () => {
    for (const n of NPCS) {
      const lines = DIALOGUE[n.id];
      expect(lines, n.id).toBeDefined();
      expect(lines.some((l) => l.when?.first), `${n.id}: manca il primo incontro`).toBe(true);
    }
    for (const id of Object.keys(DIALOGUE)) expect(NPCS.some((n) => n.id === id), `dialoghi per "${id}" che non esiste`).toBe(true);
  });

  it('nominano solo luoghi, oggetti e flag che esistono', () => {
    const places = new Set([...BUILDINGS.map((b) => b.id), ...REGIONS.map((r) => r.id), ...Object.keys(SPOTS)]);
    const things = new Set([...ITEMS.map((i) => i.id), ...ITEMS.map((i) => i.category)]);
    const setFlags = new Set(Object.values(DIALOGUE).flatMap((ls) => ls.flatMap((l) => l.sets ?? [])));
    for (const [id, lines] of Object.entries(DIALOGUE)) {
      for (const l of lines) {
        for (const a of l.when?.at ?? []) expect(places.has(a), `${id}: luogo "${a}"`).toBe(true);
        if (l.when?.playerHas) expect(things.has(l.when.playerHas), `${id}: oggetto "${l.when.playerHas}"`).toBe(true);
        if (l.when?.flag) expect(setFlags.has(l.when.flag), `${id}: nessuno imposta il flag "${l.when.flag}"`).toBe(true);
        expect(l.text.length, `${id}: battuta vuota`).toBeGreaterThan(0);
      }
    }
  });

  it('al primo incontro scelgono sempre la battuta del primo incontro', () => {
    for (const n of NPCS) {
      const lines = DIALOGUE[n.id];
      const i = chooseLine(n.id, lines, ctx({ firstMeeting: true, familiarity: 0 }), () => 0.5);
      expect(lines[i].when?.first, n.id).toBe(true);
    }
  });

  it('rispettano le condizioni', () => {
    const rainy: DialogueLine = { text: ['piove'], when: { weather: ['rain'] } };
    expect(matches(rainy.when, ctx({ weather: 'rain' }))).toBe(true);
    expect(matches(rainy.when, ctx({ weather: 'clear' }))).toBe(false);
    expect(matches({ minFam: 3 }, ctx({ familiarity: 2 }))).toBe(false);
    expect(matches({ at: ['tavern'] }, ctx({ at: ['tavern', 'tavern_bar'] }))).toBe(true);
  });

  it('preferiscono quello che non hai ancora sentito oggi, e non ripetono le rivelazioni', () => {
    const lines: DialogueLine[] = [{ text: ['a'] }, { text: ['b'] }, { text: ['segreto'], once: true }];
    expect(chooseLine('x', lines, ctx(), () => 0)).toBe(2);
    const afterSecret = ctx({ saidEver: new Set([lineKey('x', 2)]), saidToday: new Set([lineKey('x', 2), lineKey('x', 0)]) });
    expect(chooseLine('x', lines, afterSecret, () => 0)).toBe(1);
    const allHeard = ctx({ saidEver: new Set([lineKey('x', 2)]), saidToday: new Set([lineKey('x', 0), lineKey('x', 1)]) });
    expect([0, 1]).toContain(chooseLine('x', lines, allHeard, () => 0.3));
  });
});
