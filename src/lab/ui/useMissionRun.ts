import { useCallback, useMemo, useState } from 'react'
import { detectFailures } from '../failures/detect'
import type { FailureEvent } from '../failures/types'
import {
  armForCode,
  evaluateShot,
  isMissionWon,
  looksLikeDegrees,
  shotFromLaunch,
  shotFromSteps,
  starsFor,
  targetsAt,
  withRelease,
} from '../levels/evaluate'
import type { Mission } from '../levels/types'
import { runStudent } from '../python/runStudent'
import type { StudentError } from '../python/protocol'
import { simulateShot } from '../sim/shot'
import type { FlightSample, ShotResult } from '../sim/types'

const STEP_DT = 1 / 240
const MAX_STEPS = 240 * 40

export interface ShotRecord {
  shot: ShotResult
  ghost?: FlightSample[]
  failures: FailureEvent[]
  hits: number[]
  predictionError: number | null
}

export interface MissionRun {
  last: ShotRecord | null
  shots: number
  hitSoFar: ReadonlySet<number>
  won: boolean
  stars: number
  busy: boolean
  codeError: StudentError | null
  stdout: string
  fire: (input: { releaseDeg: number; code: string; prediction: number | null }) => Promise<ShotRecord | null>
  reset: () => void
}

interface Computed {
  shot: ShotResult
  ghost?: FlightSample[]
  studentFlight: boolean
  angleLooksLikeDegrees: boolean
}

type Compute = { ok: true; value: Computed; stdout: string } | { ok: false; error: StudentError; stdout: string }

async function computeShot(m: Mission, releaseDeg: number, code: string): Promise<Compute> {
  const params = withRelease(m.base, m.sliders.length > 0 ? releaseDeg : undefined)
  if (!m.code) return { ok: true, value: { shot: simulateShot(params), studentFlight: false, angleLooksLikeDegrees: false }, stdout: '' }

  const reference = simulateShot(params).flight
  const arm = armForCode(params)
  if (m.code.fn === 'launch_velocity') {
    const res = await runStudent(code, { kind: 'launch', speed: arm.speed, angleDeg: arm.angleDeg })
    if (!res.ok) return res
    if (res.kind !== 'launch') throw new Error('unexpected worker reply')
    return {
      ok: true,
      stdout: res.stdout,
      value: {
        shot: shotFromLaunch(params, res.velocity),
        ghost: reference,
        studentFlight: false,
        angleLooksLikeDegrees: looksLikeDegrees(arm.speed, arm.angleDeg, res.velocity),
      },
    }
  }
  const r = arm.run.release!
  const res = await runStudent(code, { kind: 'step', init: { x: r.x, y: r.y, vx: r.vx, vy: r.vy }, dt: STEP_DT, maxSteps: MAX_STEPS })
  if (!res.ok) return res
  if (res.kind !== 'step') throw new Error('unexpected worker reply')
  return {
    ok: true,
    stdout: res.stdout,
    value: { shot: shotFromSteps(params, res.samples, STEP_DT), ghost: reference, studentFlight: true, angleLooksLikeDegrees: false },
  }
}

/** Everything that happens when the student pulls the trigger, independent of rendering. */
export function useMissionRun(m: Mission): MissionRun {
  const [last, setLast] = useState<ShotRecord | null>(null)
  const [shots, setShots] = useState(0)
  const [hitSoFar, setHitSoFar] = useState<ReadonlySet<number>>(new Set())
  const [won, setWon] = useState(false)
  const [stars, setStars] = useState(0)
  const [busy, setBusy] = useState(false)
  const [codeError, setCodeError] = useState<StudentError | null>(null)
  const [stdout, setStdout] = useState('')

  const reset = useCallback(() => {
    setLast(null)
    setShots(0)
    setHitSoFar(new Set())
    setWon(false)
    setStars(0)
    setCodeError(null)
    setStdout('')
  }, [])

  const fire = useCallback<MissionRun['fire']>(
    async ({ releaseDeg, code, prediction }) => {
      setBusy(true)
      setCodeError(null)
      try {
        const computed = await computeShot(m, releaseDeg, code)
        setStdout(computed.stdout)
        if (!computed.ok) {
          setCodeError(computed.error)
          return null
        }
        const { shot, ghost, studentFlight, angleLooksLikeDegrees } = computed.value
        const flightTime = shot.landing ? shot.landing.t - (shot.releaseT ?? 0) : 0
        const failures = detectFailures(shot, {
          g: m.base.world.g,
          targets: targetsAt(m.targets, flightTime),
          studentFlight,
          angleLooksLikeDegrees,
        })
        const { hits, predictionError } = evaluateShot(m, shot, prediction)
        const record: ShotRecord = { shot, ghost, failures, hits, predictionError }
        const nextShots = shots + 1
        const nextHits = new Set([...hitSoFar, ...hits])
        const nowWon = !won && isMissionWon(m, nextHits, predictionError)
        setLast(record)
        setShots(nextShots)
        setHitSoFar(nextHits)
        if (nowWon) {
          setWon(true)
          setStars(starsFor(m, nextShots, predictionError))
        }
        return record
      } finally {
        setBusy(false)
      }
    },
    [m, shots, hitSoFar, won],
  )

  return useMemo(
    () => ({ last, shots, hitSoFar, won, stars, busy, codeError, stdout, fire, reset }),
    [last, shots, hitSoFar, won, stars, busy, codeError, stdout, fire, reset],
  )
}
