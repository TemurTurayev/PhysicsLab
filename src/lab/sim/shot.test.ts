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

describe('gravity as a parameter', () => {
  it('a trebuchet throws as far on the Moon, only slower: range is g-invariant, time scales as 1/√g', () => {
    const earth = simulateShot({ trebuchet: DEFAULT_TREBUCHET, world: EARTH })
    const moon = simulateShot({ trebuchet: DEFAULT_TREBUCHET, world: { ...EARTH, g: 1.62 } })
    expect(Math.abs(moon.landing!.x - earth.landing!.x) / earth.landing!.x).toBeLessThan(0.002)
    const flight = (s: typeof earth) => s.landing!.t - s.releaseT!
    expect(flight(moon) / flight(earth)).toBeCloseTo(Math.sqrt(9.81 / 1.62), 2)
  })
})
