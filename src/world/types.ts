export interface Point {
  x: number;
  y: number;
}

/** A named place on the map (used by NPC routines). */
export type SpotDef = Point;

/** Time range as 'HH:MM' strings; '24:00' is allowed as an end. */
export type TimeRange = [string, string];

export interface BuildingDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  door: Point;
  /** 'always': the player's own home; 'hours': open during `hours`; 'locked': someone else's home. */
  access: 'always' | 'hours' | 'locked';
  hours?: TimeRange[];
}

export interface RegionDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ForageKind = 'bosco' | 'prato' | 'riva';

export interface ForageSpotDef extends Point {
  id: string;
  kind: ForageKind;
}

export type Facing = 'up' | 'down' | 'left' | 'right';
