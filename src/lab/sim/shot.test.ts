import { describe, expect, it } from 'vitest'
import { simulateShot } from './shot'
import { DEFAULT_TREBUCHET, EARTH } from './types'

describe('simulateShot', () => {
  it('is deterministic, so replays and screenshots match the shot the student saw', () => {
    const params = { trebuchet: DEFAULT_TREBUCHET, world: EARTH }
    expect(simulateShot(params)).toEqual(simulateShot(params))
  })

  it('starts the flight exactly where and when the sling let go', () => {
    const shot = simulateShot({ trebuchet: DEFAULT_TREBUCHET, world: EARTH })
    const lastArmBeforeRelease = shot.arm.filter((a) => !a.released).at(-1)!
    expect(shot.flight[0].t).toBeCloseTo(shot.releaseT!, 9)
    expect(shot.flight[0].t - lastArmBeforeRelease.t).toBeLessThan(1 / 100)
  })
})
