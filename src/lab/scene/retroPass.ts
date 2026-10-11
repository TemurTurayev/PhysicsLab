import * as THREE from 'three'

/**
 * Late-90s look as one cheap pass: draw the scene at a fraction of the screen resolution,
 * upscale with nearest filtering, quantise colour with a 4×4 Bayer dither and add faint scanlines.
 * No affine warping or vertex jitter — those read as PS1 and blur the physics we teach.
 */
export class RetroPass {
  private readonly target: THREE.WebGLRenderTarget
  private readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly scale: number

  constructor(scale = 0.75, levels = 64) {
    this.scale = scale
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      // Linear upscale from 3/4 resolution: soft like a CRT, without blocky uneven pixels.
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      colorSpace: THREE.LinearSRGBColorSpace,
    })
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.target.texture },
        uLevels: { value: levels },
        uLines: { value: 1 },
        uSize: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tScene;
        uniform float uLevels;
        uniform float uLines;
        uniform vec2 uSize;
        varying vec2 vUv;
        float bayer(vec2 p) {
          ivec2 i = ivec2(mod(p, 4.0));
          int idx = i.x + i.y * 4;
          int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
          return (float(m[idx]) / 16.0 - 0.5) * 0.6;
        }
        void main() {
          vec4 c = texture2D(tScene, vUv);
          gl_FragColor = c;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          vec2 px = floor(vUv * uSize);
          vec3 q = floor(gl_FragColor.rgb * uLevels + bayer(px) + 0.5) / uLevels;
          float line = 1.0 - uLines * 0.05 * step(0.5, mod(gl_FragCoord.y, 3.0) / 3.0);
          gl_FragColor = vec4(q * line, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
      toneMapped: true,
    })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width * this.scale))
    const h = Math.max(1, Math.round(height * this.scale))
    this.target.setSize(w, h)
    this.quad.material.uniforms.uSize.value.set(w, h)
  }

  setScanlines(on: boolean): void {
    this.quad.material.uniforms.uLines.value = on ? 1 : 0
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    const toneMapping = renderer.toneMapping
    renderer.setRenderTarget(this.target)
    renderer.toneMapping = THREE.NoToneMapping // tone-map once, in the final pass
    renderer.render(scene, camera)
    renderer.toneMapping = toneMapping
    renderer.setRenderTarget(null)
    renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.target.dispose()
    this.quad.geometry.dispose()
    this.quad.material.dispose()
  }
}
