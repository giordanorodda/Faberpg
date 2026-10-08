import { describe, expect, it } from 'vitest';
import { CORVINO } from '../src/data/png/corvino';
import { YSOLDE } from '../src/data/png/ysolde';
import { BUILDINGS } from '../src/data/map';
import { Conversation } from '../src/interni/dialogue';
import { PeopleMemory } from '../src/interni/memory';
import { whereIs } from '../src/interni/routine';
import { CHAT, END } from '../src/interni/types';


const PEOPLE = [YSOLDE, CORVINO];
// the spots each house builds (kept in step with src/interni/places/*.ts)
const SPOTS: Record<string, string[]> = {
  erbe: ['letto', 'focolare', 'banco', 'tavola', 'poltrona', 'lettura', 'essiccatoio', 'finestra'],
  cartografo: ['letto', 'stufa', 'mappe', 'tavola', 'poltrona', 'banco', 'cannocchiale', 'gioco', 'ospite'],
};

describe('le persone delle case', () => {
  it('le loro case esistono nel paese, con una pagina 3D', () => {
    for (const c of PEOPLE) expect(BUILDINGS.find((b) => b.id === c.house)?.page, c.id).toBeTruthy();
  });

  it('ogni riga della routine porta a un posto che la casa conosce', () => {
    for (const c of PEOPLE)
      for (const r of c.routine) {
        if (r.spot === 'fuori') continue;
        const [house, spot] = r.spot.includes(':') ? r.spot.split(':') : [c.house, r.spot];
        expect(SPOTS[house], `${c.id}: ${r.spot}`).toContain(spot);
      }
  });

  it('a ogni ora del giorno sanno dove stare', () => {
    for (const c of PEOPLE)
      for (let wd = 0; wd < 7; wd++)
        for (let m = 0; m < 1440; m += 15) {
          const w = whereIs(c, { minute: m, weekday: wd, weather: 'clear' });
          expect(w.doing, `${c.id} ${wd} ${m}`).toBeTruthy();
        }
  });

  it('la domenica pomeriggio Ysolde è dal Cartografo, e lui è al tavolino', () => {
    const sunday = { minute: 16 * 60, weekday: 6, weather: 'clear' as const };
    expect(whereIs(YSOLDE, sunday)).toMatchObject({ house: 'cartografo', spot: 'ospite' });
    expect(whereIs(CORVINO, sunday)).toMatchObject({ house: 'cartografo', spot: 'gioco' });
    const monday = { ...sunday, weekday: 0 };
    expect(whereIs(YSOLDE, monday).house).toBe('erbe');
  });

  it('con la pioggia Ysolde non va per erbe', () => {
    expect(whereIs(YSOLDE, { minute: 8 * 60, weekday: 2, weather: 'clear' }).spot).toBe('fuori');
    expect(whereIs(YSOLDE, { minute: 8 * 60, weekday: 2, weather: 'rain' }).spot).toBe('banco');
  });

  it('ogni scelta dei dialoghi porta a un nodo che esiste', () => {
    for (const c of PEOPLE) {
      expect(c.dialogue.saluto, c.id).toBeTruthy();
      expect(c.dialogue.argomenti, c.id).toBeTruthy();
      for (const [id, n] of Object.entries(c.dialogue)) {
        expect(n.say.length, `${c.id}.${id} senza battute`).toBeGreaterThan(0);
        for (const ch of n.choices ?? []) if (ch.to !== END && ch.to !== CHAT) expect(c.dialogue[ch.to], `${c.id}.${id} → ${ch.to}`).toBeTruthy();
        if (n.next) expect(c.dialogue[n.next], `${c.id}.${id} → ${n.next}`).toBeTruthy();
      }
    }
  });

  it('i dialoghi sono ampi', () => {
    for (const c of PEOPLE) expect(Object.keys(c.dialogue).length, c.id).toBeGreaterThan(20);
  });

  it('una conversazione si può percorrere tutta senza vicoli ciechi', () => {
    for (const c of PEOPLE) {
      const mem = new PeopleMemory();
      const visited = new Set<string>();
      const queue = ['saluto'];
      while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const conv = new Conversation(c, mem, { phase: 'afternoon', weather: 'clear', doing: c.routine[3].doing, day: 3 });
        const st = conv.go(id);
        expect(st, `${c.id}.${id}`).toBeTruthy();
        expect(st!.pages.length + st!.choices.length, `${c.id}.${id}`).toBeGreaterThan(0);
        for (const ch of st!.choices) if (ch.to !== END && ch.to !== CHAT) queue.push(ch.to);
      }
      // the first meeting introduces them
      expect(visited.size, c.id).toBeGreaterThan(15);
    }
  });
});
