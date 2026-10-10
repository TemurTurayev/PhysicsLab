import * as THREE from 'three'

type Track = <T extends { dispose: () => void }>(item: T) => T

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function valueNoise(x: number, y: number): number {
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

const smooth = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

/**
 * Height of the meadow: exactly 0 on the range itself (the physics ground) and gently rolling
 * beyond it, rising toward the far edges so the field reads as a valley instead of a table.
 */
export function rangeHeight(x: number, z: number, maxX: number): number {
  const away = Math.max(smooth(14, 70, Math.abs(z)), smooth(maxX + 12, maxX + 70, x), smooth(-28, -80, x))
  if (away <= 0) return 0
  // ...and back down at the plane's edge, so it meets the flat skirt without a cliff.
  const edge = 1 - Math.max(smooth(92, 118, Math.abs(z)), smooth(-78, -98, x), smooth(maxX + 58, maxX + 78, x))
  const rolling = valueNoise(x * 0.035, z * 0.035) * 5 + valueNoise(x * 0.09, z * 0.09) * 1.6
  return away * edge * (rolling + away * 7)
}

/** Meadow colour at a point: mown lane stripes stay, the rest gets sun-bleached and clover patches. */
export function meadowColor(x: number, z: number, base: THREE.Color): THREE.Color {
  const patch = valueNoise(x * 0.05 + 11, z * 0.05 - 3)
  const fine = valueNoise(x * 0.22, z * 0.22)
  const dry = new THREE.Color('#9aa84e')
  const lush = new THREE.Color('#4e7a2c')
  const c = base.clone()
  if (patch > 0.62) c.lerp(dry, (patch - 0.62) * 1.8)
  else if (patch < 0.35) c.lerp(lush, (0.35 - patch) * 1.6)
  return c.multiplyScalar(0.94 + fine * 0.12)
}

/** Lift the ground plane's vertices onto the meadow and re-light it. */
export function applyMeadowTerrain(geo: THREE.BufferGeometry, maxX: number): void {
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, rangeHeight(pos.getX(i), pos.getZ(i), maxX))
  pos.needsUpdate = true
  geo.computeVertexNormals()
}

/** A clump of 5 leaning blades, base at y = 0; one geometry shared by every instance. */
function clumpGeometry(): THREE.BufferGeometry {
  const verts: number[] = []
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + k * 0.7
    const h = 0.32 + (k % 3) * 0.1
    const w = 0.05
    const lean = 0.12
    const cx = Math.cos(a)
    const cz = Math.sin(a)
    const px = -cz * w
    const pz = cx * w
    verts.push(px, 0, pz, -px, 0, -pz, cx * lean, h, cz * lean)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  // Normals straight up: the clump is lit like the turf it grows from, never a black backface.
  g.setAttribute('normal', new THREE.Float32BufferAttribute(verts.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  return g
}

function scatter(
  mesh: THREE.InstancedMesh,
  count: number,
  place: () => { x: number; z: number } | null,
  maxX: number,
  look: (i: number) => { scale: number; color: THREE.Color },
): void {
  const m = new THREE.Object3D()
  let n = 0
  let guard = 0
  while (n < count && guard++ < count * 20) {
    const p = place()
    if (!p) continue
    const { scale, color } = look(n)
    m.position.set(p.x, rangeHeight(p.x, p.z, maxX), p.z)
    m.rotation.set(0, (p.x * 13.7 + p.z * 7.1) % (Math.PI * 2), 0)
    m.scale.setScalar(scale)
    m.updateMatrix()
    mesh.setMatrixAt(n, m.matrix)
    mesh.setColorAt(n, color)
    n++
  }
  mesh.count = n
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

export interface MeadowOptions {
  maxX: number
  rand: () => number
  reserved: (x: number, z: number) => boolean
}

/** Grass clumps, wildflowers, boulders, hay bales, a spectators' tent and two rows of soft hills. */
export function addMeadow(group: THREE.Group, track: Track, o: MeadowOptions): void {
  const { maxX, rand, reserved } = o
  const onMeadow = (xMin: number, xMax: number, zMax: number, laneGap: number) => () => {
    const x = xMin + rand() * (xMax - xMin)
    const z = (rand() * 2 - 1) * zMax
    if (Math.abs(z) < laneGap && x > -2 && x < maxX + 6) return null // the lane is mown
    return reserved(x, z) ? null : { x, z }
  }

  const greens = ['#5f8a33', '#6f9a3d', '#7fa846', '#557d2c', '#8bb052'].map((c) => new THREE.Color(c))
  const grass = track(new THREE.InstancedMesh(track(clumpGeometry()), track(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })), 1700))
  scatter(grass, 1700, onMeadow(-30, maxX + 30, 40, 4.6), maxX, (i) => ({ scale: 0.8 + (i % 7) * 0.12, color: greens[i % greens.length] }))
  grass.receiveShadow = true
  group.add(grass)

  const petals = ['#f5f1e6', '#f2d24b', '#b78be0', '#f08a8a'].map((c) => new THREE.Color(c))
  const flowerGeo = track(new THREE.IcosahedronGeometry(0.06, 0))
  flowerGeo.translate(0, 0.32, 0)
  const flowers = track(new THREE.InstancedMesh(flowerGeo, track(new THREE.MeshLambertMaterial({ flatShading: true })), 320))
  scatter(flowers, 320, onMeadow(-25, maxX + 20, 34, 5), maxX, (i) => ({ scale: 0.8 + (i % 4) * 0.2, color: petals[i % petals.length] }))
  group.add(flowers)

  const rocks = ['#7c786f', '#8a867b', '#6b6860'].map((c) => new THREE.Color(c))
  const boulders = track(new THREE.InstancedMesh(track(new THREE.DodecahedronGeometry(0.6, 0)), track(new THREE.MeshLambertMaterial({ flatShading: true })), 34))
  scatter(boulders, 34, onMeadow(-40, maxX + 50, 70, 16), maxX, (i) => ({ scale: 0.5 + (i % 5) * 0.45, color: rocks[i % rocks.length] }))
  boulders.castShadow = true
  boulders.receiveShadow = true
  group.add(boulders)

  addHayAndTent(group, track)
  addSoftHills(group, track, maxX, rand)
}

function addHayAndTent(group: THREE.Group, track: Track): void {
  const hayMat = track(new THREE.MeshLambertMaterial({ color: 0xd9b45f, flatShading: true }))
  const bale = track(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 14))
  bale.rotateZ(Math.PI / 2)
  for (const [x, z, y] of [
    [-16, -7, 0.7],
    [-14.6, -7.2, 0.7],
    [-15.3, -7.1, 1.85],
    [-18, -4.5, 0.7],
  ]) {
    const b = new THREE.Mesh(bale, hayMat)
    b.position.set(x, y, z)
    b.rotation.y = 0.3
    b.castShadow = true
    b.receiveShadow = true
    group.add(b)
  }

  // A striped spectators' tent behind the judge's stand.
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 8
  const ctx = canvas.getContext('2d')!
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#f2ead8' : '#c8452f'
    ctx.fillRect(i * 16, 0, 16, 8)
  }
  const stripes = track(new THREE.CanvasTexture(canvas))
  stripes.colorSpace = THREE.SRGBColorSpace
  const tent = new THREE.Mesh(track(new THREE.ConeGeometry(3.2, 3.2, 8, 1, true)), track(new THREE.MeshLambertMaterial({ map: stripes, side: THREE.DoubleSide })))
  tent.position.set(-22, 3.6, -17)
  tent.castShadow = true
  const walls = new THREE.Mesh(track(new THREE.CylinderGeometry(3.1, 3.1, 2, 8, 1, true)), track(new THREE.MeshLambertMaterial({ color: 0xf2ead8, side: THREE.DoubleSide })))
  walls.position.set(-22, 1, -17)
  walls.castShadow = true
  const pennant = new THREE.Mesh(track(new THREE.ConeGeometry(0.12, 0.6, 4)), track(new THREE.MeshLambertMaterial({ color: 0xc8452f })))
  pennant.position.set(-22, 5.5, -17)
  group.add(tent, walls, pennant)
}

/** Two rows of low, wide domes: green near, blue-green far (fog finishes the depth). */
function addSoftHills(group: THREE.Group, track: Track, maxX: number, rand: () => number): void {
  const dome = track(new THREE.SphereGeometry(1, 18, 7, 0, Math.PI * 2, 0, Math.PI / 2))
  const near = [track(new THREE.MeshLambertMaterial({ color: 0x5f8a3a, flatShading: true })), track(new THREE.MeshLambertMaterial({ color: 0x527c31, flatShading: true }))]
  const far = track(new THREE.MeshLambertMaterial({ color: 0x5d7f68, flatShading: true }))
  const rows: Array<{ z: number; h: [number, number]; r: [number, number]; mats: THREE.Material[] }> = [
    { z: -95, h: [9, 16], r: [35, 55], mats: near },
    { z: -170, h: [22, 38], r: [60, 90], mats: [far] },
  ]
  for (const row of rows) {
    for (let x = -120; x < maxX + 160; x += row.r[0] * 1.3) {
      const h = row.h[0] + rand() * (row.h[1] - row.h[0])
      const r = row.r[0] + rand() * (row.r[1] - row.r[0])
      const hill = new THREE.Mesh(dome, row.mats[Math.floor(rand() * row.mats.length)])
      hill.position.set(x, -1, row.z - rand() * 20)
      hill.scale.set(r, h, r * 0.6)
      group.add(hill)
    }
  }
  // Behind the far end of the lane too, so the lane runs into a valley.
  for (const z of [-40, 0, 45]) {
    const hill = new THREE.Mesh(dome, near[0])
    hill.position.set(maxX + 95, -1, z)
    hill.scale.set(45, 14 + rand() * 6, 40)
    group.add(hill)
  }
}
