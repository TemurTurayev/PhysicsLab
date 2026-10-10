import { tr } from '../../../../i18n'
import * as THREE from 'three'
import type { Target } from '../../../levels/types'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from '../types'
import { industrialMaterial, industrialTexture, signTexture } from '../../textures/industrial'

interface TargetItem {
  spec: Target
  group: THREE.Group
  setHit(hit: boolean): void
}

interface Beacon {
  cone: THREE.Mesh
  light: THREE.PointLight
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
      ctx.beginPath()
      ctx.arc(128, 128, r, 0, Math.PI * 2)
      ctx.fillStyle = c
      ctx.fill()
    }
    ctx.fillStyle = '#1b1b1b'
    ctx.fillRect(125, 0, 6, 256)
    ctx.fillRect(0, 125, 256, 6)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.LinearFilter
  return tex
}

function makeCRTScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#0a200f'
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#14381b'
    for (let y = 0; y < 128; y += 4) ctx.fillRect(0, y, 128, 2)
    ctx.strokeStyle = '#7dff8a'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x < 128; x++) {
      const y = 64 + Math.sin(x * 0.15) * 20 + Math.sin(x * 0.05) * 10
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.fillStyle = '#7dff8a'
    ctx.font = 'bold 12px monospace'
    ctx.fillText(tr('СИГМА-7 ТЕЛЕМЕТРИЯ'), 8, 22)
    ctx.fillText(tr('СТАТУС: ГОТОВ'), 8, 116)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.LinearFilter
  return tex
}

export const createTestChamber: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  const group = new THREE.Group()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item)
    return item
  }

  const addMesh = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos?: [number, number, number],
    rot?: [number, number, number],
    cast = true,
    recv = true,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat)
    if (pos) m.position.set(...pos)
    if (rot) m.rotation.set(...rot)
    m.castShadow = cast
    m.receiveShadow = recv
    parent.add(m)
    return m
  }

  const hallMinX = -50 // an early release can throw the stone ~40 m backwards
  const hallMaxX = opts.maxX + 15
  const hallLen = hallMaxX - hallMinX
  const hallMidX = (hallMinX + hallMaxX) / 2

  const fog = new THREE.Fog('#15181a', 30, opts.maxX + 60)
  const background = new THREE.Color('#0f1112')
  group.add(new THREE.HemisphereLight(0x9fb0aa, 0x3a3c3e, 0.6))

  const sun = new THREE.DirectionalLight(0xdff3ee, 1.4)
  sun.position.set(5, 28, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.bias = -0.0003
  sun.shadow.camera.near = 5
  sun.shadow.camera.far = 60
  sun.shadow.camera.left = -25
  sun.shadow.camera.right = 35
  sun.shadow.camera.top = 20
  sun.shadow.camera.bottom = -20
  sun.target.position.set(5, 0, 0)
  group.add(sun, sun.target)

  const lampGeo = track(new THREE.BoxGeometry(2.4, 0.16, 0.5))
  const lampMat = track(new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xe8f3ef, emissiveIntensity: 2.5, toneMapped: false,
  }))
  const spots: THREE.SpotLight[] = []
  let fCount = 0
  for (let x = -20; x <= hallMaxX - 5; x += 10) {
    for (const z of [-5, 5]) {
      addMesh(group, lampGeo, lampMat, [x, 29, z], undefined, false, false)
      if (fCount % 2 === 0) {
        const spot = new THREE.SpotLight(0xdff3ee, 420, 70, 0.85, 0.5, 1.5)
        spot.position.set(x, 28.8, z)
        spot.target.position.set(x, 0, z)
        group.add(spot, spot.target)
        spots.push(spot)
      }
      fCount++
    }
  }
  spots.sort((a, b) => a.position.distanceTo(group.position) - b.position.distanceTo(group.position))
  if (spots[0]) {
    spots[0].castShadow = true; spots[0].shadow.mapSize.set(1024, 1024); spots[0].shadow.bias = -0.0005
  }
  if (spots[1]) {
    spots[1].castShadow = true; spots[1].shadow.mapSize.set(1024, 1024); spots[1].shadow.bias = -0.0005
  }

  const beaconMat = track(new THREE.MeshStandardMaterial({
    color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 3.0, toneMapped: false,
  }))
  const coneGeo = track(new THREE.ConeGeometry(0.18, 0.38, 8))
  coneGeo.rotateX(Math.PI / 2)
  const beacons: Beacon[] = []
  for (const bz of [-13.5, -12.3]) {
    addMesh(group, track(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8)), industrialMaterial('concreteDark'), [-24.9, 6, bz], [0, 0, Math.PI / 2], false, false)
    const cone = addMesh(group, coneGeo, beaconMat, [-24.7, 6, bz], undefined, false, false)
    const light = new THREE.PointLight(0xff1100, 0, 16, 2)
    light.position.set(-24.5, 6, bz)
    group.add(light)
    beacons.push({ cone, light })
  }
  let alarmOn = false
  group.userData.setAlarm = (on: boolean): void => { alarmOn = on }

  const tileLen = 62
  addMesh(group, track(new THREE.BoxGeometry(tileLen, 0.2, 46)), industrialMaterial('floorTile', [62, 46]), [-19, -0.1, 8], undefined, false, true)
  const concLen = hallMaxX - 12
  addMesh(group, track(new THREE.BoxGeometry(concLen, 0.2, 46)), industrialMaterial('concrete', [Math.max(1, Math.round(concLen / 4)), 12]), [12 + concLen / 2, -0.1, 8], undefined, false, true)

  const yellowMat = track(new THREE.MeshLambertMaterial({ color: 0xf2c400, flatShading: true }))
  const lineGeo = track(new THREE.BoxGeometry(hallLen, 0.006, 0.16))
  for (const lz of [-4, 4]) addMesh(group, lineGeo, yellowMat, [hallMidX, 0.012, lz], undefined, false, false)

  const hzMat = industrialMaterial('hazard', [8, 1])
  const hzX = track(new THREE.BoxGeometry(0.24, 0.008, 8.24))
  const hzZ = track(new THREE.BoxGeometry(13.24, 0.008, 0.24))
  addMesh(group, hzX, hzMat, [-7, 0.014, 0], undefined, false, false)
  addMesh(group, hzX, hzMat, [6, 0.014, 0], undefined, false, false)
  addMesh(group, hzZ, hzMat, [-0.5, 0.014, -4], undefined, false, false)
  addMesh(group, hzZ, hzMat, [-0.5, 0.014, 4], undefined, false, false)

  const wallMat = industrialMaterial('concrete', [Math.max(1, Math.round(hallLen / 6)), 8])
  const endWallMat = industrialMaterial('concreteDark', [7, 8])
  addMesh(group, track(new THREE.BoxGeometry(0.4, 30, 46)), endWallMat, [hallMinX - 0.2, 15, 8])
  addMesh(group, track(new THREE.BoxGeometry(0.4, 30, 46)), endWallMat, [hallMaxX + 0.2, 15, 8])
  addMesh(group, track(new THREE.BoxGeometry(hallLen, 30, 0.4)), wallMat, [hallMidX, 15, 30.2])

  addMesh(group, track(new THREE.BoxGeometry(52, 30, 0.4)), wallMat, [-24, 15, -14.2])
  addMesh(group, track(new THREE.BoxGeometry(hallMaxX - 12, 30, 0.4)), wallMat, [12 + (hallMaxX - 12) / 2, 15, -14.2])
  addMesh(group, track(new THREE.BoxGeometry(10, 5, 0.4)), wallMat, [7, 2.5, -14.2])
  addMesh(group, track(new THREE.BoxGeometry(10, 22, 0.4)), wallMat, [7, 19, -14.2])

  const steelBandMat = industrialMaterial('steelPanel', [20, 1])
  const bandGeo = track(new THREE.BoxGeometry(hallLen, 0.6, 0.06))
  for (const by of [4.8, 12.0]) {
    addMesh(group, bandGeo, steelBandMat, [hallMidX, by, 13.98], undefined, false, false)
    addMesh(group, bandGeo, steelBandMat, [hallMidX, by, -13.98], undefined, false, false)
  }

  const pipeYellow = track(new THREE.MeshLambertMaterial({ color: 0xe5a323, flatShading: true }))
  const pipeBlue = track(new THREE.MeshLambertMaterial({ color: 0x3d6888, flatShading: true }))
  const pipeSteam = track(new THREE.MeshLambertMaterial({ color: 0x5a5c60, flatShading: true }))
  const pipeYGeo = track(new THREE.CylinderGeometry(0.08, 0.08, hallLen, 8))
  const pipeBGeo = track(new THREE.CylinderGeometry(0.06, 0.06, hallLen, 8))
  const pipeSGeo = track(new THREE.CylinderGeometry(0.18, 0.18, hallLen, 8))
  for (const g of [pipeYGeo, pipeBGeo, pipeSGeo]) g.rotateZ(Math.PI / 2)
  for (const pz of [-13.7, 13.7]) {
    addMesh(group, pipeYGeo, pipeYellow, [hallMidX, 3.2, pz], undefined, true, false)
    addMesh(group, pipeBGeo, pipeBlue, [hallMidX, 3.6, pz], undefined, true, false)
    addMesh(group, pipeSGeo, pipeSteam, [hallMidX, 9.5, pz], undefined, true, false)
  }

  const trayMat = industrialMaterial('grate', [20, 1])
  const trayGeo = track(new THREE.BoxGeometry(hallLen, 0.12, 0.5))
  for (const tz of [-13.7, 13.7]) addMesh(group, trayGeo, trayMat, [hallMidX, 11.2, tz], undefined, true, false)

  const glassMat = track(new THREE.MeshStandardMaterial({
    color: 0x90c5e0, transparent: true, opacity: 0.35, roughness: 0.15, metalness: 0.1,
  }))
  addMesh(group, track(new THREE.BoxGeometry(10, 3, 0.06)), glassMat, [7, 6.5, -14.0], undefined, false, false)
  const fMat = industrialMaterial('steelPanel')
  addMesh(group, track(new THREE.BoxGeometry(10.2, 0.14, 0.16)), fMat, [7, 5.0, -14.0])
  addMesh(group, track(new THREE.BoxGeometry(10.2, 0.14, 0.16)), fMat, [7, 8.0, -14.0])
  addMesh(group, track(new THREE.BoxGeometry(0.14, 3.0, 0.16)), fMat, [2.0, 6.5, -14.0])
  addMesh(group, track(new THREE.BoxGeometry(0.14, 3.0, 0.16)), fMat, [12.0, 6.5, -14.0])

  const roomMat = industrialMaterial('concreteDark')
  addMesh(group, track(new THREE.BoxGeometry(10.6, 0.2, 3.4)), roomMat, [7, 4.9, -15.7])
  addMesh(group, track(new THREE.BoxGeometry(10.6, 0.2, 3.4)), roomMat, [7, 8.2, -15.7])
  addMesh(group, track(new THREE.BoxGeometry(10.6, 3.2, 0.2)), roomMat, [7, 6.5, -17.4])
  const obsLight = new THREE.PointLight(0xdfefff, 25, 14, 1.6)
  obsLight.position.set(7, 7.4, -15.5)
  group.add(obsLight)

  addMesh(group, track(new THREE.BoxGeometry(8, 0.75, 0.6)), fMat, [7, 5.37, -14.6])

  const coatMat = track(new THREE.MeshLambertMaterial({ color: 0xe8ecea, flatShading: true }))
  const headMat = track(new THREE.MeshLambertMaterial({ color: 0xd29d78, flatShading: true }))
  const bodyGeo = track(new THREE.CapsuleGeometry(0.28, 0.85, 4, 8))
  const headGeo = track(new THREE.SphereGeometry(0.18, 8, 8))
  for (const sx of [5.2, 8.8]) {
    addMesh(group, bodyGeo, coatMat, [sx, 5.55, -15.2])
    addMesh(group, headGeo, headMat, [sx, 6.25, -15.2])
  }

  const trussBarGeo = track(new THREE.BoxGeometry(0.3, 0.6, 46))
  const trussMat = industrialMaterial('steelPanel')
  for (let x = hallMinX + 1; x <= hallMaxX - 1; x += 10) {
    addMesh(group, trussBarGeo, trussMat, [x, 30, 8], undefined, true, false)
  }
  const trussRunGeo = track(new THREE.BoxGeometry(hallLen, 0.25, 0.25))
  for (const z of [-10, -5, 0, 5, 10]) {
    addMesh(group, trussRunGeo, trussMat, [hallMidX, 30, z], undefined, true, false)
  }

  const signPlateGeo = track(new THREE.PlaneGeometry(0.7, 0.45))
  for (let x = 10; x <= opts.maxX; x += 10) {
    const sTex = track(signTexture(`${x}`, '#f2c400', '#1b1b1b', 96, 64))
    const sMat = track(new THREE.MeshLambertMaterial({ map: sTex }))
    addMesh(group, signPlateGeo, sMat, [x, 2.5, -13.98], undefined, false, false)
  }
  const bigSign1 = track(new THREE.PlaneGeometry(3.0, 0.9))
  const sTex1 = track(signTexture(tr('КАМЕРА 3'), '#f2c400', '#1b1b1b', 256, 80))
  const sMat1 = track(new THREE.MeshLambertMaterial({ map: sTex1 }))
  addMesh(group, bigSign1, sMat1, [-24.98, 8.5, 0], [0, Math.PI / 2, 0], false, false)

  const bigSign2 = track(new THREE.PlaneGeometry(4.8, 0.65))
  const sTex2 = track(signTexture(tr('ОТДЕЛ ПРИКЛАДНОЙ МЕХАНИКИ'), '#cfd3cc', '#1b1b1b', 512, 64))
  const sMat2 = track(new THREE.MeshLambertMaterial({ map: sTex2 }))
  addMesh(group, bigSign2, sMat2, [-24.98, 7.0, 0], [0, Math.PI / 2, 0], false, false)

  const bollardGeo = track(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 10))
  bollardGeo.translate(0, 0.425, 0)
  const bollardMat = track(new THREE.MeshLambertMaterial({ color: 0xf2c400, flatShading: true }))
  const bollards = track(new THREE.InstancedMesh(bollardGeo, bollardMat, 16))
  bollards.castShadow = true
  const dummy = new THREE.Object3D()
  const bollardCoords = [
    [-8, -4.6], [-8, 4.6], [7.5, -4.6], [7.5, 4.6],
    [15, -4.6], [15, 4.6], [24, -4.6], [24, 4.6],
    [-18, -4.6], [-18, 4.6], [32, -4.6], [32, 4.6],
    [40, -4.6], [40, 4.6], [50, -4.6], [50, 4.6],
  ]
  bollardCoords.forEach(([bx, bz], i) => {
    dummy.position.set(bx, 0, bz); dummy.updateMatrix()
    bollards.setMatrixAt(i, dummy.matrix)
  })
  bollards.instanceMatrix.needsUpdate = true
  group.add(bollards)

  const warnTex = track(signTexture(tr('ОСТОРОЖНО: ЗОНА ИСПЫТАНИЙ'), '#f2c400', '#1b1b1b', 384, 64))
  const warnMat = track(new THREE.MeshLambertMaterial({ map: warnTex, side: THREE.DoubleSide }))
  addMesh(group, track(new THREE.PlaneGeometry(1.6, 0.35)), warnMat, [-8, 1.1, 4.6])

  const rustMat = industrialMaterial('rust')
  addMesh(group, track(new THREE.BoxGeometry(1.4, 0.12, 1.4)), rustMat, [16, 0.06, -10])
  const crateMat = industrialMaterial('steelPanel')
  addMesh(group, track(new THREE.BoxGeometry(0.7, 0.65, 0.7)), crateMat, [15.8, 0.445, -10.2])
  addMesh(group, track(new THREE.BoxGeometry(0.65, 0.6, 0.65)), rustMat, [16.2, 0.42, -9.8])

  const cartGroup = new THREE.Group()
  cartGroup.position.set(-4, 0, -9.5)
  addMesh(cartGroup, track(new THREE.BoxGeometry(1.0, 0.8, 0.6)), fMat, [0, 0.45, 0])
  const crtMat = track(new THREE.MeshBasicMaterial({ map: track(makeCRTScreenTexture()) }))
  addMesh(cartGroup, track(new THREE.BoxGeometry(0.48, 0.4, 0.38)), industrialMaterial('concreteDark'), [0, 1.05, 0])
  addMesh(cartGroup, track(new THREE.PlaneGeometry(0.38, 0.3)), crtMat, [0, 1.05, 0.195])
  group.add(cartGroup)

  const spoolDiscGeo = track(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 14))
  const spoolCoreGeo = track(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 14))
  for (const [sx, sz] of [[9, 10], [-17, -10.5]]) {
    const spool = new THREE.Group()
    spool.position.set(sx, 0.55, sz)
    spool.rotation.x = Math.PI / 2
    addMesh(spool, spoolDiscGeo, crateMat, [0, -0.35, 0])
    addMesh(spool, spoolDiscGeo, crateMat, [0, 0.35, 0])
    addMesh(spool, spoolCoreGeo, industrialMaterial('concreteDark'), [0, 0, 0])
    group.add(spool)
  }

  const extGroup = new THREE.Group()
  extGroup.position.set(-2, 1.3, -13.8)
  addMesh(extGroup, track(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 10)), track(new THREE.MeshLambertMaterial({ color: 0xcc1818, flatShading: true })), [0, 0, 0])
  addMesh(extGroup, track(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8)), industrialMaterial('concreteDark'), [0, 0.26, 0])
  group.add(extGroup)

  const crashTex = track(makeCrashTargetTexture())
  const targetItems: TargetItem[] = []
  const targetObjects: THREE.Object3D[] = []
  group.userData.targets = targetObjects

  for (const t of opts.targets) {
    const tGroup = new THREE.Group()
    tGroup.position.set(t.x, 0, 0)

    if (t.h !== undefined && t.h > 0) {
      const h = t.h
      const blockMat = track(new THREE.MeshLambertMaterial({ map: industrialTexture('concrete') }))
      addMesh(tGroup, track(new THREE.BoxGeometry(2.0, h, 12)), blockMat, [1.0, h / 2, 0])
      addMesh(tGroup, track(new THREE.BoxGeometry(2.04, 0.4, 12.04)), industrialMaterial('hazard', [12, 1]), [1.0, h - 0.2, 0])

      const crater = addMesh(tGroup, track(new THREE.CircleGeometry(0.85, 16)), track(new THREE.MeshLambertMaterial({ color: 0x141416 })), [-0.02, h * 0.5, 0], [0, -Math.PI / 2, 0])
      crater.visible = false

      const chunksGroup = new THREE.Group()
      const cGeo = track(new THREE.DodecahedronGeometry(0.3, 0))
      addMesh(chunksGroup, cGeo, blockMat, [-0.6, 0.15, 0.5], [0.2, 0.5, 0.1])
      addMesh(chunksGroup, cGeo, blockMat, [-1.0, 0.15, -0.6], [0.6, 0.1, 0.4])
      chunksGroup.visible = false
      tGroup.add(chunksGroup)

      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) {
          crater.visible = hit
          chunksGroup.visible = hit
          blockMat.emissive.setHex(hit ? 0x442222 : 0x000000)
        },
      })
    } else {
      const pH = Math.max(1.2, t.r + 0.4)
      const r = t.r
      const legGeo = track(new THREE.CylinderGeometry(0.035, 0.035, pH * 1.08, 6))
      const metalMat = industrialMaterial('steelPanel')
      for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
        const leg = addMesh(tGroup, legGeo, metalMat, [Math.cos(a) * r * 0.35, pH * 0.5, Math.sin(a) * r * 0.35])
        leg.rotation.set(-Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3)
      }

      const ringGeo = track(new THREE.RingGeometry(Math.max(0.05, r - 0.18), r, 48))
      ringGeo.rotateX(-Math.PI / 2)
      const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xff6a13, transparent: true, opacity: 0.65, depthWrite: false }))
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.y = 0.02
      tGroup.add(ring)

      const pivot = new THREE.Group()
      pivot.position.set(0, pH, 0)
      const plateMat = track(new THREE.MeshLambertMaterial({ map: crashTex }))
      const plateGeo = track(new THREE.CircleGeometry(r, 28))
      plateGeo.rotateY(-Math.PI / 2)
      addMesh(pivot, plateGeo, plateMat, [-0.06, 0, 0]) // 3 cm proud of the steel backing: coplanar faces flicker
      addMesh(pivot, track(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.06, 24)), metalMat, [0, 0, 0], [0, 0, Math.PI / 2])
      tGroup.add(pivot)

      targetItems.push({
        spec: t, group: tGroup,
        setHit(hit: boolean) {
          if (hit) {
            pivot.rotation.z = -0.55
            pivot.rotation.y = 0.25
            plateMat.emissive.setHex(0xff3300)
            ringMat.color.setHex(0xffea55)
          } else {
            pivot.rotation.set(0, 0, 0)
            plateMat.emissive.setHex(0x000000)
            ringMat.color.setHex(0xff6a13)
          }
        },
      })
    }

    group.add(tGroup)
    targetObjects.push(tGroup)
  }

  return {
    group, fog, background,
    indoor: true,
    palette: { accent: '#ff6a13', ground: '#8a877c', sky: '#0f1112' },
    update(t: number): void {
      for (const item of targetItems) {
        if (item.spec.moving) item.group.position.x = item.spec.x + item.spec.moving.speed * t
      }
      if (alarmOn) {
        for (const b of beacons) {
          b.cone.rotation.y = t * 8
          b.light.intensity = 10 + Math.sin(t * 12) * 8
        }
      } else {
        for (const b of beacons) b.light.intensity = 0
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
