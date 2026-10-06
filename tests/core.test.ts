import { describe, expect, it } from 'vitest';
import { FishingSession, pickFish } from '../src/activities/fishing';
import { forageAt } from '../src/activities/forage';
import { FORAGE, ITEMS } from '../src/data/items';
import { FORAGE_SPOTS } from '../src/data/map';
import { makeRng } from '../src/core/rng';
import { loadFrom, saveTo, deserialize, serialize, type KeyValueStore } from '../src/core/save';
import { newGame } from '../src/core/state';
import { calendarOf, daylight, formatClock, inRange, MINUTES_PER_DAY, parseClock, sunTimes } from '../src/core/time';
import { weatherFor } from '../src/core/weather';
import { addItem, hasItem, removeItem } from '../src/player/inventory';

describe('il tempo', () => {
  it('legge e scrive gli orari', () => {
    expect(parseClock('06:30')).toBe(390);
    expect(parseClock('24:00')).toBe(1440);
    expect(() => parseClock('25:00')).toThrow();
    expect(formatClock(390.7)).toBe('06:30');
  });

  it('gestisce gli intervalli che attraversano la mezzanotte', () => {
    expect(inRange(23 * 60, 22 * 60, 6 * 60)).toBe(true);
    expect(inRange(3 * 60, 22 * 60, 6 * 60)).toBe(true);
    expect(inRange(12 * 60, 22 * 60, 6 * 60)).toBe(false);
  });

  it('conta giorni, settimane, stagioni e anni', () => {
    const c = calendarOf(30 * MINUTES_PER_DAY + 8 * 60);
    expect(c.season).toBe(1);
    expect(c.dayOfSeason).toBe(3);
    expect(c.weekday).toBe(2);
    expect(c.phase).toBe('morning');
    expect(calendarOf(112 * MINUTES_PER_DAY).year).toBe(2);
  });

  it('ha giornate più lunghe d\'estate e più corte d\'inverno', () => {
    const len = (d: number) => sunTimes(d).sunset - sunTimes(d).sunrise;
    expect(len(28 + 14)).toBeGreaterThan(len(0));
    expect(len(84 + 14)).toBeLessThan(len(0));
  });

  it('è buio a mezzanotte e chiaro a mezzogiorno', () => {
    expect(daylight(0)).toBe(0);
    expect(daylight(13 * 60)).toBe(1);
    const dusk = daylight(sunTimes(0).sunset);
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(1);
  });
});

describe('il meteo', () => {
  it('è deterministico per mondo e giorno', () => {
    for (let d = 0; d < 50; d++) expect(weatherFor(42, d)).toEqual(weatherFor(42, d));
  });

  it('varia nel corso dei giorni', () => {
    const kinds = new Set(Array.from({ length: 60 }, (_, d) => weatherFor(7, d).kind));
    expect(kinds.size).toBe(3);
  });
});

describe('il salvataggio', () => {
  const memory = (): KeyValueStore & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
  };

  it('conserva tutto lo stato', () => {
    const s = newGame(123, 600);
    s.flags.push('heard_giant');
    s.relations.lino = { fam: 2, talks: 3, lastTalkDay: 1 };
    const back = deserialize(serialize(s));
    expect(back).toEqual(s);
  });

  it('se il salvataggio è danneggiato, recupera quello precedente', () => {
    const store = memory();
    const s = newGame(1, 600);
    saveTo(store, s);
    s.minutes = 999;
    saveTo(store, s);
    store.data.set('faberpg.save', '{rotto');
    expect(loadFrom(store)?.minutes).toBe(600);
  });

  it('rifiuta salvataggi di versioni future invece di rovinarli', () => {
    expect(() => deserialize(JSON.stringify({ ...newGame(1, 0), version: 99 }))).toThrow();
  });
});

describe('l\'inventario', () => {
  it('aggiunge, toglie e riconosce le categorie', () => {
    const inv = newGame(1, 0).inventory;
    expect(hasItem(inv, 'pesce')).toBe(false);
    addItem(inv, 'tinca');
    addItem(inv, 'tinca');
    expect(hasItem(inv, 'pesce')).toBe(true);
    expect(removeItem(inv, 'tinca', 2)).toBe(true);
    expect(hasItem(inv, 'tinca')).toBe(false);
    expect(() => addItem(inv, 'drago')).toThrow();
  });
});

describe('la pesca', () => {
  it('fa abboccare solo i pesci giusti per il momento', () => {
    const night = calendarOf(2 * 60);
    const noon = calendarOf(13 * 60);
    const atNoon = new Set(Array.from({ length: 200 }, (_, i) => pickFish(noon, 'clear', i / 200)));
    expect(atNoon.has('anguilla')).toBe(false);
    const atNight = new Set(Array.from({ length: 200 }, (_, i) => pickFish(night, 'clear', i / 200)));
    expect(atNight.has('anguilla')).toBe(true);
    for (const f of [...atNoon, ...atNight]) expect(ITEMS.some((i) => i.id === f)).toBe(true);
  });

  it('prima o poi abbocca qualcosa, e se non tiri in tempo scappa', () => {
    const s = new FishingSession(makeRng(5));
    const cal = calendarOf(8 * 60);
    let bit = false;
    for (let t = 0; t < 120 && !bit; t += 0.1) bit = s.update(0.1, cal, 'clear').some((e) => e.type === 'bite');
    expect(bit).toBe(true);
    let escaped = false;
    for (let t = 0; t < 3 && !escaped; t += 0.1) escaped = s.update(0.1, cal, 'clear').some((e) => e.type === 'escaped');
    expect(escaped).toBe(true);
  });
});

describe('la raccolta', () => {
  it('è deterministica e rispetta le stagioni', () => {
    for (const spot of FORAGE_SPOTS) {
      for (let day = 0; day < 112; day += 3) {
        const season = calendarOf(day * MINUTES_PER_DAY).season;
        const it = forageAt(9, day, season, spot);
        expect(forageAt(9, day, season, spot)).toBe(it);
        if (it) {
          const def = FORAGE.find((f) => f.item === it && f.kinds.includes(spot.kind))!;
          expect(def.seasons).toContain(season);
        }
      }
    }
  });

  it('offre qualcosa ogni giorno in ogni stagione, ma non dappertutto', () => {
    for (let day = 0; day < 112; day += 7) {
      const season = calendarOf(day * MINUTES_PER_DAY).season;
      const found = FORAGE_SPOTS.filter((s) => forageAt(3, day, season, s) !== null).length;
      expect(found, `giorno ${day}`).toBeGreaterThan(0);
      expect(found).toBeLessThan(FORAGE_SPOTS.length);
    }
  });
});
