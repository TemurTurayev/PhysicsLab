import * as THREE from 'three'

type Track = <T extends { dispose: () => void }>(item: T) => T
type Height = (x: number, z: number) => number

const smooth = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

export interface Rolling {
  flatZ: number // |z| below this stays exactly flat (the physics ground)
  flatXMin: number
  flatXMax: number
  rise: number // m of extra height toward the far edges
}

/**
 * Countryside around a flat play area: 0 inside it, gently rolling outside, rising toward the far
 * edges and easing back to 0 at the mesh edge (x from -100 to maxX + 80, |z| ≤ 120) so it meets the skirt.
 */
export function rollingHeight(x: number, z: number, maxX: number, r: Rolling): number {
  const away = Math.max(smooth(r.flatZ, r.flatZ + 55, Math.abs(z)), smooth(r.flatXMax, r.flatXMax + 55, x), smooth(r.flatXMin, r.flatXMin - 50, x))
  if (away <= 0) return 0
  const edge = 1 - Math.max(smooth(92, 118, Math.abs(z)), smooth(-78, -98, x), smooth(maxX + 58, maxX + 78, x))
  const rolling = valueNoise(x * 0.035 + 7, z * 0.035) * 5 + valueNoise(x * 0.09, z * 0.09 - 3) * 1.6
  return away * edge * (rolling + away * r.rise)
}

/** Lift a ground plane's vertices onto a height function and re-light it. */
export function applyHeight(geo: THREE.BufferGeometry, height: Height): void {
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)))
  pos.needsUpdate = true
  geo.computeVertexNormals()
}

/** A clump of 5 leaning blades with upward normals, lit like the turf it grows from. */
export function clumpGeometry(): THREE.BufferGeometry {
  const verts: number[] = []
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + k * 0.7
    const h = 0.32 + (k % 3) * 0.1
    const cx = Math.cos(a)
    const cz = Math.sin(a)
    verts.push(-cz * 0.05, 0, cx * 0.05, cz * 0.05, 0, -cx * 0.05, cx * 0.12, h, cz * 0.12)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(verts.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  return g
}

export interface Area {
  xMin: number
  xMax: number
  zMax: number
  avoid: (x: number, z: number) => boolean
  height: Height
  rand: () => number
}

/** Fill an instanced mesh with random placements in the area; returns how many were placed. */
function fill(mesh: THREE.InstancedMesh, a: Area, look: (i: number) => { scale: THREE.Vector3; color: THREE.Color; tilt?: number }): number {
  const m = new THREE.Object3D()
  let n = 0
  let guard = 0
  while (n < mesh.count && guard++ < mesh.count * 25) {
    const x = a.xMin + a.rand() * (a.xMax - a.xMin)
    const z = (a.rand() * 2 - 1) * a.zMax
    if (a.avoid(x, z)) continue
    const { scale, color, tilt = 0 } = look(n)
    m.position.set(x, a.height(x, z), z)
    m.rotation.set(tilt * (a.rand() - 0.5), a.rand() * Math.PI * 2, tilt * (a.rand() - 0.5))
    m.scale.copy(scale)
    m.updateMatrix()
    mesh.setMatrixAt(n, m.matrix)
    mesh.setColorAt(n, color)
    n++
  }
  mesh.count = n
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  return n
}

const palette = (hexes: string[]) => hexes.map((h) => new THREE.Color(h))

export function addGrass(group: THREE.Group, track: Track, a: Area, count: number, greens: string[]): void {
  const cols = palette(greens)
  const mesh = track(new THREE.InstancedMesh(track(clumpGeometry()), track(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })), count))
  fill(mesh, a, (i) => ({ scale: new THREE.Vector3().setScalar(0.8 + (i % 7) * 0.12), color: cols[i % cols.length] }))
  mesh.receiveShadow = true
  group.add(mesh)
}

export function addFlowers(group: THREE.Group, track: Track, a: Area, count: number, petals: string[]): void {
  const cols = palette(petals)
  const geo = track(new THREE.IcosahedronGeometry(0.06, 0))
  geo.translate(0, 0.32, 0)
  const mesh = track(new THREE.InstancedMesh(geo, track(new THREE.MeshLambertMaterial({ flatShading: true })), count))
  fill(mesh, a, (i) => ({ scale: new THREE.Vector3().setScalar(0.8 + (i % 4) * 0.2), color: cols[i % cols.length] }))
  group.add(mesh)
}

export function addBoulders(group: THREE.Group, track: Track, a: Area, count: number, greys: string[], maxSize = 2.4): void {
  const cols = palette(greys)
  const geo = track(new THREE.DodecahedronGeometry(0.5, 0))
  geo.translate(0, 0.22, 0)
  const mesh = track(new THREE.InstancedMesh(geo, track(new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true })), count))
  fill(mesh, a, () => {
    const r = a.rand()
    const s = 0.4 + r * r * maxSize
    return { scale: new THREE.Vector3(s, s * (0.55 + a.rand() * 0.4), s * (0.8 + a.rand() * 0.4)), color: cols[Math.floor(a.rand() * cols.length)] }
  })
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
}

/** Conifers: one instanced trunk mesh and one instanced three-tier crown mesh, sharing placements. */
export function addPines(group: THREE.Group, track: Track, a: Area, count: number, crowns: string[], lean = 0): void {
  const crownGeo = new THREE.ConeGeometry(1.9, 2.2, 7)
  crownGeo.translate(0, 3.0, 0)
  const tier2 = new THREE.ConeGeometry(1.45, 1.9, 7)
  tier2.translate(0, 4.1, 0)
  const tier3 = new THREE.ConeGeometry(0.95, 1.6, 7)
  tier3.translate(0, 5.1, 0)
  const crown = track(mergeAll([crownGeo, tier2, tier3]))
  const trunkGeo = track(new THREE.CylinderGeometry(0.18, 0.3, 2.4, 6))
  trunkGeo.translate(0, 1.2, 0)
  const trunks = track(new THREE.InstancedMesh(trunkGeo, track(new THREE.MeshLambertMaterial({ color: 0x4a3423, flatShading: true })), count))
  const tops = track(new THREE.InstancedMesh(crown, track(new THREE.MeshLambertMaterial({ flatShading: true })), count))
  const cols = palette(crowns)
  const n = fill(tops, a, (i) => ({ scale: new THREE.Vector3().setScalar(0.75 + a.rand() * 0.8), color: cols[i % cols.length], tilt: lean }))
  const m = new THREE.Matrix4()
  for (let i = 0; i < n; i++) {
    tops.getMatrixAt(i, m)
    trunks.setMatrixAt(i, m)
  }
  trunks.count = n
  trunks.instanceMatrix.needsUpdate = true
  for (const mesh of [trunks, tops]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
  }
  group.add(trunks, tops)
}

/** Broadleaf trees: trunk plus a lumpy two-blob crown. */
export function addRoundTrees(group: THREE.Group, track: Track, a: Area, count: number, crowns: string[]): void {
  const blobA = new THREE.IcosahedronGeometry(1.9, 0)
  blobA.translate(0, 4.2, 0)
  const blobB = new THREE.IcosahedronGeometry(1.4, 0)
  blobB.translate(0.9, 5.2, 0.4)
  const crown = track(mergeAll([blobA, blobB]))
  const trunkGeo = track(new THREE.CylinderGeometry(0.22, 0.34, 3.2, 6))
  trunkGeo.translate(0, 1.6, 0)
  const trunks = track(new THREE.InstancedMesh(trunkGeo, track(new THREE.MeshLambertMaterial({ color: 0x5b4330, flatShading: true })), count))
  const tops = track(new THREE.InstancedMesh(crown, track(new THREE.MeshLambertMaterial({ flatShading: true })), count))
  const cols = palette(crowns)
  const n = fill(tops, a, (i) => ({ scale: new THREE.Vector3().setScalar(0.8 + a.rand() * 0.6), color: cols[i % cols.length] }))
  const m = new THREE.Matrix4()
  for (let i = 0; i < n; i++) {
    tops.getMatrixAt(i, m)
    trunks.setMatrixAt(i, m)
  }
  trunks.count = n
  trunks.instanceMatrix.needsUpdate = true
  for (const mesh of [trunks, tops]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
  }
  group.add(trunks, tops)
}

/** Rows of low domes on the horizon; fog turns the far row blue. */
export function addDomeHills(group: THREE.Group, track: Track, rows: Array<{ z: number; xFrom: number; xTo: number; h: [number, number]; r: [number, number]; color: number }>, rand: () => number): void {
  const dome = track(new THREE.SphereGeometry(1, 18, 7, 0, Math.PI * 2, 0, Math.PI / 2))
  for (const row of rows) {
    const mat = track(new THREE.MeshLambertMaterial({ color: row.color, flatShading: true }))
    for (let x = row.xFrom; x < row.xTo; x += row.r[0] * 1.3) {
      const hill = new THREE.Mesh(dome, mat)
      hill.position.set(x, -1, row.z - rand() * 20)
      const r = row.r[0] + rand() * (row.r[1] - row.r[0])
      hill.scale.set(r, row.h[0] + rand() * (row.h[1] - row.h[0]), r * 0.6)
      group.add(hill)
    }
  }
}

function mergeAll(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g))
  const total = parts.reduce((s, g) => s + g.attributes.position.count, 0)
  const pos = new Float32Array(total * 3)
  const nor = new Float32Array(total * 3)
  let o = 0
  for (const g of parts) {
    g.computeVertexNormals()
    pos.set(g.attributes.position.array as Float32Array, o * 3)
    nor.set(g.attributes.normal.array as Float32Array, o * 3)
    o += g.attributes.position.count
  }
  geos.forEach((g) => g.dispose())
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  return out
}
