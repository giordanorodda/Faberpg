import { FORAGE, FORAGE_DAILY_CHANCE } from '../data/items';
import { hash01, hashString, weightedPick } from '../core/rng';
import type { Season } from '../core/time';
import type { ForageSpotDef } from '../world/types';

/**
 * What a foraging spot offers on a given day, or null. Deterministic: the
 * same world, day and spot always give the same answer, so reloading the
 * game doesn't reshuffle the woods.
 */
export function forageAt(seed: number, day: number, season: Season, spot: ForageSpotDef): string | null {
  const h = hashString(spot.id);
  if (hash01(seed, day, h, 1) >= FORAGE_DAILY_CHANCE) return null;
  const options = FORAGE.filter((f) => f.kinds.includes(spot.kind) && f.seasons.includes(season));
  return weightedPick(options, (f) => f.weight, hash01(seed, day, h, 2))?.item ?? null;
}
