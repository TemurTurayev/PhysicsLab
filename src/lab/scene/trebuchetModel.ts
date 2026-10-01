import * as THREE from 'three'
import type { TrebuchetParams } from '../sim/types'
import { industrialMaterial } from './textures/industrial'
import { woodMaterial } from './wood'

export interface TrebuchetModel {
  group: THREE.Group
  /** Pose the machine. theta, phi in radians. */
  pose(theta: number, phi: number, released: boolean): void
  /** World position of the stone while it is still in the sling. */
  stonePosition(): THREE.Vector3
  dispose(): void
}

function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  geos: Set<THREE.BufferGeometry>,
  mats: Set<THREE.Material>,
): THREE.Mesh {
  geos.add(geo)
  mats.add(mat)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  geos: Set<THREE.BufferGeometry>,
  mats: Set<THREE.Material>,
): THREE.Mesh {
  return addMesh(parent, new THREE.BoxGeometry(w, h, d), mat, geos, mats)
}

export type MachineSkin = 'wood' | 'steel'

export function createTrebuchet(p: TrebuchetParams, skin: MachineSkin = 'wood'): TrebuchetModel {
  const group = new THREE.Group()
  const geos = new Set<THREE.BufferGeometry>()
  const mats = new Set<THREE.Material>()

  // Materials
  const steel = skin === 'steel'
  // Same geometry, different build: timber and stone in Classic, steel truss and concrete in the complex.
  const woodMat: THREE.Material = steel ? industrialMaterial('steelPanel', [1, 4]) : woodMaterial('oak')
  const darkWoodMat: THREE.Material = steel ? industrialMaterial('rust') : woodMaterial('weathered')
  const ironBandedWoodMat: THREE.Material = steel ? industrialMaterial('concreteDark') : woodMaterial('dark')
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x3b3b40, roughness: 0.45, metalness: 0.8 })
  const ropeMat = steel
    ? new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.4, metalness: 0.9 })
    : new THREE.MeshStandardMaterial({ color: 0xc9b38a, roughness: 0.9, metalness: 0.0 })
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8c8a85, roughness: 0.85, metalness: 0.05, flatShading: true })

  // 1. A-Frame side supports at z = +0.75 and z = -0.75
  const zOffset = 0.75
  const baseLen = 2.2 * p.L2 + 2
  const halfBase = baseLen * 0.42
  const legLen = Math.hypot(halfBase, p.H)
  const legAngle = Math.atan2(halfBase, p.H)
  const tieLen = 2 * halfBase * (1 - 0.38)

  for (const z of [-zOffset, zOffset]) {
    const groundBeam = addBox(group, baseLen, 0.16, 0.16, woodMat, geos, mats)
    groundBeam.position.set(0, 0.08, z)

    const frontLeg = addBox(group, 0.16, legLen, 0.16, woodMat, geos, mats)
    frontLeg.position.set(halfBase * 0.5, p.H * 0.5, z)
    frontLeg.rotation.z = -legAngle

    const rearLeg = addBox(group, 0.16, legLen, 0.16, woodMat, geos, mats)
    rearLeg.position.set(-halfBase * 0.5, p.H * 0.5, z)
    rearLeg.rotation.z = legAngle

    const tie = addBox(group, tieLen, 0.12, 0.12, darkWoodMat, geos, mats)
    tie.position.set(0, p.H * 0.38, z)

    const pillow = addBox(group, 0.28, 0.2, 0.2, darkWoodMat, geos, mats)
    pillow.position.set(0, p.H - 0.1, z)
  }

  // Cross braces between the two side frames (along z, span 1.5m)
  const braceSpan = zOffset * 2
  const crossConfigs: [number, number, number, number][] = [
    [halfBase * 0.9, 0.08, 0.16, 0.16],
    [-halfBase * 0.9, 0.08, 0.16, 0.16],
    [halfBase * (1 - 0.38), p.H * 0.38, 0.12, 0.12],
    [-halfBase * (1 - 0.38), p.H * 0.38, 0.12, 0.12],
  ]
  for (const [bx, by, bw, bh] of crossConfigs) {
    const brace = addBox(group, bw, bh, braceSpan, darkWoodMat, geos, mats)
    brace.position.set(bx, by, 0)
  }

  // Axle: iron cylinder along z through P(0, H, 0)
  const axle = addMesh(group, new THREE.CylinderGeometry(0.06, 0.06, braceSpan + 0.4, 12), ironMat, geos, mats)
  axle.rotation.x = Math.PI / 2
  axle.position.set(0, p.H, 0)

  for (const z of [-zOffset, zOffset]) {
    const collar = addMesh(group, new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), ironMat, geos, mats)
    collar.rotation.x = Math.PI / 2
    collar.position.set(0, p.H, z)
  }

  // 2. Beam Pivot Group: centered at P(0, H, 0) and rotates about z by theta
  const beamPivotGroup = new THREE.Group()
  beamPivotGroup.position.set(0, p.H, 0)
  group.add(beamPivotGroup)

  // Tapered wooden beam from C (-L2, 0, 0) to A (+L1, 0, 0)
  const totalBeamLen = p.L1 + p.L2
  const beamGeo = new THREE.BoxGeometry(totalBeamLen, 1, 1)
  beamGeo.translate((p.L1 - p.L2) / 2, 0, 0)
  const pos = beamGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const t = (x + p.L2) / totalBeamLen
    pos.setY(i, pos.getY(i) * THREE.MathUtils.lerp(0.4, 0.14, t))
    pos.setZ(i, pos.getZ(i) * THREE.MathUtils.lerp(0.32, 0.14, t))
  }
  beamGeo.computeVertexNormals()
  addMesh(beamPivotGroup, beamGeo, woodMat, geos, mats)

  // Iron reinforcements on beam
  addBox(beamPivotGroup, 0.34, 0.44, 0.36, ironMat, geos, mats)
  const pin = addMesh(beamPivotGroup, new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), ironMat, geos, mats)
  pin.position.set(p.L1 + 0.04, 0.06, 0)
  pin.rotation.z = -Math.PI / 6

  // 3. Counterweight Box: fixed rigidly at C (-L2, 0, 0)
  const cwScale = Math.cbrt(p.mc / 600)
  const cwW = 0.9 * cwScale
  const cwH = 0.9 * cwScale
  const cwD = 1.2 * cwScale

  const cwBox = addBox(beamPivotGroup, cwW, cwH, cwD, ironBandedWoodMat, geos, mats)
  cwBox.position.set(-p.L2, 0, 0)

  const bandConfigs: [number, number, number, number][] = [
    [-cwD * 0.3, cwW * 1.02, cwH * 1.02, 0.07 * cwScale],
    [cwD * 0.3, cwW * 1.02, cwH * 1.02, 0.07 * cwScale],
    [0, cwW * 1.02, 0.07 * cwScale, cwD * 1.02],
  ]
  for (const [bz, bw, bh, bd] of bandConfigs) {
    const band = addBox(beamPivotGroup, bw, bh, bd, ironMat, geos, mats)
    band.position.set(-p.L2, 0, bz)
  }

  // Stones nestled on top of the counterweight
  const stoneOffsets: [number, number, number, number][] = [
    [-0.2, 0.46, -0.25, 0.16],
    [0.18, 0.48, -0.15, 0.18],
    [-0.12, 0.47, 0.25, 0.15],
    [0.16, 0.49, 0.2, 0.17],
  ]
  for (const [ox, oy, oz, sr] of stoneOffsets) {
    const sMesh = addMesh(beamPivotGroup, new THREE.IcosahedronGeometry(sr * cwScale, 0), stoneMat, geos, mats)
    sMesh.position.set(-p.L2 + ox * cwScale, oy * cwH, oz * cwScale)
  }

  // 4. Ground trough: shallow wooden channel from x = -1 to x = 2 at y ≈ 0.05
  const troughFloor = addBox(group, 3, 0.03, 0.44, darkWoodMat, geos, mats)
  troughFloor.position.set(0.5, 0.035, 0)
  for (const tz of [-0.22, 0.22]) {
    const rail = addBox(group, 3, 0.06, 0.04, woodMat, geos, mats)
    rail.position.set(0.5, 0.065, tz)
  }

  // 5. Sling, Pouch, and Projectile
  const slingGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 6)
  const slingMesh = addMesh(group, slingGeo, ropeMat, geos, mats)
  const pouchMesh = addBox(group, p.r * 2.2, p.r * 0.8, p.r * 1.6, ironBandedWoodMat, geos, mats)
  const stoneMesh = addMesh(group, new THREE.IcosahedronGeometry(p.r, 1), stoneMat, geos, mats)

  const upVector = new THREE.Vector3(0, 1, 0)
  const slingDir = new THREE.Vector3()
  const stonePos = new THREE.Vector3()

  function pose(theta: number, phi: number, released: boolean): void {
    const cosT = Math.cos(theta)
    const sinT = Math.sin(theta)
    beamPivotGroup.rotation.z = theta

    const ax = p.L1 * cosT
    const ay = p.H + p.L1 * sinT

    if (!released) {
      const cosP = Math.cos(phi)
      const sinP = Math.sin(phi)
      const bx = ax + p.Ls * cosP
      const by = ay + p.Ls * sinP

      stonePos.set(bx, by, 0)

      slingMesh.scale.set(1, p.Ls, 1)
      slingMesh.position.set((ax + bx) * 0.5, (ay + by) * 0.5, 0)
      slingDir.set(cosP, sinP, 0)
      slingMesh.quaternion.setFromUnitVectors(upVector, slingDir)

      pouchMesh.position.set(bx, by, 0)
      pouchMesh.quaternion.copy(slingMesh.quaternion)
      pouchMesh.visible = true

      stoneMesh.position.set(bx, by, 0)
      stoneMesh.visible = true
    } else {
      const limpLen = p.Ls * 0.6
      const by = ay - limpLen
      stonePos.set(ax, by, 0)

      slingMesh.scale.set(1, limpLen, 1)
      slingMesh.position.set(ax, ay - limpLen * 0.5, 0)
      slingDir.set(0, -1, 0)
      slingMesh.quaternion.setFromUnitVectors(upVector, slingDir)

      pouchMesh.position.set(ax, by, 0)
      pouchMesh.quaternion.copy(slingMesh.quaternion)
      pouchMesh.visible = true

      stoneMesh.position.set(ax, by, 0)
      stoneMesh.visible = false
    }
  }

  // Set initial pose
  const initTheta = (p.theta0Deg * Math.PI) / 180
  pose(initTheta, initTheta, false)

  return {
    group,
    pose,
    stonePosition(): THREE.Vector3 {
      const pos = new THREE.Vector3()
      stoneMesh.getWorldPosition(pos)
      return pos
    },
    dispose(): void {
      for (const geo of geos) geo.dispose()
      for (const mat of mats) if (!mat.userData.shared) mat.dispose()
    },
  }
}
