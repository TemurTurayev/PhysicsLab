import { describe, expect, it } from 'vitest'
import { simulateShot } from './shot'
import { DEFAULT_TREBUCHET, EARTH } from './types'

describe('simulateShot', () => {
  it('is deterministic', () => {
    const params = { trebuchet: DEFAULT_TREBUCHET, world: EARTH }
    expect(simulateShot(params)).toEqual(simulateShot(params))
  })

  it('lands somewhere forward with the default setup', () => {
    const shot = simulateShot({ trebuchet: DEFAULT_TREBUCHET, world: EARTH })
    expect(shot.released).toBe(true)
    expect(shot.landing!.x).toBeGreaterThan(10)
    expect(shot.flight[0].t).toBeCloseTo(shot.releaseT!, 9)
  })

  it('reports no flight when the pin never opens', () => {
    const shot = simulateShot({ trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: -999 }, world: EARTH })
    expect(shot.flight).toEqual([])
    expect(shot.landing).toBeNull()
  })
})
