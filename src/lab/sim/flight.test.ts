import { describe, expect, it } from 'vitest'
import { simulateFlight } from './flight'
import { EARTH } from './types'

const launch = (speed: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return { t: 0, x: 0, y: 0, vx: speed * Math.cos(a), vy: speed * Math.sin(a) }
}

describe('simulateFlight', () => {
  it('matches the vacuum range formula R = v² sin2θ / g', () => {
    const samples = simulateFlight(launch(30, 35), EARTH, 12, 0.15)
    const expected = (30 ** 2 * Math.sin((70 * Math.PI) / 180)) / EARTH.g
    const landing = samples.at(-1)!
    expect(landing.y).toBeCloseTo(0, 6)
    expect(Math.abs(landing.x - expected) / expected).toBeLessThan(0.005)
  })

  it('reaches the apex height v² sin²θ / (2g)', () => {
    const samples = simulateFlight(launch(30, 60), EARTH, 12, 0.15)
    const top = Math.max(...samples.map((s) => s.y))
    const expected = (30 * Math.sin(Math.PI / 3)) ** 2 / (2 * EARTH.g)
    expect(Math.abs(top - expected) / expected).toBeLessThan(0.005)
  })

  it('air drag shortens the throw and a tailwind lengthens it', () => {
    const still = simulateFlight(launch(40, 45), { ...EARTH, drag: true }, 2, 0.15).at(-1)!.x
    const vacuum = simulateFlight(launch(40, 45), EARTH, 2, 0.15).at(-1)!.x
    const tail = simulateFlight(launch(40, 45), { ...EARTH, drag: true, wind: 10 }, 2, 0.15).at(-1)!.x
    expect(still).toBeLessThan(vacuum)
    expect(tail).toBeGreaterThan(still)
  })
})
