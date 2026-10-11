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

/**
 * A step too large for the method: the horizontal velocity flips sign again and again,
 * or flips in one step while keeping most of its speed. Real drag only fades it through zero.
 */
function isOscillating(r: ShotResult): boolean {
  let flips = 0
  for (let i = 1; i < r.flight.length; i++) {
    const a = r.flight[i - 1].vx
    const b = r.flight[i].vx
    if (Math.sign(a) === Math.sign(b) || a === 0) continue
    flips++
    if (Math.abs(b) >= 0.3 * Math.abs(a)) return true
  }
  return flips >= 3
}

function studentPhysics(r: ShotResult, ctx: DetectContext): FailureEvent[] {
  const { g } = ctx
  const window = r.flight.slice(0, 20)
  if (window.length < 3) return []
  const first = window[0]
  const last = window[window.length - 1]
  if (isOscillating(r)) return [{ id: 'unstable', t: first.t, numbers: { dt: ctx.stepDt ?? window[1].t - first.t } }]
  const ay = (last.vy - first.vy) / (last.t - first.t)
  if (ay > 0.5 * g) return [{ id: 'gravity_up', t: first.t, numbers: { ay } }]
  if (Math.abs(ay) < 0.1 * g) return [{ id: 'no_gravity', t: first.t, numbers: { ay } }]
  if (!ctx.expectDrag && Math.abs(ay + g) > 0.25 * g) return [{ id: 'wrong_g', t: first.t, numbers: { ay, g } }]
  if (ctx.expectDrag) {
    const { k, wind } = ctx.expectDrag
    // Judge the drag right after release: over a long window a light ball has already stopped decelerating.
    const early = r.flight.find((s) => s.t - first.t >= 0.2) ?? r.flight[1]
    const ax = (early.vx - first.vx) / (early.t - first.t)
    const expected = -k * Math.hypot(first.vx - wind, first.vy) * (first.vx - wind)
    if (Math.abs(ax) < 0.25 * Math.abs(expected)) return [{ id: 'no_drag', t: first.t, numbers: { ax, expected } }]
  }
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
  if (x < SELF_HIT_X && !ctx.fixedLaunch) return [{ id: 'self_hit', t, numbers: { x } }]
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
  // A swinging numerical method usually ends in an explosion too; name the cause, not the symptom.
  if (ctx.studentFlight && isOscillating(r)) return [{ id: 'unstable', t: r.flight[0].t, numbers: { dt: ctx.stepDt ?? r.flight[1].t - r.flight[0].t } }]
  const exploded = isExploded(r)
  if (exploded) return [exploded]
  // One root cause per shot: a code bug explains the odd release and the miss, a bad release explains the miss.
  // Only a stone falling on the crew is always worth its own card.
  const onTarget = landedOnTarget(r, ctx)
  const codeFaults = [
    ...(ctx.angleLooksLikeDegrees ? [{ id: 'degrees_radians' as const, t: r.releaseT ?? 0, numbers: {} }] : []),
    // A stone that lands on a target was thrown and computed well enough: no faults to report.
    ...(ctx.studentFlight && !onTarget ? studentPhysics(r, ctx) : []),
  ]
  const releaseFaults = codeFaults.length > 0 || onTarget || ctx.fixedLaunch ? [] : releaseFailures(r)
  const landing = landingFailures(r, ctx)
  const consequences = codeFaults.length + releaseFaults.length > 0 ? landing.filter((e) => e.id === 'self_hit') : landing
  const events = [...codeFaults, ...releaseFaults, ...consequences]
  return events.sort((a, b) => a.t - b.t)
}
