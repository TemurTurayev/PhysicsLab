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
  return { arm: [], flight, released: true, releaseT: 0, launch: { speed: 22, angleDeg: 26 }, landing: null, apex: null }
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
  it('flags a late release slammed into the ground', () => {
    expect(ids(shot(80))).toEqual(expect.arrayContaining(['late_release', 'short']))
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
})
