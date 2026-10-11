import { simulateArm } from '../sim/trebuchet'
import type { SimParams } from '../sim/types'

/** Everything a student needs to compute the throw by hand: where and how the stone leaves the sling. */
export interface LaunchSheet {
  x0: number // m, release point
  y0: number
  v0: number // m/s
  alphaDeg: number // launch angle above horizontal
  vx: number
  vy: number
  g: number
}

export function launchSheet(params: SimParams): LaunchSheet | null {
  const l = params.launcher
  if (l) {
    const a = (l.angleDeg * Math.PI) / 180
    return { x0: l.x0, y0: l.y0, v0: l.speed, alphaDeg: l.angleDeg, vx: l.speed * Math.cos(a), vy: l.speed * Math.sin(a), g: params.world.g }
  }
  const r = simulateArm(params.trebuchet, params.world.g).release
  if (!r) return null
  return {
    x0: r.x,
    y0: r.y,
    v0: Math.hypot(r.vx, r.vy),
    alphaDeg: (Math.atan2(r.vy, r.vx) * 180) / Math.PI,
    vx: r.vx,
    vy: r.vy,
    g: params.world.g,
  }
}

/** The textbook projectile without air, from the sheet: what the student's own calculation should give. */
export function vacuumFlight(s: LaunchSheet): { tFlight: number; range: number; apexY: number; tApex: number } {
  const tFlight = (s.vy + Math.sqrt(s.vy * s.vy + 2 * s.g * s.y0)) / s.g
  return {
    tFlight,
    range: s.x0 + s.vx * tFlight,
    apexY: s.vy > 0 ? s.y0 + (s.vy * s.vy) / (2 * s.g) : s.y0,
    tApex: Math.max(0, s.vy / s.g),
  }
}
