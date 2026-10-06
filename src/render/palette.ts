import type { Season } from '../core/time';

/**
 * Colori del mondo. Una sola tavolozza, sobria, per tutto il gioco (§24):
 * nessun elemento deve essere spettacolare, tutti devono essere coerenti.
 */
export interface SeasonPalette {
  grass: string;
  grassDark: string;
  grassLight: string;
  flowers: string[];
  canopy: string[];
  canopyDark: string;
  bareTrees: boolean;
  sprouts: string | null;
}

export const SEASON_PALETTES: Record<Season, SeasonPalette> = {
  0: {
    grass: '#6f9e4c',
    grassDark: '#5f8a40',
    grassLight: '#82b25a',
    flowers: ['#f2efe0', '#f0d75a', '#e9a6c0', '#b8a6e0'],
    canopy: ['#3f7a3a', '#467f3c', '#3a6f36'],
    canopyDark: '#2d5a2c',
    bareTrees: false,
    sprouts: '#9fd06a',
  },
  1: {
    grass: '#7a9e44',
    grassDark: '#698a3a',
    grassLight: '#8fb352',
    flowers: ['#e0503c', '#4a7ad8', '#f0d75a'],
    canopy: ['#356a2e', '#3b7032', '#2f6029'],
    canopyDark: '#244c22',
    bareTrees: false,
    sprouts: '#5fa040',
  },
  2: {
    grass: '#8d9550',
    grassDark: '#7a8244',
    grassLight: '#a0a85e',
    flowers: ['#c8a050'],
    canopy: ['#c0702c', '#d09a34', '#a8482a', '#7a8a3a'],
    canopyDark: '#6a4a24',
    bareTrees: false,
    sprouts: '#d08a2a',
  },
  3: {
    grass: '#8a9488',
    grassDark: '#7a8478',
    grassLight: '#9ea69a',
    flowers: [],
    canopy: ['#3a5a40'],
    canopyDark: '#2a4230',
    bareTrees: true,
    sprouts: null,
  },
};

export const COLORS = {
  path: '#b39a6e',
  pathDark: '#9c845c',
  pathLight: '#c7b084',
  sand: '#d2c08c',
  sandDark: '#bba872',
  water: '#3f6f8f',
  waterDeep: '#3a6887',
  waterLight: '#7fa8c0',
  floor: '#9a7448',
  floorDark: '#845f38',
  wall: '#6a6058',
  wallDark: '#4e4640',
  plaster: '#d8ccb0',
  plasterDark: '#bfb294',
  wood: '#7a5430',
  woodDark: '#5a3c22',
  woodLight: '#966a40',
  stone: '#8a8680',
  stoneDark: '#666260',
  soil: '#6e4e30',
  soilDark: '#5a3e26',
  trunk: '#5a4028',
  window: '#2a2a34',
  windowLit: '#f2c870',
  night: [12, 16, 42] as const,
  roofs: ['#9a4a32', '#8a5a3a', '#7a3e2e', '#a0583a', '#6e5040'],
};

export const PLAYER_LOOK = {
  skin: '#e6b894',
  hair: '#4a3626',
  shirt: '#5d6e7e',
  legs: '#4a4038',
  hairStyle: 'short' as const,
};
