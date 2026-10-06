import { describe, expect, it } from 'vitest';
import { BUILDINGS, FORAGE_SPOTS, MAP_ROWS, REGIONS, SPOTS } from '../src/data/map';
import { NPCS } from '../src/data/npcs';
import { newGame } from '../src/core/state';
import { findPath } from '../src/world/pathfinding';
import { World } from '../src/world/world';

const world = new World({ rows: MAP_ROWS, buildings: BUILDINGS, spots: SPOTS, regions: REGIONS, forage: FORAGE_SPOTS });
const NOON = 12 * 60;

describe('la mappa', () => {
  it('ha tutte le righe della stessa lunghezza e solo caratteri noti', () => {
    const known = new Set('.,*:~sr=Ttfo#+_BChFSklnwX');
    for (const [y, row] of MAP_ROWS.entries()) {
      expect(row.length, `riga ${y}`).toBe(MAP_ROWS[0].length);
      for (const [x, c] of [...row].entries()) expect(known.has(c), `carattere "${c}" in ${x},${y}`).toBe(true);
    }
  });

  it('ha edifici chiusi da muri, con una sola porta sul lato inferiore', () => {
    for (const b of BUILDINGS) {
      const doors: string[] = [];
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) {
          const edge = x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1;
          const t = world.tile(x, y);
          if (t === '+') doors.push(`${x},${y}`);
          if (edge) expect(['#', '+'], `${b.id}: bordo in ${x},${y} è "${t}"`).toContain(t);
          else expect(t, `${b.id}: muro o porta all'interno in ${x},${y}`).not.toMatch(/[#+]/);
        }
      }
      expect(doors, b.id).toEqual([`${b.door.x},${b.door.y}`]);
      expect(b.door.y, `${b.id}: la porta deve stare sul lato inferiore`).toBe(b.y + b.h - 1);
      expect(world.walkableForNpc(b.door.x, b.door.y + 1), `${b.id}: davanti alla porta si deve poter stare`).toBe(true);
    }
  });

  it('ha luoghi con un nome su caselle praticabili', () => {
    for (const [id, p] of Object.entries(SPOTS)) expect(world.walkableForNpc(p.x, p.y), id).toBe(true);
  });

  it('ha punti di raccolta su caselle praticabili dal giocatore', () => {
    for (const f of FORAGE_SPOTS) expect(world.walkableForPlayer(f.x, f.y, NOON), f.id).toBe(true);
  });

  it('fa partire il giocatore dentro casa sua', () => {
    const s = newGame(1, NOON);
    expect(world.interiorAt(s.player.x, s.player.y)?.access).toBe('always');
    expect(world.walkableForPlayer(s.player.x, s.player.y, NOON)).toBe(true);
  });

  it('permette al giocatore di raggiungere a mezzogiorno ogni porta aperta, i punti di raccolta e lo stagno', () => {
    const s = newGame(1, NOON);
    const walk = (x: number, y: number) => world.walkableForPlayer(x, y, NOON);
    const targets = [
      ...BUILDINGS.filter((b) => b.access !== 'locked').map((b) => ({ id: b.id, x: b.door.x, y: b.door.y + 1 })),
      ...FORAGE_SPOTS,
      { id: 'pontile', ...SPOTS.dock_end },
    ];
    for (const t of targets) {
      expect(findPath(s.player, t, world.width, world.height, walk), `irraggiungibile: ${t.id}`).not.toBeNull();
    }
  });

  it('non chiude mai dentro nessuno: da dentro una porta chiusa si esce', () => {
    const tavern = world.building('tavern')!;
    const inside = { x: tavern.door.x, y: tavern.door.y - 1 };
    const outside = { x: tavern.door.x, y: tavern.door.y + 1 };
    const threeAm = 3 * 60;
    expect(world.walkableForPlayer(tavern.door.x, tavern.door.y, threeAm, outside)).toBe(false);
    expect(world.walkableForPlayer(tavern.door.x, tavern.door.y, threeAm, inside)).toBe(true);
  });

  it('permette a ogni abitante di raggiungere ogni luogo della sua routine partendo da casa', () => {
    const walk = (x: number, y: number) => world.walkableForNpc(x, y);
    for (const npc of NPCS) {
      const start = SPOTS[npc.schedule[0].at];
      for (const e of npc.schedule) {
        const goal = SPOTS[e.at];
        expect(goal, `${npc.id}: luogo sconosciuto "${e.at}"`).toBeDefined();
        expect(findPath(start, goal, world.width, world.height, walk), `${npc.id} → ${e.at}`).not.toBeNull();
      }
    }
  });
});
