import { describe, expect, it } from 'vitest'
import { launchSheet } from '../calc/launchSheet'
import { simulateShot } from './shot'
import { DEFAULT_TREBUCHET, EARTH } from './types'

const withLauncher = (launcher: { x0: number; y0: number; speed: number; angleDeg: number }) => ({ trebuchet: DEFAULT_TREBUCHET, world: EARTH, launcher })

describe('fixed launcher (no arm)', () => {
  it('a horizontal throw from 4.905 m flies exactly 1 s and lands speed × 1 s from the tower', () => {
    const shot = simulateShot(withLauncher({ x0: 10, y0: 4.905, speed: 30, angleDeg: 0 }))
    expect(shot.arm).toEqual([])
    expect(shot.releaseT).toBe(0)
    expect(shot.landing!.t).toBeCloseTo(1, 3)
    expect(shot.landing!.x).toBeCloseTo(40, 2)
  })

  it('a dropped stone falls straight down: t = √(2h/g)', () => {
    const shot = simulateShot(withLauncher({ x0: 5, y0: 12, speed: 0, angleDeg: 0 }))
    expect(shot.landing!.x).toBeCloseTo(5, 6)
    expect(shot.landing!.t).toBeCloseTo(Math.sqrt((2 * 12) / 9.81), 3)
  })

  it('a ground launch matches the textbook range v²·sin2α / g', () => {
    const shot = simulateShot(withLauncher({ x0: 0, y0: 0, speed: 20, angleDeg: 30 }))
    expect(shot.landing!.x).toBeCloseTo((400 * Math.sin(Math.PI / 3)) / 9.81, 2)
  })

  it('the data sheet shows the launcher itself', () => {
    const s = launchSheet(withLauncher({ x0: 2, y0: 3, speed: 13, angleDeg: 22.62 }))!
    expect(s.x0).toBe(2)
    expect(s.y0).toBe(3)
    expect(s.v0).toBe(13)
    expect(s.vx).toBeCloseTo(12, 2)
    expect(s.vy).toBeCloseTo(5, 2)
  })
})
