import { simulateFlight } from './flight'
import { simulateArm } from './trebuchet'
import type { FlightSample, ShotResult, SimParams } from './types'

const RAD = 180 / Math.PI

/** Summaries the placard and the failure detectors read from any flight, ours or the student's. */
export function summarizeFlight(flight: FlightSample[]): Pick<ShotResult, 'launch' | 'landing' | 'apex'> {
  if (flight.length === 0) return { launch: null, landing: null, apex: null }
  const first = flight[0]
  const last = flight[flight.length - 1]
  const top = flight.reduce((best, s) => (s.y > best.y ? s : best), first)
  return {
    launch: { speed: Math.hypot(first.vx, first.vy), angleDeg: Math.atan2(first.vy, first.vx) * RAD },
    landing: last.y <= 0 && flight.length > 1 ? { x: last.x, t: last.t } : null,
    apex: { x: top.x, y: top.y },
  }
}

export function simulateShot(params: SimParams): ShotResult {
  const { trebuchet, world } = params
  const run = simulateArm(trebuchet, world.g)
  if (!run.release) {
    return { arm: run.arm, flight: [], released: false, releaseT: null, launch: null, landing: null, apex: null }
  }
  const flight = simulateFlight(run.release, world, trebuchet.mp, trebuchet.r)
  return { arm: run.arm, flight, released: true, releaseT: run.release.t, ...summarizeFlight(flight) }
}
