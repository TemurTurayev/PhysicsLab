import type { ArmSample, FlightSample } from '../sim/types'

const lerp = (a: number, b: number, f: number) => a + (b - a) * f

/** Arm pose at time t; samples are evenly spaced, so this is O(1). */
export function armAt(arm: ArmSample[], t: number): ArmSample {
  if (arm.length === 0) return { t, theta: 0, phi: 0, released: false, moment: 0, tension: 0 }
  const step = arm.length > 1 ? arm[1].t - arm[0].t : 1
  const i = Math.max(0, Math.min(arm.length - 1, Math.floor(t / step)))
  const a = arm[i]
  const b = arm[Math.min(arm.length - 1, i + 1)]
  if (a === b || a.released !== b.released) return a
  const f = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)))
  return { ...a, t, theta: lerp(a.theta, b.theta, f), phi: lerp(a.phi, b.phi, f), moment: lerp(a.moment, b.moment, f), tension: lerp(a.tension, b.tension, f) }
}

/** Index of the last flight sample at or before t (binary search), or -1 before launch. */
export function flightIndex(flight: FlightSample[], t: number): number {
  if (flight.length === 0 || t < flight[0].t) return -1
  let lo = 0
  let hi = flight.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (flight[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function flightAt(flight: FlightSample[], t: number): FlightSample | null {
  const i = flightIndex(flight, t)
  if (i < 0) return null
  const a = flight[i]
  const b = flight[Math.min(flight.length - 1, i + 1)]
  if (a === b) return a
  const f = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)))
  return { t, x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), vx: lerp(a.vx, b.vx, f), vy: lerp(a.vy, b.vy, f) }
}
