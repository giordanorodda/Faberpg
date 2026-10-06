/** Size of a tile in source pixels. */
export const TILE = 16;

/** Internal (low) resolution of the world canvas; it is scaled up by an integer factor. */
export const VIEW_W = 384;
export const VIEW_H = 224;

/**
 * Game seconds per real second. The design target is roughly 1:1 (§8):
 * a day in Acquaferma lasts about a real day. The other values are a
 * development aid, cycled with the V key.
 */
export const TIME_SPEEDS = [1, 10, 60, 600] as const;

export const DAYS_PER_SEASON = 28;
export const DAYS_PER_WEEK = 7;

/**
 * If true, when the game is reopened the clock advances by the real time
 * that has passed: the world continues while the player is away (§3).
 * Nothing decays or is lost in the meantime: there are no absence penalties (§8).
 * This is a design choice to validate with play.
 */
export const ADVANCE_WHILE_AWAY = true;

/** Player and NPC walking speed, in tiles per real second. */
export const PLAYER_SPEED = 4.5;
export const NPC_SPEED = 2.4;

export const SAVE_KEY = 'faberpg.save';
export const AUTOSAVE_SECONDS = 30;
