import * as THREE from 'three'
import type { Target } from '../../levels/types'
import { createSky } from '../sky'
import { woodMaterial } from '../wood'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from './types'

let seed = 777
function rand(): number {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function isReserved(x: number, z: number, m = 0.5): boolean {
  if (x >= -6.5 - m && x <= 5.5 + m && Math.abs(z) <= 3.8 + m) return true
  if (x >= -13 - m && x <= -5.5 + m && Math.abs(z) <= 3.5 + m) return true
  return x >= 0 && Math.abs(z) <= 1.8 + m
}

function makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d'); if (ctx) draw(ctx)
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; return tex
}

function createTargetTexture(): THREE.CanvasTexture {
  return makeCanvas(256, 256, (ctx) => {
    ([[124, '#c62828'], [96, '#f5f5f5'], [68, '#c62828'], [40, '#f5f5f5'], [16, '#c62828']] as const).forEach(([r, c]) => {
      ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill()
    })
  })
}

function createSignTexture(text: string): THREE.CanvasTexture {
  return makeCanvas(256, 64, (ctx) => {
    ctx.fillStyle = '#cfbda0'; ctx.fillRect(0, 0, 256, 64); ctx.strokeStyle = '#4a3828'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, 250, 58)
    ctx.fillStyle = '#22150b'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 32)
  })
}

function createWindsockTexture(): THREE.CanvasTexture {
  return makeCanvas(128, 32, (ctx) => {
    ;['#d32f2f', '#f5f5f5', '#d32f2f', '#f5f5f5', '#d32f2f'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * 25.6, 0, 26, 32) })
  })
}

interface TargetItem {
  spec: Target; group: THREE.Group; pivot: THREE.Group; discMat: THREE.MeshLambertMaterial; strawPiece: THREE.Mesh
}
interface WindsockItem { pivot: THREE.Group; mesh: THREE.Mesh; phase: number }
interface FlagItem { basePos: [number, number, number]; xVal: number }

export const createPass: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  seed = 777
  const group = new THREE.Group()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(item: T): T => (disposables.push(item), item)
  const dummy = new THREE.Object3D()

  const wind = opts.wind ?? 0
  const absWind = Math.abs(wind)
  const windDir = wind >= 0 ? 1 : -1

  const addMesh = (p: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], rot?: [number, number, number], cast = true, receive = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m); mesh.position.set(...pos); if (rot) mesh.rotation.set(...rot)
    mesh.castShadow = cast; mesh.receiveShadow = receive; p.add(mesh); return mesh
  }

  // Sky, fog and lighting
  const SUN_DIR = new THREE.Vector3(-0.4, 0.55, 0.6).normalize()
  const fog = new THREE.Fog('#d6dee3', 35, opts.maxX + 90); const background = new THREE.Color('#dfe6ea')
  const sky = createSky({ zenith: '#5b7fa6', mid: '#a9b9c6', horizon: '#dfe6ea', ground: '#c9d2d6', sunDir: SUN_DIR, sunColor: '#fff6e8', halo: 0.6 })
  track(sky.geometry); track(sky.material as THREE.Material); group.add(sky)
  group.add(new THREE.HemisphereLight(0xdbe7f2, 0x5f6658, 0.7))

  const sun = new THREE.DirectionalLight(0xfff3e2, 2.2); sun.position.copy(SUN_DIR).multiplyScalar(70); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.03
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 160; sun.shadow.camera.left = -28; sun.shadow.camera.right = 28
  sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22; sun.target.position.set(5, 0, 0)
  group.add(sun.target); group.add(sun)

  const fill = new THREE.DirectionalLight(0xaac2d6, 0.4); fill.position.set(10, 12, 35); group.add(fill)

  // Ground plane: saddle between mountain ridges
  const groundW = opts.maxX + 120
  const groundGeo = track(new THREE.PlaneGeometry(groundW, 240, 100, 70))
  groundGeo.rotateX(-Math.PI / 2); groundGeo.translate((opts.maxX + 80 - 40) / 2, 0, 0)
  const posCount = groundGeo.attributes.position.count
  const gColors = new Float32Array(posCount * 3)
  const [cGrass, cScree, cRock, cSnow] = [new THREE.Color('#7d8a6a'), new THREE.Color('#5a5245'), new THREE.Color('#6c7075'), new THREE.Color('#e8eff4')]

  for (let i = 0; i < posCount; i++) {
    const gx = groundGeo.attributes.position.getX(i); const gz = groundGeo.attributes.position.getZ(i); const absZ = Math.abs(gz)
    let y = 0
    if (gz < -6) {
      const d = -gz - 6; y = d > 4 ? Math.pow((d - 4) / 10, 1.8) * 7.5 + Math.sin(gx * 0.06 + gz * 0.05) * 2.5 : (d / 4) * 0.4
    } else if (gz > 6) {
      const d = gz - 6; y = d > 8 ? Math.pow((d - 8) / 10, 1.8) * 7.5 + Math.cos(gx * 0.06 + gz * 0.05) * 2.5 : (d / 8) * 0.4
    }
    if (absZ <= 6) y = 0
    groundGeo.attributes.position.setY(i, Math.max(0, y))

    const n = Math.sin(gx * 0.12) * Math.cos(gz * 0.15) * 0.1
    const col = cGrass.clone()
    if (absZ < 4) {
      col.lerp(cScree, 0.45 + n * 2)
    } else if (absZ > 8) {
      col.lerp(cRock, Math.min(1, (absZ - 8) / 15 + (y > 4 ? 0.3 : 0)))
      if (y > 7 || (y > 4 && n > 0.04)) col.lerp(cSnow, Math.min(1, (y - 4) / 6))
    }
    gColors[i * 3] = col.r; gColors[i * 3 + 1] = col.g; gColors[i * 3 + 2] = col.b
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3))
  groundGeo.computeVertexNormals()
  const groundMesh = new THREE.Mesh(groundGeo, track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.05, flatShading: true })))
  groundMesh.receiveShadow = true; group.add(groundMesh)

  // Distant snow-capped mountain peaks
  const peakGeo = track(new THREE.ConeGeometry(24, 28, 5)); const snowCapGeo = track(new THREE.ConeGeometry(12, 14, 5))
  const peakMat = track(new THREE.MeshLambertMaterial({ color: 0x5a6066, flatShading: true }))
  const snowMat = track(new THREE.MeshLambertMaterial({ color: 0xe8eff4, flatShading: true }))
  const peaks: Array<[number, number, number, number]> = [
    [-30, 8, -75, 1.2], [25, 10, -85, 1.4], [opts.maxX * 0.6, 9, -80, 1.3],
    [-20, 8, 80, 1.1], [35, 11, 85, 1.5], [opts.maxX * 0.7, 10, 80, 1.3], [opts.maxX + 40, 12, -20, 1.6],
  ]
  for (const [px, py, pz, s] of peaks) {
    const pGroup = new THREE.Group(); pGroup.position.set(px, py, pz); pGroup.scale.set(s, s, s)
    addMesh(pGroup, peakGeo, peakMat, [0, 14, 0], undefined, false, false)
    addMesh(pGroup, snowCapGeo, snowMat, [0, 21, 0], undefined, false, false); group.add(pGroup)
  }

  // Structures materials
  const woodMat = woodMaterial('weathered'); const darkWoodMat = woodMaterial('dark')
  const stoneMat = track(new THREE.MeshStandardMaterial({ color: 0x6e6c67, roughness: 0.95, flatShading: true }))

  // Stone shepherd hut at (-20, 0, -14)
  const hut = new THREE.Group(); hut.position.set(-20, 0, -14)
  const turfMat = track(new THREE.MeshLambertMaterial({ color: 0x546638, flatShading: true }))
  addMesh(hut, track(new THREE.BoxGeometry(4.8, 2.2, 3.6)), stoneMat, [0, 1.1, 0])
  addMesh(hut, track(new THREE.BoxGeometry(0.9, 1.6, 0.15)), darkWoodMat, [0, 0.8, 1.82])
  addMesh(hut, track(new THREE.BoxGeometry(5.2, 0.18, 2.2)), turfMat, [0, 2.5, -0.9], [0.38, 0, 0])
  addMesh(hut, track(new THREE.BoxGeometry(5.2, 0.18, 2.2)), turfMat, [0, 2.5, 0.9], [-0.38, 0, 0])
  addMesh(hut, track(new THREE.BoxGeometry(0.6, 1.2, 0.6)), stoneMat, [-1.6, 2.6, -1.0]); group.add(hut)

  // Camp wagon at (-16, 0, 7.5)
  const wagon = new THREE.Group(); wagon.position.set(-16, 0, 7.5)
  addMesh(wagon, track(new THREE.BoxGeometry(2.4, 0.55, 1.3)), woodMat, [0, 0.7, 0])
  const canopyGeo = track(new THREE.CylinderGeometry(0.72, 0.72, 2.3, 8, 1, false, 0, Math.PI)); canopyGeo.rotateZ(Math.PI / 2)
  addMesh(wagon, canopyGeo, track(new THREE.MeshLambertMaterial({ color: 0xd8ceb8, flatShading: true })), [0, 1.0, 0])
  const wheelGeo = track(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10)); wheelGeo.rotateX(Math.PI / 2)
  for (const wx of [-0.85, 0.85]) {
    for (const wz of [-0.75, 0.75]) addMesh(wagon, wheelGeo, darkWoodMat, [wx, 0.42, wz])
  }
  group.add(wagon)

  // Cairn of stacked stones at (4.5, 0, -5.5)
  const cairnStones: Array<[number, number, number, number, number]> = [
    [0.55, 0.22, 0.55, 0.11, 0.2], [0.44, 0.2, 0.44, 0.3, -0.3], [0.34, 0.18, 0.34, 0.48, 0.4],
    [0.24, 0.16, 0.24, 0.64, -0.2], [0.16, 0.2, 0.16, 0.81, 0.1],
  ]
  const cDodec = track(new THREE.DodecahedronGeometry(1, 0))
  const cairn = new THREE.Group(); cairn.position.set(4.5, 0, -5.5)
  for (const [sx, sy, sz, cy, rot] of cairnStones) {
    const sMesh = addMesh(cairn, cDodec, track(new THREE.MeshLambertMaterial({ color: 0x727578, flatShading: true })), [0, cy, 0], [0, rot, 0])
    sMesh.scale.set(sx, sy, sz)
  }
  group.add(cairn)

  // Wooden signpost at (-5.2, 0, -5.5)
  const signpost = new THREE.Group(); signpost.position.set(-5.2, 0, -5.5)
  addMesh(signpost, track(new THREE.BoxGeometry(0.1, 1.5, 0.1)), woodMat, [0, 0.75, 0])
  addMesh(signpost, track(new THREE.BoxGeometry(1.2, 0.36, 0.05)), woodMat, [0, 1.25, 0])
  const sMat = track(new THREE.MeshLambertMaterial({ map: track(createSignTexture('ПЕРЕВАЛ · 2 340 м')), side: THREE.DoubleSide }))
  addMesh(signpost, track(new THREE.PlaneGeometry(1.16, 0.32)), sMat, [0, 1.25, 0.03], undefined, false); group.add(signpost)

  // Decorative rope bridge across gorge on south slope
  const bridge = new THREE.Group()
  const postGeo = track(new THREE.BoxGeometry(0.16, 1.8, 0.16))
  const ropeMat = track(new THREE.MeshLambertMaterial({ color: 0x4a3622, flatShading: true }))
  addMesh(bridge, postGeo, woodMat, [20, 3.5, 24]); addMesh(bridge, postGeo, woodMat, [32, 3.5, 24])
  const plankMesh = track(new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.22, 0.05, 1.2)), woodMat, 18))
  for (let p = 0; p < 18; p++) {
    const frac = p / 17
    dummy.position.set(20.3 + frac * 11.4, 3.0 - Math.sin(frac * Math.PI) * 0.5, 24)
    dummy.rotation.set((rand() - 0.5) * 0.08, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
    plankMesh.setMatrixAt(p, dummy.matrix)
  }
  plankMesh.instanceMatrix.needsUpdate = true; bridge.add(plankMesh)
  const cableGeo = track(new THREE.CylinderGeometry(0.02, 0.02, 12, 4)); cableGeo.rotateZ(Math.PI / 2)
  addMesh(bridge, cableGeo, ropeMat, [26, 3.7, 23.4]); addMesh(bridge, cableGeo, ropeMat, [26, 3.7, 24.6]); group.add(bridge)

  // Wind-bent pines leaning in wind direction
  const trunkGeo = track(new THREE.CylinderGeometry(0.2, 0.36, 2.8, 6))
  const fGeo1 = track(new THREE.ConeGeometry(1.8, 1.8, 6)); const fGeo2 = track(new THREE.ConeGeometry(1.4, 1.6, 6)); const fGeo3 = track(new THREE.ConeGeometry(0.9, 1.4, 6))
  const foliageMat = track(new THREE.MeshLambertMaterial({ color: 0x324729, flatShading: true }))
  const treeCoords = [[-18, -12], [8, -11], [30, -12], [opts.maxX * 0.65, -13], [-15, 15], [22, 16], [opts.maxX * 0.8, 15]]
  const pineLeanZ = -windDir * (0.12 + Math.min(0.25, absWind * 0.02))
  for (const [tx, tz] of treeCoords) {
    const tree = new THREE.Group(); tree.position.set(tx, 0, tz); tree.rotation.z = pineLeanZ
    addMesh(tree, trunkGeo, darkWoodMat, [0, 1.4, 0]); addMesh(tree, fGeo1, foliageMat, [0, 2.5, 0])
    addMesh(tree, fGeo2, foliageMat, [0, 3.7, 0]); addMesh(tree, fGeo3, foliageMat, [0, 4.7, 0]); group.add(tree)
  }

  // Windsocks: machine at (2, 0, -7) and near targets
  const sockTex = track(createWindsockTexture())
  const sockMat = track(new THREE.MeshLambertMaterial({ map: sockTex, side: THREE.DoubleSide, flatShading: true }))
  const sockPoleGeo = track(new THREE.CylinderGeometry(0.04, 0.06, 4.2, 6))
  const sockGeo = track(new THREE.CylinderGeometry(0.08, 0.2, 1.2, 12))
  sockGeo.rotateZ(-Math.PI / 2); sockGeo.translate(0.6, 0, 0)
  const windsocks: WindsockItem[] = []
  const sockPositions: Array<[number, number]> = [[2, -7], [opts.targets.length > 0 ? opts.targets[0].x : Math.min(opts.maxX - 10, 50), -7]]
  for (const [sx, sz] of sockPositions) {
    const sGroup = new THREE.Group(); sGroup.position.set(sx, 0, sz)
    addMesh(sGroup, sockPoleGeo, darkWoodMat, [0, 2.1, 0])
    const sPivot = new THREE.Group(); sPivot.position.set(0, 4.2, 0); sPivot.rotation.y = wind >= 0 ? 0 : Math.PI
    const sMesh = addMesh(sPivot, sockGeo, sockMat, [0, 0, 0])
    sGroup.add(sPivot); group.add(sGroup); windsocks.push({ pivot: sPivot, mesh: sMesh, phase: sx * 0.5 })
  }

  // Prayer-flag strings along lane edge at z = -6.5
  const flagCols = ['#2b6cb0', '#f5f5f5', '#c53030', '#2f855a', '#dd6b20']
  const postStep = 7.5; const numPosts = Math.max(3, Math.floor((opts.maxX + 12) / postStep) + 1)
  const flagPostsMesh = track(new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.08, 1.8, 0.08)), woodMat, numPosts))
  for (let i = 0; i < numPosts; i++) {
    dummy.position.set(-6 + i * postStep, 0.9, -6.5); dummy.rotation.set(0, 0, (rand() - 0.5) * 0.05); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
    flagPostsMesh.setMatrixAt(i, dummy.matrix)
  }
  flagPostsMesh.instanceMatrix.needsUpdate = true; group.add(flagPostsMesh)

  const flagsPerSeg = 5; const totalFlags = (numPosts - 1) * flagsPerSeg
  const flagGeo = track(new THREE.PlaneGeometry(0.35, 0.45)); flagGeo.translate(0.175, -0.225, 0)
  const flagsMesh = track(new THREE.InstancedMesh(flagGeo, track(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, flatShading: true })), totalFlags))
  const flagItems: FlagItem[] = []
  let fIdx = 0
  const ropeSegGeo = track(new THREE.CylinderGeometry(0.012, 0.012, postStep, 4)); ropeSegGeo.rotateZ(Math.PI / 2)
  for (let seg = 0; seg < numPosts - 1; seg++) {
    const xStart = -6 + seg * postStep
    addMesh(group, ropeSegGeo, ropeMat, [xStart + postStep / 2, 1.65, -6.5], undefined, false, false)
    for (let f = 0; f < flagsPerSeg; f++) {
      const fx = xStart + 0.6 + (f * (postStep - 1.2)) / (flagsPerSeg - 1)
      const fy = 1.65 - Math.sin(((f + 0.5) / flagsPerSeg) * Math.PI) * 0.12
      flagItems.push({ basePos: [fx, fy, -6.5], xVal: fx })
      flagsMesh.setColorAt(fIdx, new THREE.Color(flagCols[f % flagCols.length]))
      dummy.position.set(fx, fy, -6.5); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
      flagsMesh.setMatrixAt(fIdx++, dummy.matrix)
    }
  }
  flagsMesh.instanceMatrix.needsUpdate = true
  if (flagsMesh.instanceColor) flagsMesh.instanceColor.needsUpdate = true
  group.add(flagsMesh)

  // Mist / snow streaks points cloud
  const speckCount = 180; const speckGeo = track(new THREE.BufferGeometry())
  const speckPositions = new Float32Array(speckCount * 3); const speckBase = new Float32Array(speckCount * 3)
  const xSpan = opts.maxX + 45; const xMin = -25
  for (let i = 0; i < speckCount; i++) {
    speckPositions[i * 3] = speckBase[i * 3] = xMin + rand() * xSpan
    speckPositions[i * 3 + 1] = speckBase[i * 3 + 1] = 0.5 + rand() * 11.5
    speckPositions[i * 3 + 2] = speckBase[i * 3 + 2] = -16 + rand() * 32
  }
  speckGeo.setAttribute('position', new THREE.BufferAttribute(speckPositions, 3))
  const speckMat = track(new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }))
  group.add(new THREE.Points(speckGeo, speckMat))

  // Repeated instanced grass tufts & stones
  const tuftGeo = track(new THREE.ConeGeometry(0.18, 0.42, 4)); tuftGeo.translate(0, 0.21, 0)
  const grassTufts = track(new THREE.InstancedMesh(tuftGeo, track(new THREE.MeshLambertMaterial({ color: 0x6e8048, flatShading: true })), 65))
  let placedTufts = 0
  while (placedTufts < 65) {
    const gx = -22 + rand() * (opts.maxX + 35); const gz = -16 + rand() * 32
    if (!isReserved(gx, gz, 0.8) && (Math.abs(gz) > 2.5 || gx < 0)) {
      dummy.position.set(gx, 0, gz); const s = 0.7 + rand() * 0.6; dummy.scale.set(s, s, s)
      dummy.rotation.set(0, rand() * Math.PI * 2, 0); dummy.updateMatrix(); grassTufts.setMatrixAt(placedTufts++, dummy.matrix)
    }
  }
  grassTufts.instanceMatrix.needsUpdate = true; group.add(grassTufts)

  const stones = track(new THREE.InstancedMesh(track(new THREE.DodecahedronGeometry(0.25, 0)), track(new THREE.MeshLambertMaterial({ color: 0x686c70, flatShading: true })), 30))
  stones.castShadow = true
  let placedStones = 0
  while (placedStones < 30) {
    const sx = -20 + rand() * (opts.maxX + 30); const sz = -18 + rand() * 36
    if (!isReserved(sx, sz, 0.7) && (Math.abs(sz) > 3.0 || sx < 0)) {
      dummy.position.set(sx, 0.1, sz); dummy.scale.set(0.7 + rand() * 0.8, 0.5 + rand() * 0.4, 0.7 + rand() * 0.8)
      dummy.rotation.set(rand() * 2, rand() * 2, rand() * 2); dummy.updateMatrix(); stones.setMatrixAt(placedStones++, dummy.matrix)
    }
  }
  stones.instanceMatrix.needsUpdate = true; group.add(stones)

  // Targets: straw archery butts on wooden stands
  const targetTex = track(createTargetTexture()); const hayMat = track(new THREE.MeshLambertMaterial({ color: 0xd4b055, flatShading: true }))
  const targetItems: TargetItem[] = []; const targetObjects: THREE.Object3D[] = []; group.userData.targets = targetObjects
  const legGeo = track(new THREE.BoxGeometry(0.08, 1.6, 0.08))
  const buttGeo = track(new THREE.CylinderGeometry(0.65, 0.65, 0.3, 16)); buttGeo.rotateZ(Math.PI / 2)
  const discGeo = track(new THREE.CircleGeometry(0.62, 24)); discGeo.rotateY(-Math.PI / 2)
  const strawChunkGeo = track(new THREE.ConeGeometry(0.08, 0.35, 4))

  for (const t of opts.targets) {
    const tGroup = new THREE.Group(); tGroup.position.set(t.x, 0, 0)
    const tPivot = new THREE.Group(); tGroup.add(tPivot)

    addMesh(tPivot, legGeo, woodMat, [-0.05, 0.75, -0.35], [0.15, 0, 0.12])
    addMesh(tPivot, legGeo, woodMat, [-0.05, 0.75, 0.35], [-0.15, 0, 0.12])
    addMesh(tPivot, legGeo, darkWoodMat, [0.45, 0.75, 0], [0, 0, -0.32])
    addMesh(tPivot, track(new THREE.BoxGeometry(0.08, 0.08, 0.8)), woodMat, [0, 0.6, 0])

    addMesh(tPivot, buttGeo, hayMat, [0, 1.15, 0])
    const discMat = track(new THREE.MeshLambertMaterial({ map: targetTex }))
    addMesh(tPivot, discGeo, discMat, [-0.151, 1.15, 0], undefined, false)
    const strawPiece = addMesh(tPivot, strawChunkGeo, hayMat, [0, 1.75, 0.2], [0.2, 0, 0.4])

    const zoneGeo = track(new THREE.RingGeometry(Math.max(0.1, t.r - 0.18), t.r, 64)); zoneGeo.rotateX(-Math.PI / 2)
    const zoneMat = track(new THREE.MeshBasicMaterial({ color: 0xf0a640, transparent: true, opacity: 0.6, depthWrite: false }))
    const zone = new THREE.Mesh(zoneGeo, zoneMat); zone.position.y = 0.04; tGroup.add(zone)

    group.add(tGroup); targetObjects.push(tGroup)
    targetItems.push({ spec: t, group: tGroup, pivot: tPivot, discMat, strawPiece })
  }

  return {
    group, fog, background,
    palette: { accent: '#f0a640', ground: '#7d8a6a', sky: '#dfe6ea' },
    update(t: number): void {
      for (const item of targetItems) {
        item.group.position.x = item.spec.x + (item.spec.moving ? item.spec.moving.speed * t : 0)
      }
      const elev = (Math.PI / 2) * Math.min(1, absWind / 12)
      const ext = 0.75 + 0.45 * Math.min(1, absWind / 12)
      for (const ws of windsocks) {
        const flutter = Math.sin(t * (6 + absWind * 1.5) + ws.phase) * (0.02 + 0.12 * Math.min(1, absWind / 10))
        ws.pivot.rotation.z = -Math.PI / 2 + elev + flutter
        ws.pivot.rotation.x = Math.cos(t * (5 + absWind * 1.2) + ws.phase) * 0.04 * Math.min(1, absWind / 6)
        ws.mesh.scale.set(ext, 1, 1)
      }
      const flagWaveStrength = 0.04 + 0.45 * Math.min(1.2, absWind / 8)
      const flagLeanZ = -windDir * (0.05 + Math.min(1.2, absWind * 0.09))
      for (let i = 0; i < totalFlags; i++) {
        const f = flagItems[i]
        const wave = Math.sin(t * (4 + absWind * 1.5) + f.xVal * 0.8) * flagWaveStrength
        const twist = Math.cos(t * (4.5 + absWind * 1.3) + f.xVal * 1.1) * (0.02 + 0.25 * Math.min(1, absWind / 8))
        dummy.position.set(f.basePos[0], f.basePos[1], f.basePos[2]); dummy.rotation.set(twist, 0, flagLeanZ + wave)
        dummy.scale.set(1, 1, 1); dummy.updateMatrix(); flagsMesh.setMatrixAt(i, dummy.matrix)
      }
      flagsMesh.instanceMatrix.needsUpdate = true
      const posAttr = speckGeo.attributes.position as THREE.BufferAttribute
      const sArr = posAttr.array as Float32Array
      const fallSpeed = wind === 0 ? 0.45 : 0.25
      for (let i = 0; i < speckCount; i++) {
        const idx = i * 3
        const driftX = (speckBase[idx] - xMin + wind * t) % xSpan
        sArr[idx] = xMin + (driftX < 0 ? driftX + xSpan : driftX)
        const driftY = (speckBase[idx + 1] - 0.5 - fallSpeed * t) % 11.5
        sArr[idx + 1] = 0.5 + (driftY < 0 ? driftY + 11.5 : driftY)
        sArr[idx + 2] = speckBase[idx + 2] + Math.sin(t * 1.5 + i) * 0.15
      }
      posAttr.needsUpdate = true
    },
    setHit(index: number | null): void {
      targetItems.forEach((item, idx) => {
        if (index === idx) {
          item.pivot.rotation.set(0.1, 0, -0.42); item.pivot.position.set(0.12, -0.08, 0); item.strawPiece.position.set(0.2, 0.4, 0.35)
          item.discMat.color.setHex(0xffea55); item.discMat.emissive.setHex(0xff3300)
        } else {
          item.pivot.rotation.set(0, 0, 0); item.pivot.position.set(0, 0, 0); item.strawPiece.position.set(0, 1.75, 0.2)
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
