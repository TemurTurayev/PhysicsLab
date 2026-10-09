import * as THREE from 'three'

export type IndustrialTex = 'concrete' | 'concreteDark' | 'steelPanel' | 'floorTile' | 'hazard' | 'grate' | 'rust'

function hash(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 3628273) ^ 0x5bf03635
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function quantize(val: number, steps = 24): number {
  const step = 256 / steps
  return Math.min(255, Math.max(0, Math.round(val / step) * step))
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, ImageData, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  return [canvas, img, ctx]
}

function configureTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  // Smooth filtering with mipmaps: crisp-pixel textures shimmer into black specks at a distance.
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 8
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function bakeHazard(): THREE.CanvasTexture {
  const [canvas, img, ctx] = makeCanvas(64, 64)
  const d = img.data
  const yCol = [242, 196, 0]
  const bCol = [27, 27, 27]
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const diag = (x + y) % 32
      const isYellow = diag < 16
      const base = isYellow ? yCol : bCol
      let shade = (diag === 0 || diag === 15) ? -22 : 0
      if (hash(x, y, 71) > 0.95) shade += (hash(x, y, 72) - 0.5) * 40
      const i = (y * 64 + x) * 4
      d[i] = quantize(base[0] + shade)
      d[i + 1] = quantize(base[1] + shade)
      d[i + 2] = quantize(base[2] + shade)
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return configureTexture(canvas)
}

function bakeConcrete(dark: boolean): THREE.CanvasTexture {
  const [canvas, img, ctx] = makeCanvas(128, 128)
  const d = img.data
  const base = dark ? [74, 75, 76] : [138, 135, 124]
  for (let y = 0; y < 128; y++) {
    const by = y % 32
    const seam = (by === 0 || by === 31) ? -20 : (by === 1 ? 8 : 0)
    for (let x = 0; x < 128; x++) {
      const streak1 = Math.max(0, 1 - Math.abs(x - 24) / 3) * (0.3 + 0.7 * (y / 128))
      const streak2 = Math.max(0, 1 - Math.abs(x - 62) / 2) * (0.4 + 0.6 * (y / 128))
      const streak3 = Math.max(0, 1 - Math.abs(x - 96) / 3.5) * 0.4
      const streak = (streak1 + streak2 + streak3) * -35
      const pore = hash(x, y, 13) > 0.985 ? -12 : 0
      const mottling = (hash(x >> 2, y >> 2, 5) - 0.5) * 12 + (hash(x >> 4, y >> 4, 9) - 0.5) * 16
      const total = seam + streak + pore + mottling
      const i = (y * 128 + x) * 4
      d[i] = quantize(base[0] + total)
      d[i + 1] = quantize(base[1] + total)
      d[i + 2] = quantize(base[2] + total)
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return configureTexture(canvas)
}

function bakeSteelPanel(): THREE.CanvasTexture {
  const [canvas, img, ctx] = makeCanvas(128, 128)
  const d = img.data
  const base = [93, 100, 107]
  const rivets = [[8, 8], [119, 8], [8, 119], [119, 119]]
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4
      let r = base[0], g = base[1], b = base[2]
      if (x <= 1 || x >= 126 || y <= 1 || y >= 126) {
        r = 40; g = 44; b = 48
      } else if (x <= 3 || y <= 3) {
        r = 125; g = 132; b = 140
      } else if (x >= 124 || y >= 124) {
        r = 62; g = 66; b = 71
      } else {
        let isRivet = false
        for (const [rx, ry] of rivets) {
          const dist = Math.hypot(x - rx, y - ry)
          if (dist <= 3.5) {
            isRivet = true
            const hl = (x < rx && y < ry) ? 55 : (x > rx && y > ry ? -45 : 0)
            r += hl; g += hl; b += hl
            break
          }
        }
        if (!isRivet) {
          const scratch1 = y === Math.floor(x * 0.5 + 24) && x >= 15 && x <= 45
          const scratch2 = y === Math.floor(x * 0.35 + 68) && x >= 60 && x <= 100
          if (scratch1 || scratch2) {
            r += 26; g += 26; b += 28
          } else {
            const n = (hash(x >> 1, y >> 1, 31) - 0.5) * 16
            r += n; g += n; b += n
          }
        }
      }
      d[i] = quantize(r); d[i + 1] = quantize(g); d[i + 2] = quantize(b); d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return configureTexture(canvas)
}

function bakeFloorTile(): THREE.CanvasTexture {
  const [canvas, img, ctx] = makeCanvas(128, 128)
  const d = img.data
  const base = [184, 188, 182]
  for (let y = 0; y < 128; y++) {
    const ty = y % 32
    for (let x = 0; x < 128; x++) {
      const tx = x % 32
      const i = (y * 128 + x) * 4
      if (tx < 2 || ty < 2) {
        d[i] = quantize(44); d[i + 1] = quantize(46); d[i + 2] = quantize(45); d[i + 3] = 255
      } else if (tx === 2 || ty === 2) {
        d[i] = quantize(228); d[i + 1] = quantize(232); d[i + 2] = quantize(225); d[i + 3] = 255
      } else if (tx === 31 || ty === 31) {
        d[i] = quantize(165); d[i + 1] = quantize(168); d[i + 2] = quantize(162); d[i + 3] = 255
      } else {
        const cdist = Math.min(tx - 2, 31 - tx) + Math.min(ty - 2, 31 - ty)
        const grime = cdist < 5 ? -24 : 0
        const tileVar = (hash(x >> 5, y >> 5, 42) - 0.5) * 18
        const n = (hash(x, y, 7) - 0.5) * 10
        const val = grime + tileVar + n
        d[i] = quantize(base[0] + val); d[i + 1] = quantize(base[1] + val); d[i + 2] = quantize(base[2] + val); d[i + 3] = 255
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  return configureTexture(canvas)
}

function bakeGrate(): THREE.CanvasTexture {
  const [canvas, img, ctx] = makeCanvas(128, 128)
  const d = img.data
  const barBase = [93, 100, 107]
  for (let y = 0; y < 128; y++) {
    const cy = y % 16
    for (let x = 0; x < 128; x++) {
      const cx = x % 16
      const isBar = cx < 4 || cy < 4
      const i = (y * 128 + x) * 4
      if (!isBar) {
        d[i] = quantize(18); d[i + 1] = quantize(19); d[i + 2] = quantize(21); d[i + 3] = 255
      } else {
        let shade = 0
        if (cx === 0 || cy === 0) shade = 35
        else if (cx === 3 || cy === 3) shade = -35
        d[i] = quantize(barBase[0] + shade)
        d[i + 1] = quantize(barBase[1] + shade)
        d[i + 2] = quantize(barBase[2] + shade)
        d[i + 3] = 255
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  return configureTexture(canvas)
}

function bakeRust(): THREE.CanvasTexture {
  const [canvas, img, ctx] = makeCanvas(128, 128)
  const d = img.data
  const palette = [
    [42, 18, 8], [68, 28, 12], [96, 42, 18], [125, 58, 24],
    [156, 75, 30], [184, 94, 42], [206, 115, 56], [228, 138, 72],
  ]
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const n = hash(x >> 3, y >> 3, 11) * 0.5 + hash(x >> 1, y >> 1, 23) * 0.3 + hash(x, y, 47) * 0.2
      const idx = Math.min(7, Math.floor(n * 8))
      const col = palette[idx]
      const i = (y * 128 + x) * 4
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return configureTexture(canvas)
}

const texCache = new Map<IndustrialTex, THREE.CanvasTexture>()
const matCache = new Map<string, THREE.MeshLambertMaterial>()

/** Retro texture: 128x128 (hazard 64x64), linear filtering with mipmaps, RepeatWrapping, sRGB colour space. Cached; callers must not dispose. */
export function industrialTexture(kind: IndustrialTex): THREE.CanvasTexture {
  const cached = texCache.get(kind)
  if (cached) return cached
  let tex: THREE.CanvasTexture
  switch (kind) {
    case 'hazard': tex = bakeHazard(); break
    case 'concrete': tex = bakeConcrete(false); break
    case 'concreteDark': tex = bakeConcrete(true); break
    case 'steelPanel': tex = bakeSteelPanel(); break
    case 'floorTile': tex = bakeFloorTile(); break
    case 'grate': tex = bakeGrate(); break
    case 'rust': tex = bakeRust(); break
  }
  texCache.set(kind, tex)
  return tex
}

/** Material helper: MeshLambertMaterial with that map, cached per kind+repeat key; userData.shared = true so models skip disposing it. */
export function industrialMaterial(kind: IndustrialTex, repeat?: [number, number]): THREE.MeshLambertMaterial {
  const rx = repeat ? repeat[0] : 1
  const ry = repeat ? repeat[1] : 1
  const key = `${kind}:${rx},${ry}`
  const existing = matCache.get(key)
  if (existing) return existing

  const base = industrialTexture(kind)
  let map = base
  if (rx !== 1 || ry !== 1) {
    map = base.clone()
    map.repeat.set(rx, ry)
    map.needsUpdate = true
  }
  const mat = new THREE.MeshLambertMaterial({ map })
  mat.userData.shared = true
  matCache.set(key, mat)
  return mat
}

/** A sign texture with text on a plate, e.g. ('КАМЕРА 3', '#f2c400', '#1b1b1b'). Not cached. */
export function signTexture(text: string, bg: string, fg: string, w = 256, h = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = fg
    ctx.lineWidth = Math.max(2, Math.round(h * 0.05))
    ctx.strokeRect(3, 3, w - 6, h - 6)

    const boltR = Math.max(2, Math.round(h * 0.04))
    const bOff = Math.max(6, Math.round(h * 0.12))
    ctx.fillStyle = fg
    for (const bx of [bOff, w - bOff]) {
      for (const by of [bOff, h - bOff]) {
        ctx.beginPath()
        ctx.arc(bx, by, boltR, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    let fontSize = Math.round(h * 0.46)
    ctx.font = `bold ${fontSize}px sans-serif`
    while (ctx.measureText(text).width > w - bOff * 2 - 12 && fontSize > 9) {
      fontSize -= 2
      ctx.font = `bold ${fontSize}px sans-serif`
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.NearestFilter
  return tex
}
