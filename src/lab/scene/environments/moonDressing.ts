import * as THREE from 'three'

type Track = <T extends { dispose: () => void }>(item: T) => T

/**
 * Earth hung where the main camera looks: high over the far end of the range, big enough to read
 * as a world, lit from the side by the same sun so it shows as a crescent.
 */
function hash(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return v - Math.floor(v)
}

/** Value noise that wraps horizontally (period cells), so the globe has no seam at the dateline. */
function wrapNoise(x: number, y: number, cells: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const h = (a: number, b: number) => hash(((a % cells) + cells) % cells, b, seed)
  return (h(ix, iy) * (1 - ux) + h(ix + 1, iy) * ux) * (1 - uy) + (h(ix, iy + 1) * (1 - ux) + h(ix + 1, iy + 1) * ux) * uy
}

function fbm(u: number, v: number, base: number, seed: number): number {
  let sum = 0
  let amp = 0.5
  let cells = base
  for (let k = 0; k < 5; k++) {
    sum += amp * wrapNoise(u * cells, v * cells, cells, seed + k)
    cells *= 2
    amp *= 0.5
  }
  return sum
}

const LAND = 0.485 // fbm level of the coastline: about 30 % land, like Earth

/** A procedural blue marble: fbm continents (green to tan by latitude), deep/shallow ocean, ice caps and clouds. */
export function earthTexture(): THREE.CanvasTexture {
  const W = 512
  const H = 256
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    const lat = Math.abs(y / H - 0.5) * 2 // 0 equator .. 1 pole
    for (let x = 0; x < W; x++) {
      const u = x / W
      const v = y / H
      const land = fbm(u, v * 0.5, 4, 3)
      const cloud = fbm(u, v * 0.5, 6, 11)
      let r: number
      let g: number
      let b: number
      if (land > LAND) {
        const dry = Math.min(1, Math.max(0, 1 - Math.abs(lat - 0.3) * 4)) * 0.8 // deserts around 25–35°
        r = 70 + dry * 120
        g = 110 + dry * 60
        b = 50 + dry * 30
      } else {
        const depth = Math.min(1, (LAND - land) * 6)
        r = 20 - depth * 10
        g = 70 - depth * 30
        b = 150 - depth * 40
      }
      if (lat > 0.82) [r, g, b] = [236, 242, 248]
      const c = Math.max(0, (cloud - 0.5) * 3.6)
      const i = (y * W + x) * 4
      img.data[i] = r + (250 - r) * Math.min(1, c)
      img.data[i + 1] = g + (252 - g) * Math.min(1, c)
      img.data[i + 2] = b + (255 - b) * Math.min(1, c)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

export function placeEarth(group: THREE.Group, track: Track, map: THREE.Texture, rimColor: number): void {
  const at = new THREE.Vector3(820, 185, -300)
  const earth = new THREE.Mesh(
    track(new THREE.SphereGeometry(68, 40, 28)),
    track(new THREE.MeshLambertMaterial({ map, emissive: 0x0b1626, emissiveIntensity: 1 })), // night side: faint city-less glow
  )
  earth.position.copy(at)
  earth.rotation.set(0.35, 2.4, 0.15)
  const atmosphere = new THREE.Mesh(
    track(new THREE.SphereGeometry(72, 40, 28)),
    track(new THREE.MeshBasicMaterial({ color: rimColor, side: THREE.BackSide, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })),
  )
  atmosphere.position.copy(at)
  group.add(earth, atmosphere)
}

export interface RegolithOptions {
  maxX: number
  rand: () => number
  reserved: (x: number, z: number) => boolean
  heightAt: (x: number, z: number) => number
}

function scatterInstances(mesh: THREE.InstancedMesh, o: RegolithOptions, area: { xMin: number; xMax: number; zMax: number; laneGap: number }, size: () => [number, number], colors: THREE.Color[]): void {
  const m = new THREE.Object3D()
  let n = 0
  let guard = 0
  while (n < mesh.count && guard++ < mesh.count * 30) {
    const x = area.xMin + o.rand() * (area.xMax - area.xMin)
    const z = (o.rand() * 2 - 1) * area.zMax
    if (Math.abs(z) < area.laneGap || o.reserved(x, z)) continue
    const [s, flat] = size()
    m.position.set(x, o.heightAt(x, z) + s * 0.18, z)
    m.rotation.set(o.rand() * 3, o.rand() * 3, o.rand() * 3)
    m.scale.set(s, s * flat, s * (0.8 + o.rand() * 0.4))
    m.updateMatrix()
    mesh.setMatrixAt(n, m.matrix)
    mesh.setColorAt(n, colors[n % colors.length])
    n++
  }
  mesh.count = n
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

/** A boulder field (many small, a few big), a gravel of pebbles and young small craters. */
export function addRegolithField(group: THREE.Group, track: Track, o: RegolithOptions): void {
  const greys = ['#7d7b76', '#8c8a84', '#6c6a66', '#96938c', '#5f5d59'].map((c) => new THREE.Color(c))
  const rock = track(new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }))

  const boulders = track(new THREE.InstancedMesh(track(new THREE.IcosahedronGeometry(0.5, 0)), rock, 160))
  scatterInstances(boulders, o, { xMin: -40, xMax: o.maxX + 60, zMax: 85, laneGap: 6.5 }, () => {
    const r = o.rand()
    return [0.4 + r * r * r * 4.5, 0.55 + o.rand() * 0.4] // cubic: lots of small rocks, rare giants
  }, greys)
  boulders.castShadow = true
  boulders.receiveShadow = true

  const pebbles = track(new THREE.InstancedMesh(track(new THREE.DodecahedronGeometry(0.08, 0)), rock, 700))
  scatterInstances(pebbles, o, { xMin: -25, xMax: o.maxX + 30, zMax: 45, laneGap: 3.2 }, () => [0.6 + o.rand() * 1.6, 0.6], greys)
  pebbles.receiveShadow = true

  // Young craters: a raised rim of ejecta and a darker floor.
  const rimGeo = track(new THREE.TorusGeometry(1, 0.18, 5, 18))
  rimGeo.rotateX(Math.PI / 2)
  const floorGeo = track(new THREE.CircleGeometry(0.9, 18))
  floorGeo.rotateX(-Math.PI / 2)
  const rimMat = track(new THREE.MeshStandardMaterial({ color: 0x9c9993, roughness: 1, flatShading: true }))
  const floorMat = track(new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 1 }))
  for (let i = 0; i < 28; i++) {
    const x = -30 + o.rand() * (o.maxX + 70)
    const z = (o.rand() * 2 - 1) * 60
    if (Math.abs(z) < 7 || o.reserved(x, z)) continue
    const r = 0.8 + o.rand() * o.rand() * 3.5
    const crater = new THREE.Group()
    crater.position.set(x, o.heightAt(x, z) + 0.02, z)
    crater.scale.set(r, r * 0.4, r)
    const rim = new THREE.Mesh(rimGeo, rimMat)
    rim.position.y = 0.08
    rim.receiveShadow = true
    rim.castShadow = true
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.y = 0.03
    floor.receiveShadow = true
    crater.add(rim, floor)
    group.add(crater)
  }

  group.add(boulders, pebbles)
}
