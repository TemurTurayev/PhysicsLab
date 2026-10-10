import { tr } from '../../../i18n'
import * as THREE from 'three'
import { addRegolithField, earthTexture, placeEarth } from './moonDressing'
import { addGroundDetail } from '../textures/groundDetail'
import type { Target } from '../../levels/types'
import { woodMaterial } from '../wood'
import type { Environment, EnvironmentFactory, EnvironmentOptions } from './types'

let seed = 42
function rand(): number {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

/** Flat lane for the physics, gentle swells beyond |z| = 6. */
function moonHeight(gx: number, gz: number): number {
  const d = Math.abs(gz) - 6
  if (d <= 0) return 0
  return Math.max(0, (d / 16) * (Math.sin(gx * 0.05 + 1.2) * Math.cos(gz * 0.05) * 2.2 + Math.sin(gx * 0.1) * 0.6))
}

function isReserved(x: number, z: number, m = 0.5): boolean {
  if (x >= -6.5 - m && x <= 5.5 + m && Math.abs(z) <= 3.8 + m) return true
  if (x >= -13 - m && x <= -5.5 && Math.abs(z) <= 3.5 + m) return true
  return x >= -2 && Math.abs(z) <= 3.0 + m
}

function makeCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); if (ctx) draw(ctx)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex
}

function createTargetTexture(): THREE.CanvasTexture {
  return makeCanvas(256, 256, (ctx) => {
    ;([[124, '#c62828'], [96, '#f5f5f5'], [68, '#c62828'], [40, '#f5f5f5'], [16, '#c62828']] as const).forEach(([r, col]) => {
      ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill()
    })
  })
}

function createSignTexture(text: string): THREE.CanvasTexture {
  return makeCanvas(256, 64, (ctx) => {
    ctx.fillStyle = '#ecdab4'; ctx.fillRect(0, 0, 256, 64); ctx.strokeStyle = '#54391c'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, 250, 58)
    ctx.fillStyle = '#2b1b0b'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 32)
  })
}

function createStarChartTexture(): THREE.CanvasTexture {
  return makeCanvas(128, 96, (ctx) => {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 128, 96); ctx.strokeStyle = '#d4a742'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 124, 92)
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)'; ctx.lineWidth = 1; ctx.beginPath()
    ctx.moveTo(20, 30); ctx.lineTo(45, 20); ctx.lineTo(70, 45); ctx.lineTo(95, 25); ctx.lineTo(110, 60)
    ctx.moveTo(30, 70); ctx.lineTo(60, 65); ctx.lineTo(80, 80); ctx.stroke(); ctx.fillStyle = '#fbbf24'
    for (const [sx, sy] of [[20, 30], [45, 20], [70, 45], [95, 25], [110, 60], [30, 70], [60, 65], [80, 80], [50, 50], [90, 65]]) {
      ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill()
    }
  })
}

interface DustParticle { vx: number; vy: number; vz: number }
interface TargetItem {
  spec: Target; group: THREE.Group; pivot: THREE.Group; discMat: THREE.MeshLambertMaterial
  dustPoints: THREE.Points; dustVelocities: DustParticle[]; hitTime: number | null
}

export const createMoon: EnvironmentFactory = (opts: EnvironmentOptions): Environment => {
  seed = 42
  const group = new THREE.Group()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(item: T): T => (disposables.push(item), item)
  const dummy = new THREE.Object3D()
  let lastT = 0

  const addMesh = (p: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], rot?: [number, number, number], cast = true, receive = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m); mesh.position.set(...pos); if (rot) mesh.rotation.set(...rot)
    mesh.castShadow = cast; mesh.receiveShadow = receive; p.add(mesh); return mesh
  }

  // Lunar void, deep space & lighting
  const fog = null
  const background = new THREE.Color('#000000')
  const SUN_DIR = new THREE.Vector3(-0.6, 0.35, 0.5).normalize()
  group.add(new THREE.HemisphereLight(0x8899aa, 0x2a2a2a, 0.3))

  const sun = new THREE.DirectionalLight(0xffffff, 3.4)
  sun.position.copy(SUN_DIR).multiplyScalar(100); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.03
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 180; sun.shadow.camera.left = -30; sun.shadow.camera.right = 40
  sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25; sun.target.position.set(5, 0, 0)
  group.add(sun.target); group.add(sun)

  // Sun disk in the sky
  const sunDisk = new THREE.Mesh(track(new THREE.CircleGeometry(16, 20)), track(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, depthWrite: false, side: THREE.DoubleSide })))
  sunDisk.position.copy(SUN_DIR).multiplyScalar(800); sunDisk.lookAt(0, 0, 0); group.add(sunDisk)

  // Star field: 1500 stars on sphere radius 900
  const starCount = 1500; const starGeo = track(new THREE.BufferGeometry())
  const starPos = new Float32Array(starCount * 3); const starCols = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const u = rand() * 2 - 1; const theta = rand() * Math.PI * 2; const r = Math.sqrt(Math.max(0, 1 - u * u))
    starPos[i * 3] = r * Math.cos(theta) * 900; starPos[i * 3 + 1] = Math.abs(u) * 860 + 30; starPos[i * 3 + 2] = r * Math.sin(theta) * 900
    const b = 0.45 + rand() * 0.55
    starCols[i * 3] = b; starCols[i * 3 + 1] = b; starCols[i * 3 + 2] = b * (0.9 + rand() * 0.2)
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3)); starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3))
  group.add(new THREE.Points(starGeo, track(new THREE.PointsMaterial({ size: 1.5, vertexColors: true, sizeAttenuation: false, depthWrite: false }))))

  // Earth hanging over the far end of the range, where the camera looks
  placeEarth(group, track, track(earthTexture()), 0x4aa3ff)

  // Ground plane: grey regolith with subtle vertex colors, flat in lane |z| < 6
  const groundW = opts.maxX + 180 // x from -100: broken beams throw the stone ~70 m backwards
  const groundGeo = track(new THREE.PlaneGeometry(groundW, 240, 120, 75))
  groundGeo.rotateX(-Math.PI / 2); groundGeo.translate((opts.maxX - 20) / 2, 0, 0)
  const posCount = groundGeo.attributes.position.count
  const gColors = new Float32Array(posCount * 3)
  const [cRegolith, cDark] = [new THREE.Color('#9a9893'), new THREE.Color('#6f6d69')]

  for (let i = 0; i < posCount; i++) {
    const gx = groundGeo.attributes.position.getX(i); const gz = groundGeo.attributes.position.getZ(i)
    groundGeo.attributes.position.setY(i, moonHeight(gx, gz))
    const n = Math.sin(gx * 0.08) * Math.cos(gz * 0.07) * 0.5 + Math.sin(gx * 0.2 + gz * 0.18) * 0.25
    // Highlands and maria: a slow light/dark swell under the fine mottling.
    const mare = Math.sin(gx * 0.017 + 0.7) * Math.cos(gz * 0.021 - 0.4)
    const col = cRegolith.clone().lerp(cDark, Math.max(0, Math.min(1, 0.35 + n))).multiplyScalar(0.86 + 0.26 * (mare * 0.5 + 0.5))
    gColors[i * 3] = col.r; gColors[i * 3 + 1] = col.g; gColors[i * 3 + 2] = col.b
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3)); groundGeo.computeVertexNormals()
  const groundMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.05, flatShading: true }))
  track(addGroundDetail(groundMat, 'regolith', groundW, 240))
  const groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.receiveShadow = true; group.add(groundMesh)

  // Shared props materials
  const woodMat = woodMaterial('weathered'); const darkWoodMat = woodMaterial('dark')
  const brassMat = track(new THREE.MeshStandardMaterial({ color: 0xd4a742, metalness: 0.8, roughness: 0.35, flatShading: true }))
  const darkBrassMat = track(new THREE.MeshStandardMaterial({ color: 0x997022, metalness: 0.85, roughness: 0.4, flatShading: true }))
  const rimMat = track(new THREE.MeshLambertMaterial({ color: 0x8a8882, flatShading: true }))
  const bowlMat = track(new THREE.MeshLambertMaterial({ color: 0x484644, flatShading: true }))

  // Craters: rims and shallow bowls beyond |z| > 8
  const craterRimGeo = track(new THREE.TorusGeometry(1, 0.22, 4, 14)); craterRimGeo.rotateX(Math.PI / 2)
  const craterBowlGeo = track(new THREE.CircleGeometry(0.92, 14)); craterBowlGeo.rotateX(-Math.PI / 2)
  const craterList: Array<[number, number, number]> = [
    [-26, -32, 7.5], [16, -38, 9.0], [58, -45, 12.0], [105, -52, 15.0], [-18, 28, 6.0],
    [38, 34, 8.5], [82, 42, 11.0], [opts.maxX * 0.7, -35, 10.0], [opts.maxX + 35, 26, 14.0], [-35, -15, 5.0],
  ]
  for (const [cx, cz, cr] of craterList) {
    const cg = new THREE.Group(); cg.position.set(cx, 0.02, cz); cg.scale.set(cr, cr * 0.35, cr)
    addMesh(cg, craterRimGeo, rimMat, [0, 0.08, 0]); addMesh(cg, craterBowlGeo, bowlMat, [0, 0.02, 0], undefined, false, true)
    group.add(cg)
  }

  // Boulder field, pebbles and young craters on the real ground height
  addRegolithField(group, track, { maxX: opts.maxX, rand, reserved: (x, z) => isReserved(x, z, 1.2), heightAt: moonHeight })

  // Track & footprint marks along the lane near trebuchet
  const trackMesh = track(new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.24, 0.005, 0.1)), track(new THREE.MeshLambertMaterial({ color: 0x5a5854, flatShading: true })), 24))
  trackMesh.receiveShadow = true
  for (let i = 0; i < 24; i++) {
    const tx = -11 + (i / 23) * 16 + (rand() - 0.5) * 0.4; const tz = (i % 2 === 0 ? -1.8 : 1.8) + (rand() - 0.5) * 0.5
    dummy.position.set(tx, 0.004, tz); dummy.rotation.set(0, (rand() - 0.5) * 0.3, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
    trackMesh.setMatrixAt(i, dummy.matrix)
  }
  trackMesh.instanceMatrix.needsUpdate = true; group.add(trackMesh)

  // Jules-Verne Observatory at (-22, 0, -16)
  const obs = new THREE.Group(); obs.position.set(-22, 0, -16)
  addMesh(obs, track(new THREE.CylinderGeometry(3.4, 3.6, 3.2, 8)), woodMat, [0, 1.6, 0])
  const domeGeo = track(new THREE.SphereGeometry(3.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)); addMesh(obs, domeGeo, brassMat, [0, 3.2, 0])
  addMesh(obs, track(new THREE.BoxGeometry(0.7, 2.0, 3.6)), darkWoodMat, [0.4, 4.0, 0], [0, 0.4, 0])
  const scopeGeo = track(new THREE.CylinderGeometry(0.18, 0.32, 4.4, 8)); scopeGeo.rotateX(Math.PI / 2)
  addMesh(obs, scopeGeo, brassMat, [0.8, 4.2, -0.6], [-0.55, 0.4, 0])
  const lensRimGeo = track(new THREE.TorusGeometry(0.34, 0.05, 6, 12)); lensRimGeo.rotateX(Math.PI / 2)
  addMesh(obs, lensRimGeo, darkBrassMat, [0.8, 4.2, -0.6], [-0.55, 0.4, 0])
  addMesh(obs, track(new THREE.BoxGeometry(0.9, 1.8, 0.1)), darkWoodMat, [0, 1.0, 3.5])
  addMesh(obs, track(new THREE.BoxGeometry(1.4, 0.2, 0.6)), woodMat, [0, 0.1, 3.8]); group.add(obs)

  // Expedition tent with warm oil lantern
  const tent = new THREE.Group(); tent.position.set(-12, 0, -10)
  const tentMat = track(new THREE.MeshLambertMaterial({ color: 0xd8ceb8, flatShading: true }))
  addMesh(tent, track(new THREE.CylinderGeometry(1.8, 2.1, 1.1, 6)), tentMat, [0, 0.55, 0])
  addMesh(tent, track(new THREE.ConeGeometry(2.2, 1.7, 6)), tentMat, [0, 1.95, 0]); group.add(tent)

  const lanternGroup = new THREE.Group(); lanternGroup.position.set(-9.2, 0, -9.5)
  addMesh(lanternGroup, track(new THREE.BoxGeometry(0.08, 1.8, 0.08)), darkWoodMat, [0, 0.9, 0])
  addMesh(lanternGroup, track(new THREE.BoxGeometry(0.35, 0.06, 0.06)), darkWoodMat, [0.15, 1.75, 0])
  addMesh(lanternGroup, track(new THREE.CylinderGeometry(0.08, 0.12, 0.24, 6)), darkBrassMat, [0.32, 1.58, 0])
  const flameMat = track(new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff8822, emissiveIntensity: 2.8, toneMapped: false }))
  addMesh(lanternGroup, track(new THREE.SphereGeometry(0.06, 6, 6)), flameMat, [0.32, 1.58, 0], undefined, false, false)
  const lanternLight = new THREE.PointLight(0xff9933, 3.6, 9, 2); lanternLight.position.set(0.32, 1.6, 0)
  lanternGroup.add(lanternLight); group.add(lanternGroup)

  // Wooden crates
  const crateGeo = track(new THREE.BoxGeometry(0.8, 0.8, 0.8))
  const crateCoords: Array<[number, number, number, number]> = [
    [-16, 0.4, -13, 0.1], [-15.2, 0.4, -13.2, -0.2], [-15.6, 1.2, -13.1, 0.05], [-9.2, 0.4, -7.8, 0.25], [-10.0, 0.4, -7.6, -0.1],
  ]
  crateCoords.forEach(([cx, cy, cz, ry]) => addMesh(group, crateGeo, woodMat, [cx, cy, cz], [0, ry, 0]))

  // Hand-drawn star chart on an easel
  const easel = new THREE.Group(); easel.position.set(-17.5, 0, -11)
  const eLegGeo = track(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 4))
  addMesh(easel, eLegGeo, woodMat, [-0.28, 0.8, -0.08], [0.1, 0, 0.14]); addMesh(easel, eLegGeo, woodMat, [0.28, 0.8, -0.08], [0.1, 0, -0.14])
  addMesh(easel, eLegGeo, darkWoodMat, [0, 0.8, 0.32], [-0.24, 0, 0])
  addMesh(easel, track(new THREE.BoxGeometry(0.8, 0.04, 0.1)), woodMat, [0, 0.78, -0.05])
  addMesh(easel, track(new THREE.BoxGeometry(0.74, 0.54, 0.03)), woodMat, [0, 1.05, -0.08], [-0.15, 0, 0])
  addMesh(easel, track(new THREE.PlaneGeometry(0.7, 0.5)), track(new THREE.MeshLambertMaterial({ map: track(createStarChartTexture()) })), [0, 1.05, -0.06], [-0.15, 0, 0], false, false)
  group.add(easel)

  // Wooden signpost 'МОРЕ СПОКОЙСТВИЯ'
  const signpost = new THREE.Group(); signpost.position.set(-5.5, 0, -4.5)
  addMesh(signpost, track(new THREE.BoxGeometry(0.1, 1.4, 0.1)), woodMat, [0, 0.7, 0]); addMesh(signpost, track(new THREE.BoxGeometry(1.6, 0.42, 0.04)), woodMat, [0, 1.2, 0])
  const sMat = track(new THREE.MeshLambertMaterial({ map: track(createSignTexture(tr('МОРЕ СПОКОЙСТВИЯ'))), side: THREE.DoubleSide }))
  addMesh(signpost, track(new THREE.PlaneGeometry(1.56, 0.38)), sMat, [0, 1.2, 0.025], undefined, false, false); group.add(signpost)

  // Bullet-shaped brass capsule, well clear of the machine's silhouette from the main camera
  const capsule = new THREE.Group(); capsule.position.set(58, 1.2, -46); capsule.rotation.set(-0.35, 0.25, -0.42)
  addMesh(capsule, track(new THREE.CylinderGeometry(1.6, 1.6, 4.2, 14)), brassMat, [0, 2.1, 0]); addMesh(capsule, track(new THREE.ConeGeometry(1.6, 2.4, 14)), brassMat, [0, 5.4, 0])
  const flangeGeo = track(new THREE.TorusGeometry(1.65, 0.08, 6, 16)); flangeGeo.rotateX(Math.PI / 2); addMesh(capsule, flangeGeo, darkBrassMat, [0, 0.1, 0])
  const portMat = track(new THREE.MeshLambertMaterial({ color: 0x1f2937 }))
  const portGeo = track(new THREE.CircleGeometry(0.26, 12)); portGeo.rotateY(Math.PI / 2)
  for (const py of [1.5, 2.7, 3.9]) addMesh(capsule, portGeo, portMat, [1.61, py, 0], undefined, false, false)
  group.add(capsule)
  const capRimGeo = track(new THREE.TorusGeometry(3.2, 0.45, 4, 14)); capRimGeo.rotateX(Math.PI / 2); addMesh(group, capRimGeo, rimMat, [30, 0.05, -24], undefined, true, true)

  // Distance stakes every 20m along z = -4.5
  const markerGeo = track(new THREE.BoxGeometry(0.08, 0.9, 0.08)); const mPlateGeo = track(new THREE.PlaneGeometry(0.55, 0.28))
  for (let x = 20; x <= opts.maxX; x += 20) {
    addMesh(group, markerGeo, woodMat, [x, 0.45, -4.5])
    addMesh(group, mPlateGeo, track(new THREE.MeshLambertMaterial({ map: track(createSignTexture(tr(`{0} м`, [x]))), side: THREE.DoubleSide })), [x, 0.72, -4.45], undefined, true, false)
  }

  // Targets: moving cart or static stand, accent ring, ballistic dust puff
  const targetTex = track(createTargetTexture()); const hayMat = track(new THREE.MeshLambertMaterial({ color: 0xd4b055, flatShading: true }))
  const targetItems: TargetItem[] = []; const targetObjects: THREE.Object3D[] = []; group.userData.targets = targetObjects
  const DUST_COUNT = 24; const dustVelocities: DustParticle[] = []
  for (let j = 0; j < DUST_COUNT; j++) {
    const a = (j / DUST_COUNT) * Math.PI * 2; const sp = 1.0 + ((j * 7) % 11) * 0.22
    dustVelocities.push({ vx: Math.cos(a) * sp * 0.6 + 0.4, vy: 1.6 + ((j * 3) % 7) * 0.35, vz: Math.sin(a) * sp * 0.6 })
  }

  for (const t of opts.targets) {
    const tGroup = new THREE.Group(); tGroup.position.set(t.x, 0, 0); const tPivot = new THREE.Group(); tGroup.add(tPivot)
    let discMat: THREE.MeshLambertMaterial

    if (t.moving) {
      const bed = addMesh(tGroup, track(new THREE.BoxGeometry(t.r * 1.8, 0.12, t.r * 1.3)), woodMat, [0, 0.42, 0]); bed.receiveShadow = true
      const wheelRimGeo = track(new THREE.TorusGeometry(0.32, 0.035, 6, 12)); const spokeGeo = track(new THREE.BoxGeometry(0.03, 0.64, 0.03))
      for (const wx of [-t.r * 0.6, t.r * 0.6]) {
        for (const wz of [-t.r * 0.72, t.r * 0.72]) {
          const wGroup = new THREE.Group(); wGroup.position.set(wx, 0.35, wz)
          addMesh(wGroup, wheelRimGeo, darkWoodMat, [0, 0, 0], [0, Math.PI / 2, 0]); addMesh(wGroup, spokeGeo, darkWoodMat, [0, 0, 0])
          addMesh(wGroup, spokeGeo, darkWoodMat, [0, 0, 0], [0.78, 0, 0]); tGroup.add(wGroup)
        }
      }
      const baleGeo = track(new THREE.CylinderGeometry(0.55 * t.r, 0.55 * t.r, 0.25, 16)); baleGeo.rotateZ(Math.PI / 2)
      addMesh(tPivot, baleGeo, hayMat, [0, 0.55 * t.r + 0.48, 0])
      const discGeo = track(new THREE.CircleGeometry(0.52 * t.r, 20)); discGeo.rotateY(-Math.PI / 2)
      discMat = track(new THREE.MeshLambertMaterial({ map: targetTex }))
      addMesh(tPivot, discGeo, discMat, [-0.13, 0.55 * t.r + 0.48, 0], undefined, true, false)
    } else {
      const legGeo = track(new THREE.BoxGeometry(0.08, 1.6 * t.r + 0.4, 0.08))
      for (const lz of [-0.45 * t.r, 0.45 * t.r]) addMesh(tGroup, legGeo, woodMat, [0, 0.8 * t.r + 0.2, lz])
      addMesh(tGroup, track(new THREE.BoxGeometry(0.07, 1.5 * t.r + 0.3, 0.07)), darkWoodMat, [0.45 * t.r, 0.75 * t.r + 0.15, 0], [0, 0, -0.32])
      addMesh(tGroup, track(new THREE.BoxGeometry(0.08, 0.08, 1.1 * t.r)), woodMat, [0, 1.2 * t.r + 0.2, 0])
      const backBoard = addMesh(tPivot, track(new THREE.BoxGeometry(0.06, 1.1 * t.r, 1.1 * t.r)), woodMat, [0, 1.1 * t.r + 0.2, 0]); backBoard.castShadow = true
      const discGeo = track(new THREE.CircleGeometry(0.52 * t.r, 20)); discGeo.rotateY(-Math.PI / 2)
      discMat = track(new THREE.MeshLambertMaterial({ map: targetTex }))
      addMesh(tPivot, discGeo, discMat, [-0.035, 1.1 * t.r + 0.2, 0], undefined, true, false)
    }

    const zoneGeo = track(new THREE.RingGeometry(Math.max(0.1, t.r - 0.2), t.r, 48)); zoneGeo.rotateX(-Math.PI / 2)
    const zone = new THREE.Mesh(zoneGeo, track(new THREE.MeshBasicMaterial({ color: 0xf0a640, transparent: true, opacity: 0.65, depthWrite: false })))
    zone.position.y = 0.03; tGroup.add(zone)

    const dustGeo = track(new THREE.BufferGeometry()); dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_COUNT * 3), 3))
    const dustPoints = new THREE.Points(dustGeo, track(new THREE.PointsMaterial({ color: 0x9a9893, size: 0.18, transparent: true, opacity: 0.85, depthWrite: false })))
    dustPoints.position.set(0, 0.9 * t.r, 0); dustPoints.visible = false; tGroup.add(dustPoints)
    group.add(tGroup); targetObjects.push(tGroup)
    targetItems.push({ spec: t, group: tGroup, pivot: tPivot, discMat, dustPoints, dustVelocities, hitTime: null })
  }

  return {
    group, fog, background,
    skirt: '#8a8883',
    palette: { accent: '#f0a640', ground: '#9a9893', sky: '#000000' },
    update(t: number): void {
      lastT = t
      for (const item of targetItems) {
        if (item.hitTime !== null) {
          const dt = t - item.hitTime
          const posAttr = item.dustPoints.geometry.attributes.position as THREE.BufferAttribute
          const arr = posAttr.array as Float32Array
          for (let j = 0; j < DUST_COUNT; j++) {
            const v = item.dustVelocities[j]
            arr[j * 3] = v.vx * dt
            arr[j * 3 + 1] = Math.max(-0.8, v.vy * dt - 0.5 * 1.62 * dt * dt)
            arr[j * 3 + 2] = v.vz * dt
          }
          posAttr.needsUpdate = true
        }
      }
    },
    setHit(index: number | null): void {
      targetItems.forEach((item, idx) => {
        if (index === idx) {
          item.pivot.rotation.set(0.12, 0, -0.45); item.pivot.position.set(0.14, -0.06, 0)
          item.discMat.color.setHex(0xffea55); item.discMat.emissive.setHex(0xff3300)
          item.dustPoints.visible = true; if (item.hitTime === null) item.hitTime = lastT
        } else {
          item.pivot.rotation.set(0, 0, 0); item.pivot.position.set(0, 0, 0)
          item.discMat.color.setHex(0xffffff); item.discMat.emissive.setHex(0x000000)
          item.dustPoints.visible = false; item.hitTime = null
          const posAttr = item.dustPoints.geometry.attributes.position as THREE.BufferAttribute
          ;(posAttr.array as Float32Array).fill(0)
          posAttr.needsUpdate = true
        }
      })
    },
    dispose(): void {
      for (const d of disposables) d.dispose()
      group.clear()
    },
  }
}
