import type { NpcLook } from '../npc/types';
import type { Facing } from '../world/types';

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export { shade };

/**
 * Draws a small person in a 16×16 cell whose top-left is (x, y).
 * Everything is a handful of rectangles: legible, not spectacular (§24).
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: NpcLook,
  facing: Facing,
  walkTime: number,
): void {
  const child = look.build === 'child';
  const elder = look.build === 'elder';
  const top = y + (child ? 4 : 1) + (elder ? 1 : 0);
  const step = walkTime > 0 ? Math.floor(walkTime * 8) % 2 : -1;
  const bob = step === 1 ? 1 : 0;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x + 4, y + 14, 8, 2);

  const headH = child ? 4 : 5;
  const bodyH = child ? 4 : 5;
  const legH = child ? 3 : 4;
  const headY = top + bob;
  const bodyY = headY + headH;
  const legY = bodyY + bodyH;

  // legs
  if (step === -1) {
    px(ctx, look.legs, x + 5, legY, 2, legH);
    px(ctx, look.legs, x + 9, legY, 2, legH);
  } else if (facing === 'left' || facing === 'right') {
    px(ctx, look.legs, x + (step ? 5 : 6), legY, 2, legH);
    px(ctx, look.legs, x + (step ? 9 : 8), legY, 2, legH);
  } else {
    px(ctx, look.legs, x + 5, legY, 2, legH - (step ? 1 : 0));
    px(ctx, look.legs, x + 9, legY, 2, legH - (step ? 0 : 1));
  }

  // body
  px(ctx, look.shirt, x + 4, bodyY, 8, bodyH);
  px(ctx, shade(look.shirt, -25), x + 4, bodyY + bodyH - 1, 8, 1);
  // arms
  const arm = shade(look.shirt, -15);
  if (facing === 'left' || facing === 'right') {
    px(ctx, arm, x + (facing === 'left' ? 7 : 8), bodyY + 1, 1, bodyH - 1);
  } else {
    px(ctx, arm, x + 3, bodyY + 1, 1, bodyH - 1);
    px(ctx, arm, x + 12, bodyY + 1, 1, bodyH - 1);
    px(ctx, look.skin, x + 3, bodyY + bodyH - 1, 1, 1);
    px(ctx, look.skin, x + 12, bodyY + bodyH - 1, 1, 1);
  }
  if (elder) px(ctx, shade(look.shirt, 20), x + 4, bodyY, 8, 1);

  // head
  const hx = x + 5;
  px(ctx, look.skin, hx, headY, 6, headH);
  const hair = look.hairStyle === 'kerchief' ? shade(look.shirt, 30) : look.hair;
  if (look.hairStyle !== 'bald') {
    if (facing === 'up') {
      px(ctx, hair, hx, headY, 6, headH);
    } else {
      px(ctx, hair, hx, headY, 6, 2);
      if (facing === 'left') px(ctx, hair, hx + 4, headY + 1, 2, look.hairStyle === 'long' ? headH + 1 : 3);
      else if (facing === 'right') px(ctx, hair, hx, headY + 1, 2, look.hairStyle === 'long' ? headH + 1 : 3);
      else if (look.hairStyle === 'long') {
        px(ctx, hair, hx - 1, headY + 1, 1, headH + 1);
        px(ctx, hair, hx + 6, headY + 1, 1, headH + 1);
      }
    }
  } else {
    px(ctx, shade(look.skin, -20), hx, headY, 6, 1);
    if (facing !== 'down') px(ctx, look.hair, facing === 'left' ? hx + 4 : hx, headY + 2, 2, 2);
  }
  // face
  const eye = '#2a2420';
  if (facing === 'down') {
    px(ctx, eye, hx + 1, headY + 2, 1, 1);
    px(ctx, eye, hx + 4, headY + 2, 1, 1);
  } else if (facing === 'left') {
    px(ctx, eye, hx + 1, headY + 2, 1, 1);
  } else if (facing === 'right') {
    px(ctx, eye, hx + 4, headY + 2, 1, 1);
  }
  if (look.beard && facing !== 'up') {
    const bx = facing === 'left' ? hx : facing === 'right' ? hx + 2 : hx + 1;
    px(ctx, look.hair, bx, headY + headH - 1, facing === 'down' ? 4 : 4, 1);
  }
}

/** A sleeping villager: a head on the pillow and a blanket. */
export function drawSleeper(ctx: CanvasRenderingContext2D, x: number, y: number, look: NpcLook, t: number): void {
  px(ctx, look.skin, x + 5, y + 2, 5, 4);
  if (look.hairStyle !== 'bald') px(ctx, look.hairStyle === 'kerchief' ? shade(look.shirt, 30) : look.hair, x + 5, y + 2, 5, 2);
  px(ctx, shade(look.shirt, -10), x + 2, y + 6, 12, 8);
  px(ctx, shade(look.shirt, 10), x + 2, y + 6, 12, 1);
  // a slow "z"
  const phase = (t * 0.5) % 1;
  ctx.globalAlpha = 1 - phase;
  const zx = x + 11 + Math.round(phase * 3);
  const zy = y - Math.round(phase * 6);
  px(ctx, '#e8e8f0', zx, zy, 3, 1);
  px(ctx, '#e8e8f0', zx + 1, zy + 1, 1, 1);
  px(ctx, '#e8e8f0', zx, zy + 2, 3, 1);
  ctx.globalAlpha = 1;
}
