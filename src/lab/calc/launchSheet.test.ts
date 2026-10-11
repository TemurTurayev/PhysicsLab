import { describe, expect, it } from 'vitest'
import { simulateShot } from '../sim/shot'
import { DEFAULT_TREBUCHET, EARTH } from '../sim/types'
import { launchSheet, vacuumFlight } from './launchSheet'

const params = { trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 110 }, world: EARTH }

describe('launchSheet', () => {
  it('gives the release point and velocity the real shot starts from', () => {
    const sheet = launchSheet(params)!
    const shot = simulateShot(params)
    expect(sheet.v0).toBeCloseTo(shot.launch!.speed, 6)
    expect(sheet.alphaDeg).toBeCloseTo(shot.launch!.angleDeg, 6)
    expect(sheet.vx).toBeCloseTo(sheet.v0 * Math.cos((sheet.alphaDeg * Math.PI) / 180), 6)
  })
  it('the textbook formulas from the sheet land where the simulator lands (no air)', () => {
    const sheet = launchSheet(params)!
    const shot = simulateShot(params)
    const f = vacuumFlight(sheet)
    expect(f.range).toBeCloseTo(shot.landing!.x, 0)
    expect(f.apexY).toBeCloseTo(shot.apex!.y, 0)
    expect(f.tFlight).toBeCloseTo(shot.landing!.t - shot.releaseT!, 1)
  })
  it('says so when the sling never opens', () => {
    expect(launchSheet({ ...params, trebuchet: { ...params.trebuchet, releaseDeg: -999 } })).toBeNull()
  })
})
