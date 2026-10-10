import * as THREE from 'three'
import { addGroundDetail } from '../../textures/groundDetail'
import type { Target } from '../../../levels/types'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from '../types'
import { industrialMaterial, signTexture } from '../../textures/industrial'
import { createSky } from '../../sky'

interface TargetItem {
  spec: Target
  group: THREE.Group
  setHit(hit: boolean): void
}

let seed = 1998
function rand(): number {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function isReserved(x: number, z: number, maxX: number, m = 0.6): boolean {
  if (x >= -7.0 - m && x <= 6.0 + m && Math.abs(z) <= 4.0 + m) return true
  if (x >= -14.0 - m && x <= -5.0 + m && Math.abs(z) <= 4.0 + m) return true
  if (x >= 0 && x <= maxX + 20 && Math.abs(z) <= 3.5 + m) return true
  if (Math.hypot(x + 14, z + 14) < 3.8 || Math.hypot(x + 30, z + 26) < 7.5) return true
  return false
}

function makeCrashTargetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const rings = [
      [126, '#1b1b1b'], [100, '#f2c400'], [75, '#1b1b1b'],
      [50, '#f2c400'], [25, '#1b1b1b'], [10, '#f2c400'],
    ] as const
    for (const [r, c] of rings) {
      ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill()
    }
    ctx.fillStyle = '#1b1b1b'
    ctx.fillRect(125, 0, 6, 256); ctx.fillRect(0, 125, 256, 6)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.LinearFilter
  return tex
}

export const createDesertRange: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  seed = 1998
  const group = new THREE.Group()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item)
    return item
  }

  const addMesh = (
    p: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material,
    pos?: [number, number, number], rot?: [number, number, number], c = true, r = true,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m)
    if (pos) mesh.position.set(...pos)
    if (rot) mesh.rotation.set(...rot)
    mesh.castShadow = c; mesh.receiveShadow = r; p.add(mesh)
    return mesh
  }

  const SUN_DIR = new THREE.Vector3(-0.35, 0.82, 0.45).normalize()
  const sky = createSky({
    zenith: '#3a78c2', mid: '#9fc0d8', horizon: '#f1dcb4', ground: '#d8b98c',
    sunDir: SUN_DIR, sunColor: '#fff1d0', halo: 0.8,
    clouds: { cover: 0.16, color: '#fffaf0' },
  })
  group.add(sky)
  if (Array.isArray(sky.material)) sky.material.forEach(track); else track(sky.material)
  track(sky.geometry)

  const hemi = new THREE.HemisphereLight(0xbfd6ea, 0x8a6a48, 0.55)
  const sun = new THREE.DirectionalLight(0xfff3dc, 3.2)
  sun.position.copy(SUN_DIR).multiplyScalar(80)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = 0.03; sun.shadow.bias = -0.0002
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 160
  sun.shadow.camera.left = -25; sun.shadow.camera.right = 40
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20
  sun.target.position.set(5, 0, 0)
  group.add(hemi, sun, sun.target)

  const fog = new THREE.Fog('#e8d2ad', 120, opts.maxX + 300)
  const background = new THREE.Color('#f1dcb4')

  // Ground plane with vertex-color variation
  const groundMinX = -100, groundMaxX = opts.maxX + 80, groundW = groundMaxX - groundMinX
  const groundGeo = track(new THREE.PlaneGeometry(groundW, 240, 160, 90))
  groundGeo.rotateX(-Math.PI / 2); groundGeo.translate((groundMinX + groundMaxX) / 2, 0, 0)
  const posAttr = groundGeo.attributes.position, gColors = new Float32Array(posAttr.count * 3)
  const [cBase, cLight, cRed, cGravel] = [new THREE.Color('#c9a473'), new THREE.Color('#dcc196'), new THREE.Color('#b9825a'), new THREE.Color('#9e8e7a')]
  for (let i = 0; i < posAttr.count; i++) {
    const gx = posAttr.getX(i), gz = posAttr.getZ(i)
    const n = Math.sin(gx * 0.05 + gz * 0.07) * 0.5 + Math.cos(gx * 0.11 - gz * 0.04) * 0.5
    const col = cBase.clone()
    if (n > 0.15) col.lerp(cLight, Math.min(1, (n - 0.15) * 1.5))
    else if (n < -0.15) col.lerp(cRed, Math.min(1, (-n - 0.15) * 1.5))
    if (Math.abs(gz) < 3.0 && gx >= -7 && gx <= opts.maxX + 30) col.lerp(cGravel, (1 - Math.abs(gz) / 3.0) * 0.85)
    gColors[i * 3] = col.r; gColors[i * 3 + 1] = col.g; gColors[i * 3 + 2] = col.b
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3))
  const groundMat = track(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))
  track(addGroundDetail(groundMat, 'sand', groundW, 240))
  const groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.receiveShadow = true; group.add(groundMesh)

  // Distance lines & sign plates every 50 m
  const lineMat = track(new THREE.MeshLambertMaterial({ color: 0xedebe4, flatShading: true }))
  const c10Geo = track(new THREE.BoxGeometry(0.12, 0.005, 4.4)), c50Geo = track(new THREE.BoxGeometry(0.24, 0.006, 5.6))
  const signPostGeo = track(new THREE.BoxGeometry(0.06, 0.7, 0.06)), signBackGeo = track(new THREE.BoxGeometry(0.82, 0.46, 0.04)), signFaceGeo = track(new THREE.PlaneGeometry(0.8, 0.44))
  for (let x = 10; x <= opts.maxX; x += 10) {
    const is50 = x % 50 === 0
    addMesh(group, is50 ? c50Geo : c10Geo, lineMat, [x, 0.012, 0], undefined, false, false)
    if (is50) {
      addMesh(group, signPostGeo, industrialMaterial('steelPanel'), [x, 0.35, -3.4])
      addMesh(group, signBackGeo, industrialMaterial('steelPanel'), [x, 0.7, -3.4])
      const sMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture(`${x} м`, '#f2c400', '#1b1b1b', 128, 64)), side: THREE.DoubleSide }))
      addMesh(group, signFaceGeo, sMat, [x, 0.7, -3.37], undefined, false, false)
    }
  }

  // Low-poly mesas on horizon with stratified vertex colors
  const mesaGeo = track(new THREE.CylinderGeometry(0.75, 1.0, 1.0, 8, 5)), mPos = mesaGeo.attributes.position, mColors = new Float32Array(mPos.count * 3)
  const strata = ['#6e3b22', '#8c5234', '#a8643f', '#784226', '#b8744c', '#8c5234'].map((c) => new THREE.Color(c))
  for (let i = 0; i < mPos.count; i++) {
    const ny = Math.min(1, Math.max(0, mPos.getY(i) + 0.5)), idx = Math.min(strata.length - 2, Math.floor(ny * (strata.length - 1)))
    const c = strata[idx].clone().lerp(strata[idx + 1], (ny * (strata.length - 1)) - idx)
    mColors[i * 3] = c.r; mColors[i * 3 + 1] = c.g; mColors[i * 3 + 2] = c.b
  }
  mesaGeo.setAttribute('color', new THREE.BufferAttribute(mColors, 3))
  const mesaMat = track(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))
  const mesaSpecs: [number, number, number, number, number][] = [
    [-45, -100, 36, 28, 0.3], [15, -112, 42, 34, 1.2], [75, -98, 38, 30, 2.1],
    [135, -106, 44, 36, 0.8], [opts.maxX + 45, -55, 34, 28, 1.7],
    [opts.maxX + 65, 5, 40, 32, 2.5], [opts.maxX + 50, 60, 36, 30, 0.5],
    [-65, -45, 30, 25, 1.4], [-70, 35, 32, 26, 2.9],
  ]
  // Push the plateaus out to the real horizon so they frame the sky instead of walling it off.
  const FAR = 2.3
  for (const [mx, mz, rad, h, rot] of mesaSpecs) {
    const m = addMesh(group, mesaGeo, mesaMat, [mx * FAR, h * 0.55, mz * FAR], [0, rot, 0], false, true)
    m.scale.set(rad * 1.6, h * 1.1, rad * 1.6)
  }

  // Instanced rock outcrops & scrub bushes
  const dummy = new THREE.Object3D()
  const rocksMesh = track(new THREE.InstancedMesh(track(new THREE.DodecahedronGeometry(0.5, 0)), track(new THREE.MeshLambertMaterial({ color: 0x8a6e55, flatShading: true })), 25))
  rocksMesh.castShadow = true
  let rIdx = 0
  while (rIdx < 25) {
    const rx = -50 + rand() * (opts.maxX + 80), rz = -75 + rand() * 150
    if (!isReserved(rx, rz, opts.maxX, 1.0)) {
      dummy.position.set(rx, 0.25, rz); dummy.scale.set(0.8 + rand() * 0.8, 0.5 + rand() * 0.5, 0.8 + rand() * 0.8)
      dummy.rotation.set(rand() * 2, rand() * 3, rand() * 2); dummy.updateMatrix(); rocksMesh.setMatrixAt(rIdx++, dummy.matrix)
    }
  }
  rocksMesh.instanceMatrix.needsUpdate = true; group.add(rocksMesh)

  const bushGeo = track(new THREE.DodecahedronGeometry(0.35, 0)); bushGeo.translate(0, 0.3, 0)
  const bushesMesh = track(new THREE.InstancedMesh(bushGeo, track(new THREE.MeshLambertMaterial({ color: 0x767046, flatShading: true })), 60))
  let bIdx = 0
  while (bIdx < 60) {
    const bx = -40 + rand() * (opts.maxX + 70), bz = -55 + rand() * 110
    if (!isReserved(bx, bz, opts.maxX, 1.0)) {
      dummy.position.set(bx, 0, bz); const s = 0.7 + rand() * 0.6; dummy.scale.set(s, s * (0.8 + rand() * 0.4), s)
      dummy.rotation.set(0, rand() * Math.PI * 2, 0); dummy.updateMatrix(); bushesMesh.setMatrixAt(bIdx++, dummy.matrix)
    }
  }
  bushesMesh.instanceMatrix.needsUpdate = true; group.add(bushesMesh)

  // Launch pad under machine & hazard borders
  addMesh(group, track(new THREE.BoxGeometry(13, 0.12, 8)), industrialMaterial('concrete', [4, 2]), [-0.5, -0.03, 0], undefined, false, true)
  const hzXMat = industrialMaterial('hazard', [8, 1]), hzZMat = industrialMaterial('hazard', [5, 1])
  for (const pz of [-4, 4]) addMesh(group, track(new THREE.BoxGeometry(13.2, 0.008, 0.24)), hzXMat, [-0.5, 0.036, pz], undefined, false, false)
  for (const px of [-7, 6]) addMesh(group, track(new THREE.BoxGeometry(0.24, 0.008, 8.24)), hzZMat, [px, 0.036, 0], undefined, false, false)

  // Blast wall of concrete jersey barriers behind crew zone at x ≈ -16
  const barMat = industrialMaterial('concreteDark', [2, 1]), barBaseGeo = track(new THREE.BoxGeometry(0.65, 0.4, 1.8)), barTopGeo = track(new THREE.BoxGeometry(0.35, 0.75, 1.8))
  for (let i = 0; i < 7; i++) {
    const bz = -5.4 + i * 1.8
    addMesh(group, barBaseGeo, barMat, [-16, 0.2, bz]); addMesh(group, barTopGeo, barMat, [-16, 0.775, bz])
  }
  const blastSignMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture('УКРЫТИЕ РАСЧЕТА', '#f2c400', '#1b1b1b', 256, 64)), side: THREE.DoubleSide }))
  addMesh(group, track(new THREE.PlaneGeometry(1.6, 0.4)), blastSignMat, [-15.82, 0.85, 0], [0, Math.PI / 2, 0], false, false)

  // Elevated steel observation tower at (-14, 0, -14)
  const tower = new THREE.Group(); tower.position.set(-14, 0, -14)
  const steelMat = industrialMaterial('steelPanel'), legGeo = track(new THREE.BoxGeometry(0.18, 6.2, 0.18))
  for (const lx of [-1.3, 1.3]) for (const lz of [-1.3, 1.3]) addMesh(tower, legGeo, steelMat, [lx, 3.1, lz])
  addMesh(tower, track(new THREE.BoxGeometry(0.06, 6.2, 0.4)), steelMat, [1.32, 3.1, 0])
  addMesh(tower, track(new THREE.BoxGeometry(3.6, 0.2, 3.6)), steelMat, [0, 6.2, 0])
  addMesh(tower, track(new THREE.BoxGeometry(3.0, 0.9, 3.0)), industrialMaterial('concreteDark'), [0, 6.75, 0])
  const glassMat = track(new THREE.MeshStandardMaterial({ color: 0x90c5e0, transparent: true, opacity: 0.4, roughness: 0.15 }))
  addMesh(tower, track(new THREE.BoxGeometry(2.95, 0.75, 2.95)), glassMat, [0, 7.55, 0], undefined, false, false)
  addMesh(tower, track(new THREE.BoxGeometry(3.4, 0.16, 3.4)), steelMat, [0, 8.0, 0])
  group.add(tower)

  // Half-buried hangar entrance at (-30, 0, -26)
  const hangar = new THREE.Group(); hangar.position.set(-30, 0, -26)
  const moundGeo = track(new THREE.CylinderGeometry(5.2, 7.0, 14, 10, 1, false, 0, Math.PI)); moundGeo.rotateZ(Math.PI / 2)
  addMesh(hangar, moundGeo, track(new THREE.MeshLambertMaterial({ color: 0xb58f62, flatShading: true })), [0, 0, -4], undefined, false, true)
  addMesh(hangar, track(new THREE.BoxGeometry(7.0, 4.4, 0.8)), industrialMaterial('concreteDark'), [0, 2.2, 1.2])
  addMesh(hangar, track(new THREE.BoxGeometry(5.0, 3.6, 0.2)), industrialMaterial('steelPanel', [3, 2]), [0, 1.8, 1.3])
  addMesh(hangar, track(new THREE.BoxGeometry(5.6, 0.25, 0.25)), industrialMaterial('hazard', [6, 1]), [0, 3.75, 1.45])
  const hSignMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture('ЛИФТ В КОМПЛЕКС · СЕКТОР Н', '#e6e2d8', '#1b1b1b', 512, 64)) }))
  addMesh(hangar, track(new THREE.PlaneGeometry(4.8, 0.6)), hSignMat, [0, 4.15, 1.62], undefined, false, false)
  group.add(hangar)

  // Radio mast with blinking red beacon at (-22, 0, -20)
  const mast = new THREE.Group(); mast.position.set(-22, 0, -20)
  addMesh(mast, track(new THREE.CylinderGeometry(0.04, 0.08, 18, 6)), steelMat, [0, 9.0, 0])
  for (const my of [5, 10, 15]) addMesh(mast, track(new THREE.RingGeometry(0.3, 0.6, 6)), steelMat, [0, my, 0], [-Math.PI / 2, 0, 0])
  const beaconMat = track(new THREE.MeshStandardMaterial({ color: 0xff1111, emissive: 0xff0000, emissiveIntensity: 3.5, toneMapped: false }))
  addMesh(mast, track(new THREE.SphereGeometry(0.2, 8, 8)), beaconMat, [0, 18.2, 0], undefined, false, false)
  const beaconLight = new THREE.PointLight(0xff1100, 18, 25, 2); beaconLight.position.set(0, 18.2, 0); mast.add(beaconLight); group.add(mast)

  // Chain-link fence along z = -12 and z = 14 with warning signs
  const fCount = Math.floor((opts.maxX + 46) / 3.5) + 1
  const fencePosts = track(new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6)), steelMat, fCount * 2))
  fencePosts.castShadow = true
  let fIdx = 0
  for (const fz of [-12, 14]) {
    for (let i = 0; i < fCount; i++) {
      dummy.position.set(-24 + i * 3.5, 1.1, fz); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
      fencePosts.setMatrixAt(fIdx++, dummy.matrix)
    }
  }
  fencePosts.instanceMatrix.needsUpdate = true; group.add(fencePosts)
  const fenceLen = opts.maxX + 48, fenceMidX = (-24 + opts.maxX + 24) / 2
  const railGeo = track(new THREE.BoxGeometry(fenceLen, 0.04, 0.04)), grateMat = industrialMaterial('grate', [Math.round(fenceLen / 2), 1]), wireGeo = track(new THREE.PlaneGeometry(fenceLen, 1.9))
  for (const fz of [-12, 14]) {
    addMesh(group, railGeo, steelMat, [fenceMidX, 2.15, fz]); addMesh(group, railGeo, steelMat, [fenceMidX, 0.15, fz])
    addMesh(group, wireGeo, grateMat, [fenceMidX, 1.15, fz], undefined, false, false)
  }
  const warnMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture('ПОЛИГОН. ВХОД ПО ПРОПУСКАМ', '#f2c400', '#1b1b1b', 384, 64)), side: THREE.DoubleSide }))
  const warnGeo = track(new THREE.PlaneGeometry(1.8, 0.35))
  for (const wx of [-10, 20, 60]) {
    if (wx <= opts.maxX + 10) {
      addMesh(group, warnGeo, warnMat, [wx, 1.25, -11.95], undefined, false, false)
      addMesh(group, warnGeo, warnMat, [wx, 1.25, 13.95], [0, Math.PI, 0], false, false)
    }
  }

  // Limp windsock at (8, 0, -6.5)
  const windGroup = new THREE.Group(); windGroup.position.set(8, 0, -6.5)
  addMesh(windGroup, track(new THREE.CylinderGeometry(0.04, 0.05, 4.2, 8)), steelMat, [0, 2.1, 0])
  const sCanvas = document.createElement('canvas'); sCanvas.width = 128; sCanvas.height = 32
  const sctx = sCanvas.getContext('2d')
  if (sctx) {
    ['#ff6a13', '#ffffff', '#ff6a13', '#ffffff', '#ff6a13'].forEach((col, i) => { sctx.fillStyle = col; sctx.fillRect(i * 25.6, 0, 26, 32) })
  }
  const sockTex = track(new THREE.CanvasTexture(sCanvas)); sockTex.colorSpace = THREE.SRGBColorSpace
  addMesh(windGroup, track(new THREE.CylinderGeometry(0.18, 0.08, 1.1, 8)), track(new THREE.MeshLambertMaterial({ map: sockTex, flatShading: true })), [0.15, 3.65, 0], [0, 0, -1.25])
  group.add(windGroup)

  // Parked utility truck at (-8, 0, -15)
  const truck = new THREE.Group(); truck.position.set(-8, 0, -15); truck.rotation.y = 0.3
  addMesh(truck, track(new THREE.BoxGeometry(3.6, 0.25, 1.6)), steelMat, [0, 0.45, 0])
  const tireGeo = track(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12)); tireGeo.rotateX(Math.PI / 2)
  const tireMat = track(new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true }))
  for (const tx of [-1.1, 1.1]) for (const tz of [-0.85, 0.85]) addMesh(truck, tireGeo, tireMat, [tx, 0.38, tz])
  const cabMat = track(new THREE.MeshLambertMaterial({ color: 0xe6e2d8, flatShading: true })), stripeMat = track(new THREE.MeshLambertMaterial({ color: 0xff6a13, flatShading: true }))
  addMesh(truck, track(new THREE.BoxGeometry(1.4, 1.15, 1.55)), cabMat, [0.85, 1.15, 0])
  addMesh(truck, track(new THREE.BoxGeometry(1.41, 0.16, 1.56)), stripeMat, [0.85, 0.95, 0], undefined, false, false)
  addMesh(truck, track(new THREE.BoxGeometry(0.04, 0.45, 1.3)), track(new THREE.MeshLambertMaterial({ color: 0x283842 })), [1.56, 1.3, 0], undefined, false, false)
  addMesh(truck, track(new THREE.BoxGeometry(2.0, 1.15, 1.55)), steelMat, [-0.8, 1.15, 0])
  addMesh(truck, track(new THREE.BoxGeometry(2.01, 0.16, 1.56)), stripeMat, [-0.8, 0.95, 0], undefined, false, false)
  group.add(truck)

  // Ground dust specks (Points)
  const DUST_COUNT = 70, minDustX = -25, spanDustX = opts.maxX + 60
  const dustPos = new Float32Array(DUST_COUNT * 3), dustBaseX = new Float32Array(DUST_COUNT), dustBaseY = new Float32Array(DUST_COUNT), dustBaseZ = new Float32Array(DUST_COUNT)
  for (let i = 0; i < DUST_COUNT; i++) {
    dustBaseX[i] = rand() * spanDustX; dustBaseY[i] = 0.2 + rand() * 1.8; dustBaseZ[i] = -12 + rand() * 24
  }
  const dustGeo = track(new THREE.BufferGeometry()); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  group.add(new THREE.Points(dustGeo, track(new THREE.PointsMaterial({ color: 0xd9c29e, size: 0.14, transparent: true, opacity: 0.55, depthWrite: false }))))

  // Targets
  const crashTex = track(makeCrashTargetTexture())
  const targetItems: TargetItem[] = [], targetObjects: THREE.Object3D[] = []
  group.userData.targets = targetObjects
  const plateGeoCache = new Map<number, THREE.BufferGeometry>()
  const getPlateGeo = (r: number): THREE.BufferGeometry => {
    let g = plateGeoCache.get(r)
    if (!g) { g = track(new THREE.CircleGeometry(r, 28)); g.rotateY(-Math.PI / 2); plateGeoCache.set(r, g) }
    return g
  }

  for (const t of opts.targets) {
    const tGroup = new THREE.Group(); tGroup.position.set(t.x, 0, 0)
    if (t.h !== undefined && t.h > 0) {
      const h = t.h, blockMat = track(new THREE.MeshLambertMaterial({ color: 0x9c9990, flatShading: true }))
      addMesh(tGroup, track(new THREE.BoxGeometry(2.0, h, 12)), blockMat, [1.0, h / 2, 0])
      addMesh(tGroup, track(new THREE.BoxGeometry(2.04, 0.4, 12.04)), industrialMaterial('hazard', [12, 1]), [1.0, h - 0.2, 0])
      const crater = addMesh(tGroup, track(new THREE.CircleGeometry(0.85, 16)), track(new THREE.MeshLambertMaterial({ color: 0x141416 })), [-0.02, h * 0.5, 0], [0, -Math.PI / 2, 0])
      crater.visible = false
      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) { crater.visible = hit; blockMat.emissive.setHex(hit ? 0x552211 : 0x000000) },
      })
    } else if (t.moving) {
      const railMinX = t.x - 5, railLen = 65, railMidX = railMinX + railLen / 2
      const railBarGeo = track(new THREE.BoxGeometry(railLen, 0.1, 0.08)), sleeperGeo = track(new THREE.BoxGeometry(0.18, 0.06, 2.0))
      addMesh(group, railBarGeo, steelMat, [railMidX, 0.06, -0.8]); addMesh(group, railBarGeo, steelMat, [railMidX, 0.06, 0.8])
      for (let sx = railMinX; sx <= railMinX + railLen; sx += 1.6) addMesh(group, sleeperGeo, industrialMaterial('concreteDark'), [sx, 0.03, 0])

      addMesh(tGroup, track(new THREE.BoxGeometry(1.6, 0.35, 1.4)), steelMat, [0, 0.24, 0])
      addMesh(tGroup, track(new THREE.BoxGeometry(1.62, 0.18, 1.42)), industrialMaterial('hazard', [2, 1]), [0, 0.24, 0])
      const wGeo = track(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10)); wGeo.rotateX(Math.PI / 2)
      for (const wx of [-0.55, 0.55]) for (const wz of [-0.8, 0.8]) addMesh(tGroup, wGeo, steelMat, [wx, 0.12, wz])

      const pH = Math.max(1.3, t.r + 0.5)
      addMesh(tGroup, track(new THREE.BoxGeometry(0.1, pH * 0.9, 0.1)), steelMat, [0, pH * 0.45 + 0.2, 0])
      const pivot = new THREE.Group(); pivot.position.set(0, pH + 0.2, 0)
      const plateMat = track(new THREE.MeshLambertMaterial({ map: crashTex }))
      addMesh(pivot, getPlateGeo(t.r), plateMat, [-0.06, 0, 0]) // 3 cm proud of the steel backing: coplanar faces flicker
      addMesh(pivot, track(new THREE.CylinderGeometry(t.r * 0.95, t.r * 0.95, 0.06, 24)), steelMat, [0, 0, 0], [0, 0, Math.PI / 2])
      tGroup.add(pivot)

      const sparkPos = new Float32Array(18 * 3)
      for (let s = 0; s < 18 * 3; s++) sparkPos[s] = (rand() - 0.5) * 0.8
      const sparkGeo = track(new THREE.BufferGeometry()); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
      const sparks = new THREE.Points(sparkGeo, track(new THREE.PointsMaterial({ color: 0xffaa22, size: 0.16, transparent: true, opacity: 0.9 })))
      sparks.position.set(0, pH + 0.2, 0); sparks.visible = false; tGroup.add(sparks)

      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) {
          pivot.rotation.set(hit ? 0 : 0, hit ? 0.35 : 0, hit ? -0.7 : 0)
          plateMat.emissive.setHex(hit ? 0xff3300 : 0x000000)
          sparks.visible = hit
        },
      })
    } else {
      const pH = Math.max(1.2, t.r + 0.4), r = t.r, legGeo = track(new THREE.CylinderGeometry(0.035, 0.035, pH * 1.08, 6))
      for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
        const leg = addMesh(tGroup, legGeo, steelMat, [Math.cos(a) * r * 0.35, pH * 0.5, Math.sin(a) * r * 0.35])
        leg.rotation.set(-Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3)
      }
      const ringGeo = track(new THREE.RingGeometry(Math.max(0.05, r - 0.18), r, 48)); ringGeo.rotateX(-Math.PI / 2)
      const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xff6a13, transparent: true, opacity: 0.65, depthWrite: false }))
      const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = 0.02; tGroup.add(ring)

      const pivot = new THREE.Group(); pivot.position.set(0, pH, 0)
      const plateMat = track(new THREE.MeshLambertMaterial({ map: crashTex }))
      addMesh(pivot, getPlateGeo(r), plateMat, [-0.06, 0, 0]) // 3 cm proud of the steel backing: coplanar faces flicker
      addMesh(pivot, track(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.06, 24)), steelMat, [0, 0, 0], [0, 0, Math.PI / 2])
      tGroup.add(pivot)

      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) {
          pivot.rotation.set(hit ? 0 : 0, hit ? 0.25 : 0, hit ? -0.55 : 0)
          plateMat.emissive.setHex(hit ? 0xff3300 : 0x000000)
          ringMat.color.setHex(hit ? 0xffea55 : 0xff6a13)
        },
      })
    }
    group.add(tGroup); targetObjects.push(tGroup)
  }

  return {
    group, fog, background,
    skirt: '#c9a473',
    palette: { accent: '#ff6a13', ground: '#c9a473', sky: '#f1dcb4' },
    update(t: number): void {
      const blink = Math.sin(t * 6) > 0.1
      beaconMat.emissiveIntensity = blink ? 3.5 : 0.2
      beaconLight.intensity = blink ? 18 : 0

      const pArr = (dustGeo.attributes.position as THREE.BufferAttribute).array as Float32Array
      for (let i = 0; i < DUST_COUNT; i++) {
        pArr[i * 3] = minDustX + ((dustBaseX[i] + t * 0.8) % spanDustX)
        pArr[i * 3 + 1] = dustBaseY[i] + Math.sin(t * 1.2 + i * 0.5) * 0.08
        pArr[i * 3 + 2] = dustBaseZ[i]
      }
      dustGeo.attributes.position.needsUpdate = true
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
