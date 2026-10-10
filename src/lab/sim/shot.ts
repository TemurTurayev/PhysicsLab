import { simulateFlight } from './flight'
import { simulateArm, type ArmRun } from './trebuchet'
import type { FlightSample, LauncherParams, ShotResult, SimParams } from './types'

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

/** Structural summary shared by our own shots and student-code shots. */
export function loadsOf(run: ArmRun): Pick<ShotResult, 'breakage' | 'peakMoment' | 'peakTension'> {
  return { breakage: run.breakage, peakMoment: run.peakMoment, peakTension: run.peakTension }
}

/** The stone's state the instant it leaves a fixed launcher, at t = 0. */
export function launcherStart(l: LauncherParams): FlightSample {
  const a = l.angleDeg / RAD
  return { t: 0, x: l.x0, y: l.y0, vx: l.speed * Math.cos(a), vy: l.speed * Math.sin(a) }
}

function launcherShot(l: LauncherParams, params: SimParams): ShotResult {
  const flight = simulateFlight(launcherStart(l), params.world, params.trebuchet.mp, params.trebuchet.r)
  return { arm: [], flight, released: true, releaseT: 0, breakage: null, peakMoment: 0, peakTension: 0, ...summarizeFlight(flight) }
}

export function simulateShot(params: SimParams): ShotResult {
  const { trebuchet, world, launcher } = params
  if (launcher) return launcherShot(launcher, params)
  const run = simulateArm(trebuchet, world.g)
  if (!run.release) {
    return { ...loadsOf(run), arm: run.arm, flight: [], released: false, releaseT: null, launch: null, landing: null, apex: null }
  }
  const flight = simulateFlight(run.release, world, trebuchet.mp, trebuchet.r)
  return { ...loadsOf(run), arm: run.arm, flight, released: true, releaseT: run.release.t, ...summarizeFlight(flight) }
}
