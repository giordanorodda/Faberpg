import { RECIPES } from './textures';

/**
 * Service page for scripts/bake-textures.ts: generates one material and
 * returns its three images as JPEG data URLs.
 */
(window as unknown as Record<string, unknown>).bake = (name: string) => {
  const c = RECIPES[name]();
  return {
    color: c.color.toDataURL('image/jpeg', 0.88),
    height: c.height.toDataURL('image/jpeg', 0.9),
    rough: c.rough.toDataURL('image/jpeg', 0.85),
  };
};
(window as unknown as Record<string, unknown>).recipes = Object.keys(RECIPES);
