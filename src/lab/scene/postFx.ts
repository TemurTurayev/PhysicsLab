import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export type FxQuality = 'high' | 'low' | 'off'

/** Gentle grade in linear light before tone mapping: a touch of contrast and saturation, a soft vignette. */
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVignette: { value: 0.32 }, uSat: { value: 1.08 }, uContrast: { value: 1.05 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette, uSat, uContrast;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 col = mix(vec3(l), c.rgb, uSat);
      col = max(vec3(0.0), (col - 0.18) * uContrast + 0.18);
      vec2 d = vUv - 0.5;
      col *= 1.0 - uVignette * smoothstep(0.35, 0.95, length(d * vec2(1.25, 1.0)) * 1.25);
      gl_FragColor = vec4(col, c.a);
    }`,
}

/**
 * The "nice" render path: multisampled scene → ambient occlusion (contact shadows, desktop only)
 * → bloom on things brighter than white (lamps, emissive signs) → grade → tone map + sRGB.
 */
export class PostFx {
  private readonly composer: EffectComposer
  private readonly ao: GTAOPass | null

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, quality: FxQuality) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
    this.composer = new EffectComposer(renderer, target)
    this.composer.addPass(new RenderPass(scene, camera))
    this.ao = quality === 'high' ? new GTAOPass(scene, camera, 1, 1) : null
    if (this.ao) {
      this.ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 })
      this.ao.blendIntensity = 0.85
      this.composer.addPass(this.ao)
    }
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.45, 1.0))
    this.composer.addPass(new ShaderPass(GradeShader))
    this.composer.addPass(new OutputPass())
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    // Full-res AO on a retina laptop is the expensive part; 1.25× keeps it crisp enough with MSAA.
    this.composer.setPixelRatio(Math.min(pixelRatio, this.ao ? 1.25 : 1.5))
    this.composer.setSize(width, height)
  }

  render(): void {
    this.composer.render()
  }

  dispose(): void {
    this.ao?.dispose()
    this.composer.dispose()
  }
}

const KEY = 'physicslab-fx'

/** The student's choice if any; otherwise ambient occlusion only on real screens with a mouse. */
export function defaultQuality(): FxQuality {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'high' || saved === 'low' || saved === 'off') return saved
  } catch {
    // storage blocked: fall through to the device default
  }
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  return coarse ? 'low' : 'high'
}

export function saveQuality(q: FxQuality): void {
  try {
    localStorage.setItem(KEY, q)
  } catch {
    // not persisted; the choice still applies to this session
  }
}
