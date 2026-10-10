import * as THREE from 'three'
import type { LauncherParams } from '../sim/types'
import { industrialMaterial } from './textures/industrial'
import type { MachineSkin, TrebuchetModel } from './trebuchetModel'
import { woodMaterial } from './wood'

const CHUTE = 1.8 // m, length of the chute behind the release point
const POST = 0.22

/**
 * The basics launcher: a tower of the given height with a chute on top, tilted to the launch angle.
 * The chute ends exactly at (x0, y0), where the flight starts. A stone rests in it until the shot.
 */
export function createLauncher(l: LauncherParams, skin: MachineSkin = 'wood'): TrebuchetModel {
  const group = new THREE.Group()
  const owned: THREE.BufferGeometry[] = []
  const steel = skin === 'steel'
  const frame: THREE.Material = steel ? industrialMaterial('steelPanel', [1, 4]) : woodMaterial('oak')
  const deck: THREE.Material = steel ? industrialMaterial('concrete') : woodMaterial('weathered')
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8c8a85, roughness: 0.85, flatShading: true })

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const geo = new THREE.BoxGeometry(w, h, d)
    owned.push(geo)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  const a = (l.angleDeg * Math.PI) / 180
  const top = Math.max(0.35, l.y0 - 0.25) // deck height under the chute
  const cx = l.x0 - 1.1 // tower centre sits just behind the release point
  // Four posts and a deck; tall towers get cross braces every 3 m so they read as a structure.
  for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) box(POST, top, POST, frame, cx + dx, top / 2, dz)
  box(1.9, 0.14, 1.9, deck, cx, top, 0)
  for (let y = 3; y < top - 0.5; y += 3) {
    box(1.6, 0.12, 0.12, frame, cx, y, -0.7)
    box(1.6, 0.12, 0.12, frame, cx, y, 0.7)
    box(0.12, 0.12, 1.6, frame, cx - 0.7, y, 0)
    box(0.12, 0.12, 1.6, frame, cx + 0.7, y, 0)
  }

  // The chute: a trough whose lip is the release point, tilted to the launch angle.
  const chute = new THREE.Group()
  chute.position.set(l.x0, l.y0, 0)
  chute.rotation.z = a
  group.add(chute)
  const trough = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const geo = new THREE.BoxGeometry(w, h, d)
    owned.push(geo)
    const mesh = new THREE.Mesh(geo, frame)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    chute.add(mesh)
  }
  trough(CHUTE, 0.08, 0.5, -CHUTE / 2, -0.2, 0)
  trough(CHUTE, 0.22, 0.06, -CHUTE / 2, -0.1, 0.25)
  trough(CHUTE, 0.22, 0.06, -CHUTE / 2, -0.1, -0.25)
  // A strut from the deck up to the chute keeps a raised chute from floating.
  const strutH = l.y0 - 0.2 - top
  if (strutH > 0.1) box(0.14, strutH, 0.14, frame, l.x0 - 0.5, top + strutH / 2, 0)

  const stoneGeo = new THREE.IcosahedronGeometry(0.15, 1)
  owned.push(stoneGeo)
  const stone = new THREE.Mesh(stoneGeo, stoneMat)
  stone.position.set(-0.25, 0, 0)
  stone.castShadow = true
  chute.add(stone)

  return {
    group,
    // A launcher has no arm: "released" only hides the resting stone once the real one is in the air.
    pose: (_theta, _phi, released) => {
      stone.visible = !released
    },
    stonePosition: () => stone.getWorldPosition(new THREE.Vector3()),
    dispose: () => {
      owned.forEach((g) => g.dispose())
      stoneMat.dispose()
    },
  }
}
