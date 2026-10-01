import type { ShotResult } from '../sim/types'
import type { DetectContext, FailureEvent } from './types'

const RUNAWAY = 1e5 // m — anything this far is a numerical explosion, not a throw
const SELF_HIT_X = 3 // m — landing behind this line falls on the machine or its crew
const EARLY_DEG = 70
const LATE_DEG = -15 // clearly thrown downward; a flat low throw is a legitimate shot

function isExploded(r: ShotResult): FailureEvent | null {
  const bad = r.flight.find((s) => [s.x, s.y, s.vx, s.vy].some((v) => !Number.isFinite(v) || Math.abs(v) > RUNAWAY))
  return bad ? { id: 'exploded', t: bad.t, numbers: { t: bad.t } } : null
}

function studentPhysics(r: ShotResult, g: number): FailureEvent[] {
  const window = r.flight.slice(0, 20)
  if (window.length < 3) return []
  const first = window[0]
  const last = window[window.length - 1]
  const ay = (last.vy - first.vy) / (last.t - first.t)
  if (ay > 0.5 * g) return [{ id: 'gravity_up', t: first.t, numbers: { ay } }]
  if (Math.abs(ay) < 0.1 * g) return [{ id: 'no_gravity', t: first.t, numbers: { ay } }]
  return []
}

function releaseFailures(r: ShotResult): FailureEvent[] {
  if (!r.launch || r.releaseT === null) return []
  const { angleDeg, speed } = r.launch
  const numbers = { angleDeg, speed }
  const backwards = Math.abs(angleDeg) > 90
  if (backwards || angleDeg > EARLY_DEG) return [{ id: 'early_release', t: r.releaseT, numbers }]
  if (angleDeg < LATE_DEG) return [{ id: 'late_release', t: r.releaseT, numbers }]
  return []
}

function landingFailures(r: ShotResult, ctx: DetectContext): FailureEvent[] {
  if (!r.landing) return []
  const { x, t } = r.landing
  if (x < SELF_HIT_X) return [{ id: 'self_hit', t, numbers: { x } }]
  if (ctx.targets.length === 0) return []
  const nearest = ctx.targets.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a))
  const miss = x - nearest.x
  if (Math.abs(miss) <= nearest.r) return []
  return [{ id: miss < 0 ? 'short' : 'long', t, numbers: { miss, x, target: nearest.x } }]
}

function landedOnTarget(r: ShotResult, ctx: DetectContext): boolean {
  const x = r.landing?.x
  return x !== undefined && ctx.targets.some((t) => Math.abs(x - t.x) <= t.r)
}

/** Every way this shot went wrong, in the order the viewer sees them happen. */
export function detectFailures(r: ShotResult, ctx: DetectContext): FailureEvent[] {
  if (!r.released) return [{ id: 'no_release', t: r.arm.at(-1)?.t ?? 0, numbers: {} }]
  if (r.breakage) {
    const id = r.breakage.kind === 'beam' ? 'beam_break' : 'sling_snap'
    const { t, load, limit } = r.breakage
    return [{ id, t, numbers: { load, limit, ratio: load / limit, t } }]
  }
  const exploded = isExploded(r)
  if (exploded) return [exploded]
  const events = [
    ...(ctx.angleLooksLikeDegrees ? [{ id: 'degrees_radians' as const, t: r.releaseT ?? 0, numbers: {} }] : []),
    ...(ctx.studentFlight ? studentPhysics(r, ctx.g) : []),
    // A stone that lands on a target was released well enough, whatever its angle.
    ...(landedOnTarget(r, ctx) ? [] : releaseFailures(r)),
    ...landingFailures(r, ctx),
  ]
  return events.sort((a, b) => a.t - b.t)
}
