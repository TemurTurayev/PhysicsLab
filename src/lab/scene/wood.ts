import * as THREE from 'three'

/**
 * Procedural timber shared by every wooden part: long fibres, uneven growth bands, a few knots.
 * Colour goes to `map`, the same pattern drives `bumpMap` and roughness so grain catches raking light
 * instead of reading as painted plastic. Baked once per tone, reused everywhere.
 */
function bakeGrain(pale: string, dark: string, seed: number): { color: THREE.CanvasTexture; height: THREE.CanvasTexture } {
  const size = 512
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const color = document.createElement('canvas')
  const height = document.createElement('canvas')
  color.width = color.height = height.width = height.height = size
  const c = color.getContext('2d')!
  const h = height.getContext('2d')!
  const a = new THREE.Color(pale)
  const b = new THREE.Color(dark)
  const img = c.createImageData(size, size)
  const him = h.createImageData(size, size)
  const knots = Array.from({ length: 3 }, () => ({ x: rand() * size, y: rand() * size, r: 6 + rand() * 10 }))
  const phase = Array.from({ length: 6 }, () => rand() * Math.PI * 2)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // fibres run along x; growth bands wander slowly across y
      let warp = Math.sin(x * 0.012 + phase[0]) * 9 + Math.sin(x * 0.031 + phase[1]) * 3
      for (const k of knots) {
        const dx = x - k.x
        const dy = y - k.y
        const d2 = dx * dx + dy * dy
        warp += (k.r * k.r * 6 * Math.sign(dy || 1)) / (d2 + k.r * k.r)
      }
      const band = (y + warp) * 0.11
      const late = Math.pow(0.5 + 0.5 * Math.sin(band + Math.sin(band * 0.37 + phase[2]) * 1.4), 6)
      const fibre = 0.5 + 0.5 * Math.sin(y * 1.9 + Math.sin(x * 0.05 + phase[3]) * 2 + phase[4])
      const tone = Math.min(1, 0.18 + late * 0.55 + fibre * 0.12 + rand() * 0.05)
      const col = a.clone().lerp(b, tone)
      const i = (y * size + x) * 4
      img.data[i] = col.r * 255
      img.data[i + 1] = col.g * 255
      img.data[i + 2] = col.b * 255
      img.data[i + 3] = 255
      const hv = 255 * (0.6 - late * 0.35 - fibre * 0.12)
      him.data[i] = him.data[i + 1] = him.data[i + 2] = hv
      him.data[i + 3] = 255
    }
  }
  c.putImageData(img, 0, 0)
  h.putImageData(him, 0, 0)
  const colorTex = new THREE.CanvasTexture(color)
  colorTex.colorSpace = THREE.SRGBColorSpace
  const heightTex = new THREE.CanvasTexture(height)
  for (const t of [colorTex, heightTex]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 4
  }
  return { color: colorTex, height: heightTex }
}

export type WoodTone = 'oak' | 'weathered' | 'dark'

const TONES: Record<WoodTone, { pale: string; dark: string; rough: number }> = {
  oak: { pale: '#d2a873', dark: '#8a5d36', rough: 0.72 },
  weathered: { pale: '#b8a389', dark: '#76624b', rough: 0.86 },
  dark: { pale: '#a07750', dark: '#5e3f22', rough: 0.68 },
}

const cache = new Map<WoodTone, THREE.MeshStandardMaterial>()

/** Shared wood material. Callers must not dispose it; it lives for the page. */
export function woodMaterial(tone: WoodTone): THREE.MeshStandardMaterial {
  const hit = cache.get(tone)
  if (hit) return hit
  const t = TONES[tone]
  const { color, height } = bakeGrain(t.pale, t.dark, tone.length * 7919 + 17)
  const mat = new THREE.MeshStandardMaterial({
    map: color,
    bumpMap: height,
    bumpScale: 1.4,
    roughnessMap: height,
    roughness: t.rough,
    metalness: 0,
    envMapIntensity: 0.4,
  })
  mat.userData.shared = true
  cache.set(tone, mat)
  return mat
}
