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
  targetsAt,
  withSliders,
  pickCounterweight,
  SAFETY_MASSES,
  clipAtWalls,
} from '../levels/evaluate'
import { costsLife, MAX_LIVES, starsForLives } from '../levels/lives'
import type { Mission, SliderValues } from '../levels/types'
import { runStudent } from '../python/runStudent'
import type { StudentError } from '../python/protocol'
import { dragFactor } from '../sim/flight'
import { simulateShot } from '../sim/shot'
import type { FlightSample, ShotResult, SimParams } from '../sim/types'

const STEP_DT = 1 / 240
const MAX_FLIGHT_S = 40

export interface ShotRecord {
  shot: ShotResult
  ghost?: FlightSample[]
  failures: FailureEvent[]
  hits: number[]
  predictionError: number | null
  lifeLost: boolean
}

export interface MissionRun {
  last: ShotRecord | null
  shots: number
  hitSoFar: ReadonlySet<number>
  won: boolean
  stars: number
  lives: number
  busy: boolean
  codeError: StudentError | null
  stdout: string
  fire: (input: { values: SliderValues; code: string; prediction: number | null }) => Promise<ShotRecord | null>
  reset: () => void
}

interface Computed {
  shot: ShotResult
  ghost?: FlightSample[]
  studentFlight: boolean
  angleLooksLikeDegrees: boolean
}

type Compute = { ok: true; value: Computed; stdout: string } | { ok: false; error: StudentError; stdout: string }

async function computeShot(m: Mission, values: SliderValues, code: string): Promise<Compute> {
  const params = withSliders(m, values)
  if (!m.code) return { ok: true, value: { shot: simulateShot(params), studentFlight: false, angleLooksLikeDegrees: false }, stdout: '' }

  if (m.code.fn === 'beam_moment') return momentShot(params, code)
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
  const dt = m.code.dt ?? STEP_DT
  const res = await runStudent(code, { kind: 'step', init: { x: r.x, y: r.y, vx: r.vx, vy: r.vy }, dt, maxSteps: Math.ceil(MAX_FLIGHT_S / dt), g: params.world.g })
  if (!res.ok) return res
  if (res.kind !== 'step') throw new Error('unexpected worker reply')
  return {
    ok: true,
    stdout: res.stdout,
    value: { shot: shotFromSteps(params, res.samples, dt), ghost: reference, studentFlight: true, angleLooksLikeDegrees: false },
  }
}

async function momentShot(params: SimParams, code: string): Promise<Compute> {
  const limit = params.trebuchet.beamStrength ?? Infinity
  const res = await runStudent(code, { kind: 'moment', masses: SAFETY_MASSES })
  if (!res.ok) return res
  if (res.kind !== 'moment') throw new Error('unexpected worker reply')
  const mc = pickCounterweight(SAFETY_MASSES, res.moments, limit)
  const truth = SAFETY_MASSES.map((x) => x * params.world.g * params.trebuchet.L2)
  const safeMc = pickCounterweight(SAFETY_MASSES, truth, limit)
  const shot = simulateShot({ ...params, trebuchet: { ...params.trebuchet, mc } })
  const ghost = simulateShot({ ...params, trebuchet: { ...params.trebuchet, mc: safeMc } }).flight
  const note = `Мастер поставил противовес ${mc} кг: по твоей формуле это ${Math.round(res.moments[SAFETY_MASSES.indexOf(mc)])} Н·м — не больше предела ${limit} Н·м.`
  return { ok: true, stdout: `${note}\n${res.stdout}`, value: { shot, ghost, studentFlight: false, angleLooksLikeDegrees: false } }
}

/** Everything that happens when the student pulls the trigger, independent of rendering. */
export function useMissionRun(m: Mission): MissionRun {
  const [last, setLast] = useState<ShotRecord | null>(null)
  const [shots, setShots] = useState(0)
  const [hitSoFar, setHitSoFar] = useState<ReadonlySet<number>>(new Set())
  const [won, setWon] = useState(false)
  const [stars, setStars] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [busy, setBusy] = useState(false)
  const [codeError, setCodeError] = useState<StudentError | null>(null)
  const [stdout, setStdout] = useState('')

  const reset = useCallback(() => {
    setLast(null)
    setShots(0)
    setHitSoFar(new Set())
    setWon(false)
    setStars(0)
    setLives(MAX_LIVES)
    setCodeError(null)
    setStdout('')
  }, [])

  const fire = useCallback<MissionRun['fire']>(
    async ({ values, code, prediction }) => {
      if (lives <= 0 && !won) return null
      setBusy(true)
      setCodeError(null)
      try {
        const computed = await computeShot(m, values, code)
        setStdout(computed.stdout)
        if (!computed.ok) {
          setCodeError(computed.error)
          return null
        }
        const { ghost, studentFlight, angleLooksLikeDegrees } = computed.value
        const shot = clipAtWalls(computed.value.shot, m.targets)
        const flightTime = shot.landing ? shot.landing.t - (shot.releaseT ?? 0) : 0
        const failures = detectFailures(shot, {
          g: m.base.world.g,
          targets: targetsAt(m.targets, flightTime),
          studentFlight,
          angleLooksLikeDegrees,
          stepDt: m.code?.fn === 'step' ? (m.code.dt ?? STEP_DT) : undefined,
          expectDrag: m.base.world.drag ? { k: dragFactor(m.base.trebuchet.mp, m.base.trebuchet.r), wind: m.base.world.wind } : undefined,
        })
        const { hits, predictionError } = evaluateShot(m, shot, prediction)
        const lifeLost = !won && costsLife(m, { hits, predictionError }, code)
        const record: ShotRecord = { shot, ghost, failures, hits, predictionError, lifeLost }
        const livesLeft = lifeLost ? lives - 1 : lives
        const nextShots = shots + 1
        const nextHits = new Set([...hitSoFar, ...hits])
        const nowWon = !won && isMissionWon(m, nextHits, predictionError)
        setLast(record)
        setShots(nextShots)
        setHitSoFar(nextHits)
        setLives(livesLeft)
        if (nowWon) {
          setWon(true)
          setStars(starsForLives(livesLeft))
        }
        return record
      } finally {
        setBusy(false)
      }
    },
    [m, shots, hitSoFar, won, lives],
  )

  return useMemo(
    () => ({ last, shots, hitSoFar, won, stars, lives, busy, codeError, stdout, fire, reset }),
    [last, shots, hitSoFar, won, stars, lives, busy, codeError, stdout, fire, reset],
  )
}
