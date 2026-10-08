import * as THREE from 'three';
import { toon } from '../stile/paint';
import { LOOKS } from './looks';
import { Person, type Pose } from './person';

/** A quick stage to look at the people in their poses (persona.html). */
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('view') as HTMLCanvasElement, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8b8a0);
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 50);
const params = new URLSearchParams(location.search);
const close = params.has('vicino');
camera.position.set(0, close ? 1.55 : 1.4, close ? 1.3 : 6.5);
camera.lookAt(0, close ? 1.5 : 0.9, 0);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.position.set(2, 5, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
scene.add(sun, new THREE.HemisphereLight(0xb8c8f0, 0xb08860, 1.0));
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), toon({ color: 0xa8845a, rim: 0 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const poses: [string, Pose, number][] = close
  ? [['ysolde', 'stand', -0.25], ['corvino', 'stand', 0.25]]
  : [['ysolde', 'stand', -2.4], ['ysolde', 'walk', -1.4], ['ysolde', 'work', -0.4], ['corvino', 'stand', 0.6], ['corvino', 'sitRead', 1.6], ['corvino', 'walk', 2.6]];
const people = poses.map(([id, pose, x]) => {
  const p = new Person(LOOKS[id]);
  p.setPose(pose);
  p.root.position.x = x;
  p.root.rotation.y = close ? (x < 0 ? 0.35 : -0.35) : 0.25;
  if (pose.startsWith('sit')) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.46, 0.45), toon({ color: 0x7a5232 }));
    seat.position.set(x, 0.23, -0.12);
    seat.castShadow = true;
    scene.add(seat);
  }
  scene.add(p.root);
  return { p, pose };
});
let t = 0;
function frame(): void {
  t += 1 / 60;
  for (const { p, pose } of people) {
    p.lookTarget = camera.position;
    p.talking = close;
    p.update(1 / 60, t, pose === 'walk' ? 1 : 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
(window as unknown as Record<string, unknown>).ready = true;
