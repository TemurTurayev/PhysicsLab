import * as THREE from 'three'
import { createSky } from '../sky'
import { woodMaterial } from '../wood'
import type { Target } from '../../levels/types'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from './types'

let seed = 12345
function rand(): number {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function isReserved(x: number, z: number, m = 0.5): boolean {
  if (x >= -6.5 - m && x <= 5.5 + m && Math.abs(z) <= 3.8 + m) return true
  if (x >= -13 - m && x <= -5.5 && Math.abs(z) <= 3.5 + m) return true
  return x >= 0 && Math.abs(z) <= 1.8 + m
}

function createTargetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const rings = [[124, '#c62828'], [96, '#f5f5f5'], [68, '#c62828'], [40, '#f5f5f5'], [16, '#c62828']] as const
    rings.forEach(([r, col]) => {
      ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill()
    })
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function createSignTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#ecdab4'; ctx.fillRect(0, 0, 128, 64)
    ctx.strokeStyle = '#54391c'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 124, 60)
    ctx.fillStyle = '#2b1b0b'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 32)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

interface TargetItem {
  spec: Target
  group: THREE.Group
  pivot: THREE.Group
  discMat: THREE.MeshLambertMaterial
}

export const createWorkshop: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  seed = 12345
  const group = new THREE.Group()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(item: T): T => (disposables.push(item), item)

  const addMesh = (p: THREE.Group, g: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], rot?: [number, number, number], shadow = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(...pos)
    if (rot) mesh.rotation.set(...rot)
    mesh.castShadow = shadow; mesh.receiveShadow = shadow
    p.add(mesh)
    return mesh
  }

  // One golden-morning atmosphere: the sky's sun, the key light and the shafts share SUN_DIR.
  const SUN_DIR = new THREE.Vector3(-0.68, 0.44, 0.58).normalize()
  const fog = new THREE.Fog('#e9cfa2', 55, opts.maxX + 160)
  const background = new THREE.Color('#e9cfa2')
  const sky = createSky({
    zenith: '#6f9fd0',
    mid: '#b9c7cf',
    horizon: '#f3cf98',
    ground: '#e9cfa2',
    sunDir: SUN_DIR,
    sunColor: '#ffd59a',
    halo: 1.1,
  })
  track(sky.geometry)
  track(sky.material as THREE.Material)
  group.add(sky)
  group.add(new THREE.HemisphereLight(0xcfe0f0, 0x6b5a40, 0.6))

  const sun = new THREE.DirectionalLight(0xffd9a6, 3.0)
  sun.position.copy(SUN_DIR).multiplyScalar(60)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.bias = -0.0002
  sun.shadow.normalBias = 0.03
  sun.shadow.camera.near = 5; sun.shadow.camera.far = 140
  sun.shadow.camera.left = -32; sun.shadow.camera.right = 32
  sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24
  sun.target.position.set(0, 0, 0)
  group.add(sun.target); group.add(sun)

  // Cool fill from the camera side keeps the shaded flanks of the timber readable without flattening the grain.
  const fill = new THREE.DirectionalLight(0xaec7df, 0.45)
  fill.position.set(10, 8, 30)
  group.add(fill)

  // Ground plane
  const groundGeo = track(new THREE.PlaneGeometry(opts.maxX + 180, 240, 160, 90))
  groundGeo.rotateX(-Math.PI / 2); groundGeo.translate((opts.maxX - 20) / 2, 0, 0)
  const gColors = new Float32Array(groundGeo.attributes.position.count * 3)
  const cDirt = new THREE.Color(0xa08866); const cGrass = new THREE.Color('#86a052'); const cDry = new THREE.Color(0xa3a35c)
  for (let i = 0; i < groundGeo.attributes.position.count; i++) {
    const x = groundGeo.attributes.position.getX(i); const z = groundGeo.attributes.position.getZ(i)
    const n = Math.sin(x * 0.12) * Math.cos(z * 0.15) * 0.12
    const yardDist = Math.hypot((x - 4) * 0.55, z + 3) - 9
    const lane = x > 0 ? Math.abs(z) - 2.2 - Math.sin(x * 0.08) * 0.6 : 99
    const yard = Math.max(0, Math.min(1, Math.min(yardDist / 10, lane / 2.5) + n))
    const col = cDirt.clone().lerp(cGrass, yard)
    if (n > 0.04) col.lerp(cDry, n * 2.5)
    gColors[i * 3] = col.r; gColors[i * 3 + 1] = col.g; gColors[i * 3 + 2] = col.b
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3))
  const groundMesh = new THREE.Mesh(groundGeo, track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })))
  groundMesh.receiveShadow = true; group.add(groundMesh)

  // Materials
  const woodMat = woodMaterial('weathered')
  const darkWoodMat = woodMaterial('dark')
  const foliageMat = track(new THREE.MeshLambertMaterial({ color: 0x4c6b2e, flatShading: true }))

  // Workshop timber shed (z ≈ -14)
  const shed = new THREE.Group()
  shed.position.set(34, 0, -19)
  addMesh(shed, track(new THREE.BoxGeometry(7.5, 3.4, 0.2)), woodMat, [0, 1.7, -2.3])
  addMesh(shed, track(new THREE.BoxGeometry(0.2, 3.4, 4.6)), woodMat, [-3.65, 1.7, 0])
  addMesh(shed, track(new THREE.BoxGeometry(0.2, 3.4, 4.6)), woodMat, [3.65, 1.7, 0])
  addMesh(shed, track(new THREE.BoxGeometry(8.2, 0.2, 5.4)), darkWoodMat, [0, 3.7, 0], [-0.16, 0, 0])
  addMesh(shed, track(new THREE.BoxGeometry(0.2, 3.8, 0.2)), woodMat, [-3.5, 1.9, 2.2])
  addMesh(shed, track(new THREE.BoxGeometry(0.2, 3.8, 0.2)), woodMat, [3.5, 1.9, 2.2])
  addMesh(shed, track(new THREE.BoxGeometry(3.0, 0.12, 0.7)), woodMat, [0, 0.18, -1.0])
  group.add(shed)

  // Workbench & Saw-horse
  const bench = new THREE.Group()
  bench.position.set(13, 0, -9)
  addMesh(bench, track(new THREE.BoxGeometry(2.4, 0.14, 0.9)), woodMat, [0, 0.85, 0])
  const legGeo = track(new THREE.BoxGeometry(0.1, 0.85, 0.1))
  for (const lx of [-1.05, 1.05]) {
    for (const lz of [-0.35, 0.35]) addMesh(bench, legGeo, woodMat, [lx, 0.425, lz])
  }
  const bLogGeo = track(new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8))
  bLogGeo.rotateX(Math.PI / 2)
  addMesh(bench, bLogGeo, darkWoodMat, [-0.2, 1.05, 0])
  group.add(bench)

  const sawhorse = new THREE.Group()
  sawhorse.position.set(9, 0, -8)
  addMesh(sawhorse, track(new THREE.BoxGeometry(1.6, 0.12, 0.12)), woodMat, [0, 0.75, 0])
  const shLegGeo = track(new THREE.BoxGeometry(0.08, 0.8, 0.08))
  for (const sx of [-0.65, 0.65]) {
    for (const sz of [-0.22, 0.22]) {
      addMesh(sawhorse, shLegGeo, woodMat, [sx, 0.4, sz], [0, 0, sx > 0 ? 0.2 : -0.2])
    }
  }
  const shLogGeo = track(new THREE.CylinderGeometry(0.11, 0.11, 1.8, 8))
  shLogGeo.rotateZ(0.35)
  addMesh(sawhorse, shLogGeo, darkWoodMat, [0, 0.95, 0.1])
  group.add(sawhorse)

  // Stacked barrels
  const barrelGeo = track(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 10))
  const barrelMat = track(new THREE.MeshLambertMaterial({ color: 0x563e28, flatShading: true }))
  const barrels: Array<[number, number, number]> = [[6.5, 0.425, -10.5], [7.3, 0.425, -10.3], [6.9, 1.25, -10.4], [-8.5, 0.425, -11.5], [-9.3, 0.425, -11.2]]
  barrels.forEach(([bx, by, bz]) => addMesh(group, barrelGeo, barrelMat, [bx, by, bz]))

  // Fence along the back (z = -17)
  const postCount = 21
  const fenceMesh = track(new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.14, 1.3, 0.14)), woodMat, postCount))
  fenceMesh.castShadow = true
  const dummy = new THREE.Object3D()
  for (let i = 0; i < postCount; i++) {
    dummy.position.set(30 + i * 2.5, 0.65, -12.5)
    dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
    fenceMesh.setMatrixAt(i, dummy.matrix)
  }
  fenceMesh.instanceMatrix.needsUpdate = true
  group.add(fenceMesh)
  const railGeo = track(new THREE.BoxGeometry(52, 0.08, 0.06))
  addMesh(group, railGeo, woodMat, [5, 0.45, -17])
  addMesh(group, railGeo, woodMat, [5, 0.95, -17])

  // Trees
  const trunkGeo = track(new THREE.CylinderGeometry(0.25, 0.4, 3.2, 6))
  const coneGeo1 = track(new THREE.ConeGeometry(2.2, 2.6, 7))
  const coneGeo2 = track(new THREE.ConeGeometry(1.6, 2.2, 7))
  const treeCoords = [[-16, -15], [16, -22], [33, -24], [44, -19], [-38, 24], [30, 18]]
  for (const [tx, tz] of treeCoords) {
    const tree = new THREE.Group()
    tree.position.set(tx, 0, tz)
    addMesh(tree, trunkGeo, darkWoodMat, [0, 1.6, 0])
    addMesh(tree, coneGeo1, foliageMat, [0, 3.6, 0])
    addMesh(tree, coneGeo2, foliageMat, [0, 5.0, 0])
    group.add(tree)
  }

  // Hand cart
  const cart = new THREE.Group()
  cart.position.set(11, 0, 7)
  const wheelGeo = track(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12))
  wheelGeo.rotateZ(Math.PI / 2)
  for (const wz of [-0.45, 0.45]) addMesh(cart, wheelGeo, darkWoodMat, [0, 0.42, wz])
  const axleGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6))
  axleGeo.rotateX(Math.PI / 2)
  addMesh(cart, axleGeo, darkWoodMat, [0, 0.42, 0], undefined, false)
  addMesh(cart, track(new THREE.BoxGeometry(1.5, 0.25, 0.85)), woodMat, [0.1, 0.5, 0], [0, 0, -0.15])
  group.add(cart)

  // Repeated instanced grass tufts & stones
  const tuftGeo = track(new THREE.ConeGeometry(0.18, 0.4, 4))
  tuftGeo.translate(0, 0.2, 0)
  const grassMat = track(new THREE.MeshLambertMaterial({ color: 0x6e8838, flatShading: true }))
  const grassTufts = track(new THREE.InstancedMesh(tuftGeo, grassMat, 70))
  let placedTufts = 0
  while (placedTufts < 70) {
    const gx = -22 + rand() * (opts.maxX + 40); const gz = -18 + rand() * 34
    if (!isReserved(gx, gz, 0.8)) {
      dummy.position.set(gx, 0, gz)
      const s = 0.7 + rand() * 0.6
      dummy.scale.set(s, s, s); dummy.rotation.set(0, rand() * Math.PI * 2, 0); dummy.updateMatrix()
      grassTufts.setMatrixAt(placedTufts++, dummy.matrix)
    }
  }
  grassTufts.instanceMatrix.needsUpdate = true
  group.add(grassTufts)

  const stoneGeo = track(new THREE.DodecahedronGeometry(0.2, 0))
  const stoneMat = track(new THREE.MeshLambertMaterial({ color: 0x76736c, flatShading: true }))
  const stones = track(new THREE.InstancedMesh(stoneGeo, stoneMat, 25))
  stones.castShadow = true
  let placedStones = 0
  while (placedStones < 25) {
    const sx = -18 + rand() * 38; const sz = -15 + rand() * 28
    if (!isReserved(sx, sz, 0.6)) {
      dummy.position.set(sx, 0.08, sz)
      dummy.scale.set(0.7 + rand() * 0.5, 0.4 + rand() * 0.3, 0.7 + rand() * 0.5)
      dummy.rotation.set(rand() * 2, rand() * 2, rand() * 2); dummy.updateMatrix()
      stones.setMatrixAt(placedStones++, dummy.matrix)
    }
  }
  stones.instanceMatrix.needsUpdate = true
  group.add(stones)

  // Distance cue stakes every 10m along z = -3
  const stakeGeo = track(new THREE.BoxGeometry(0.08, 0.9, 0.08))
  const plateGeo = track(new THREE.PlaneGeometry(0.55, 0.28))
  for (let x = 10; x <= opts.maxX; x += 10) {
    addMesh(group, stakeGeo, woodMat, [x, 0.45, -3])
    const signTex = track(createSignTexture(`${x} м`))
    const signMat = track(new THREE.MeshLambertMaterial({ map: signTex, side: THREE.DoubleSide }))
    addMesh(group, plateGeo, signMat, [x, 0.75, -2.95], undefined, false)
  }

  // Dust motes in sunlight
  const dustCount = 40
  const dustGeo = track(new THREE.BufferGeometry())
  const dustPositions = new Float32Array(dustCount * 3)
  const dustBase = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    const dx = -14 + rand() * 42; const dy = 0.5 + rand() * 4.5; const dz = -9 + rand() * 18
    dustPositions[i * 3] = dustBase[i * 3] = dx
    dustPositions[i * 3 + 1] = dustBase[i * 3 + 1] = dy
    dustPositions[i * 3 + 2] = dustBase[i * 3 + 2] = dz
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dustMat = track(new THREE.PointsMaterial({
    color: 0xffe3a0, size: 0.07, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }))
  group.add(new THREE.Points(dustGeo, dustMat))

  // Target bales
  const targetTex = track(createTargetTexture())
  const hayMat = track(new THREE.MeshLambertMaterial({ color: 0xd9b45a, flatShading: true }))
  const ropeMat = track(new THREE.MeshLambertMaterial({ color: 0x5a3c22, flatShading: true }))
  const targetItems: TargetItem[] = []

  for (const t of opts.targets) {
    const tGroup = new THREE.Group()
    tGroup.position.set(t.x, 0, 0)
    const tPivot = new THREE.Group()
    tGroup.add(tPivot)

    // Bale lying with its round face toward the machine; the hit zone is a ring on the ground
    const baleR = 0.8
    const baleLen = 1.3
    const baleGeo = track(new THREE.CylinderGeometry(baleR, baleR, baleLen, 16))
    baleGeo.rotateZ(Math.PI / 2)
    addMesh(tPivot, baleGeo, hayMat, [0, baleR, 0])

    const ropeGeo = track(new THREE.CylinderGeometry(baleR * 1.02, baleR * 1.02, 0.05, 16))
    ropeGeo.rotateZ(Math.PI / 2)
    for (const rx of [-0.3 * baleLen, 0.3 * baleLen]) addMesh(tPivot, ropeGeo, ropeMat, [rx, baleR, 0], undefined, false)

    const discGeo = track(new THREE.CircleGeometry(0.72 * baleR, 24))
    discGeo.rotateY(-Math.PI / 2)
    const discMat = track(new THREE.MeshLambertMaterial({ map: targetTex }))
    addMesh(tPivot, discGeo, discMat, [-baleLen / 2 - 0.01, baleR, 0], undefined, false)

    const zoneGeo = track(new THREE.RingGeometry(Math.max(0.1, t.r - 0.18), t.r, 64))
    zoneGeo.rotateX(-Math.PI / 2)
    const zoneMat = track(new THREE.MeshBasicMaterial({ color: 0xf0a640, transparent: true, opacity: 0.55, depthWrite: false }))
    const zone = new THREE.Mesh(zoneGeo, zoneMat)
    zone.position.y = 0.04
    tGroup.add(zone)

    group.add(tGroup)
    targetItems.push({ spec: t, group: tGroup, pivot: tPivot, discMat })
  }

  return {
    group, fog, background,
    skirt: '#8d9a5a',
    palette: { accent: '#f0a640', ground: '#7a8f4e', sky: '#f6dcae' },
    update(t: number): void {
      for (const item of targetItems) {
        item.group.position.x = item.spec.x + (item.spec.moving ? item.spec.moving.speed * t : 0)
      }
      const posAttr = dustGeo.attributes.position as THREE.BufferAttribute
      const arr = posAttr.array as Float32Array
      for (let i = 0; i < dustCount; i++) {
        const idx = i * 3
        arr[idx] = dustBase[idx] + Math.sin(t * 0.5 + i) * 0.35
        arr[idx + 1] = dustBase[idx + 1] + Math.cos(t * 0.6 + i * 0.7) * 0.2
        arr[idx + 2] = dustBase[idx + 2] + Math.sin(t * 0.4 + i * 1.2) * 0.35
      }
      posAttr.needsUpdate = true
    },
    setHit(index: number | null): void {
      targetItems.forEach((item, idx) => {
        if (index === idx) {
          item.pivot.rotation.set(0.25, 0, -0.45)
          item.pivot.position.y = -0.1 * item.spec.r
          item.discMat.color.setHex(0xffea55); item.discMat.emissive.setHex(0xff3300)
        } else {
          item.pivot.rotation.set(0, 0, 0); item.pivot.position.set(0, 0, 0)
          item.discMat.color.setHex(0xffffff); item.discMat.emissive.setHex(0x000000)
        }
      })
    },
    dispose(): void {
      for (const d of disposables) d.dispose()
      group.clear()
    },
  }
}
