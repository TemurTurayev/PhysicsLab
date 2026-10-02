import * as THREE from 'three'
import type { Target } from '../../../levels/types'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from '../types'
import { industrialMaterial, signTexture } from '../../textures/industrial'

interface TargetItem { spec: Target; group: THREE.Group; setHit(hit: boolean): void }
interface Beacon { cone: THREE.Mesh; light: THREE.PointLight }
interface RibbonItem { mesh: THREE.Mesh; seed: number }

function makeCrashTargetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const rings = [[126, '#1b1b1b'], [100, '#f2c400'], [75, '#1b1b1b'], [50, '#f2c400'], [25, '#1b1b1b'], [10, '#f2c400']] as const
    for (const [r, c] of rings) {
      ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill()
    }
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(125, 0, 6, 256); ctx.fillRect(0, 125, 256, 6)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter
  return tex
}

function makeCRTScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#0a200f'; ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#14381b'
    for (let y = 0; y < 128; y += 4) ctx.fillRect(0, y, 128, 2)
    ctx.strokeStyle = '#7dff8a'; ctx.lineWidth = 2; ctx.beginPath()
    for (let x = 0; x < 128; x++) {
      const y = 64 + Math.sin(x * 0.18) * 22 + Math.sin(x * 0.06) * 12
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke(); ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 11px monospace'
    ctx.fillText('ТЕЛЕМЕТРИЯ ПОТОКА', 6, 20); ctx.fillText('СИГМА-7 ДАТЧИК-4', 6, 118)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter
  return tex
}

function makeWindDisplayTexture(wind: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#101416'; ctx.fillRect(0, 0, 512, 256)
    ctx.strokeStyle = '#2b3338'; ctx.lineWidth = 6; ctx.strokeRect(4, 4, 504, 248)
    ctx.fillStyle = '#f2c400'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('СКОРОСТЬ ПОТОКА', 256, 46)
    ctx.fillStyle = '#081a10'; ctx.fillRect(40, 68, 432, 120)
    ctx.strokeStyle = '#1b4a28'; ctx.lineWidth = 3; ctx.strokeRect(40, 68, 432, 120)
    const sign = wind < 0 ? '\u2212' : (wind > 0 ? '+' : '')
    ctx.fillStyle = '#55ff77'; ctx.font = 'bold 64px monospace'; ctx.fillText(`${sign}${Math.abs(wind)} м/с`, 256, 150)
    ctx.fillStyle = '#8a9992'; ctx.font = '16px monospace'
    const status = wind < 0 ? 'НАПРАВЛЕНИЕ: ВСТРЕЧНЫЙ' : (wind > 0 ? 'НАПРАВЛЕНИЕ: ПОПУТНЫЙ' : 'РЕЖИМ: ШТИЛЬ')
    ctx.fillText(`АЭРОДИНАМИЧЕСКИЙ ЗАЛ · ${status}`, 256, 224)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter
  return tex
}

export const createWindTunnel: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  const group = new THREE.Group()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(item: T): T => (disposables.push(item), item)

  const addMesh = (
    p: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material,
    pos?: [number, number, number], rot?: [number, number, number], cast = true, recv = true,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m)
    if (pos) mesh.position.set(...pos)
    if (rot) mesh.rotation.set(...rot)
    mesh.castShadow = cast; mesh.receiveShadow = recv; p.add(mesh)
    return mesh
  }

  const wind = opts.wind ?? 0
  const hallMinX = -55, hallMaxX = opts.maxX + 20, hallLen = hallMaxX - hallMinX, hallMidX = (hallMinX + hallMaxX) / 2
  const dummy = new THREE.Object3D()

  // Sky & Lighting
  const fog = new THREE.Fog('#14181a', 40, opts.maxX + 70), background = new THREE.Color('#0e1112')
  group.add(new THREE.HemisphereLight(0x9fb0aa, 0x202224, 0.3))
  const sun = new THREE.DirectionalLight(0xdff3ee, 1.3)
  sun.position.set(5, 30, 8); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003
  sun.shadow.camera.near = 5; sun.shadow.camera.far = 65
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 30
  sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15
  sun.target.position.set(5, 0, 0); group.add(sun, sun.target)

  // Inverted Sky Sphere (BackSide with gradient via vertex colours)
  const skyGeo = track(new THREE.SphereGeometry(600, 24, 16))
  const skyPos = skyGeo.attributes.position, skyCol = new Float32Array(skyPos.count * 3)
  const [cHorizon, cZenith, cNadir] = [new THREE.Color('#0e1112'), new THREE.Color('#050708'), new THREE.Color('#040506')]
  for (let i = 0; i < skyPos.count; i++) {
    const ny = skyPos.getY(i) / 600, c = ny > 0 ? cHorizon.clone().lerp(cZenith, ny) : cHorizon.clone().lerp(cNadir, -ny)
    skyCol[i * 3] = c.r; skyCol[i * 3 + 1] = c.g; skyCol[i * 3 + 2] = c.b
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3))
  group.add(new THREE.Mesh(skyGeo, track(new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, depthWrite: false, fog: false }))))

  // Large Ground Plane (to x = maxX + 80 and z in [-120, 120])
  const outW = opts.maxX + 180, outGeo = track(new THREE.PlaneGeometry(outW, 240, 40, 30))
  outGeo.rotateX(-Math.PI / 2); outGeo.translate((opts.maxX + 80 - 100) / 2, -0.15, 0)
  const gPos = outGeo.attributes.position, gCol = new Float32Array(gPos.count * 3)
  const [cgBase, cgMid] = [new THREE.Color('#101315'), new THREE.Color('#161a1d')]
  for (let i = 0; i < gPos.count; i++) {
    const n = Math.sin(gPos.getX(i) * 0.08) * Math.cos(gPos.getZ(i) * 0.08) * 0.5 + 0.5
    const c = cgBase.clone().lerp(cgMid, n)
    gCol[i * 3] = c.r; gCol[i * 3 + 1] = c.g; gCol[i * 3 + 2] = c.b
  }
  outGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3))
  const outMesh = new THREE.Mesh(outGeo, track(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })))
  outMesh.receiveShadow = true; group.add(outMesh)

  // Concrete Hall Floor & Markings (z in [-16, 30], center z = 7)
  addMesh(group, track(new THREE.BoxGeometry(hallLen, 0.15, 46)), industrialMaterial('concrete', [Math.max(1, Math.round(hallLen / 6)), 8]), [hallMidX, -0.075, 7], undefined, false, true)
  const hzMat = industrialMaterial('hazard', [8, 1])
  addMesh(group, track(new THREE.BoxGeometry(0.24, 0.008, 8.24)), hzMat, [-7, 0.004, 0], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(0.24, 0.008, 8.24)), hzMat, [6, 0.004, 0], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(13.24, 0.008, 0.24)), hzMat, [-0.5, 0.004, -4], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(13.24, 0.008, 0.24)), hzMat, [-0.5, 0.004, 4], undefined, false, false)

  const yellowMat = track(new THREE.MeshLambertMaterial({ color: 0xf2c400, flatShading: true })), laneGeo = track(new THREE.BoxGeometry(hallLen - 10, 0.006, 0.16))
  addMesh(group, laneGeo, yellowMat, [hallMidX, 0.003, -5], undefined, false, false)
  addMesh(group, laneGeo, yellowMat, [hallMidX, 0.003, 5], undefined, false, false)

  const distGeo = track(new THREE.PlaneGeometry(0.8, 0.5))
  for (let x = 10; x <= opts.maxX; x += 10) {
    const dMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture(`${x}`, '#f2c400', '#1b1b1b', 96, 64)) }))
    addMesh(group, distGeo, dMat, [x, 0.005, -4.2], [-Math.PI / 2, 0, 0], false, false)
  }

  // Hall Walls (32 m high), Steel Ribs, and Dark Roof Truss Grid at y = 34
  const wallConc = industrialMaterial('concrete', [Math.max(1, Math.round(hallLen / 6)), 6]), wallSteel = industrialMaterial('steelPanel', [Math.max(1, Math.round(hallLen / 8)), 4])
  addMesh(group, track(new THREE.BoxGeometry(hallLen, 32, 0.4)), wallConc, [hallMidX, 16, -16.2])
  addMesh(group, track(new THREE.BoxGeometry(hallLen, 32, 0.4)), wallConc, [hallMidX, 16, 30.2])

  const colGeo = track(new THREE.BoxGeometry(0.6, 32, 0.6)); colGeo.translate(0, 16, 0)
  const trussGeo = track(new THREE.BoxGeometry(0.35, 0.6, 46.4)), colMax = (Math.floor(hallLen / 12) + 2) * 2
  const colMesh = track(new THREE.InstancedMesh(colGeo, wallSteel, colMax)), trussMesh = track(new THREE.InstancedMesh(trussGeo, wallSteel, Math.floor(colMax / 2) + 1))
  colMesh.castShadow = true; trussMesh.castShadow = true
  let colIdx = 0, trussIdx = 0
  for (let x = hallMinX + 2; x <= hallMaxX - 2; x += 12) {
    for (const cz of [-16, 30]) { dummy.position.set(x, 0, cz); dummy.updateMatrix(); colMesh.setMatrixAt(colIdx++, dummy.matrix) }
    dummy.position.set(x, 34, 7); dummy.updateMatrix(); trussMesh.setMatrixAt(trussIdx++, dummy.matrix)
  }
  colMesh.count = colIdx; trussMesh.count = trussIdx
  colMesh.instanceMatrix.needsUpdate = true; trussMesh.instanceMatrix.needsUpdate = true
  group.add(colMesh, trussMesh)

  const trussRunGeo = track(new THREE.BoxGeometry(hallLen, 0.25, 0.25))
  for (const tz of [-10, 0, 10, 20]) addMesh(group, trussRunGeo, wallSteel, [hallMidX, 34, tz], undefined, true, false)

  // Fluorescent Strip Lights & Spotlights
  const lampGeo = track(new THREE.BoxGeometry(2.4, 0.16, 0.5)), lampMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe8f3ef, emissiveIntensity: 2.5, toneMapped: false }))
  const spots: THREE.SpotLight[] = []
  let fCount = 0
  for (let x = hallMinX + 8; x <= hallMaxX - 8; x += 12) {
    for (const lz of [-15.7, 29.7]) {
      addMesh(group, lampGeo, lampMat, [x, 28, lz], undefined, false, false)
      if (fCount % 2 === 0) {
        const spot = new THREE.SpotLight(0xdff3ee, 100, 60, 0.6, 0.4, 1.6)
        spot.position.set(x, 27.8, lz); spot.target.position.set(x, 0, lz > 0 ? 8 : -4)
        group.add(spot, spot.target); spots.push(spot)
      }
      fCount++
    }
  }
  spots.sort((a, b) => a.position.distanceTo(group.position) - b.position.distanceTo(group.position))
  if (spots[0]) { spots[0].castShadow = true; spots[0].shadow.mapSize.set(1024, 1024); spots[0].shadow.bias = -0.0005 }
  if (spots[1]) { spots[1].castShadow = true; spots[1].shadow.mapSize.set(1024, 1024); spots[1].shadow.bias = -0.0005 }

  // The 4 Huge Ducted Fans & Honeycomb Flow-Straightener Grid
  const fansAtNear = wind > 0
  const fanX = fansAtNear ? -43 : (opts.maxX + 18), oppX = fansAtNear ? (opts.maxX + 20) : -45
  const honeycombX = fansAtNear ? (fanX + 2.2) : (fanX - 2.2)

  addMesh(group, track(new THREE.BoxGeometry(0.4, 32, 46)), industrialMaterial('concreteDark', [6, 4]), [fanX, 16, 7])
  addMesh(group, track(new THREE.BoxGeometry(0.4, 32, 46)), industrialMaterial('concreteDark', [6, 4]), [oppX, 16, 7])
  addMesh(group, track(new THREE.BoxGeometry(0.1, 16, 26)), industrialMaterial('grate', [8, 4]), [oppX + (fansAtNear ? -0.22 : 0.22), 13, 0], undefined, false, false)

  const shroudGeo = track(new THREE.CylinderGeometry(6, 6, 2.2, 24, 1, true)); shroudGeo.rotateZ(Math.PI / 2)
  const hubGeo = track(new THREE.CylinderGeometry(1.0, 1.0, 2.4, 12)); hubGeo.rotateZ(Math.PI / 2)
  const bladeGeo = track(new THREE.BoxGeometry(0.08, 0.7, 4.8)); bladeGeo.rotateZ(0.35); bladeGeo.translate(0, 0, 3.2)
  const fanSteel = industrialMaterial('steelPanel')

  const rotors: THREE.Group[] = []
  const fanRingGeo = track(new THREE.TorusGeometry(6.1, 0.18, 6, 32))
  const fanRingMat = track(new THREE.MeshBasicMaterial({ color: 0xff6a13, toneMapped: false }))
  const fanLampGeo = track(new THREE.BoxGeometry(1.4, 0.9, 0.9))
  const fanLampMat = track(new THREE.MeshBasicMaterial({ color: 0xe8f3ef, toneMapped: false }))
  for (const [fy, fz] of [[7, -6], [7, 6], [19, -6], [19, 6]] as const) {
    addMesh(group, shroudGeo, fanSteel, [fanX, fy, fz]); addMesh(group, hubGeo, fanSteel, [fanX, fy, fz])
    const rotor = new THREE.Group(); rotor.position.set(fanX, fy, fz)
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(bladeGeo, fanSteel)
      blade.rotation.x = b * (Math.PI / 3); blade.castShadow = true; rotor.add(blade)
    }
    group.add(rotor); rotors.push(rotor)
    // Orange warning ring on each shroud so the fan wall reads from the far end of the hall.
    const ring = new THREE.Mesh(fanRingGeo, fanRingMat)
    ring.position.set(fanX + (fansAtNear ? 0.6 : -0.6), fy, fz)
    ring.rotation.y = Math.PI / 2
    group.add(ring)
  }
  // Two floodlights on the side walls, aimed at the fan wall (visible lamp housings).
  for (const side of [-14, 28]) {
    const lampPos = new THREE.Vector3(fanX + (fansAtNear ? 22 : -22), 22, side)
    const lamp = new THREE.Mesh(fanLampGeo, fanLampMat)
    lamp.position.copy(lampPos)
    group.add(lamp)
    const flood = new THREE.SpotLight(0xdff3ee, 1400, 80, 0.55, 0.5, 1.4)
    flood.position.copy(lampPos)
    flood.target.position.set(fanX, 13, 0)
    group.add(flood, flood.target)
  }

  // Honeycomb flow-straightener grid (thin slats) in front of the fans
  const hSlatGeo = track(new THREE.BoxGeometry(0.8, 0.06, 24.2)), vSlatGeo = track(new THREE.BoxGeometry(0.8, 24.2, 0.06))
  const hSlats = track(new THREE.InstancedMesh(hSlatGeo, fanSteel, 13)), vSlats = track(new THREE.InstancedMesh(vSlatGeo, fanSteel, 13))
  for (let s = 0; s < 13; s++) {
    dummy.position.set(honeycombX, 1 + s * 2, 0); dummy.updateMatrix(); hSlats.setMatrixAt(s, dummy.matrix)
    dummy.position.set(honeycombX, 13, -12 + s * 2); dummy.updateMatrix(); vSlats.setMatrixAt(s, dummy.matrix)
  }
  hSlats.instanceMatrix.needsUpdate = true; vSlats.instanceMatrix.needsUpdate = true
  group.add(hSlats, vSlats)

  // Smoke Streamlines (12 thin horizontal particle streaks)
  const smokeCount = 300, smokeGeo = track(new THREE.BufferGeometry())
  const smokePos = new Float32Array(smokeCount * 3), smokeBaseX = new Float32Array(smokeCount)
  let sIdx = 0
  for (let l = 0; l < 12; l++) {
    const ly = 1.5 + l * 1.1, lz = -3.6 + (l % 5) * 1.8 + (l > 5 ? 0.3 : -0.3)
    for (let p = 0; p < 25; p++) {
      const bx = hallMinX + (p / 25) * hallLen
      smokeBaseX[sIdx] = bx
      smokePos[sIdx * 3] = bx; smokePos[sIdx * 3 + 1] = ly; smokePos[sIdx * 3 + 2] = lz
      sIdx++
    }
  }
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3))
  group.add(new THREE.Points(smokeGeo, track(new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.55, depthWrite: false }))))

  // Tell-Tale Ribbons on Poles (z = ±5.5 every 15 m)
  const poleGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6)); poleGeo.translate(0, 1.2, 0)
  const ribbonGeo = track(new THREE.BoxGeometry(0.6, 0.04, 0.01)); ribbonGeo.translate(0.3, 0, 0)
  const ribbonMat = track(new THREE.MeshLambertMaterial({ color: 0xee2222, flatShading: true }))
  const ribbons: RibbonItem[] = []
  for (let px = -35; px <= opts.maxX + 5; px += 15) {
    for (const pz of [-5.5, 5.5]) {
      addMesh(group, poleGeo, fanSteel, [px, 0, pz], undefined, false, false)
      ribbons.push({ mesh: addMesh(group, ribbonGeo, ribbonMat, [px, 2.4, pz], undefined, false, false), seed: px * 0.3 + pz })
    }
  }

  // Telemetry Wall Display 'СКОРОСТЬ ПОТОКА'
  addMesh(group, track(new THREE.PlaneGeometry(4.0, 2.0)), track(new THREE.MeshLambertMaterial({ map: track(makeWindDisplayTexture(wind)) })), [-6, 7.5, -15.96], undefined, false, false)

  // Props: Instrument Cart with CRT
  const cartGroup = new THREE.Group(); cartGroup.position.set(-4, 0, -8.5)
  addMesh(cartGroup, track(new THREE.BoxGeometry(1.0, 0.8, 0.6)), fanSteel, [0, 0.4, 0])
  addMesh(cartGroup, track(new THREE.BoxGeometry(0.48, 0.4, 0.38)), industrialMaterial('concreteDark'), [0, 1.0, 0])
  addMesh(cartGroup, track(new THREE.PlaneGeometry(0.38, 0.3)), track(new THREE.MeshBasicMaterial({ map: track(makeCRTScreenTexture()) })), [0, 1.0, 0.195])
  group.add(cartGroup)

  // Props: Pitot-Tube Probe Stand at (8, 0, -6)
  const probeGroup = new THREE.Group(); probeGroup.position.set(8, 0, -6)
  addMesh(probeGroup, track(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 8)), fanSteel, [0, 0.03, 0])
  addMesh(probeGroup, track(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 8)), fanSteel, [0, 1.28, 0])
  addMesh(probeGroup, track(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8)), fanSteel, [0, 2.5, 0], [0, 0, Math.PI / 2])
  const pDir = wind > 0 ? -1 : 1
  addMesh(probeGroup, track(new THREE.ConeGeometry(0.025, 0.12, 8)), fanSteel, [0.45 * pDir, 2.5, 0], [0, 0, -Math.PI / 2 * pDir])
  addMesh(probeGroup, track(new THREE.BoxGeometry(0.25, 0.35, 0.18)), industrialMaterial('concreteDark'), [0, 1.2, 0])
  group.add(probeGroup)

  // Props: Control Booth with 2 Scientists at (-25, 0, -14)
  const boothConc = industrialMaterial('concreteDark')
  addMesh(group, track(new THREE.BoxGeometry(8, 1.2, 3.8)), boothConc, [-25, 0.6, -14])
  addMesh(group, track(new THREE.BoxGeometry(8.2, 0.2, 4.0)), boothConc, [-25, 3.3, -14])
  addMesh(group, track(new THREE.BoxGeometry(8, 2.0, 0.2)), boothConc, [-25, 2.2, -15.9])
  addMesh(group, track(new THREE.BoxGeometry(0.2, 2.0, 3.8)), boothConc, [-29, 2.2, -14]); addMesh(group, track(new THREE.BoxGeometry(0.2, 2.0, 3.8)), boothConc, [-21, 2.2, -14])
  const glassMat = track(new THREE.MeshStandardMaterial({ color: 0x90c5e0, transparent: true, opacity: 0.35, roughness: 0.15, metalness: 0.1 }))
  addMesh(group, track(new THREE.BoxGeometry(7.6, 1.9, 0.06)), glassMat, [-25, 2.2, -12.1], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(6.5, 0.75, 0.6)), fanSteel, [-25, 0.87, -12.8])
  const obsLight = new THREE.PointLight(0xdfefff, 20, 12, 1.6); obsLight.position.set(-25, 2.8, -13.5); group.add(obsLight)

  const coatMat = track(new THREE.MeshLambertMaterial({ color: 0xe8ecea, flatShading: true })), headMat = track(new THREE.MeshLambertMaterial({ color: 0xd29d78, flatShading: true }))
  const bodyGeo = track(new THREE.CapsuleGeometry(0.28, 0.85, 4, 8)), headGeo = track(new THREE.SphereGeometry(0.18, 8, 8))
  for (const sx of [-26.5, -23.5]) { addMesh(group, bodyGeo, coatMat, [sx, 1.2, -13.3]); addMesh(group, headGeo, headMat, [sx, 1.9, -13.3]) }

  // Signs & Warning Beacons
  const signHallMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture('АЭРОДИНАМИЧЕСКИЙ ЗАЛ · СЕКТОР В', '#cfd3cc', '#1b1b1b', 512, 64)) }))
  addMesh(group, track(new THREE.PlaneGeometry(6.0, 0.8)), signHallMat, [-25, 5.5, -13.98], undefined, false, false)
  const warnTex = track(signTexture('ОСТОРОЖНО: ПОТОК ВОЗДУХА', '#f2c400', '#1b1b1b', 384, 64))
  addMesh(group, track(new THREE.PlaneGeometry(1.8, 0.4)), track(new THREE.MeshLambertMaterial({ map: warnTex, side: THREE.DoubleSide })), [-8, 1.2, 5.5], undefined, false, false)

  const coneGeo = track(new THREE.ConeGeometry(0.18, 0.38, 8)); coneGeo.rotateX(Math.PI / 2)
  const beaconMat = track(new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 3.0, toneMapped: false }))
  const beacons: Beacon[] = []
  for (const bx of [-28, -22]) {
    addMesh(group, track(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8)), fanSteel, [bx, 3.4, -12.3], undefined, false, false)
    const cone = addMesh(group, coneGeo, beaconMat, [bx, 3.65, -12.3], [-Math.PI / 2, 0, 0], false, false)
    const light = new THREE.PointLight(0xff1100, 0, 16, 2); light.position.set(bx, 3.8, -12.3); group.add(light)
    beacons.push({ cone, light })
  }
  let alarmOn = false
  group.userData.setAlarm = (on: boolean): void => { alarmOn = on }

  // Targets
  const crashTex = track(makeCrashTargetTexture())
  const targetItems: TargetItem[] = [], targetObjects: THREE.Object3D[] = []
  group.userData.targets = targetObjects

  for (const t of opts.targets) {
    const tGroup = new THREE.Group(); tGroup.position.set(t.x, 0, 0)
    if (t.h !== undefined && t.h > 0) {
      const h = t.h, blockMat = track(new THREE.MeshLambertMaterial({ color: 0x8a877c }))
      addMesh(tGroup, track(new THREE.BoxGeometry(2.0, h, 12)), blockMat, [1.0, h / 2, 0])
      addMesh(tGroup, track(new THREE.BoxGeometry(2.04, 0.4, 12.04)), hzMat, [1.0, h - 0.2, 0])
      const crater = addMesh(tGroup, track(new THREE.CircleGeometry(0.85, 16)), track(new THREE.MeshLambertMaterial({ color: 0x141416 })), [-0.02, h * 0.5, 0], [0, -Math.PI / 2, 0], false, false)
      crater.visible = false
      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) { crater.visible = hit; blockMat.emissive.setHex(hit ? 0x442222 : 0x000000) },
      })
    } else {
      const pH = Math.max(1.2, t.r + 0.4), r = t.r, legGeo = track(new THREE.CylinderGeometry(0.035, 0.035, pH * 1.08, 6))
      for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
        const leg = addMesh(tGroup, legGeo, fanSteel, [Math.cos(a) * r * 0.35, pH * 0.5, Math.sin(a) * r * 0.35])
        leg.rotation.set(-Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3)
      }
      const ringGeo = track(new THREE.RingGeometry(Math.max(0.05, r - 0.18), r, 48)); ringGeo.rotateX(-Math.PI / 2)
      const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xff6a13, transparent: true, opacity: 0.65, depthWrite: false }))
      const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = 0.02; tGroup.add(ring)

      const pivot = new THREE.Group(); pivot.position.set(0, pH, 0)
      const plateMat = track(new THREE.MeshLambertMaterial({ map: crashTex }))
      const plateGeo = track(new THREE.CircleGeometry(r, 28)); plateGeo.rotateY(-Math.PI / 2)
      addMesh(pivot, plateGeo, plateMat, [-0.03, 0, 0])
      addMesh(pivot, track(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.06, 24)), fanSteel, [0, 0, 0], [0, 0, Math.PI / 2])
      tGroup.add(pivot)

      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) {
          pivot.rotation.set(0, hit ? 0.25 : 0, hit ? -0.55 : 0)
          plateMat.emissive.setHex(hit ? 0xff3300 : 0x000000); ringMat.color.setHex(hit ? 0xffea55 : 0xff6a13)
        },
      })
    }
    group.add(tGroup); targetObjects.push(tGroup)
  }

  return {
    group, fog, background,
    palette: { accent: '#ff6a13', ground: '#8a877c', sky: '#0e1112' },
    update(t: number): void {
      for (const item of targetItems) {
        if (item.spec.moving) item.group.position.x = item.spec.x + item.spec.moving.speed * t
      }
      if (alarmOn) {
        for (const b of beacons) {
          b.cone.rotation.y = t * 8; b.light.intensity = 10 + Math.sin(t * 12) * 8
        }
      } else {
        for (const b of beacons) b.light.intensity = 0
      }
      const spinRate = wind * 3.5
      for (const r of rotors) r.rotation.x = t * spinRate

      const posAttr = smokeGeo.attributes.position as THREE.BufferAttribute
      const posArr = posAttr.array as Float32Array
      const move = wind * t
      for (let i = 0; i < smokeCount; i++) {
        posArr[i * 3] = ((smokeBaseX[i] + move - hallMinX) % hallLen + hallLen) % hallLen + hallMinX
      }
      posAttr.needsUpdate = true

      const bend = Math.min(1.42, Math.abs(wind) * 0.09), isPos = wind >= 0
      for (const r of ribbons) {
        const fl = Math.abs(wind) > 0.1 ? Math.sin(t * 14 + r.seed) * 0.09 * Math.min(1, Math.abs(wind) / 3) : 0
        r.mesh.rotation.z = -Math.PI / 2 + (isPos ? bend : -bend) + fl
        r.mesh.rotation.y = Math.cos(t * 8 + r.seed) * 0.04
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
