import * as THREE from 'three';

/**
 * Makes everything slightly crooked, as if built by hand: walls lean a
 * little more the higher they go, beams and shelves wander by a centimetre
 * or two. The displacement is a smooth function of world position, so
 * pieces that touch stay together. Mark an object with userData.noWonk
 * (on it or an ancestor) to leave it alone, e.g. things that move.
 */
export function wonkify(root: THREE.Object3D, amount = 1): void {
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  const seen = new Set<THREE.BufferGeometry>();
  const skip = (o: THREE.Object3D | null): boolean => {
    for (let p = o; p; p = p.parent) if (p.userData.noWonk) return true;
    return false;
  };
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || skip(m)) return;
    if (seen.has(m.geometry)) m.geometry = m.geometry.clone();
    seen.add(m.geometry);
    inv.copy(m.matrixWorld).invert();
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      const lean = Math.max(0, v.y) / 3;
      const dx = 0.04 * lean * Math.sin(v.z * 0.9 + 1.3) + 0.01 * Math.sin(v.y * 2.3 + v.z * 1.7);
      const dz = 0.035 * lean * Math.sin(v.x * 0.8 + 0.4) + 0.01 * Math.sin(v.y * 2.1 + v.x * 1.9);
      const dy = v.y > 0.1 ? 0.02 * Math.sin(v.x * 1.1 + 0.5) * Math.sin(v.z * 1.3) : 0;
      v.x += dx * amount;
      v.z += dz * amount;
      v.y += dy * amount;
      v.applyMatrix4(inv);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    m.geometry.computeBoundingSphere();
    m.geometry.computeBoundingBox();
  });
}

const FULLSCREEN_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

/**
 * Ink outlines, drawn where depth or surface direction change sharply.
 * Uses the depth and normals that the ambient-occlusion pass renders anyway.
 */
export function outlineShader(camera: THREE.PerspectiveCamera) {
  return {
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      tDepth: { value: null as THREE.Texture | null },
      tNormal: { value: null as THREE.Texture | null },
      resolution: { value: new THREE.Vector2(1, 1) },
      near: { value: camera.near },
      far: { value: camera.far },
      ink: { value: new THREE.Color(0.16, 0.09, 0.07) },
      strength: { value: 0.75 },
    },
    vertexShader: FULLSCREEN_VS,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform sampler2D tNormal;
      uniform vec2 resolution; uniform float near; uniform float far; uniform vec3 ink; uniform float strength;
      varying vec2 vUv;
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
      vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 px = 1.0 / resolution;
        float d = lin(vUv);
        vec3 n = nrm(vUv);
        float de = 0.0; float ne = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 o = (i == 0) ? vec2(px.x, 0.0) : (i == 1) ? vec2(-px.x, 0.0) : (i == 2) ? vec2(0.0, px.y) : vec2(0.0, -px.y);
          float dd = lin(vUv + o);
          de = max(de, abs(dd - d) / max(d, 0.001));
          ne = max(ne, 1.0 - dot(n, nrm(vUv + o)));
        }
        float edge = max(smoothstep(0.03, 0.08, de), smoothstep(0.25, 0.6, ne));
        // thinner and fainter in the distance, so far things don't turn to scribble
        edge *= strength * clamp(3.5 / d, 0.25, 1.0);
        gl_FragColor = vec4(mix(c.rgb, ink * c.rgb * 0.6 + ink * 0.05, edge), c.a);
      }`,
  };
}

/**
 * Final look, in display space: cool violet shadows, golden highlights, a
 * touch more saturation, a soft vignette and a whisper of grain.
 */
export const gradeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, time: { value: 0 } },
  vertexShader: FULLSCREEN_VS,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 1.18);
      c *= mix(vec3(0.86, 0.86, 1.06), vec3(1.06, 1.0, 0.9), smoothstep(0.05, 0.75, l));
      vec2 d = vUv - 0.5;
      c *= 1.0 - dot(d, d) * 0.6;
      c += (rand(vUv * 1000.0 + time) - 0.5) * 0.02;
      gl_FragColor = vec4(c, 1.0);
    }`,
};
