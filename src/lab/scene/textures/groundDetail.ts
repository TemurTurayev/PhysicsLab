import * as THREE from 'three'

export type GroundKind = 'grass' | 'dirt' | 'regolith' | 'sand'

const SIZE = 256

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 3628273) ^ 0x5bf03635
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Tileable value noise: cells wrap around the texture edge so the repeat never shows a seam. */
function noise(x: number, y: number, cells: number, seed: number): number {
  const fx = (x / SIZE) * cells
  const fy = (y / SIZE) * cells
  const ix = Math.floor(fx)
  const iy = Math.floor(fy)
  const tx = fx - ix
  const ty = fy - iy
  const sx = tx * tx * (3 - 2 * tx)
  const sy = ty * ty * (3 - 2 * ty)
  const at = (a: number, b: number) => hash(((a % cells) + cells) % cells, ((b % cells) + cells) % cells, seed)
  const top = at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx
  const bottom = at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx
  return top * (1 - sy) + bottom * sy
}

// Only fine grain lives in the tiled map: anything larger than a tile would repeat as a visible
// checkerboard. Large-scale variation comes from the ground's own vertex colours.
const LOOK: Record<GroundKind, { tint: [number, number, number]; grain: number }> = {
  grass: { tint: [0.97, 1.02, 0.95], grain: 0.2 },
  dirt: { tint: [1.02, 0.99, 0.95], grain: 0.18 },
  regolith: { tint: [1, 1, 1], grain: 0.22 },
  sand: { tint: [1.02, 1, 0.97], grain: 0.12 },
}

const cache = new Map<GroundKind, THREE.CanvasTexture>()

/**
 * A grey-ish detail map multiplied over the vertex-coloured ground: blades, pebbles and patches
 * at metre scale, so the field stops looking like one flat colour up close.
 */
function detail(kind: GroundKind): THREE.CanvasTexture {
  const hit = cache.get(kind)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(SIZE, SIZE)
  const { tint, grain } = LOOK[kind]
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = 1 + (noise(x, y, 64, 2) - 0.5) * grain + (hash(x, y, 3) - 0.5) * grain * 0.7
      const i = (y * SIZE + x) * 4
      img.data[i] = Math.min(255, v * tint[0] * 238)
      img.data[i + 1] = Math.min(255, v * tint[1] * 238)
      img.data[i + 2] = Math.min(255, v * tint[2] * 238)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  cache.set(kind, tex)
  return tex
}

/** Put the detail map on a ground material whose plane is width × depth metres; one tile ≈ 4 m. */
export function addGroundDetail(material: THREE.MeshStandardMaterial | THREE.MeshLambertMaterial, kind: GroundKind, width: number, depth: number): THREE.Texture {
  const tex = detail(kind).clone()
  tex.repeat.set(width / 4, depth / 4)
  tex.needsUpdate = true
  material.map = tex
  material.needsUpdate = true
  return tex
}
