import * as THREE from 'three'
import type { FlightSample } from '../sim/types'

export interface CameraShot {
  position: THREE.Vector3
  target: THREE.Vector3
}

const smooth = (x: number) => {
  const c = Math.max(0, Math.min(1, x))
  return c * c * (3 - 2 * c)
}

function mix(a: CameraShot, b: CameraShot, f: number): CameraShot {
  const k = smooth(f)
  return { position: a.position.clone().lerp(b.position, k), target: a.target.clone().lerp(b.target, k) }
}

/** Wide establishing view: the machine in the foreground, the lane and targets beyond. */
export function establishingShot(focusX: number, aspect: number): CameraShot {
  const pull = aspect < 1 ? 1.7 : 1
  return {
    position: new THREE.Vector3(-11 * pull, 6.5 * pull, 17 * pull),
    target: new THREE.Vector3(Math.min(focusX, 40) * 0.35, 4, 0),
  }
}

function followShot(stone: FlightSample, aspect: number): CameraShot {
  const pull = aspect < 1 ? 1.6 : 1
  const height = Math.max(5, stone.y * 0.55 + 4)
  return {
    position: new THREE.Vector3(stone.x - 9 * pull, height * pull, (20 + stone.y * 0.4) * pull),
    target: new THREE.Vector3(stone.x + 4, stone.y * 0.75 + 1, 0),
  }
}

function landingShot(x: number, aspect: number): CameraShot {
  const pull = aspect < 1 ? 1.6 : 1
  return { position: new THREE.Vector3(x - 14 * pull, 7 * pull, 16 * pull), target: new THREE.Vector3(x, 1, 0) }
}

/**
 * Deterministic camera for scene time t: establishing → follow the stone → settle on the landing.
 * Same t always gives the same framing, so replays and screenshots are reproducible.
 */
export function cameraAt(t: number, aspect: number, stone: FlightSample | null, launchT: number | null, land: FlightSample | null, focusX: number): CameraShot {
  const wide = establishingShot(focusX, aspect)
  if (launchT === null || stone === null) {
    return land ? mix(wide, landingShot(land.x, aspect), (t - land.t) / 1.2) : wide
  }
  const follow = followShot(stone, aspect)
  const inFlight = mix(wide, follow, (t - launchT) / 0.9)
  if (!land || t < land.t) return inFlight
  return mix(inFlight, landingShot(land.x, aspect), (t - land.t) / 1.0)
}
