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
