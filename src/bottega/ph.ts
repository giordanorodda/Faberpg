import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Photographed assets from Poly Haven (CC0), downloaded into
 * public/assets/ph/ by scripts/fetch-polyhaven.py.
 */

const BASE = `${import.meta.env.BASE_URL}assets/ph`;
const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

/**
 * A scanned surface material: color, normal map, and the packed ARM map
 * (red: ambient occlusion, green: roughness, blue: metalness).
 */
export function phMaterial(name: string, repeat: [number, number] = [1, 1], opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const load = (kind: string, srgb: boolean) => {
    const t = texLoader.load(`${BASE}/textures/${name}/${name}_${kind}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const arm = load('arm', false);
  return new THREE.MeshStandardMaterial({
    map: load('diff', true),
    normalMap: load('nor_gl', false),
    aoMap: arm,
    roughnessMap: arm,
    metalnessMap: arm,
    roughness: 1,
    metalness: 1,
    ...opts,
  });
}

const cache = new Map<string, Promise<THREE.Group>>();

function loadModel(name: string): Promise<THREE.Group> {
  let p = cache.get(name);
  if (!p) {
    p = gltfLoader.loadAsync(`${BASE}/models/${name}/${name}.gltf`).then((g) => {
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      return g.scene;
    });
    cache.set(name, p);
  }
  return p;
}

export interface Placement {
  at: [number, number, number];
  rotY?: number;
  scale?: number;
  /** Tilt, for things leaning against a wall. */
  rotX?: number;
  rotZ?: number;
  inspect?: string;
}

/**
 * Places a copy of a model in the group as soon as it has loaded. Models
 * are in real-world meters, so they need no scaling.
 */
export function place(group: THREE.Group, name: string, p: Placement): Promise<THREE.Object3D> {
  return loadModel(name).then((src) => {
    const obj = src.clone(true);
    obj.position.set(...p.at);
    obj.rotation.set(p.rotX ?? 0, p.rotY ?? 0, p.rotZ ?? 0);
    if (p.scale) obj.scale.setScalar(p.scale);
    if (p.inspect) obj.traverse((o) => (o.userData.inspect = p.inspect));
    group.add(obj);
    return obj;
  });
}

/** World-space height of the top of a placed object. */
export function topOf(obj: THREE.Object3D): number {
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj).max.y;
}
