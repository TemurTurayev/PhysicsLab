import * as THREE from 'three'
import { addRegolithField, earthTexture, placeEarth } from '../moonDressing'
import { addGroundDetail } from '../../textures/groundDetail'
import type { Target } from '../../../levels/types'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from '../types'
import { industrialMaterial, signTexture } from '../../textures/industrial'

interface TargetItem {
  spec: Target
  group: THREE.Group
  pivot?: THREE.Group
  ringMat?: THREE.MeshBasicMaterial
  plateMat?: THREE.MeshLambertMaterial
  radarDish?: THREE.Mesh
  dustGeo?: THREE.BufferGeometry
  dustPoints?: THREE.Points
  dustVels?: Float32Array
  hitT: number | null
  crater?: THREE.Mesh
  setHit(hit: boolean, now: number): void
}

interface Beacon {
  cone: THREE.Mesh
  light: THREE.PointLight
}

let seed = 1998
function rand(): number {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

/** Flat lane for the physics, low swells beyond |z| = 6. */
function stationHeight(gx: number, gz: number): number {
  if (Math.abs(gz) < 6) return 0
  const blend = Math.min(1, (Math.abs(gz) - 6) / 6)
  return (Math.sin(gx * 0.04) * Math.cos(gz * 0.05) * 1.6 + Math.sin(gx * 0.08 + gz * 0.07) * 0.7) * blend
}

function isReserved(x: number, z: number, maxX: number, m = 0.6): boolean {
  if (x >= -6.5 - m && x <= 5.5 + m && Math.abs(z) <= 3.8 + m) return true
  if (x >= -13.0 - m && x <= -5.5 && Math.abs(z) <= 3.5 + m) return true
  if (x >= 0 && x <= maxX + 15 && Math.abs(z) <= 4.0 + m) return true
  if (Math.hypot(x - 28, z + 22) < 5.5) return true
  if (x >= -14 && x <= 12 && z >= -22 && z <= -14) return true
  return false
}

function makeCrashTargetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const rings = [[126, '#1b1b1b'], [100, '#ff6a13'], [75, '#1b1b1b'], [50, '#ff6a13'], [25, '#1b1b1b'], [10, '#ff6a13']] as const
    for (const [r, c] of rings) { ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill() }
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(125, 0, 6, 256); ctx.fillRect(0, 125, 256, 6)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter
  return tex
}

export const createLunarStation: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  seed = 1998
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

  const SUN_DIR = new THREE.Vector3(-0.6, 0.35, 0.5).normalize()
  const sun = new THREE.DirectionalLight(0xffffff, 3.4)
  sun.position.copy(SUN_DIR).multiplyScalar(100)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = 0.03; sun.shadow.bias = -0.0002
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 180
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 40
  sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25
  sun.target.position.set(5, 0, 0)
  group.add(sun, sun.target, new THREE.HemisphereLight(0x8899aa, 0x2a2a2a, 0.3))

  const sunDisk = new THREE.Mesh(track(new THREE.CircleGeometry(16, 20)), track(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, depthWrite: false })))
  sunDisk.position.copy(SUN_DIR).multiplyScalar(800); sunDisk.lookAt(0, 0, 0); group.add(sunDisk)

  const STAR_COUNT = 1500
  const starPos = new Float32Array(STAR_COUNT * 3), starCol = new Float32Array(STAR_COUNT * 3)
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = rand() * Math.PI * 2, phi = Math.acos(2 * rand() - 1), r = 900
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta); starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta); starPos[i * 3 + 2] = r * Math.cos(phi)
    const b = 0.45 + rand() * 0.55, t = rand(), col = t > 0.82 ? [b * 0.85, b * 0.92, b] : (t < 0.18 ? [b, b * 0.88, b * 0.78] : [b, b, b])
    starCol[i * 3] = col[0]; starCol[i * 3 + 1] = col[1]; starCol[i * 3 + 2] = col[2]
  }
  const starGeo = track(new THREE.BufferGeometry()); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3)); starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3))
  group.add(new THREE.Points(starGeo, track(new THREE.PointsMaterial({ size: 1.8, vertexColors: true, sizeAttenuation: false, fog: false, depthWrite: false }))))

  placeEarth(group, track, track(earthTexture()), 0x3d94ff)

  const groundMinX = -100, groundMaxX = opts.maxX + 80, groundW = groundMaxX - groundMinX
  const groundGeo = track(new THREE.PlaneGeometry(groundW, 240, 100, 70))
  groundGeo.rotateX(-Math.PI / 2); groundGeo.translate((groundMinX + groundMaxX) / 2, 0, 0)
  const gPos = groundGeo.attributes.position, gCol = new Float32Array(gPos.count * 3)
  const [cRegolith, cDarkPatch, cLightPatch] = [new THREE.Color('#9a9893'), new THREE.Color('#6f6d69'), new THREE.Color('#afada8')]
  for (let i = 0; i < gPos.count; i++) {
    const gx = gPos.getX(i), gz = gPos.getZ(i)
    gPos.setY(i, stationHeight(gx, gz))
    const n = Math.sin(gx * 0.05 + gz * 0.07) * 0.5 + Math.cos(gx * 0.1 - gz * 0.06) * 0.5
    const c = cRegolith.clone()
    if (n > 0.15) c.lerp(cLightPatch, Math.min(1, (n - 0.15) * 1.4))
    else if (n < -0.15) c.lerp(cDarkPatch, Math.min(1, (-n - 0.15) * 1.4))
    gCol[i * 3] = c.r; gCol[i * 3 + 1] = c.g; gCol[i * 3 + 2] = c.b
  }
  groundGeo.computeVertexNormals(); groundGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3))
  const groundMat = track(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))
  track(addGroundDetail(groundMat, 'regolith', groundW, 240))
  const groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.receiveShadow = true; group.add(groundMesh)

  addRegolithField(group, track, { maxX: opts.maxX, rand, reserved: (x, z) => isReserved(x, z, opts.maxX, 1.2), heightAt: stationHeight })

  const craterRimMat = track(new THREE.MeshLambertMaterial({ color: 0x9a9893, flatShading: true })), craterBowlMat = track(new THREE.MeshLambertMaterial({ color: 0x55534f, flatShading: true }))
  const craterSpecs: [number, number, number][] = [[-35, -34, 7], [22, -38, 9], [68, -42, 11], [115, -46, 14], [-28, 28, 6], [32, 32, 8], [80, 36, 10], [opts.maxX + 35, -24, 13]]
  for (const [cx, cz, cr] of craterSpecs) {
    const rimGeo = track(new THREE.TorusGeometry(cr, cr * 0.18, 5, 16)); rimGeo.rotateX(Math.PI / 2)
    addMesh(group, rimGeo, craterRimMat, [cx, 0.08, cz], undefined, true, true)
    const bowlGeo = track(new THREE.CircleGeometry(cr * 0.92, 16)); bowlGeo.rotateX(-Math.PI / 2)
    addMesh(group, bowlGeo, craterBowlMat, [cx, 0.03, cz], undefined, false, true)
  }

  addMesh(group, track(new THREE.BoxGeometry(13, 0.12, 8)), industrialMaterial('concreteDark', [4, 2]), [-0.5, -0.03, 0], undefined, false, true)
  const hzXMat = industrialMaterial('hazard', [8, 1]), hzZMat = industrialMaterial('hazard', [5, 1])
  for (const pz of [-4, 4]) addMesh(group, track(new THREE.BoxGeometry(13.2, 0.008, 0.24)), hzXMat, [-0.5, 0.036, pz], undefined, false, false)
  for (const px of [-7, 6]) addMesh(group, track(new THREE.BoxGeometry(0.24, 0.008, 8.24)), hzZMat, [px, 0.036, 0], undefined, false, false)
  const trackMat = track(new THREE.MeshLambertMaterial({ color: 0x65635f, flatShading: true }))
  for (const rz of [-2.4, 2.4]) addMesh(group, track(new THREE.PlaneGeometry(24, 0.3)), trackMat, [1, 0.012, rz], [-Math.PI / 2, 0, 0], false, false)

  const whiteModuleMat = track(new THREE.MeshLambertMaterial({ color: 0xdfdfdb, flatShading: true })), orangeStripeMat = track(new THREE.MeshLambertMaterial({ color: 0xff6a13, flatShading: true }))
  const steelMat = industrialMaterial('steelPanel'), windowLitMat = track(new THREE.MeshBasicMaterial({ color: 0xffe699 }))

  const hab1 = new THREE.Group(); hab1.position.set(-8, 2.2, -18)
  const mod1Geo = track(new THREE.CylinderGeometry(2.0, 2.0, 9.0, 14)); mod1Geo.rotateZ(Math.PI / 2); addMesh(hab1, mod1Geo, whiteModuleMat, [0, 0, 0])
  const bandGeo = track(new THREE.CylinderGeometry(2.02, 2.02, 0.6, 14)); bandGeo.rotateZ(Math.PI / 2)
  addMesh(hab1, bandGeo, orangeStripeMat, [-3.2, 0, 0]); addMesh(hab1, bandGeo, orangeStripeMat, [3.2, 0, 0])
  const capGeo = track(new THREE.SphereGeometry(2.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2))
  addMesh(hab1, capGeo, whiteModuleMat, [-4.5, 0, 0], [0, 0, Math.PI / 2]); addMesh(hab1, capGeo, whiteModuleMat, [4.5, 0, 0], [0, 0, -Math.PI / 2])
  addMesh(hab1, track(new THREE.CylinderGeometry(0.8, 0.8, 0.2, 10)), steelMat, [4.6, 0, 0], [0, 0, Math.PI / 2])
  const winGeo = track(new THREE.PlaneGeometry(0.5, 0.4))
  for (const wx of [-2, -0.7, 0.7, 2]) addMesh(hab1, winGeo, windowLitMat, [wx, 0.2, 2.02], undefined, false, false)
  const legGeo = track(new THREE.BoxGeometry(0.2, 2.0, 0.2))
  for (const lx of [-3, 3]) for (const lz of [-1.5, 1.5]) addMesh(hab1, legGeo, steelMat, [lx, -1.0, lz])
  group.add(hab1)

  const hab2 = new THREE.Group(); hab2.position.set(7, 2.0, -18)
  const mod2Geo = track(new THREE.CylinderGeometry(1.8, 1.8, 7.0, 14)); mod2Geo.rotateZ(Math.PI / 2); addMesh(hab2, mod2Geo, whiteModuleMat, [0, 0, 0])
  const band2Geo = track(new THREE.CylinderGeometry(1.82, 1.82, 0.5, 14)); band2Geo.rotateZ(Math.PI / 2)
  addMesh(hab2, band2Geo, orangeStripeMat, [-2.5, 0, 0]); addMesh(hab2, band2Geo, orangeStripeMat, [2.5, 0, 0])
  for (const lx of [-2.2, 2.2]) for (const lz of [-1.3, 1.3]) addMesh(hab2, legGeo, steelMat, [lx, -1.0, lz])
  group.add(hab2)

  const tunnelGeo = track(new THREE.CylinderGeometry(0.8, 0.8, 6.0, 10)); tunnelGeo.rotateZ(Math.PI / 2); addMesh(group, tunnelGeo, steelMat, [-0.5, 1.8, -18])
  const ringTGeo = track(new THREE.TorusGeometry(0.85, 0.06, 6, 12)); ringTGeo.rotateY(Math.PI / 2)
  for (let tx = -3; tx <= 2; tx += 1.2) addMesh(group, ringTGeo, orangeStripeMat, [tx, 1.8, -18])

  addMesh(group, track(new THREE.PlaneGeometry(6.4, 0.8)), track(new THREE.MeshLambertMaterial({ map: track(signTexture('СТАНЦИЯ СИГМА-Л · ИСПЫТАТЕЛЬНЫЙ ПОЛИГОН', '#ff6a13', '#0e1112', 512, 64)) })), [-8, 4.4, -15.96], undefined, false, false)

  const coneGeo = track(new THREE.ConeGeometry(0.18, 0.38, 8)); coneGeo.rotateX(-Math.PI / 2)
  const beaconMat = track(new THREE.MeshStandardMaterial({ color: 0xff6a13, emissive: 0xff4400, emissiveIntensity: 3.0, toneMapped: false }))
  const beacons: Beacon[] = []
  for (const [bx, by, bz] of [[-8, 4.4, -18], [7, 4.0, -18]] as const) {
    addMesh(group, track(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8)), steelMat, [bx, by, bz])
    const cone = addMesh(group, coneGeo, beaconMat, [bx, by + 0.25, bz], undefined, false, false)
    const light = new THREE.PointLight(0xff4400, 0, 16, 2); light.position.set(bx, by + 0.3, bz)
    group.add(light); beacons.push({ cone, light })
  }
  let alarmOn = false
  group.userData.setAlarm = (on: boolean): void => { alarmOn = on }

  const lander = new THREE.Group(); lander.position.set(28, 0, -22)
  const goldMat = track(new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.85, flatShading: true }))
  addMesh(lander, track(new THREE.CylinderGeometry(2.3, 2.5, 1.5, 8)), goldMat, [0, 1.35, 0])
  addMesh(lander, track(new THREE.ConeGeometry(0.6, 0.8, 8)), steelMat, [0, 0.45, 0], [Math.PI, 0, 0])
  const legStrutGeo = track(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6)), footGeo = track(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 8))
  for (const [lx, lz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
    const leg = addMesh(lander, legStrutGeo, steelMat, [lx * 1.05, 0.9, lz * 1.05])
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(lx, -1.2, lz).normalize())
    addMesh(lander, footGeo, steelMat, [lx * 1.7, 0.04, lz * 1.7])
  }
  addMesh(lander, track(new THREE.CylinderGeometry(1.6, 1.8, 1.5, 8)), whiteModuleMat, [0, 2.85, 0])
  addMesh(lander, track(new THREE.CylinderGeometry(1.82, 1.82, 0.25, 8)), orangeStripeMat, [0, 2.3, 0])
  addMesh(lander, track(new THREE.BoxGeometry(0.8, 0.4, 0.1)), track(new THREE.MeshBasicMaterial({ color: 0x112233 })), [0, 3.1, 1.62], undefined, false, false)
  addMesh(lander, track(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6)), steelMat, [0.8, 4.3, 0]); group.add(lander)

  const mastGroup = new THREE.Group(); mastGroup.position.set(-18, 0, -21)
  addMesh(mastGroup, track(new THREE.CylinderGeometry(0.1, 0.25, 12, 6)), steelMat, [0, 6, 0])
  for (const my of [3, 6, 9, 12]) addMesh(mastGroup, track(new THREE.RingGeometry(0.2, 0.6, 6)), steelMat, [0, my, 0], [-Math.PI / 2, 0, 0])
  addMesh(mastGroup, track(new THREE.SphereGeometry(2.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 3)), whiteModuleMat, [0, 12.6, 0], [0.8, 0.4, 0])
  addMesh(mastGroup, track(new THREE.ConeGeometry(0.12, 1.4, 6)), steelMat, [0.4, 13.4, -0.6], [-0.8, 0, 0]); group.add(mastGroup)

  const solarMat = track(new THREE.MeshStandardMaterial({ color: 0x14223d, roughness: 0.25, metalness: 0.6, flatShading: true }))
  const panelGeo = track(new THREE.BoxGeometry(4.2, 1.8, 0.08)), pMastGeo = track(new THREE.CylinderGeometry(0.07, 0.09, 3.0, 6))
  for (const [sx, sz] of [[-2, -23], [16, -24]] as const) {
    addMesh(group, pMastGeo, steelMat, [sx, 1.5, sz])
    addMesh(group, panelGeo, solarMat, [sx, 3.0, sz], [-0.55, 0.4, 0])
    addMesh(group, track(new THREE.BoxGeometry(4.24, 0.06, 0.1)), orangeStripeMat, [sx, 3.0, sz], [-0.55, 0.4, 0])
  }

  const signPostGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6)), signPlateGeo = track(new THREE.PlaneGeometry(0.7, 0.4))
  for (let x = 20; x <= opts.maxX; x += 20) {
    addMesh(group, signPostGeo, steelMat, [x, 0.45, -4.5])
    const sMat = track(new THREE.MeshLambertMaterial({ map: track(signTexture(`${x} м`, '#ff6a13', '#0e1112', 128, 64)), side: THREE.DoubleSide }))
    addMesh(group, signPlateGeo, sMat, [x, 0.72, -4.48], undefined, false, false)
  }

  const dustMat = track(new THREE.PointsMaterial({ color: 0xb5b3ac, size: 0.18, depthWrite: false }))
  const crashTex = track(makeCrashTargetTexture())
  const targetItems: TargetItem[] = [], targetObjects: THREE.Object3D[] = []
  group.userData.targets = targetObjects
  let lastT = 0

  for (const t of opts.targets) {
    const tGroup = new THREE.Group(); tGroup.position.set(t.x, 0, 0)
    if (t.h !== undefined && t.h > 0) {
      const h = t.h, blockMat = track(new THREE.MeshLambertMaterial({ color: 0x8a877c }))
      addMesh(tGroup, track(new THREE.BoxGeometry(2.0, h, 12)), blockMat, [1.0, h / 2, 0])
      addMesh(tGroup, track(new THREE.BoxGeometry(2.04, 0.4, 12.04)), hzXMat, [1.0, h - 0.2, 0])
      const crater = addMesh(tGroup, track(new THREE.CircleGeometry(0.85, 16)), track(new THREE.MeshLambertMaterial({ color: 0x141416 })), [-0.02, h * 0.5, 0], [0, -Math.PI / 2, 0], false, false)
      crater.visible = false
      targetItems.push({
        spec: t, group: tGroup, crater, hitT: null,
        setHit(hit: boolean) { crater.visible = hit; blockMat.emissive.setHex(hit ? 0x442222 : 0x000000) },
      })
    } else {
      const DUST_N = 24, dustPos = new Float32Array(DUST_N * 3), dustVels = new Float32Array(DUST_N * 3)
      for (let k = 0; k < DUST_N; k++) {
        dustVels[k * 3] = -0.6 - ((k * 17) % 11) * 0.22; dustVels[k * 3 + 1] = 1.6 + ((k * 23) % 13) * 0.25; dustVels[k * 3 + 2] = (((k * 31) % 15) - 7) * 0.22
      }
      const dustGeo = track(new THREE.BufferGeometry()); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
      const dustPoints = new THREE.Points(dustGeo, dustMat); dustPoints.visible = false; tGroup.add(dustPoints)

      const pH = Math.max(1.2, t.r + 0.4), pivot = new THREE.Group(); pivot.position.set(0, pH, 0)
      const plateMat = track(new THREE.MeshLambertMaterial({ map: crashTex })), plateGeo = track(new THREE.CircleGeometry(t.r, 28)); plateGeo.rotateY(-Math.PI / 2)
      addMesh(pivot, plateGeo, plateMat, [-0.06, 0, 0]) // 3 cm proud of the steel backing: coplanar faces flicker
      addMesh(pivot, track(new THREE.CylinderGeometry(t.r * 0.95, t.r * 0.95, 0.06, 24)), steelMat, [0, 0, 0], [0, 0, Math.PI / 2]); tGroup.add(pivot)

      const ringGeo = track(new THREE.RingGeometry(Math.max(0.05, t.r - 0.18), t.r, 48)); ringGeo.rotateX(-Math.PI / 2)
      const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xff6a13, transparent: true, opacity: 0.65, depthWrite: false }))
      const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = 0.02; tGroup.add(ring)

      let radarDish: THREE.Mesh | undefined
      if (t.moving) {
        addMesh(tGroup, track(new THREE.BoxGeometry(1.8, 0.35, 1.3)), whiteModuleMat, [0, 0.4, 0])
        addMesh(tGroup, track(new THREE.BoxGeometry(1.82, 0.1, 1.32)), orangeStripeMat, [0, 0.4, 0])
        const wGeo = track(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12)); wGeo.rotateX(Math.PI / 2)
        for (const wx of [-0.6, 0, 0.6]) for (const wz of [-0.78, 0.78]) addMesh(tGroup, wGeo, steelMat, [wx, 0.24, wz])
        addMesh(tGroup, track(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6)), steelMat, [0.65, 0.75, 0])
        const dGeo = track(new THREE.CylinderGeometry(0.35, 0.05, 0.12, 12)); dGeo.rotateZ(0.4)
        radarDish = addMesh(tGroup, dGeo, whiteModuleMat, [0.65, 1.0, 0])
        addMesh(tGroup, track(new THREE.CylinderGeometry(0.04, 0.04, pH, 6)), steelMat, [0, pH * 0.5, 0])
      } else {
        const legGeo = track(new THREE.CylinderGeometry(0.035, 0.035, pH * 1.08, 6))
        for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
          const leg = addMesh(tGroup, legGeo, steelMat, [Math.cos(a) * t.r * 0.35, pH * 0.5, Math.sin(a) * t.r * 0.35])
          leg.rotation.set(-Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3)
        }
      }

      const item: TargetItem = {
        spec: t, group: tGroup, pivot, ringMat, plateMat, radarDish, dustGeo, dustPoints, dustVels, hitT: null,
        setHit(hit: boolean, now: number) {
          pivot.rotation.set(0, hit ? 0.25 : 0, hit ? -0.55 : 0)
          plateMat.emissive.setHex(hit ? 0xff3300 : 0x000000)
          ringMat.color.setHex(hit ? 0xffea55 : 0xff6a13)
          dustPoints.visible = hit
          item.hitT = hit ? now : null
        },
      }
      targetItems.push(item)
    }
    group.add(tGroup); targetObjects.push(tGroup)
  }

  return {
    group,
    fog: null,
    background: new THREE.Color('#000000'),
    skirt: '#8a8883',
    palette: { accent: '#ff6a13', ground: '#9a9893', sky: '#000000' },
    update(t: number): void {
      lastT = t
      for (const item of targetItems) {
        if (item.radarDish) item.radarDish.rotation.y = t * 4
        if (item.hitT !== null && item.dustGeo && item.dustVels) {
          const dt = t - item.hitT
          const pArr = (item.dustGeo.attributes.position as THREE.BufferAttribute).array as Float32Array
          for (let k = 0; k < 24; k++) {
            pArr[k * 3] = item.dustVels[k * 3] * dt
            pArr[k * 3 + 1] = Math.max(0, item.dustVels[k * 3 + 1] * dt - 0.5 * 1.62 * dt * dt)
            pArr[k * 3 + 2] = item.dustVels[k * 3 + 2] * dt
          }
          item.dustGeo.attributes.position.needsUpdate = true
        }
      }
      if (alarmOn) {
        for (const b of beacons) {
          b.cone.rotation.y = t * 8; b.light.intensity = 12 + Math.sin(t * 12) * 8
        }
      } else {
        for (const b of beacons) b.light.intensity = 0
      }
    },
    setHit(index: number | null): void {
      for (let i = 0; i < targetItems.length; i++) targetItems[i].setHit(index === i, lastT)
    },
    dispose(): void {
      for (const d of disposables) d.dispose()
      group.clear()
    },
  }
}
