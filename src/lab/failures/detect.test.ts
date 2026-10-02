import { describe, expect, it } from 'vitest'
import { simulateShot } from '../sim/shot'
import { DEFAULT_TREBUCHET, EARTH, type FlightSample, type ShotResult } from '../sim/types'
import { detectFailures } from './detect'

const shot = (releaseDeg: number) => simulateShot({ trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg }, world: EARTH })
const ids = (r: ShotResult, targets = [{ x: 73, r: 4 }], extra = {}) =>
  detectFailures(r, { g: 9.81, targets, ...extra }).map((f) => f.id)

function fakeFlight(ay: number, n = 40): ShotResult {
  const flight: FlightSample[] = Array.from({ length: n }, (_, i) => {
    const t = i / 60
    return { t, x: 20 * t, y: 5 + 10 * t + 0.5 * ay * t * t, vx: 20, vy: 10 + ay * t }
  })
  return { arm: [], flight, released: true, releaseT: 0, launch: { speed: 22, angleDeg: 26 }, landing: null, apex: null, breakage: null, peakMoment: 0, peakTension: 0 }
}

describe('detectFailures', () => {
  it('is silent on a good shot that hits', () => {
    expect(ids(shot(110))).toEqual([])
  })
  it('flags a pin that never opens', () => {
    expect(ids(shot(-999))).toEqual(['no_release'])
  })
  it('flags an early release that comes back over the crew', () => {
    expect(ids(shot(170))).toEqual(expect.arrayContaining(['early_release', 'self_hit']))
  })
  it('flags a late release slammed into the ground, without a second "short" story', () => {
    expect(ids(shot(80))).toEqual(['late_release'])
  })
  it('reports signed miss distance', () => {
    const [miss] = detectFailures(shot(110), { g: 9.81, targets: [{ x: 40, r: 3 }] })
    expect(miss.id).toBe('long')
    expect(miss.numbers.miss).toBeCloseTo(shot(110).landing!.x - 40, 6)
  })
  it('checks student physics only for student flights', () => {
    expect(ids(fakeFlight(0), [], { studentFlight: true })).toContain('no_gravity')
    expect(ids(fakeFlight(9.81), [], { studentFlight: true })).toContain('gravity_up')
    expect(ids(fakeFlight(-9.81), [], { studentFlight: true })).not.toContain('no_gravity')
    expect(ids(fakeFlight(0), [])).not.toContain('no_gravity')
  })
  it('flags NaN or runaway numbers as an explosion', () => {
    const r = fakeFlight(-9.81)
    const broken = { ...r, flight: [...r.flight, { t: 1, x: NaN, y: 1, vx: 0, vy: 0 }] }
    expect(ids(broken, [], { studentFlight: true })).toEqual(['exploded'])
  })
  it('passes through the degrees/radians verdict of the mission', () => {
    expect(ids(shot(110), [], { angleLooksLikeDegrees: true })).toContain('degrees_radians')
  })
  it('names a code bug as the cause, not the release angle or the miss it produced', () => {
    expect(ids(shot(170), [{ x: 73, r: 4 }], { angleLooksLikeDegrees: true })).toEqual(['degrees_radians', 'self_hit'])
    expect(ids(shot(80), [{ x: 73, r: 4 }], { angleLooksLikeDegrees: true })).toEqual(['degrees_radians'])
  })
})

describe('structural failures', () => {
  const base = { ...DEFAULT_TREBUCHET, releaseDeg: 110 }
  const peak = simulateShot({ trebuchet: base, world: EARTH })

  it('a snapped beam is the only story, with load against limit', () => {
    const r = simulateShot({ trebuchet: { ...base, beamStrength: peak.peakMoment * 0.7 }, world: EARTH })
    const events = detectFailures(r, { g: 9.81, targets: [{ x: 73, r: 3 }] })
    expect(events.map((e) => e.id)).toEqual(['beam_break'])
    expect(events[0].numbers.ratio).toBeGreaterThan(1)
  })

  it('a torn sling is reported instead of a release-angle mistake', () => {
    const r = simulateShot({ trebuchet: { ...base, slingStrength: peak.peakTension * 0.7 }, world: EARTH })
    expect(detectFailures(r, { g: 9.81, targets: [] }).map((e) => e.id)).toEqual(['sling_snap'])
  })
})

describe('a hit is never a failure', () => {
  it('a flat, low throw that lands on the target is not reported as a late release', () => {
    const r = simulateShot({ trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 96 }, world: EARTH }) // 4.5° launch, 47 m
    expect(detectFailures(r, { g: 9.81, targets: [{ x: 47, r: 2.5 }] })).toEqual([])
  })
  it('a shallow throw that misses is a miss, not a release fault', () => {
    const r = simulateShot({ trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 96 }, world: EARTH })
    expect(detectFailures(r, { g: 9.81, targets: [{ x: 70, r: 2 }] }).map((e) => e.id)).toEqual(['short'])
  })
})

describe('air and numerics in student code', () => {
  const k = 0.0017
  const wind = -12
  const dragCtx = { g: 9.81, targets: [], studentFlight: true, expectDrag: { k, wind } }
  const flightWith = (ax: (vx: number, vy: number) => number, n = 40): ShotResult => {
    let s = { t: 0, x: 0, y: 10, vx: 25, vy: 10 }
    const flight: FlightSample[] = [s]
    for (let i = 1; i < n; i++) {
      const dt = 1 / 60
      const vx = s.vx + ax(s.vx, s.vy) * dt
      const vy = s.vy - 9.81 * dt
      s = { t: i * dt, x: s.x + vx * dt, y: s.y + vy * dt, vx, vy }
      flight.push(s)
    }
    return { arm: [], flight, released: true, releaseT: 0, launch: { speed: 27, angleDeg: 22 }, landing: null, apex: null, breakage: null, peakMoment: 0, peakTension: 0 }
  }
  const realDrag = (vx: number, vy: number) => -k * Math.hypot(vx - wind, vy) * (vx - wind)

  it('flags a flight that ignores the air when the air is on', () => {
    expect(ids(flightWith(() => 0), [], dragCtx)).toContain('no_drag')
  })
  it('accepts a flight that feels the air', () => {
    expect(ids(flightWith(realDrag), [], dragCtx)).not.toContain('no_drag')
  })
  it('flags a numerical method that makes the stone swing back and forth', () => {
    const r = flightWith(() => 0)
    const shaky = { ...r, flight: r.flight.map((s, i) => ({ ...s, vx: i % 2 === 0 ? 20 + i : -20 - i })) }
    expect(ids(shaky, [], { g: 9.81, targets: [], studentFlight: true })).toContain('unstable')
  })
})

describe('gravity of the right world', () => {
  it('flags a student flight that falls with Earth gravity on the Moon', () => {
    expect(ids(fakeFlight(-9.81), [], { studentFlight: true, g: 1.62 })).toContain('wrong_g')
  })
  it('accepts the gravity of the world it runs in', () => {
    expect(ids(fakeFlight(-1.62), [], { studentFlight: true, g: 1.62 })).not.toContain('wrong_g')
  })
})
