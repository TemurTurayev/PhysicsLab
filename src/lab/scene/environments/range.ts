import * as THREE from 'three'
import { createSky } from '../sky'
import { addGroundDetail } from '../textures/groundDetail'
import { addMeadow, applyMeadowTerrain, meadowColor, rangeHeight } from './rangeDressing'
import type { Target } from '../../levels/types'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from './types'

let seed = 42
function rand(): number {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function isReserved(x: number, z: number, maxX: number, m = 0.5): boolean {
  if (x >= -6 - m && x <= 5 + m && Math.abs(z) <= 3.5 + m) return true
  if (x >= -13 - m && x <= -5.5 && Math.abs(z) <= 4 + m) return true
  if (x >= 0 && x <= maxX + 5 && Math.abs(z) <= 4.2 + m) return true
  return Math.hypot(x + 10, z + 10) < 3.2 || Math.hypot(x - 5, z + 8) < 2.0
}

function makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function createTargetTexture(): THREE.CanvasTexture {
  return makeCanvas(256, 256, (ctx) => {
    const rings = [{ r: 126, c: '#d32f2f' }, { r: 100, c: '#fff' }, { r: 75, c: '#d32f2f' }, { r: 50, c: '#fff' }, { r: 25, c: '#d32f2f' }]
    for (const { r, c } of rings) {
      ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill()
    }
  })
}

function createSignTexture(text: string): THREE.CanvasTexture {
  return makeCanvas(128, 64, (ctx) => {
    ctx.fillStyle = '#ecdcb4'; ctx.fillRect(0, 0, 128, 64)
    ctx.strokeStyle = '#54391c'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 124, 60)
    ctx.fillStyle = '#2b1b0b'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 32)
  })
}

function createWindsockTexture(): THREE.CanvasTexture {
  return makeCanvas(128, 32, (ctx) => {
    const cols = ['#d32f2f', '#fff', '#d32f2f', '#fff', '#d32f2f']
    cols.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * 25.6, 0, 26, 32) })
  })
}

interface TargetItem {
  spec: Target
  boardPivot: THREE.Group
  ringMat: THREE.MeshLambertMaterial
  boardMat: THREE.MeshLambertMaterial
}

export function rangeTargetObject(env: Environment, index: number): THREE.Object3D | undefined {
  const arr = env.group.userData.targets as THREE.Object3D[] | undefined
  return arr?.[index]
}

export const createRange: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  seed = 42
  const group = new THREE.Group()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item)
    return item
  }

  // Fog & Background
  const fog = new THREE.Fog('#cfe6f5', 150, opts.maxX + 250)
  const background = new THREE.Color('#cfe6f5')

  // Lights
  const hemi = new THREE.HemisphereLight(0xd8ecf8, 0x5d8a3c, 0.6)
  const sun = new THREE.DirectionalLight(0xfff1d6, 3.0)
  sun.position.set(-20, 60, 30); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 130
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30
  sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28
  sun.target.position.set(5, 0, 0)
  group.add(hemi, sun, sun.target)

  // Sky dome: the shared procedural sky with fair-weather clouds, sun on the key light's direction
  const sky = createSky({
    zenith: '#4f93d6', mid: '#9cc6e8', horizon: '#e4f0f7', ground: '#cfe6f5',
    sunDir: sun.position.clone().normalize(), sunColor: '#fff4dc', halo: 0.7,
    clouds: { cover: 0.42, color: '#ffffff' },
  })
  track(sky.geometry); track(sky.material as THREE.Material)
  group.add(sky)

  // Ground plane with mowing stripes along x
  const groundW = opts.maxX + 180 // x from -100: broken beams throw the stone ~70 m backwards
  const groundGeo = track(new THREE.PlaneGeometry(groundW, 240, Math.min(96, Math.max(40, Math.round(groundW / 3))), 80))
  groundGeo.rotateX(-Math.PI / 2); groundGeo.translate((opts.maxX - 20) / 2, 0, 0)
  applyMeadowTerrain(groundGeo, opts.maxX)
  const gColors = new Float32Array(groundGeo.attributes.position.count * 3)
  const [cGrass, cDark, cLight] = [new THREE.Color('#6f9a45'), new THREE.Color('#60883b'), new THREE.Color('#7ca64e')]
  for (let i = 0; i < groundGeo.attributes.position.count; i++) {
    const gx = groundGeo.attributes.position.getX(i), gz = groundGeo.attributes.position.getZ(i)
    const n = Math.sin(gx * 0.08 + gz * 0.06) * 0.03 + (Math.sin(gz * 0.9) > 0 ? 0.04 : -0.04)
    const mown = cGrass.clone().lerp(n > 0 ? cLight : cDark, Math.min(1, Math.abs(n) * 8))
    const col = Math.abs(gz) < 6 && gx > -3 && gx < opts.maxX + 6 ? mown : meadowColor(gx, gz, cGrass)
    gColors.set([col.r, col.g, col.b], i * 3)
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3))
  const groundMat = track(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))
  track(addGroundDetail(groundMat, 'grass', groundW, 240))
  const groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.receiveShadow = true
  group.add(groundMesh)

  // Shared materials
  const woodMat = track(new THREE.MeshLambertMaterial({ color: 0x6e4f32, flatShading: true }))
  const darkWoodMat = track(new THREE.MeshLambertMaterial({ color: 0x483421, flatShading: true }))
  const chalkMat = track(new THREE.MeshLambertMaterial({ color: 0xf5f5f5, flatShading: true }))
  const foliageMat = track(new THREE.MeshLambertMaterial({ color: 0x4e6b2e, flatShading: true }))
  const targetTex = track(createTargetTexture())

  // Measured lane chalk lines: along x at z = ±4 from 0 to maxX
  const laneGeo = track(new THREE.BoxGeometry(opts.maxX, 0.005, 0.12))
  for (const lz of [-4, 4]) {
    const l = new THREE.Mesh(laneGeo, chalkMat); l.position.set(opts.maxX / 2, 0.012, lz); group.add(l)
  }
  const cross10Geo = track(new THREE.BoxGeometry(0.1, 0.005, 8.0))
  const cross25Geo = track(new THREE.BoxGeometry(0.2, 0.005, 11.0))
  for (let x = 0; x <= opts.maxX; x += 10) {
    const is25 = x % 25 === 0
    const c = new THREE.Mesh(is25 ? cross25Geo : cross10Geo, chalkMat)
    c.position.set(x, 0.012, 0); group.add(c)
  }

  // Wooden signboards & red pennant flags every 25m
  const signPostGeo = track(new THREE.BoxGeometry(0.1, 1.1, 0.1))
  const signBackGeo = track(new THREE.BoxGeometry(0.72, 0.42, 0.05))
  const signFaceGeo = track(new THREE.PlaneGeometry(0.7, 0.4))
  const flagPoleGeo = track(new THREE.CylinderGeometry(0.03, 0.04, 3.0, 6))
  const flagTriGeo = track(new THREE.BufferGeometry())
  flagTriGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.35, 0, 0, -0.35, 0, 0.85, 0, 0]), 3))
  flagTriGeo.setIndex([0, 1, 2, 0, 2, 1]); flagTriGeo.computeVertexNormals()
  const flagMat = track(new THREE.MeshLambertMaterial({ color: 0xd32f2f, side: THREE.DoubleSide, flatShading: true }))
  const flags: THREE.Mesh[] = []

  for (let x = 25; x <= opts.maxX; x += 25) {
    const post = new THREE.Mesh(signPostGeo, woodMat); post.position.set(x, 0.55, -6); post.castShadow = true
    const back = new THREE.Mesh(signBackGeo, woodMat); back.position.set(x, 0.95, -6); back.castShadow = true
    const sMat = track(new THREE.MeshLambertMaterial({ map: track(createSignTexture(`${x} м`)), side: THREE.DoubleSide }))
    const face = new THREE.Mesh(signFaceGeo, sMat); face.position.set(x, 0.95, -5.97)
    group.add(post, back, face)

    const pole = new THREE.Mesh(flagPoleGeo, woodMat); pole.position.set(x, 1.5, 6); pole.castShadow = true
    const flag = new THREE.Mesh(flagTriGeo, flagMat); flag.position.set(x, 2.7, 6); flag.castShadow = true
    group.add(pole, flag)
    flags.push(flag)
  }

  // Distant trees (trunk + 2 cones)
  const trunkGeo = track(new THREE.CylinderGeometry(0.2, 0.35, 2.8, 6))
  const fGeo1 = track(new THREE.ConeGeometry(2.0, 2.4, 7))
  const fGeo2 = track(new THREE.ConeGeometry(1.5, 2.0, 7))
  const treeCoords = [[-18, -25], [12, -28], [45, -30], [80, -26], [-15, 18], [25, 20], [65, 19], [opts.maxX + 10, 22]]
  for (const [tx, tz] of treeCoords) {
    const tree = new THREE.Group(); tree.position.set(tx, rangeHeight(tx, tz, opts.maxX), tz)
    const trunk = new THREE.Mesh(trunkGeo, darkWoodMat); trunk.position.set(0, 1.4, 0); trunk.castShadow = true
    const f1 = new THREE.Mesh(fGeo1, foliageMat); f1.position.set(0, 3.2, 0); f1.castShadow = true
    const f2 = new THREE.Mesh(fGeo2, foliageMat); f2.position.set(0, 4.5, 0); f2.castShadow = true
    tree.add(trunk, f1, f2); group.add(tree)
  }

  // Judge's stand at x = -10, z = -10
  const stand = new THREE.Group(); stand.position.set(-10, 0, -10)
  const stiltGeo = track(new THREE.BoxGeometry(0.12, 1.6, 0.12))
  for (const sx of [-0.9, 0.9]) {
    for (const sz of [-0.9, 0.9]) {
      const s = new THREE.Mesh(stiltGeo, woodMat); s.position.set(sx, 0.8, sz); s.castShadow = true; stand.add(s)
    }
  }
  const deck = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.1, 2.1)), woodMat); deck.position.set(0, 1.6, 0); deck.castShadow = true; deck.receiveShadow = true
  const canopy = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 0.08, 2.3)), track(new THREE.MeshLambertMaterial({ color: 0xd97736, flatShading: true })))
  canopy.position.set(0, 3.4, 0); canopy.rotation.x = -0.12; canopy.castShadow = true
  const desk = new THREE.Mesh(track(new THREE.BoxGeometry(0.8, 0.45, 0.4)), darkWoodMat); desk.position.set(0, 1.85, -0.4); desk.castShadow = true
  const cPostGeo = track(new THREE.BoxGeometry(0.08, 1.8, 0.08))
  for (const px of [-0.9, 0.9]) {
    for (const pz of [-0.9, 0.9]) {
      const p = new THREE.Mesh(cPostGeo, woodMat); p.position.set(px, 2.5, pz); p.castShadow = true; stand.add(p)
    }
  }
  const rail = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 0.06, 0.06)), woodMat); rail.position.set(0, 2.1, -0.9)
  stand.add(deck, canopy, desk, rail); group.add(stand)

  // Static wind sock at x = 5, z = -8
  const sockGroup = new THREE.Group(); sockGroup.position.set(5, 0, -8)
  const sockPole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.05, 4.0, 8)), darkWoodMat); sockPole.position.set(0, 2.0, 0); sockPole.castShadow = true
  const sock = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.08, 1.0, 8)), track(new THREE.MeshLambertMaterial({ map: track(createWindsockTexture()), flatShading: true })))
  sock.position.set(0, 3.5, 0.25); sock.rotation.set(0.35, 0, -0.15); sock.castShadow = true
  sockGroup.add(sockPole, sock); group.add(sockGroup)

  // Fence along z = -16
  const fenceCount = Math.floor((opts.maxX + 40) / 3) + 1
  const fenceMesh = track(new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.12, 1.1, 0.12)), woodMat, fenceCount))
  fenceMesh.castShadow = true
  const dummy = new THREE.Object3D()
  for (let i = 0; i < fenceCount; i++) {
    dummy.position.set(-20 + i * 3, 0.55, -16); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
    fenceMesh.setMatrixAt(i, dummy.matrix)
  }
  fenceMesh.instanceMatrix.needsUpdate = true
  const fRail = new THREE.Mesh(track(new THREE.BoxGeometry(opts.maxX + 45, 0.06, 0.06)), woodMat); fRail.position.set((opts.maxX - 5) / 2, 0.85, -16); fRail.castShadow = true
  group.add(fenceMesh, fRail)

  // Meadow: grass, flowers, boulders, hay, tent and soft hills
  addMeadow(group, track, { maxX: opts.maxX, rand, reserved: (x, z) => isReserved(x, z, opts.maxX, 0.6) })

  const stones = track(new THREE.InstancedMesh(track(new THREE.DodecahedronGeometry(0.18, 0)), track(new THREE.MeshLambertMaterial({ color: 0x76736a, flatShading: true })), 22))
  stones.castShadow = true
  let placedStones = 0
  while (placedStones < 22) {
    const sx = -18 + rand() * (opts.maxX + 30), sz = -20 + rand() * 40
    if (!isReserved(sx, sz, opts.maxX, 0.6)) {
      dummy.position.set(sx, 0.08, sz); dummy.scale.set(0.7 + rand() * 0.5, 0.4 + rand() * 0.3, 0.7 + rand() * 0.5); dummy.rotation.set(rand() * 2, rand() * 2, rand() * 2); dummy.updateMatrix()
      stones.setMatrixAt(placedStones++, dummy.matrix)
    }
  }
  stones.instanceMatrix.needsUpdate = true; group.add(stones)

  // Targets
  const targetItems: TargetItem[] = []
  const targetObjects: THREE.Object3D[] = []
  group.userData.targets = targetObjects
  const wheelGeo = track(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12))
  wheelGeo.rotateX(Math.PI / 2)

  for (const t of opts.targets) {
    const tGroup = new THREE.Group()
    tGroup.position.set(t.x, 0, 0)
    const ringGeo = track(new THREE.CircleGeometry(t.r, 32)); ringGeo.rotateX(-Math.PI / 2)
    const ringMat = track(new THREE.MeshLambertMaterial({ map: targetTex, transparent: true }))
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.receiveShadow = true

    if (t.moving) {
      const bed = new THREE.Mesh(track(new THREE.BoxGeometry(t.r * 2.2, 0.1, t.r * 2.2)), woodMat)
      bed.position.set(0, 0.2, 0); bed.castShadow = true; bed.receiveShadow = true
      tGroup.add(bed)
      for (const wx of [-t.r * 0.75, t.r * 0.75]) {
        for (const wz of [-t.r * 1.05, t.r * 1.05]) {
          const w = new THREE.Mesh(wheelGeo, darkWoodMat); w.position.set(wx, 0.16, wz); w.castShadow = true; tGroup.add(w)
        }
      }
      ring.position.set(0, 0.26, 0)
    } else {
      ring.position.set(0, 0.02, 0)
    }
    tGroup.add(ring)

    // Upright wooden frame at x = target.x + r + 0.5
    const frame = new THREE.Group(); frame.position.set(t.r + 0.5, 0, 0)
    const fPostGeo = track(new THREE.BoxGeometry(0.08, 1.8 * t.r + 0.6, 0.08))
    for (const fz of [-0.6 * t.r - 0.15, 0.6 * t.r + 0.15]) {
      const p = new THREE.Mesh(fPostGeo, woodMat); p.position.set(0, 0.9 * t.r + 0.3, fz); p.castShadow = true; frame.add(p)
    }
    const topBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.08, 1.4 * t.r + 0.4)), woodMat)
    topBar.position.set(0, 1.8 * t.r + 0.5, 0); frame.add(topBar)

    const boardPivot = new THREE.Group(); boardPivot.position.set(0, t.r + 0.3, 0)
    const back = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 1.2 * t.r, 1.2 * t.r)), woodMat); back.castShadow = true
    const boardDiscGeo = track(new THREE.CircleGeometry(0.55 * t.r, 24)); boardDiscGeo.rotateY(-Math.PI / 2)
    const boardMat = track(new THREE.MeshLambertMaterial({ map: targetTex }))
    const boardDisc = new THREE.Mesh(boardDiscGeo, boardMat); boardDisc.position.set(-0.05, 0, 0)
    boardPivot.add(back, boardDisc); frame.add(boardPivot); tGroup.add(frame)

    group.add(tGroup); targetObjects.push(tGroup); targetItems.push({ spec: t, boardPivot, ringMat, boardMat })
  }

  return {
    group,
    fog,
    background,
    skirt: '#6f9a45',
    palette: { accent: '#f0a640', ground: '#6f9a45', sky: '#cfe6f5' },
    update(t: number): void {
      for (let i = 0; i < flags.length; i++) {
        const f = flags[i]
        f.rotation.y = Math.sin(t * 5 + f.position.x * 0.25) * 0.28
        f.rotation.z = Math.cos(t * 4 + f.position.x * 0.2) * 0.08
      }
    },
    setHit(index: number | null): void {
      for (let idx = 0; idx < targetItems.length; idx++) {
        const item = targetItems[idx]
        if (index === idx) {
          item.boardPivot.rotation.z = -0.45
          item.boardPivot.position.x = 0.15
          item.ringMat.emissive.setHex(0xffaa22)
          item.boardMat.emissive.setHex(0xff3300)
        } else {
          item.boardPivot.rotation.set(0, 0, 0)
          item.boardPivot.position.set(0, 0, 0)
          item.ringMat.emissive.setHex(0x000000)
          item.boardMat.emissive.setHex(0x000000)
        }
      }
    },
    dispose(): void {
      for (const d of disposables) {
        d.dispose()
      }
      group.clear()
    },
  }
}
