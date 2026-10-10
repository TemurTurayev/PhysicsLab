import { loadsOf, summarizeFlight } from '../sim/shot'
import { simulateFlight } from '../sim/flight'
import { simulateArm } from '../sim/trebuchet'
import type { FlightSample, ShotResult, SimParams } from '../sim/types'
import type { Mission, SliderValues, Target } from './types'

/** Where every target stands t seconds after the stone leaves the sling (carts start at release). */
export function targetsAt(targets: Target[], t: number): Array<{ x: number; r: number }> {
  return targets.map((tg) => ({ x: tg.x + (tg.moving?.speed ?? 0) * t, r: tg.r }))
}

/**
 * Vertical targets stop the stone: the first wall face it crosses below the wall's top ends the flight there.
 * A stone that clears the top flies on.
 */
export function clipAtWalls(shot: ShotResult, targets: Target[]): ShotResult {
  const walls = targets.filter((t) => t.h !== undefined && !t.moving).sort((a, b) => a.x - b.x)
  if (walls.length === 0 || shot.flight.length < 2) return shot
  for (let i = 1; i < shot.flight.length; i++) {
    const a = shot.flight[i - 1]
    const b = shot.flight[i]
    for (const w of walls) {
      if (!(a.x < w.x && b.x >= w.x)) continue
      const f = (w.x - a.x) / (b.x - a.x)
      const y = a.y + (b.y - a.y) * f
      if (y > w.h! || y < 0) continue
      const t = a.t + (b.t - a.t) * f
      const impact = { t, x: w.x, y, vx: a.vx + (b.vx - a.vx) * f, vy: a.vy + (b.vy - a.vy) * f }
      const flight = [...shot.flight.slice(0, i), impact]
      return { ...shot, flight, ...summarizeFlight(flight), landing: { x: w.x, t } }
    }
  }
  return shot
}

export function withRelease(params: SimParams, releaseDeg: number | undefined): SimParams {
  return releaseDeg === undefined ? params : { ...params, trebuchet: { ...params.trebuchet, releaseDeg } }
}

/** Apply only the parameters this mission exposes as sliders; everything else stays as authored. */
const LAUNCHER_KEYS = new Set<string>(['x0', 'speed', 'angleDeg'])

export function withSliders(m: Mission, values: SliderValues): SimParams {
  const set = m.sliders.flatMap((s) => (values[s.key] === undefined ? [] : [[s.key, values[s.key]] as const]))
  if (m.base.launcher) {
    const launcher = { ...m.base.launcher, ...Object.fromEntries(set.filter(([k]) => LAUNCHER_KEYS.has(k))) }
    return { ...m.base, launcher }
  }
  const overrides = Object.fromEntries(m.sliders.flatMap((s) => (values[s.key] === undefined ? [] : [[s.key, values[s.key]]])))
  return { ...m.base, trebuchet: { ...m.base.trebuchet, ...overrides } }
}

/** The machine part of a code mission: arm motion and the moment the stone leaves the sling. */
export function armForCode(params: SimParams) {
  const run = simulateArm(params.trebuchet, params.world.g)
  if (!run.release) throw new Error('В миссии с кодом требушет обязан отпускать камень')
  const { vx, vy } = run.release
  return {
    run,
    speed: Math.hypot(vx, vy),
    angleDeg: (Math.atan2(vy, vx) * 180) / Math.PI,
  }
}

function shotFrom(arm: ReturnType<typeof armForCode>, flight: FlightSample[]): ShotResult {
  return { ...loadsOf(arm.run), arm: arm.run.arm, flight, released: true, releaseT: arm.run.release!.t, ...summarizeFlight(flight) }
}

/** launch_velocity mission: the student's (vx, vy) replaces the real release velocity. */
export function shotFromLaunch(params: SimParams, velocity: [number, number]): ShotResult {
  const arm = armForCode(params)
  const { t, x, y } = arm.run.release!
  const flight = simulateFlight({ t, x, y, vx: velocity[0], vy: velocity[1] }, params.world, params.trebuchet.mp, params.trebuchet.r)
  return shotFrom(arm, flight)
}

/** True when the student fed degrees straight into cos/sin. */
export function looksLikeDegrees(speed: number, angleDeg: number, velocity: [number, number]): boolean {
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b))
  return close(velocity[0], speed * Math.cos(angleDeg)) && close(velocity[1], speed * Math.sin(angleDeg))
}

/** Coarse steps overshoot the ground; put the last sample exactly where the path crosses y = 0. */
export function landOnGround(flight: FlightSample[]): FlightSample[] {
  const n = flight.length
  if (n < 2) return flight
  const a = flight[n - 2]
  const b = flight[n - 1]
  if (!(b.y < 0 && a.y >= 0) || !Number.isFinite(b.y)) return flight
  const f = a.y / (a.y - b.y)
  const lerp = (p: number, q: number) => p + (q - p) * f
  return [...flight.slice(0, -1), { t: lerp(a.t, b.t), x: lerp(a.x, b.x), y: 0, vx: lerp(a.vx, b.vx), vy: lerp(a.vy, b.vy) }]
}

/** step mission: the student's samples (without time) become the flight after release. */
export function shotFromSteps(params: SimParams, samples: Array<Omit<FlightSample, 't'>>, dt: number): ShotResult {
  const arm = armForCode(params)
  const t0 = arm.run.release!.t
  const timed = samples.map((s, i) => ({ ...s, t: t0 + i * dt }))
  return shotFrom(arm, landOnGround(timed))
}

/** Counterweights the master is willing to try, lightest first. */
export const SAFETY_MASSES = Array.from({ length: 35 }, (_, i) => 300 + i * 50)

/**
 * The master loads the heaviest counterweight whose moment, by the student's formula, stays within the limit.
 * A formula that underestimates the moment talks him into an overload.
 */
export function pickCounterweight(masses: number[], moments: number[], limit: number): number {
  const allowed = masses.filter((_, i) => Number.isFinite(moments[i]) && moments[i] <= limit)
  return allowed.length > 0 ? Math.max(...allowed) : masses[0]
}

export interface Outcome {
  hits: number[] // indices of targets hit by this shot
  predictionError: number | null
}

export function evaluateShot(m: Mission, shot: ShotResult, prediction: number | null): Outcome {
  const landing = shot.landing
  const hits =
    landing === null
      ? []
      : targetsAt(m.targets, landing.t - (shot.releaseT ?? 0)).flatMap((tg, i) => (Math.abs(landing.x - tg.x) <= tg.r ? [i] : []))
  let predictionError: number | null = null
  if (m.predict && prediction !== null) {
    const actual =
      m.predict.quantity === 'landingX'
        ? landing?.x
        : m.predict.quantity === 'apexY'
          ? shot.apex?.y
          : landing && shot.releaseT !== null
            ? landing.t - shot.releaseT
            : undefined
    predictionError = actual === undefined ? null : prediction - actual
  }
  return { hits, predictionError }
}

export function isMissionWon(m: Mission, hitSoFar: ReadonlySet<number>, predictionError: number | null): boolean {
  if (m.predict) return predictionError !== null && Math.abs(predictionError) <= m.predict.tolerance
  return m.targets.length > 0 && m.targets.every((_, i) => hitSoFar.has(i))
}
