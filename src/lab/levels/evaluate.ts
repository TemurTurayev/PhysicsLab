import { summarizeFlight } from '../sim/shot'
import { simulateFlight } from '../sim/flight'
import { simulateArm } from '../sim/trebuchet'
import type { FlightSample, ShotResult, SimParams } from '../sim/types'
import type { Mission, Target } from './types'

/** Where every target stands at time t (moving carts start when the trigger is pulled). */
export function targetsAt(targets: Target[], t: number): Array<{ x: number; r: number }> {
  return targets.map((tg) => ({ x: tg.x + (tg.moving?.speed ?? 0) * t, r: tg.r }))
}

export function withRelease(params: SimParams, releaseDeg: number | undefined): SimParams {
  return releaseDeg === undefined ? params : { ...params, trebuchet: { ...params.trebuchet, releaseDeg } }
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
  return { arm: arm.run.arm, flight, released: true, releaseT: arm.run.release!.t, ...summarizeFlight(flight) }
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

/** step mission: the student's samples (without time) become the flight after release. */
export function shotFromSteps(params: SimParams, samples: Array<Omit<FlightSample, 't'>>, dt: number): ShotResult {
  const arm = armForCode(params)
  const t0 = arm.run.release!.t
  const flight = samples.map((s, i) => ({ ...s, t: t0 + i * dt }))
  return shotFrom(arm, flight)
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
      : targetsAt(m.targets, landing.t).flatMap((tg, i) => (Math.abs(landing.x - tg.x) <= tg.r ? [i] : []))
  let predictionError: number | null = null
  if (m.predict && prediction !== null) {
    const actual = m.predict.quantity === 'landingX' ? landing?.x : shot.apex?.y
    predictionError = actual === undefined ? null : prediction - actual
  }
  return { hits, predictionError }
}

export function isMissionWon(m: Mission, hitSoFar: ReadonlySet<number>, predictionError: number | null): boolean {
  if (m.predict) return predictionError !== null && Math.abs(predictionError) <= m.predict.tolerance
  return m.targets.length > 0 && m.targets.every((_, i) => hitSoFar.has(i))
}

export function starsFor(m: Mission, shots: number, predictionError: number | null): number {
  if (m.predict) {
    const tol = m.predict.tolerance
    if (shots > 1) return 1
    return predictionError !== null && Math.abs(predictionError) <= tol / 2 ? 3 : 2
  }
  const n = m.targets.length
  if (shots <= n + 1) return 3
  if (shots <= 2 * n + 3) return 2
  return 1
}
