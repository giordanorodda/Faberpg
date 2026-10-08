import type { Look } from './person';

/** How the people of the 3D interiors look. Their stories are in src/data/png/. */
export const LOOKS: Record<string, Look> = {
  ysolde: {
    height: 1.68,
    girth: 1.0,
    skin: 0xe8c0a0,
    hair: 0xa8806a,
    hairStyle: 'bun',
    eyes: 0x2e4a32,
    top: 0x6a7a4a,
    sleeves: 0x6a7a4a,
    bottom: 0x5a3a4a,
    shoes: 0x4a3424,
    skirt: true,
    apron: 0xd8cbb0,
    shawl: 0x9a4a3a,
    cheeks: 0xd88a7a,
  },
  corvino: {
    height: 1.72,
    girth: 1.14,
    skin: 0xe0b090,
    hair: 0xd0ccc4,
    hairStyle: 'bald',
    eyes: 0x2a2018,
    top: 0xe8dcc0,
    sleeves: 0x3a4a6a,
    bottom: 0x5a4a3a,
    shoes: 0x3a2a1e,
    coat: 0x3a4a6a,
    belt: 0x3a2a1e,
    beard: 0xd8d4cc,
    glasses: true,
    cheeks: 0xd8907a,
  },
};
