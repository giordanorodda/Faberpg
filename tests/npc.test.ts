import { describe, expect, it } from 'vitest';
import { NPCS } from '../src/data/npcs';
import { BUILDINGS, SPOTS } from '../src/data/map';
import { calendarOf, MINUTES_PER_DAY, parseClock, type Season } from '../src/core/time';
import type { WeatherKind } from '../src/core/weather';
import { resolveSchedule } from '../src/npc/schedule';

const WEATHERS: WeatherKind[] = ['clear', 'cloudy', 'rain'];

describe('gli abitanti', () => {
  it('hanno identificativi unici e una casa che esiste', () => {
    const ids = NPCS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of NPCS) expect(BUILDINGS.some((b) => b.id === n.home), n.id).toBe(true);
  });

  it('hanno legami familiari verso persone che esistono', () => {
    const ids = new Set(NPCS.map((n) => n.id));
    for (const n of NPCS) for (const other of Object.keys(n.family)) expect(ids.has(other), `${n.id} → ${other}`).toBe(true);
  });

  it('hanno routine con orari validi e luoghi esistenti', () => {
    for (const n of NPCS) {
      for (const e of n.schedule) {
        expect(() => parseClock(e.from), `${n.id} ${e.from}`).not.toThrow();
        expect(() => parseClock(e.to), `${n.id} ${e.to}`).not.toThrow();
        expect(SPOTS[e.at], `${n.id}: ${e.at}`).toBeDefined();
      }
    }
  });

  it('sanno sempre dove stare: ogni quarto d\'ora, ogni giorno della settimana, ogni tempo, ogni stagione', () => {
    for (const n of NPCS) {
      for (let season = 0 as Season; season < 4; season = (season + 1) as Season) {
        for (let weekday = 0; weekday < 7; weekday++) {
          const day = season * 28 + weekday;
          for (let m = 0; m < MINUTES_PER_DAY; m += 15) {
            const cal = calendarOf(day * MINUTES_PER_DAY + m);
            for (const w of WEATHERS) expect(() => resolveSchedule(n, cal, w), `${n.id} giorno ${day} ${m}`).not.toThrow();
          }
        }
      }
    }
  });

  it('dormono di notte nel proprio letto, in casa propria', () => {
    for (const n of NPCS) {
      const e = resolveSchedule(n, calendarOf(3 * 60), 'clear');
      expect(e.activity, n.id).toBe('sleep');
      const bed = SPOTS[e.at];
      const home = BUILDINGS.find((b) => b.id === n.home)!;
      const inHome = bed.x > home.x && bed.x < home.x + home.w - 1 && bed.y > home.y && bed.y < home.y + home.h - 1;
      expect(inHome, `${n.id} dorme fuori casa`).toBe(true);
    }
  });

  it('cambiano posto con la pioggia quando la routine lo prevede', () => {
    const lino = NPCS.find((n) => n.id === 'lino')!;
    const tenAm = calendarOf(10 * 60);
    expect(resolveSchedule(lino, tenAm, 'clear').at).toBe('square_play');
    expect(resolveSchedule(lino, tenAm, 'rain').at).toBe('shop_front');
  });

  it('non dormono in due nello stesso letto', () => {
    const cal = calendarOf(3 * 60);
    const beds = NPCS.map((n) => resolveSchedule(n, cal, 'clear').at);
    expect(new Set(beds).size).toBe(beds.length);
  });
});
