import * as THREE from 'three';

/**
 * A small position-based cloth simulator, run once at load time so soft
 * things settle the way they would: a tablecloth falling over a barrel, a
 * half-empty sack slumping on the floor. Nothing here is animated
 * afterwards; it only replaces hand-placed folds with real ones.
 */

export interface Collider {
  /** Pushes a point (in world space) out of the collider. */
  resolve(p: THREE.Vector3): void;
}

export const floorCollider = (y = 0, thickness = 0.004): Collider => ({
  resolve(p) {
    if (p.y < y + thickness) p.y = y + thickness;
  },
});

/** A vertical solid of revolution (a barrel): radius as a function of height. */
export const barrelCollider = (center: THREE.Vector3, height: number, radius: (y: number) => number, pad = 0.02): Collider => ({
  resolve(p) {
    const y = p.y - center.y;
    if (y > height + pad || y < 0) return;
    const dx = p.x - center.x;
    const dz = p.z - center.z;
    const d = Math.hypot(dx, dz);
    const r = radius(Math.min(y, height)) + pad;
    if (d >= r) return;
    // close to the top: push up onto the lid; otherwise push out sideways
    if (height + pad - y < r - d) p.y = center.y + height + pad;
    else {
      const k = r / Math.max(d, 1e-6);
      p.x = center.x + dx * k;
      p.z = center.z + dz * k;
    }
  },
});

export const wallCollider = (axis: 'x' | 'z', min: number): Collider => ({
  resolve(p) {
    if (p[axis] < min) p[axis] = min;
  },
});

export interface SimOptions {
  steps?: number;
  iterations?: number;
  gravity?: number;
  /** 0..1, how much velocity survives each step (air drag and friction). */
  damping?: number;
  /** Target volume as a fraction of the start (for closed-ish bags). Omit for open cloth. */
  volume?: number;
  colliders: Collider[];
  /** How strongly the cloth resists bending (0 = silk, 1 = card). */
  bend?: number;
  /** Friction against colliders: tangential speed kept on contact. */
  friction?: number;
}

/**
 * Simulates a mesh (already positioned in world space via its matrixWorld)
 * and writes the settled shape back into its geometry. Vertices that share
 * a position (UV seams) move together.
 */
export function settle(mesh: THREE.Mesh, o: SimOptions): void {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const toWorld = mesh.matrixWorld;
  const toLocal = toWorld.clone().invert();

  // weld vertices that share a position into one particle
  const key = (v: THREE.Vector3) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
  const map = new Map<string, number>();
  const particleOf = new Int32Array(pos.count);
  const P: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(toWorld);
    const k = key(v);
    let id = map.get(k);
    if (id === undefined) {
      id = P.length;
      P.push(v.clone());
      map.set(k, id);
    }
    particleOf[i] = id;
  }
  const n = P.length;
  const prev = P.map((p) => p.clone());

  // triangles in particle indices
  const tris: [number, number, number][] = [];
  const idx = geo.index;
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let t = 0; t < triCount; t++) {
    const a = particleOf[idx ? idx.getX(t * 3) : t * 3];
    const b = particleOf[idx ? idx.getX(t * 3 + 1) : t * 3 + 1];
    const c = particleOf[idx ? idx.getX(t * 3 + 2) : t * 3 + 2];
    if (a !== b && b !== c && a !== c) tris.push([a, b, c]);
  }

  // stretch constraints along edges; bending constraints across shared edges
  const edges = new Map<string, [number, number]>();
  const edgeTris = new Map<string, number[]>();
  const ek = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  tris.forEach(([a, b, c], ti) => {
    for (const [x, y] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const k = ek(x, y);
      edges.set(k, [x, y]);
      (edgeTris.get(k) ?? edgeTris.set(k, []).get(k)!).push(ti);
    }
  });
  type Link = { a: number; b: number; rest: number; k: number };
  const links: Link[] = [];
  for (const [a, b] of edges.values()) links.push({ a, b, rest: P[a].distanceTo(P[b]), k: 1 });
  const bend = o.bend ?? 0.15;
  if (bend > 0) {
    for (const [k, ts] of edgeTris) {
      if (ts.length !== 2) continue;
      const [a, b] = edges.get(k)!;
      const opp = ts.map((ti) => tris[ti].find((x) => x !== a && x !== b)!);
      links.push({ a: opp[0], b: opp[1], rest: P[opp[0]].distanceTo(P[opp[1]]), k: bend });
    }
  }

  const signedVolume = () => {
    let vol = 0;
    for (const [a, b, c] of tris) vol += P[a].dot(new THREE.Vector3().crossVectors(P[b], P[c])) / 6;
    return vol;
  };
  const targetVol = o.volume !== undefined ? signedVolume() * o.volume : 0;

  const g = o.gravity ?? 9.8;
  const dt = 1 / 120;
  const damping = o.damping ?? 0.985;
  const friction = o.friction ?? 0.6;
  const steps = o.steps ?? 360;
  const iters = o.iterations ?? 8;
  const tmp = new THREE.Vector3();
  const grads = Array.from({ length: n }, () => new THREE.Vector3());

  for (let s = 0; s < steps; s++) {
    // integrate (Verlet)
    for (let i = 0; i < n; i++) {
      const p = P[i];
      tmp.copy(p).sub(prev[i]).multiplyScalar(damping);
      prev[i].copy(p);
      p.add(tmp);
      p.y -= g * dt * dt;
    }
    for (let it = 0; it < iters; it++) {
      for (const l of links) {
        const pa = P[l.a];
        const pb = P[l.b];
        tmp.subVectors(pb, pa);
        const d = tmp.length();
        if (d < 1e-9) continue;
        // cloth stretches very little but compresses freely (it folds instead)
        const diff = d - l.rest;
        if (l.k === 1 && diff < 0) continue;
        const corr = (diff / d) * 0.5 * l.k;
        pa.addScaledVector(tmp, corr);
        pb.addScaledVector(tmp, -corr);
      }
      if (o.volume !== undefined) {
        // keep the bag's volume: the grain inside does not compress
        for (const gr of grads) gr.set(0, 0, 0);
        for (const [a, b, c] of tris) {
          grads[a].add(tmp.crossVectors(P[b], P[c]).multiplyScalar(1 / 6));
          grads[b].add(tmp.crossVectors(P[c], P[a]).multiplyScalar(1 / 6));
          grads[c].add(tmp.crossVectors(P[a], P[b]).multiplyScalar(1 / 6));
        }
        let denom = 0;
        for (const gr of grads) denom += gr.lengthSq();
        const C = signedVolume() - targetVol;
        if (denom > 1e-12) {
          const lambda = -C / denom;
          for (let i = 0; i < n; i++) P[i].addScaledVector(grads[i], lambda * 0.5);
        }
      }
      for (let i = 0; i < n; i++) {
        const p = P[i];
        tmp.copy(p);
        for (const c of o.colliders) c.resolve(p);
        if (!tmp.equals(p)) {
          // on contact, friction eats most of the sliding motion
          const vel = tmp.copy(p).sub(prev[i]);
          prev[i].addScaledVector(vel, 1 - friction);
        }
      }
    }
  }

  for (let i = 0; i < pos.count; i++) {
    v.copy(P[particleOf[i]]).applyMatrix4(toLocal);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}
