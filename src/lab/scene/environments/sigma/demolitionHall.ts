import { tr } from '../../../../i18n'
import * as THREE from 'three'
import type { Target } from '../../../levels/types'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from '../types'
import { industrialMaterial, signTexture } from '../../textures/industrial'
import { createSky } from '../../sky'

interface TargetItem { spec: Target; group: THREE.Group; setHit(hit: boolean): void }
interface Beacon { cone: THREE.Mesh; coneMat: THREE.MeshStandardMaterial; light: THREE.PointLight }

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
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter
  return tex
}

function makeGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#8e8b82'; ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#252525'; ctx.lineWidth = 2
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke()
    }
    ctx.fillStyle = '#1b1b1b'; ctx.font = 'bold 16px monospace'
    ctx.fillText('0.0', 6, 250); ctx.fillText('2.0', 6, 128); ctx.fillText('4.0', 6, 20)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter
  return tex
}

function makeGaugeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#14171a'; ctx.fillRect(0, 0, 64, 256)
    ctx.fillStyle = '#16381e'; ctx.fillRect(16, 20, 32, 216)
    ctx.fillStyle = '#39ff14'; ctx.fillRect(18, 70, 28, 164)
    ctx.strokeStyle = '#dcd8ce'; ctx.lineWidth = 2
    for (let y = 30; y <= 230; y += 20) {
      ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(16, y); ctx.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter
  return tex
}

export const createDemolitionHall: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
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

  const hallMinX = -80, hallMaxX = opts.maxX + 25, hallLen = hallMaxX - hallMinX, hallMidX = (hallMinX + hallMaxX) / 2
  const dummy = new THREE.Object3D()

  // Sky & Lighting
  const SUN_DIR = new THREE.Vector3(-0.8, 0.12, 0.3).normalize()
  const sky = createSky({
    zenith: '#24345a', mid: '#7d6b86', horizon: '#f08a4b', ground: '#4a3a35',
    sunDir: SUN_DIR, sunColor: '#ffa260', halo: 1.2,
  })
  track(sky.geometry); track(sky.material as THREE.Material); group.add(sky)

  const fog = new THREE.Fog('#3a2f34', 90, opts.maxX + 200)
  const background = new THREE.Color('#1c1a22')
  group.add(new THREE.HemisphereLight(0x7a86a8, 0x3a3230, 0.65))

  const sun = new THREE.DirectionalLight(0xffa874, 1.6)
  sun.position.copy(SUN_DIR).multiplyScalar(120)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = 0.03; sun.shadow.bias = -0.0002
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 250
  sun.shadow.camera.left = -40; sun.shadow.camera.right = 60
  sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35
  sun.target.position.set(10, 0, 4)
  group.add(sun, sun.target)

  // Outer Ground
  const outW = opts.maxX + 180, outGeo = track(new THREE.PlaneGeometry(outW, 240, 60, 40))
  outGeo.rotateX(-Math.PI / 2); outGeo.translate((opts.maxX + 80 - 100) / 2, -0.05, 0)
  const gPos = outGeo.attributes.position, gCol = new Float32Array(gPos.count * 3)
  const [cBase, cMid, cDark] = [new THREE.Color('#4a3a35'), new THREE.Color('#6b675e'), new THREE.Color('#3a2f34')]
  for (let i = 0; i < gPos.count; i++) {
    const gx = gPos.getX(i), gz = gPos.getZ(i)
    const n = Math.sin(gx * 0.08) * Math.cos(gz * 0.09) * 0.5 + 0.5
    const c = cBase.clone().lerp(cMid, n * 0.7).lerp(cDark, Math.min(1, Math.abs(gz) / 120))
    gCol[i * 3] = c.r; gCol[i * 3 + 1] = c.g; gCol[i * 3 + 2] = c.b
  }
  outGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3))
  const outMesh = new THREE.Mesh(outGeo, track(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })))
  outMesh.receiveShadow = true; group.add(outMesh)

  // Hangar Floor & Markings
  addMesh(group, track(new THREE.BoxGeometry(hallLen, 0.15, 52)), industrialMaterial('concrete', [Math.max(1, Math.round(hallLen / 6)), 8]), [hallMidX, -0.075, 4], undefined, false, true)
  const hzMat = industrialMaterial('hazard', [8, 1])
  addMesh(group, track(new THREE.BoxGeometry(0.24, 0.008, 8.24)), hzMat, [-7, 0.014, 0], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(0.24, 0.008, 8.24)), hzMat, [6, 0.014, 0], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(13.24, 0.008, 0.24)), hzMat, [-0.5, 0.014, -4], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(13.24, 0.008, 0.24)), hzMat, [-0.5, 0.014, 4], undefined, false, false)

  const yellowMat = track(new THREE.MeshLambertMaterial({ color: 0xf2c400, flatShading: true }))
  const laneGeo = track(new THREE.BoxGeometry(hallLen - 10, 0.006, 0.16))
  addMesh(group, laneGeo, yellowMat, [hallMidX, 0.012, -5], undefined, false, false)
  addMesh(group, laneGeo, yellowMat, [hallMidX, 0.012, 5], undefined, false, false)

  const distGeo = track(new THREE.PlaneGeometry(0.8, 0.5))
  for (let x = 10; x <= opts.maxX; x += 10) {
    const dMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture(`${x}`, '#f2c400', '#1b1b1b', 96, 64)) }))
    addMesh(group, distGeo, dMat, [x, 0.014, -4.2], [-Math.PI / 2, 0, 0], false, false)
  }

  // Side and End Walls (40 m high, lower 4 m concrete, upper 36 m steelPanel)
  const wallSteel = industrialMaterial('steelPanel', [Math.max(1, Math.round(hallLen / 6)), 6])
  const wallConc = industrialMaterial('concrete', [Math.max(1, Math.round(hallLen / 6)), 1])
  const endSteel = industrialMaterial('steelPanel', [9, 6]), endConc = industrialMaterial('concreteDark', [9, 1])

  for (const wz of [-22, 30]) {
    addMesh(group, track(new THREE.BoxGeometry(hallLen, 4, 0.4)), wallConc, [hallMidX, 2, wz])
    addMesh(group, track(new THREE.BoxGeometry(hallLen, 36, 0.4)), wallSteel, [hallMidX, 22, wz])
  }
  for (const wx of [hallMinX - 0.2, hallMaxX + 0.2]) {
    addMesh(group, track(new THREE.BoxGeometry(0.4, 4, 52.4)), endConc, [wx, 2, 4])
    addMesh(group, track(new THREE.BoxGeometry(0.4, 36, 52.4)), endSteel, [wx, 22, 4])
  }

  // Portal Frames & Roof Truss Stubs
  const colGeo = track(new THREE.BoxGeometry(0.8, 40, 0.8)); colGeo.translate(0, 20, 0)
  const trussGeo = track(new THREE.BoxGeometry(0.6, 1.2, 10))
  const colMax = (Math.floor(hallLen / 12) + 2) * 2
  const colMesh = track(new THREE.InstancedMesh(colGeo, wallSteel, colMax))
  const trussMesh = track(new THREE.InstancedMesh(trussGeo, wallSteel, colMax))
  colMesh.castShadow = true; trussMesh.castShadow = true
  let colIdx = 0
  for (let x = hallMinX + 2; x <= hallMaxX - 2; x += 12) {
    for (const [cz, tz] of [[-22, -17], [30, 25]] as const) {
      dummy.position.set(x, 0, cz); dummy.updateMatrix(); colMesh.setMatrixAt(colIdx, dummy.matrix)
      dummy.position.set(x, 39.4, tz); dummy.updateMatrix(); trussMesh.setMatrixAt(colIdx, dummy.matrix)
      colIdx++
    }
  }
  colMesh.count = colIdx; trussMesh.count = colIdx
  colMesh.instanceMatrix.needsUpdate = true; trussMesh.instanceMatrix.needsUpdate = true
  group.add(colMesh, trussMesh)

  // Rolled-back Roof Panels at Far End
  addMesh(group, track(new THREE.BoxGeometry(16, 0.4, 16)), wallSteel, [opts.maxX, 40.5, -4])
  addMesh(group, track(new THREE.BoxGeometry(16, 0.4, 16)), wallSteel, [opts.maxX, 40.5, 12])
  const railGeo = track(new THREE.BoxGeometry(22, 0.2, 0.25))
  for (const rz of [-12, 4, 20]) addMesh(group, railGeo, wallSteel, [opts.maxX, 40.1, rz], undefined, false, false)

  // Overhead Gantry Crane
  const craneRailGeo = track(new THREE.BoxGeometry(hallLen - 4, 0.5, 0.3))
  addMesh(group, craneRailGeo, wallSteel, [hallMidX, 32, -13], undefined, false, false)
  addMesh(group, craneRailGeo, wallSteel, [hallMidX, 32, 21], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(2.4, 1.4, 34.4)), wallSteel, [60, 32.7, 4])
  addMesh(group, track(new THREE.BoxGeometry(2.42, 0.25, 34.42)), industrialMaterial('hazard', [12, 1]), [60, 32.7, 4])
  addMesh(group, track(new THREE.BoxGeometry(2.8, 0.6, 2.6)), wallSteel, [60, 33.7, 4])
  addMesh(group, track(new THREE.CylinderGeometry(0.02, 0.02, 13, 6)), wallSteel, [60, 26.5, 4])
  const hookGeo = track(new THREE.TorusGeometry(0.4, 0.1, 8, 16)); hookGeo.rotateY(Math.PI / 2)
  addMesh(group, hookGeo, wallSteel, [60, 19.8, 4])

  // Sodium High-Bay Lamps & SpotLights
  const lampGeo = track(new THREE.BoxGeometry(1.6, 0.16, 0.6)), dropGeo = track(new THREE.CylinderGeometry(0.02, 0.02, 13.4, 6))
  const lampMat = track(new THREE.MeshStandardMaterial({ color: 0xffb35c, emissive: 0xffb35c, emissiveIntensity: 2.8, toneMapped: false }))
  const spots: THREE.SpotLight[] = []
  let lampCount = 0
  for (let x = hallMinX + 10; x <= hallMaxX - 8; x += 12) {
    for (const lz of [-14, 21]) {
      addMesh(group, dropGeo, wallSteel, [x, 32.7, lz], undefined, false, false)
      addMesh(group, lampGeo, lampMat, [x, 26, lz], undefined, false, false)
      if (lampCount % 3 === 0) {
        const spot = new THREE.SpotLight(0xffb35c, 420, 80, 0.9, 0.5, 1.4)
        spot.position.set(x, 25.8, lz); spot.target.position.set(x, 0, lz)
        group.add(spot, spot.target); spots.push(spot)
      }
      lampCount++
    }
  }
  spots.sort((a, b) => a.position.distanceTo(group.position) - b.position.distanceTo(group.position))
  if (spots[0]) { spots[0].castShadow = true; spots[0].shadow.mapSize.set(1024, 1024); spots[0].shadow.bias = -0.0005 }
  if (spots[1]) { spots[1].castShadow = true; spots[1].shadow.mapSize.set(1024, 1024); spots[1].shadow.bias = -0.0005 }

  // Warning Beacons
  const coneGeo = track(new THREE.ConeGeometry(0.18, 0.38, 8)); coneGeo.rotateX(Math.PI / 2)
  const beacons: Beacon[] = []
  for (const bx of [-6, 6]) {
    addMesh(group, track(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8)), wallSteel, [bx, 8, -21.8], [0, 0, Math.PI / 2], false, false)
    const coneMat = track(new THREE.MeshStandardMaterial({ color: 0xffa500, emissive: 0xff8800, emissiveIntensity: 3.0, toneMapped: false }))
    const cone = addMesh(group, coneGeo, coneMat, [bx, 8, -21.6], undefined, false, false)
    const light = new THREE.PointLight(0xffaa22, 4, 18, 2); light.position.set(bx, 8, -21.4); group.add(light)
    beacons.push({ cone, coneMat, light })
  }
  let alarmOn = false
  group.userData.setAlarm = (on: boolean): void => { alarmOn = on }

  // Control Booth at (-20, 0, -18)
  addMesh(group, track(new THREE.BoxGeometry(8, 1.2, 3.8)), endConc, [-20, 0.6, -18])
  addMesh(group, track(new THREE.BoxGeometry(8.2, 0.2, 4.0)), endConc, [-20, 3.3, -18])
  addMesh(group, track(new THREE.BoxGeometry(8, 2.0, 0.2)), endConc, [-20, 2.2, -19.9])
  addMesh(group, track(new THREE.BoxGeometry(0.2, 2.0, 3.8)), endConc, [-24, 2.2, -18])
  addMesh(group, track(new THREE.BoxGeometry(0.2, 2.0, 3.8)), endConc, [-16, 2.2, -18])
  const glassMat = track(new THREE.MeshStandardMaterial({ color: 0x90c5e0, transparent: true, opacity: 0.35, roughness: 0.15, metalness: 0.1 }))
  addMesh(group, track(new THREE.BoxGeometry(7.6, 1.9, 0.06)), glassMat, [-20, 2.2, -16.1], undefined, false, false)
  addMesh(group, track(new THREE.BoxGeometry(6.5, 0.75, 0.6)), wallSteel, [-20, 0.87, -16.8])
  const obsLight = new THREE.PointLight(0xdfefff, 20, 12, 1.6); obsLight.position.set(-20, 2.8, -17.5); group.add(obsLight)

  const coatMat = track(new THREE.MeshLambertMaterial({ color: 0xe8ecea, flatShading: true }))
  const headMat = track(new THREE.MeshLambertMaterial({ color: 0xd29d78, flatShading: true }))
  const bodyGeo = track(new THREE.CapsuleGeometry(0.28, 0.85, 4, 8)), headGeo = track(new THREE.SphereGeometry(0.18, 8, 8))
  for (const sx of [-21.5, -18.5]) {
    addMesh(group, bodyGeo, coatMat, [sx, 1.2, -17.3]); addMesh(group, headGeo, headMat, [sx, 1.9, -17.3])
  }

  // Load Gauge Board near Booth & Back Wall Sign
  addMesh(group, track(new THREE.BoxGeometry(1.0, 3.6, 0.2)), endConc, [-15, 1.8, -17])
  const gaugeMat = track(new THREE.MeshBasicMaterial({ map: track(makeGaugeTexture()) }))
  addMesh(group, track(new THREE.PlaneGeometry(0.8, 3.2)), gaugeMat, [-15, 1.8, -16.89], undefined, false, false)
  const signBackMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture(tr('СЕКТОР Р · РАЗРУШАЮЩИЕ ИСПЫТАНИЯ'), '#dcd8ce', '#1b1b1b', 512, 64)) }))
  addMesh(group, track(new THREE.PlaneGeometry(12, 1.8)), signBackMat, [hallMinX + 0.2, 14, 4], [0, Math.PI / 2, 0], false, false)

  // Stacks of Spare Concrete Test Blocks & Debris Pile
  const blockGeo = track(new THREE.BoxGeometry(1.6, 0.8, 1.0)); blockGeo.translate(0, 0.4, 0)
  const blocksMesh = track(new THREE.InstancedMesh(blockGeo, wallConc, 18))
  blocksMesh.castShadow = true
  let bIdx = 0
  for (const [bx, bz] of [[-18, 16], [20, 16], [35, 16]]) {
    dummy.position.set(bx - 0.85, 0, bz); dummy.updateMatrix(); blocksMesh.setMatrixAt(bIdx++, dummy.matrix)
    dummy.position.set(bx + 0.85, 0, bz); dummy.updateMatrix(); blocksMesh.setMatrixAt(bIdx++, dummy.matrix)
    dummy.position.set(bx, 0.8, bz); dummy.updateMatrix(); blocksMesh.setMatrixAt(bIdx++, dummy.matrix)
  }
  blocksMesh.count = bIdx; blocksMesh.instanceMatrix.needsUpdate = true; group.add(blocksMesh)

  const dMat = industrialMaterial('rust')
  addMesh(group, track(new THREE.DodecahedronGeometry(1.2, 0)), wallConc, [24, 0.6, -16])
  addMesh(group, track(new THREE.DodecahedronGeometry(0.8, 0)), endConc, [25.2, 0.4, -15.5])
  const rebGeo = track(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6))
  addMesh(group, rebGeo, dMat, [23.8, 1.2, -15.8], [0.3, 0.2, 0.6])
  addMesh(group, rebGeo, dMat, [24.4, 1.1, -16.2], [-0.5, 0.4, -0.4])

  // Targets
  const crashTex = track(makeCrashTargetTexture())
  const targetItems: TargetItem[] = [], targetObjects: THREE.Object3D[] = []
  // Floodlights for the far test structures: the low dusk sun never clears the 40 m end wall,
  // so each target gets its own visible lamp on a column, aimed at its face.
  const floodGeo = track(new THREE.BoxGeometry(1.2, 0.8, 0.8))
  const floodMat = track(new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: false }))
  for (const t of opts.targets) {
    const lamp = new THREE.Mesh(floodGeo, floodMat)
    lamp.position.set(t.x - 18, 16, -19)
    group.add(lamp)
    const flood = new THREE.SpotLight(0xfff1d6, 900, 60, 0.42, 0.45, 1.4)
    flood.position.copy(lamp.position)
    flood.target.position.set(t.x, (t.h ?? 2) * 0.5, 0)
    group.add(flood, flood.target)
  }

  group.userData.targets = targetObjects

  for (const t of opts.targets) {
    const tGroup = new THREE.Group(); tGroup.position.set(t.x, 0, 0)

    if (t.h !== undefined && t.h > 0) {
      const h = t.h, isGate = t.label?.includes(tr('Ворота')) ?? false, isTower = t.label?.includes(tr('Башня')) ?? false

      const crater = addMesh(tGroup, track(new THREE.CircleGeometry(0.85, 16)), track(new THREE.MeshLambertMaterial({ color: 0x141416 })), [-0.02, h * 0.5, 0], [0, -Math.PI / 2, 0], false, false)
      crater.visible = false

      const chunks = new THREE.Group(), cGeo = track(new THREE.DodecahedronGeometry(0.35, 0))
      addMesh(chunks, cGeo, wallConc, [-0.7, 0.2, 0.6], [0.2, 0.4, 0.1])
      addMesh(chunks, cGeo, wallConc, [-1.1, 0.2, -0.7], [0.5, 0.2, 0.3])
      const rGeo = track(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6))
      addMesh(chunks, rGeo, dMat, [-0.2, h * 0.5 + 0.2, 0.2], [0.3, 0.2, 0.8])
      addMesh(chunks, rGeo, dMat, [-0.25, h * 0.5 - 0.2, -0.2], [-0.4, 0.3, -0.7])
      chunks.visible = false; tGroup.add(chunks)

      let doorPivot: THREE.Group | null = null

      if (isGate) {
        addMesh(tGroup, track(new THREE.BoxGeometry(2.0, h, 3.0)), endConc, [1.0, h / 2, -4.5])
        addMesh(tGroup, track(new THREE.BoxGeometry(2.0, h, 3.0)), endConc, [1.0, h / 2, 4.5])
        addMesh(tGroup, track(new THREE.BoxGeometry(2.0, h * 0.2, 6.0)), endConc, [1.0, h * 0.9, 0])
        doorPivot = new THREE.Group()
        addMesh(doorPivot, track(new THREE.BoxGeometry(0.24, h * 0.8, 5.96)), wallSteel, [0.12, h * 0.4, 0])
        tGroup.add(doorPivot)
      } else if (isTower) {
        addMesh(tGroup, track(new THREE.CylinderGeometry(3, 3, h, 24)), industrialMaterial('concrete', [6, Math.max(1, Math.round(h / 3))]), [3.0, h / 2, 0])
        const bandMat = industrialMaterial('steelPanel', [6, 1]), bandGeo = track(new THREE.CylinderGeometry(3.04, 3.04, 0.2, 24))
        for (const by of [h * 0.25, h * 0.5, h * 0.75]) addMesh(tGroup, bandGeo, bandMat, [3.0, by, 0])
      } else {
        addMesh(tGroup, track(new THREE.BoxGeometry(2.0, h, 12)), industrialMaterial('concrete', [3, Math.max(1, Math.round(h / 4))]), [1.0, h / 2, 0])
        addMesh(tGroup, track(new THREE.BoxGeometry(2.04, 0.4, 12.04)), hzMat, [1.0, h - 0.2, 0])
        const gridMat = track(new THREE.MeshLambertMaterial({ map: track(makeGridTexture()) }))
        addMesh(tGroup, track(new THREE.PlaneGeometry(12, h - 0.4)), gridMat, [-0.01, (h - 0.4) / 2, 0], [0, -Math.PI / 2, 0], false, false)
      }

      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) {
          crater.visible = hit; chunks.visible = hit
          if (doorPivot) {
            doorPivot.rotation.z = hit ? -0.25 : 0
            doorPivot.position.x = hit ? 0.4 : 0
          }
        },
      })
    } else {
      const pH = Math.max(1.2, t.r + 0.4), r = t.r, legGeo = track(new THREE.CylinderGeometry(0.035, 0.035, pH * 1.08, 6))
      for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
        const leg = addMesh(tGroup, legGeo, wallSteel, [Math.cos(a) * r * 0.35, pH * 0.5, Math.sin(a) * r * 0.35])
        leg.rotation.set(-Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3)
      }
      const ringGeo = track(new THREE.RingGeometry(Math.max(0.05, r - 0.18), r, 48)); ringGeo.rotateX(-Math.PI / 2)
      const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xff6a13, transparent: true, opacity: 0.65, depthWrite: false }))
      const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = 0.02; tGroup.add(ring)

      const pivot = new THREE.Group(); pivot.position.set(0, pH, 0)
      const plateMat = track(new THREE.MeshLambertMaterial({ map: crashTex }))
      const plateGeo = track(new THREE.CircleGeometry(r, 28)); plateGeo.rotateY(-Math.PI / 2)
      addMesh(pivot, plateGeo, plateMat, [-0.06, 0, 0]) // 3 cm proud of the steel backing: coplanar faces flicker
      addMesh(pivot, track(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.06, 24)), wallSteel, [0, 0, 0], [0, 0, Math.PI / 2])
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
    indoor: true,
    palette: { accent: '#ff6a13', ground: '#6b675e', sky: '#f08a4b' },
    update(t: number): void {
      for (const item of targetItems) {
        if (item.spec.moving) item.group.position.x = item.spec.x + item.spec.moving.speed * t
      }
      const speed = alarmOn ? 12 : 3.5
      for (const b of beacons) {
        b.cone.rotation.y = t * speed
        if (alarmOn) {
          b.coneMat.color.setHex(0xff2222); b.coneMat.emissive.setHex(0xff0000)
          b.light.color.setHex(0xff1100); b.light.intensity = 14 + Math.sin(t * 12) * 6
        } else {
          b.coneMat.color.setHex(0xffa500); b.coneMat.emissive.setHex(0xff8800)
          b.light.color.setHex(0xffaa22); b.light.intensity = 4 + Math.sin(t * 4) * 2
        }
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
