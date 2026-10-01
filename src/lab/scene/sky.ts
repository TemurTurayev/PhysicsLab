import * as THREE from 'three'

export interface SkyOptions {
  zenith: string
  mid: string
  horizon: string
  ground: string // colour below the horizon, should match the far ground haze
  sunDir: THREE.Vector3 // direction TOWARD the sun; the scene's key light must use the same one
  sunColor: string
  halo: number // broad glow strength around the sun
}

const RADIUS = 1200

/**
 * A procedural sky dome: warm horizon → muted middle → cool zenith, with a sun disk and halo
 * on the same direction as the key light. Fog-free and depth-write-free, so it never fights the scene.
 */
export function createSky(o: SkyOptions): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(o.zenith) },
      uMid: { value: new THREE.Color(o.mid) },
      uHorizon: { value: new THREE.Color(o.horizon) },
      uGround: { value: new THREE.Color(o.ground) },
      uSunDir: { value: o.sunDir.clone().normalize() },
      uSunColor: { value: new THREE.Color(o.sunColor) },
      uHalo: { value: o.halo },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uMid, uHorizon, uGround, uSunDir, uSunColor;
      uniform float uHalo;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
        sky = mix(sky, uZenith, smoothstep(0.18, 0.85, h));
        sky = mix(sky, uGround, smoothstep(0.0, -0.08, h));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        float halo = pow(s, 6.0) * 0.35 + pow(s, 48.0) * 0.6;
        float disk = smoothstep(0.9993, 0.9997, s);
        sky += uSunColor * (halo * uHalo + disk * 2.2) * step(-0.02, h);
        float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
        gl_FragColor = vec4(sky + dither, 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 48, 24), material)
  mesh.frustumCulled = false
  mesh.renderOrder = -1
  mesh.userData.isSky = true
  return mesh
}

/** Prefiltered environment from the sky alone, so standard materials pick up the sky's colour and the sun's sheen. */
export function skyEnvironment(renderer: THREE.WebGLRenderer, sky: THREE.Mesh): THREE.WebGLRenderTarget {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(sky.geometry, sky.material))
  const target = pmrem.fromScene(scene, 0.02)
  pmrem.dispose()
  return target
}
