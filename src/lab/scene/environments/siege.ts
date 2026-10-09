import * as THREE from 'three'
import { addGroundDetail } from '../textures/groundDetail'
import type { Target } from '../../levels/types'
import { createSky } from '../sky'
import { woodMaterial } from '../wood'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from './types'

interface TargetItem {
  spec: Target
  group: THREE.Group
  setHit: (hit: boolean) => void
}

interface Crow {
  pivot: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh
  radius: number; speed: number; y: number; phase: number
}

let seed = 42
function rand(): number {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function isReserved(x: number, z: number, m = 0.5): boolean {
  if (x >= -6.5 - m && x <= 5.5 + m && Math.abs(z) <= 3.8 + m) return true
  if (x >= -13 - m && x <= -5.5 && Math.abs(z) <= 3.5 + m) return true
  return x >= 0 && Math.abs(z) <= 2.2 + m
}

export const createSiege: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  seed = 42
  const group = new THREE.Group()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(item: T): T => (disposables.push(item), item)

  const addMesh = (p: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], rot?: [number, number, number], cast = true, receive = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(...pos)
    if (rot) mesh.rotation.set(...rot)
    mesh.castShadow = cast; mesh.receiveShadow = receive
    p.add(mesh)
    return mesh
  }

  // Sun, Fog, Sky and Lighting
  const SUN_DIR = new THREE.Vector3(-0.75, 0.24, 0.45).normalize()
  const fog = new THREE.Fog('#d9a07c', 70, opts.maxX + 180)
  const background = new THREE.Color('#d9a07c')
  const sky = createSky({
    zenith: '#2f4f86', mid: '#c9849a', horizon: '#ffb26b', ground: '#c98d6a',
    sunDir: SUN_DIR, sunColor: '#ffb066', halo: 1.4,
    clouds: { cover: 0.3, color: '#ffc39a' },
  })
  track(sky.geometry); track(sky.material as THREE.Material); group.add(sky)
  group.add(new THREE.HemisphereLight(0x9fb0dc, 0x6e5038, 0.9))

  const sun = new THREE.DirectionalLight(0xffb57a, 2.6)
  sun.position.copy(SUN_DIR).multiplyScalar(80)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.bias = -0.0002
  sun.shadow.normalBias = 0.03
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 160
  sun.shadow.camera.left = -35; sun.shadow.camera.right = 35
  sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25
  sun.target.position.set(7.5, 0, 0)
  group.add(sun.target); group.add(sun)

  const fill = new THREE.DirectionalLight(0xffc9a0, 0.7)
  fill.position.set(10, 10, 40)
  group.add(fill)

  // Castle X position
  const targetsWithH = opts.targets.filter((t) => t.h !== undefined && t.h > 0)
  const castleX = targetsWithH.length > 0 ? Math.max(...targetsWithH.map((t) => t.x)) : 100

  // Ground plane with vertex colours
  const groundW = opts.maxX + 180 // x from -100: broken beams throw the stone ~70 m backwards
  const groundGeo = track(new THREE.PlaneGeometry(groundW, 240, 160, 90))
  groundGeo.rotateX(-Math.PI / 2); groundGeo.translate((opts.maxX - 20) / 2, 0, 0)
  const gColors = new Float32Array(groundGeo.attributes.position.count * 3)
  const [cMud, cGrass, cDry, cMoatMud] = [new THREE.Color('#58442e'), new THREE.Color('#7b7a48'), new THREE.Color('#8c7a4e'), new THREE.Color('#383127')]
  for (let i = 0; i < groundGeo.attributes.position.count; i++) {
    const gx = groundGeo.attributes.position.getX(i), gz = groundGeo.attributes.position.getZ(i)
    const n = Math.sin(gx * 0.12) * Math.cos(gz * 0.14) * 0.1
    const campT = Math.max(0, Math.min(1, (gx - 5) / 12 + n))
    const col = cMud.clone().lerp(cGrass, campT)
    if (n > 0.03) col.lerp(cDry, n * 2.5)
    const dMoatX = Math.max(0, Math.max(castleX - 9 - gx, gx - (castleX - 3)))
    if (dMoatX < 6 && Math.abs(gz) < 42) col.lerp(cMoatMud, Math.max(0, 1 - dMoatX / 6) * 0.8)
    gColors[i * 3] = col.r; gColors[i * 3 + 1] = col.g; gColors[i * 3 + 2] = col.b
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3))
  const groundMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }))
  track(addGroundDetail(groundMat, 'grass', groundW, 240))
  const groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.receiveShadow = true; group.add(groundMesh)

  // Materials
  const woodMat = woodMaterial('weathered')
  const darkWoodMat = woodMaterial('dark')
  const stoneMat = track(new THREE.MeshStandardMaterial({ color: 0x9c968a, roughness: 0.95, flatShading: true }))
  const crenelMat = track(new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 0.95, flatShading: true }))
  const slateMat = track(new THREE.MeshStandardMaterial({ color: 0x3c4458, roughness: 0.9, flatShading: true }))
  const amberMat = track(new THREE.MeshLambertMaterial({ color: 0xff8a3d, side: THREE.DoubleSide, flatShading: true }))
  const banners: THREE.Mesh[] = []

  const addBanner = (pos: [number, number, number], scale = 1): THREE.Mesh => {
    addMesh(group, track(new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, 2.8 * scale, 6)), darkWoodMat, pos)
    const flagGeo = track(new THREE.PlaneGeometry(1.0 * scale, 0.6 * scale, 3, 1))
    flagGeo.translate(0.5 * scale, 0, 0)
    const flag = addMesh(group, flagGeo, amberMat, [pos[0], pos[1] + 0.9 * scale, pos[2]], undefined, true, false)
    banners.push(flag)
    return flag
  }

  // Our camp: tents
  const tentMat1 = track(new THREE.MeshLambertMaterial({ color: 0xd8c9a6, flatShading: true }))
  const tentMat2 = track(new THREE.MeshLambertMaterial({ color: 0x8f3b2b, flatShading: true }))
  const tentGeoBase = track(new THREE.CylinderGeometry(1.8, 2.0, 1.1, 6))
  const tentGeoRoof = track(new THREE.ConeGeometry(2.1, 1.8, 6))
  addMesh(group, tentGeoBase, tentMat1, [-10, 0.55, -10.5])
  addMesh(group, tentGeoRoof, tentMat1, [-10, 2.0, -10.5])
  addMesh(group, tentGeoBase, tentMat2, [-13.5, 0.55, -11.5])
  addMesh(group, tentGeoRoof, tentMat2, [-13.5, 2.0, -11.5])

  // Camp stone pile (InstancedMesh)
  const dummy = new THREE.Object3D()
  const stoneGeo = track(new THREE.DodecahedronGeometry(0.24, 0))
  const stoneMatShared = track(new THREE.MeshLambertMaterial({ color: 0x6e6c66, flatShading: true }))
  const stonePile = track(new THREE.InstancedMesh(stoneGeo, stoneMatShared, 18))
  stonePile.castShadow = true
  let sIdx = 0
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2
    dummy.position.set(3 + Math.cos(a) * 0.6, 0.16, -6 + Math.sin(a) * 0.6)
    const s = 0.85 + rand() * 0.3; dummy.scale.set(s, s * 0.8, s); dummy.rotation.set(rand() * 2, rand() * 2, rand() * 2); dummy.updateMatrix()
    stonePile.setMatrixAt(sIdx++, dummy.matrix)
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3
    dummy.position.set(3 + Math.cos(a) * 0.32, 0.36, -6 + Math.sin(a) * 0.32)
    const s = 0.8 + rand() * 0.25; dummy.scale.set(s, s * 0.8, s); dummy.rotation.set(rand() * 2, rand() * 2, rand() * 2); dummy.updateMatrix()
    stonePile.setMatrixAt(sIdx++, dummy.matrix)
  }
  for (const [px, pz] of [[3.05, -6.05], [2.95, -5.95]] as const) {
    dummy.position.set(px, 0.54, pz); dummy.scale.set(0.85, 0.7, 0.85); dummy.rotation.set(rand() * 2, rand() * 2, rand() * 2); dummy.updateMatrix()
    stonePile.setMatrixAt(sIdx++, dummy.matrix)
  }
  stonePile.instanceMatrix.needsUpdate = true; group.add(stonePile)

  // Palisade stakes behind camp (x ≈ -22)
  const palisade = track(new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.04, 0.12, 2.6, 5)), woodMat, 25))
  palisade.castShadow = true
  for (let i = 0; i < 25; i++) {
    dummy.position.set(-22 + (rand() - 0.5) * 0.4, 1.3, -16 + i * 1.0 + (rand() - 0.5) * 0.2)
    dummy.rotation.set((rand() - 0.5) * 0.12, rand() * Math.PI, (rand() - 0.5) * 0.12)
    dummy.scale.set(1, 0.85 + rand() * 0.3, 1); dummy.updateMatrix()
    palisade.setMatrixAt(i, dummy.matrix)
  }
  palisade.instanceMatrix.needsUpdate = true; group.add(palisade)

  // Camp banner pole at (-4, 0, -6)
  addBanner([-4, 2.2, -6], 1.4)

  // Torch posts at (-3, 0, 5) and (6, 0, -5)
  const flameGeo = track(new THREE.ConeGeometry(0.12, 0.35, 6))
  flameGeo.translate(0, 0.175, 0)
  const flameMat = track(new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff6600, emissiveIntensity: 2.8, toneMapped: false }))
  const torchLights: THREE.PointLight[] = []
  for (const [tx, tz] of [[-3, 5], [6, -5]] as const) {
    addMesh(group, track(new THREE.BoxGeometry(0.1, 1.8, 0.1)), darkWoodMat, [tx, 0.9, tz])
    addMesh(group, flameGeo, flameMat, [tx, 1.8, tz], undefined, false, false)
    const light = new THREE.PointLight(0xff8a3d, 6, 9, 2)
    light.position.set(tx, 2.0, tz)
    group.add(light); torchLights.push(light)
  }

  // Castle Moat
  const moatGeo = track(new THREE.PlaneGeometry(6, 80)); moatGeo.rotateX(-Math.PI / 2)
  const moatMat = track(new THREE.MeshStandardMaterial({ color: 0x2f4b4a, metalness: 0.2, roughness: 0.25 }))
  addMesh(group, moatGeo, moatMat, [castleX - 6, -0.3, 0], undefined, false, true)
  const bankGeo = track(new THREE.BoxGeometry(0.8, 0.3, 80))
  const bankMat = track(new THREE.MeshLambertMaterial({ color: 0x3d352a, flatShading: true }))
  addMesh(group, bankGeo, bankMat, [castleX - 9, -0.15, 0])
  addMesh(group, bankGeo, bankMat, [castleX - 3, -0.15, 0])

  // Keep tower & Corner towers
  addMesh(group, track(new THREE.CylinderGeometry(4.0, 4.4, 18, 12)), stoneMat, [castleX + 13, 9, 0])
  addMesh(group, track(new THREE.ConeGeometry(4.6, 5.5, 12)), slateMat, [castleX + 13, 20.75, 0])
  addBanner([castleX + 13, 23.5, 0], 1.2)
  for (const tz of [-22, 22] as const) {
    addMesh(group, track(new THREE.CylinderGeometry(2.8, 3.2, 14, 10)), stoneMat, [castleX + 5, 7, tz])
    addMesh(group, track(new THREE.ConeGeometry(3.3, 4.2, 10)), slateMat, [castleX + 5, 16.1, tz])
    addBanner([castleX + 5, 18.2, tz], 1.0)
  }

  // Flanking curtain walls (Instanced blocks ~1.0 x 0.6 x 0.6 m)
  const hasGate = opts.targets.some((t) => t.h && t.label?.includes('Ворота'))
  const wingZStart = hasGate ? 3 : 6
  const wallBlockGeo = track(new THREE.BoxGeometry(0.58, 0.58, 0.98))
  const maxInstances = 850
  const wallMesh = track(new THREE.InstancedMesh(wallBlockGeo, stoneMat, maxInstances))
  wallMesh.castShadow = true; wallMesh.receiveShadow = true
  let blockIdx = 0
  const cNorm = new THREE.Color('#9c968a')
  const cCren = new THREE.Color('#6f6a60')
  for (const side of [-1, 1] as const) {
    for (let layer = 0; layer < 10; layer++) {
      const y = 0.3 + layer * 0.6
      for (let zPos = wingZStart; zPos < 22; zPos += 1.0) {
        const z = side * (zPos + (layer % 2 === 1 ? 0.5 : 0))
        for (const xOff of [0.3, 0.9]) {
          if (blockIdx >= maxInstances) break
          dummy.position.set(castleX + xOff, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
          wallMesh.setMatrixAt(blockIdx, dummy.matrix)
          const tint = cNorm.clone().offsetHSL(0, 0, (rand() - 0.5) * 0.08)
          wallMesh.setColorAt(blockIdx, tint)
          blockIdx++
        }
      }
    }
    // Crenellations along the front top edge
    for (let zPos = wingZStart; zPos < 22; zPos += 2.0) {
      if (blockIdx >= maxInstances) break
      dummy.position.set(castleX + 0.3, 6.3, side * zPos); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
      wallMesh.setMatrixAt(blockIdx, dummy.matrix)
      wallMesh.setColorAt(blockIdx, cCren)
      blockIdx++
    }
  }
  wallMesh.count = blockIdx
  wallMesh.instanceMatrix.needsUpdate = true
  if (wallMesh.instanceColor) wallMesh.instanceColor.needsUpdate = true
  group.add(wallMesh)

  if (targetsWithH.length === 0) {
    addMesh(group, track(new THREE.BoxGeometry(2.5, 7, 12)), stoneMat, [castleX + 1.25, 3.5, 0])
  }

  // Targets
  const targetItems: TargetItem[] = []
  const targetObjects: THREE.Object3D[] = []
  group.userData.targets = targetObjects

  for (let idx = 0; idx < opts.targets.length; idx++) {
    const t = opts.targets[idx]
    const tGroup = new THREE.Group()
    tGroup.position.set(t.x, 0, 0)

    if (t.h !== undefined && t.h > 0) {
      const isGateTarget = t.label?.includes('Ворота') ?? false
      const isTowerTarget = t.label?.includes('Башня') ?? false

      const craterGeo = track(new THREE.CircleGeometry(0.75, 12))
      craterGeo.rotateY(-Math.PI / 2)
      const crater = new THREE.Mesh(craterGeo, track(new THREE.MeshLambertMaterial({ color: 0x1f1d1a })))
      crater.position.set(-0.02, t.h * 0.5, 0); crater.visible = false; tGroup.add(crater)

      const looseGroup = new THREE.Group()
      const lGeo = track(new THREE.BoxGeometry(0.7, 0.35, 0.45))
      const b1 = new THREE.Mesh(lGeo, stoneMat); b1.position.set(-0.8, 0.18, 0.4); b1.rotation.set(0.2, 0.4, 0.3)
      const b2 = new THREE.Mesh(lGeo, stoneMat); b2.position.set(-1.1, 0.18, -0.5); b2.rotation.set(-0.3, 0.6, -0.2)
      const b3 = new THREE.Mesh(lGeo, stoneMat); b3.position.set(-0.5, 0.18, -0.2); b3.rotation.set(0, 0.8, 0.5)
      looseGroup.add(b1, b2, b3); looseGroup.visible = false; tGroup.add(looseGroup)

      let doorPivot: THREE.Group | null = null

      if (isGateTarget) {
        addMesh(tGroup, track(new THREE.BoxGeometry(2.5, t.h, 1.6)), stoneMat, [1.25, t.h / 2, -2.2])
        addMesh(tGroup, track(new THREE.BoxGeometry(2.5, t.h, 1.6)), stoneMat, [1.25, t.h / 2, 2.2])
        addMesh(tGroup, track(new THREE.BoxGeometry(2.5, t.h * 0.28, 2.8)), stoneMat, [1.25, t.h * 0.86, 0])
        doorPivot = new THREE.Group(); doorPivot.position.set(1.2, 0, 0)
        const door = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, t.h * 0.72, 2.76)), darkWoodMat)
        door.position.set(0, t.h * 0.36, 0); door.castShadow = true; doorPivot.add(door); tGroup.add(doorPivot)
      } else if (isTowerTarget) {
        addMesh(tGroup, track(new THREE.CylinderGeometry(3, 3, t.h, 16)), stoneMat, [3, t.h / 2, 0])
        addMesh(tGroup, track(new THREE.ConeGeometry(3.3, 3, 16)), slateMat, [3, t.h + 1.5, 0])
      } else {
        addMesh(tGroup, track(new THREE.BoxGeometry(2.5, t.h, 12)), stoneMat, [1.25, t.h / 2, 0])
        const merlonGeo = track(new THREE.BoxGeometry(0.8, 0.7, 1.2))
        for (let mz = -5.4; mz <= 5.4; mz += 1.8) addMesh(tGroup, merlonGeo, crenelMat, [0.4, t.h + 0.35, mz])
      }

      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) {
          crater.visible = hit; looseGroup.visible = hit
          if (doorPivot) {
            doorPivot.rotation.z = hit ? -0.35 : 0
            doorPivot.position.x = hit ? 1.5 : 1.2
          }
        },
      })
    } else {
      const ringGeo = track(new THREE.RingGeometry(Math.max(0.1, t.r - 0.25), t.r, 48))
      ringGeo.rotateX(-Math.PI / 2)
      const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.75, depthWrite: false }))
      const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = 0.04; tGroup.add(ring)
      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) { ringMat.color.setHex(hit ? 0xffea55 : 0xff8a3d) },
      })
    }

    group.add(tGroup); targetObjects.push(tGroup)
  }

  // Flying crows circling above castle
  const crowMat = track(new THREE.MeshBasicMaterial({ color: 0x1f1f24, side: THREE.DoubleSide }))
  const wingGeo = track(new THREE.PlaneGeometry(0.32, 0.16))
  wingGeo.translate(0.16, 0, 0)
  const crows: Crow[] = []
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group()
    const wingL = new THREE.Mesh(wingGeo, crowMat); wingL.rotation.y = Math.PI
    const wingR = new THREE.Mesh(wingGeo, crowMat)
    pivot.add(wingL, wingR); group.add(pivot)
    crows.push({ pivot, wingL, wingR, radius: 12 + i * 3.5, speed: 0.6 + i * 0.08, y: 16 + i * 1.5, phase: i * 1.25 })
  }

  // Grass tufts & Field stones
  const tuftGeo = track(new THREE.ConeGeometry(0.16, 0.38, 4)); tuftGeo.translate(0, 0.19, 0)
  const grassMat = track(new THREE.MeshLambertMaterial({ color: 0x6e7838, flatShading: true }))
  const tufts = track(new THREE.InstancedMesh(tuftGeo, grassMat, 75))
  let placedTufts = 0
  while (placedTufts < 75) {
    const gx = -20 + rand() * (opts.maxX + 30), gz = -24 + rand() * 48
    if (!isReserved(gx, gz, 0.8)) {
      dummy.position.set(gx, 0, gz); const s = 0.7 + rand() * 0.5
      dummy.scale.set(s, s, s); dummy.rotation.set(0, rand() * Math.PI * 2, 0); dummy.updateMatrix()
      tufts.setMatrixAt(placedTufts++, dummy.matrix)
    }
  }
  tufts.instanceMatrix.needsUpdate = true; group.add(tufts)

  const fieldStones = track(new THREE.InstancedMesh(stoneGeo, stoneMatShared, 25))
  fieldStones.castShadow = true
  let placedStones = 0
  while (placedStones < 25) {
    const sx = -18 + rand() * (opts.maxX + 20), sz = -22 + rand() * 44
    if (!isReserved(sx, sz, 0.8)) {
      dummy.position.set(sx, 0.1, sz); const s = 0.7 + rand() * 0.6
      dummy.scale.set(s, s * 0.5, s); dummy.rotation.set(rand() * 2, rand() * 2, rand() * 2); dummy.updateMatrix()
      fieldStones.setMatrixAt(placedStones++, dummy.matrix)
    }
  }
  fieldStones.instanceMatrix.needsUpdate = true; group.add(fieldStones)

  return {
    group, fog, background,
    skirt: '#6b6a40',
    palette: { accent: '#ff8a3d', ground: '#7b7a48', sky: '#d9a07c' },
    update(t: number): void {
      for (const item of targetItems) {
        if (item.spec.moving) item.group.position.x = item.spec.x + item.spec.moving.speed * t
      }
      for (let i = 0; i < banners.length; i++) {
        banners[i].rotation.y = Math.sin(t * 4.5 + i * 1.2) * 0.25
        banners[i].rotation.z = Math.cos(t * 3.8 + i * 0.9) * 0.08
      }
      for (let i = 0; i < torchLights.length; i++) {
        torchLights[i].intensity = 6 + Math.sin(t * (12 + i * 4)) * 1.4 + Math.sin(t * (25 + i * 6)) * 0.7
      }
      for (let i = 0; i < crows.length; i++) {
        const c = crows[i]
        const angle = t * c.speed + c.phase
        c.pivot.position.set(castleX + Math.cos(angle) * c.radius, c.y + Math.sin(t * 1.2 + i) * 1.2, Math.sin(angle) * (c.radius * 0.8))
        c.pivot.rotation.y = -angle - Math.PI / 2
        const flap = Math.sin(t * 11 + i * 2) * 0.45
        c.wingL.rotation.z = flap; c.wingR.rotation.z = -flap
      }
    },
    setHit(index: number | null): void {
      for (let i = 0; i < targetItems.length; i++) targetItems[i].setHit(index === i)
    },
    dispose(): void {
      for (const d of disposables) d.dispose()
      group.clear()
    },
  }
}
