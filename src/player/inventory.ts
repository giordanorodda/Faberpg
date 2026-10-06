import { item } from '../data/items';
import type { InventoryEntry } from '../core/state';

export function addItem(inv: InventoryEntry[], id: string, qty = 1): void {
  item(id); // throws on unknown ids
  const e = inv.find((i) => i.id === id);
  if (e) e.qty += qty;
  else inv.push({ id, qty });
}

export function removeItem(inv: InventoryEntry[], id: string, qty = 1): boolean {
  const e = inv.find((i) => i.id === id);
  if (!e || e.qty < qty) return false;
  e.qty -= qty;
  if (e.qty === 0) inv.splice(inv.indexOf(e), 1);
  return true;
}

/** True if the inventory holds the item, or any item of that category (e.g. 'pesce'). */
export function hasItem(inv: InventoryEntry[], idOrCategory: string): boolean {
  return inv.some((e) => e.qty > 0 && (e.id === idOrCategory || item(e.id).category === idOrCategory));
}
