import type { Phase } from '../core/time';
import type { WeatherKind } from '../core/weather';
import type { Pose } from './person';

/**
 * The people of the 3D interiors: who they are, where they are at each hour,
 * and what they say. The content lives in src/data/png/, in Italian; the
 * shapes are here.
 */

/** A place in a house where someone can be, and what they do there. */
export interface Spot {
  at: [number, number];
  /** Which way they face (radians; 0 looks towards +z). */
  yaw: number;
  pose: Pose;
  /** Seat height (for sitting), or the top of the mattress (for sleeping). */
  seat?: number;
}

/** One line of a routine. As in the village, the last matching line wins. */
export interface Routine {
  from: string;
  to: string;
  /** A spot id in the house, or 'fuori' when they are out. */
  spot: string;
  /** What they are doing, in a few words ("pesta le erbe nel mortaio"). Used by dialogue conditions and the chat. */
  doing: string;
  weather?: WeatherKind[];
  days?: number[];
}

export interface Cond {
  phase?: Phase[];
  weather?: WeatherKind[];
  /** Matches if the current activity contains any of these words. */
  doing?: string[];
  famMin?: number;
  famMax?: number;
  flag?: string;
  notFlag?: string;
  seen?: string;
  notSeen?: string;
  /** True only the very first time you ever speak to them. */
  first?: boolean;
  /** True on the first conversation of the day. */
  firstToday?: boolean;
}

export interface Line {
  /** One string per page; text in brackets is narration. */
  text: string | string[];
  when?: Cond;
}

export interface Choice {
  text: string;
  to: string;
  when?: Cond;
  /** The choice disappears once its node has been seen. */
  once?: boolean;
}

export interface Node {
  /** Lines to choose from: the first that matches its condition (or a random one among the plain ones). */
  say: Line[];
  choices?: Choice[];
  /** Where to go after this node if there are no choices (default: the hub). */
  next?: string;
  set?: string[];
  /** Familiarity gained the first time this node is seen. */
  fam?: number;
}

export interface Character {
  id: string;
  name: string;
  /** How others call them, in a word or two. */
  epithet: string;
  age: number;
  role: string;
  /** The house page they live in. */
  house: string;
  /** For the free conversation with Claude: who they are, how they talk, what they know and don't. */
  sheet: {
    personality: string;
    voice: string;
    background: string;
    secrets: string;
    likes: string[];
    dislikes: string[];
    relations: Record<string, string>;
    knowledge: string[];
    /** Things they will never do or say. */
    limits: string[];
  };
  routine: Routine[];
  /** 'saluto' starts every conversation, 'argomenti' is the menu of topics. */
  dialogue: Record<string, Node>;
  /** Things said aloud while busy, when you are near: [activity words, lines]. */
  barks: [string[], string[]][];
}

/** Special destinations in a dialogue. */
export const END = '__fine';
export const CHAT = '__chat';
