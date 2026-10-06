import type { Point } from './types';

const DIRS: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/**
 * A* on a 4-connected grid. Returns the steps from start (excluded) to goal
 * (included), [] if already there, or null if the goal can't be reached.
 */
export function findPath(
  start: Point,
  goal: Point,
  width: number,
  height: number,
  walkable: (x: number, y: number) => boolean,
): Point[] | null {
  if (start.x === goal.x && start.y === goal.y) return [];
  if (!walkable(goal.x, goal.y)) return null;
  const idx = (x: number, y: number) => y * width + x;
  const h = (x: number, y: number) => Math.abs(x - goal.x) + Math.abs(y - goal.y);
  const g = new Float64Array(width * height).fill(Infinity);
  const came = new Int32Array(width * height).fill(-1);
  const closed = new Uint8Array(width * height);
  // Small binary heap keyed by f = g + h.
  const heap: [number, number][] = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = (): number => {
    const top = heap[0][1];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = 2 * c + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };

  const s = idx(start.x, start.y);
  g[s] = 0;
  push(h(start.x, start.y), s);
  while (heap.length > 0) {
    const cur = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % width;
    const cy = (cur - cx) / width;
    if (cx === goal.x && cy === goal.y) {
      const path: Point[] = [];
      let i = cur;
      while (i !== s) {
        path.push({ x: i % width, y: Math.floor(i / width) });
        i = came[i];
      }
      return path.reverse();
    }
    for (const d of DIRS) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (!walkable(nx, ny)) continue;
      const n = idx(nx, ny);
      const ng = g[cur] + 1;
      if (ng < g[n]) {
        g[n] = ng;
        came[n] = cur;
        push(ng + h(nx, ny), n);
      }
    }
  }
  return null;
}
