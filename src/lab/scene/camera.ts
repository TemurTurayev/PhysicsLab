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

/** Narrow screens need the camera further back to keep the same subject in frame. */
const pullFor = (aspect: number) => (aspect < 1 ? 1.9 : aspect < 1.4 ? 1.25 : 1)

/** Three-quarter view from behind the machine: the trebuchet in the foreground, the lane and targets beyond. */
export function establishingShot(focusX: number, aspect: number): CameraShot {
  const p = pullFor(aspect)
  const reach = Math.min(focusX, 80)
  return {
    position: new THREE.Vector3(-16 * p, 7.5 * p, 15 * p),
    target: new THREE.Vector3(reach * 0.32, 3.2, -1),
  }
}

/** Side-on tracking shot: works for stones flying forward and backward alike. */
function followShot(stone: FlightSample, aspect: number): CameraShot {
  const p = pullFor(aspect)
  const y = Math.max(stone.y, 0)
  return {
    position: new THREE.Vector3(stone.x - 5, (4 + y * 0.6) * p, (24 + y * 0.5) * p),
    target: new THREE.Vector3(stone.x + Math.sign(stone.vx || 1) * 3, y * 0.75 + 1, 0),
  }
}

function landingShot(x: number, aspect: number): CameraShot {
  const p = pullFor(aspect)
  // Look back toward the machine when the stone landed behind it, so the camera stays inside indoor halls.
  const side = x < 0 ? 10 : -13
  return { position: new THREE.Vector3(x + side * p, 6 * p, 15 * p), target: new THREE.Vector3(x, 1, 0) }
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
