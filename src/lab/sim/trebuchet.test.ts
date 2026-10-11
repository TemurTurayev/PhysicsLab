import { describe, expect, it } from 'vitest'
import { armEnergy, simulateArm } from './trebuchet'
import { DEFAULT_TREBUCHET, type TrebuchetParams } from './types'

const g = 9.81
const NEVER = -999

describe('simulateArm', () => {
  it('conserves energy when nothing touches the ground and nothing is damped', () => {
    const p: TrebuchetParams = { ...DEFAULT_TREBUCHET, H: 20, releaseDeg: NEVER }
    const run = simulateArm(p, g, { ground: false, duration: 2 })
    const e0 = armEnergy(p, g, run.states[0])
    const drift = run.states.map((s) => Math.abs(armEnergy(p, g, s) - e0))
    const scale = p.mc * g * p.L2 * 2
    expect(Math.max(...drift) / scale).toBeLessThan(0.005)
  })

  it('never releases when the release angle cannot be reached', () => {
    const run = simulateArm({ ...DEFAULT_TREBUCHET, releaseDeg: NEVER }, g)
    expect(run.release).toBeNull()
    expect(run.arm.at(-1)!.t).toBeGreaterThanOrEqual(3.99)
  })

  it('throws forward at a plausible speed with the default setup', () => {
    const run = simulateArm(DEFAULT_TREBUCHET, g)
    expect(run.release).not.toBeNull()
    const { vx, vy } = run.release!
    expect(vx).toBeGreaterThan(0)
    expect(Math.hypot(vx, vy)).toBeGreaterThan(15)
    expect(Math.hypot(vx, vy)).toBeLessThan(80)
  })


  it('keeps the resting stone on the ground before the swing lifts it', () => {
    const run = simulateArm(DEFAULT_TREBUCHET, g)
    const firstTenth = run.states.filter((s) => s.t < 0.1)
    for (const s of firstTenth) expect(s.stoneY).toBeGreaterThan(DEFAULT_TREBUCHET.r - 0.02)
  })
})

describe('structural loads', () => {
  const free = { ...DEFAULT_TREBUCHET }

  it('sling tension equals m·|a − g| of the stone (checked by finite differences)', () => {
    const run = simulateArm(free, g)
    const s = run.states
    const releaseT = run.release!.t
    // a sample well after lift-off and before release
    const i = s.findIndex((x) => x.t > releaseT * 0.8)
    const h = s[1].t - s[0].t
    const ax = (s[i + 1].stoneX - 2 * s[i].stoneX + s[i - 1].stoneX) / (h * h)
    const ay = (s[i + 1].stoneY - 2 * s[i].stoneY + s[i - 1].stoneY) / (h * h)
    const expected = free.mp * Math.hypot(ax, ay + g)
    expect(Math.abs(s[i].tension - expected) / expected).toBeLessThan(0.05)
  })

  it('the beam moment at the axle is at least the counterweight hanging statically', () => {
    const run = simulateArm(free, g)
    expect(run.peakMoment).toBeGreaterThan(free.mc * g * free.L2 * 0.5)
    expect(run.peakMoment).toBeLessThan(free.mc * g * free.L2 * 10)
  })

  it('a weak beam breaks at its peak load and lets the stone go at that instant', () => {
    const peak = simulateArm(free, g).peakMoment
    const run = simulateArm({ ...free, beamStrength: peak * 0.6 }, g)
    expect(run.breakage?.kind).toBe('beam')
    expect(run.release!.t).toBe(run.breakage!.t)
    expect(run.arm.at(-1)!.broken).toBe(true)
  })

  it('a weak sling snaps before the planned release', () => {
    const normal = simulateArm(free, g)
    const run = simulateArm({ ...free, slingStrength: normal.peakTension * 0.6 }, g)
    expect(run.breakage?.kind).toBe('sling')
    expect(run.release!.t).toBeLessThan(normal.release!.t)
  })

  it('strong parts change nothing', () => {
    const a = simulateArm(free, g)
    const b = simulateArm({ ...free, beamStrength: a.peakMoment * 2, slingStrength: a.peakTension * 2 }, g)
    expect(b.breakage).toBeNull()
    expect(b.release).toEqual(a.release)
  })
})
