import type { FlightSample, WorldParams } from './types'

const DT = 1 / 240
const MAX_T = 60
const AIR_DENSITY = 1.225 // kg/m³
const SPHERE_CD = 0.47

type State = readonly [number, number, number, number] // x, y, vx, vy

/** Projectile flight with gravity and optional quadratic drag against the wind, integrated with RK4. */
export function simulateFlight(start: FlightSample, world: WorldParams, mass: number, radius: number): FlightSample[] {
  const k = world.drag ? (AIR_DENSITY * SPHERE_CD * Math.PI * radius ** 2) / (2 * mass) : 0
  const deriv = ([, , vx, vy]: State): State => {
    const rx = vx - world.wind
    const speed = Math.hypot(rx, vy)
    return [vx, vy, -k * speed * rx, -world.g - k * speed * vy]
  }
  const step = (s: State, h: number): State => {
    const add = (a: State, b: State, m: number): State => [a[0] + b[0] * m, a[1] + b[1] * m, a[2] + b[2] * m, a[3] + b[3] * m]
    const k1 = deriv(s)
    const k2 = deriv(add(s, k1, h / 2))
    const k3 = deriv(add(s, k2, h / 2))
    const k4 = deriv(add(s, k3, h))
    return [0, 1, 2, 3].map((i) => s[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as unknown as State
  }

  const samples: FlightSample[] = [start]
  let s: State = [start.x, start.y, start.vx, start.vy]
  let t = start.t
  while (t - start.t < MAX_T) {
    const next = step(s, DT)
    t += DT
    if (next[1] <= 0 && next[3] < 0) {
      const f = s[1] / (s[1] - next[1]) // linear interpolation to the ground crossing
      const lerp = (i: number) => s[i] + (next[i] - s[i]) * f
      samples.push({ t: t - DT + DT * f, x: lerp(0), y: 0, vx: lerp(2), vy: lerp(3) })
      return samples
    }
    s = next
    samples.push({ t, x: s[0], y: s[1], vx: s[2], vy: s[3] })
  }
  return samples
}
