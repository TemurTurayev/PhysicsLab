import { describe, expect, it } from 'vitest'
import { simulateShot } from '../sim/shot'
import { CHAPTER_0 } from './chapter0'
import { evaluateShot, isMissionWon, withSliders } from './evaluate'
import { costsLife } from './lives'
import type { Mission, SliderValues } from './types'

const m = (id: string) => CHAPTER_0.missions.find((x) => x.id === id)!
const hits = (mission: Mission, values: SliderValues) => evaluateShot(mission, simulateShot(withSliders(mission, values)), null).hits.length > 0
const predicts = (mission: Mission, answer: number) => {
  const { predictionError } = evaluateShot(mission, simulateShot(mission.base), answer)
  return isMissionWon(mission, new Set(), predictionError)
}
const withSpeed = (mission: Mission, speed: number) => ({ ...mission.base, launcher: { ...mission.base.launcher!, speed } })
const hitsAtSpeed = (mission: Mission, speed: number) => evaluateShot(mission, simulateShot(withSpeed(mission, speed)), null).hits.length > 0

describe('chapter 0: each step is solved by its school formula, and only by it', () => {
  it('0-1 number line: x₀ = 52 − 30', () => {
    expect(hits(m('0-1'), { x0: 22 })).toBe(true)
    expect(hits(m('0-1'), { x0: 10 })).toBe(false)
  })
  it('0-2 s = v·t: v = 36 / 2, half a step off misses', () => {
    expect(hits(m('0-2'), { speed: 18 })).toBe(true)
    expect(hits(m('0-2'), { speed: 17.5 })).toBe(false)
  })
  it('0-3 free fall: t = √(2h/g)', () => {
    expect(predicts(m('0-3'), Math.sqrt(24 / 9.81))).toBe(true)
    expect(predicts(m('0-3'), 12 / 9.81)).toBe(false) // forgot the square root
  })
  it('0-4 horizontal throw: R = x₀ + v·t', () => {
    expect(predicts(m('0-4'), 2 + 14 * Math.sqrt(24 / 9.81))).toBe(true)
    expect(predicts(m('0-4'), 14 * Math.sqrt(24 / 9.81))).toBe(false) // forgot x₀: 2 m off
  })
  it('0-5 Pythagoras: √(12² + 5²) = 13, the sum of the legs does not', () => {
    expect(hits(m('0-5'), { speed: 13 })).toBe(true)
    expect(hits(m('0-5'), { speed: 12.5 })).toBe(false)
    expect(hits(m('0-5'), { speed: 17 })).toBe(false)
  })
  it('0-6 sin: t = 2·v·sin30° / g, cos instead misses', () => {
    expect(predicts(m('0-6'), (2 * 10) / 9.81)).toBe(true)
    expect(predicts(m('0-6'), (2 * 20 * Math.cos(Math.PI / 6)) / 9.81)).toBe(false)
  })
  it('0-7 vertex: h = vy² / 2g', () => {
    const vy = 20 * Math.sin(Math.PI / 3)
    expect(predicts(m('0-7'), (vy * vy) / (2 * 9.81))).toBe(true)
    expect(predicts(m('0-7'), (vy * vy) / 9.81)).toBe(false) // forgot the 2
  })
  it('0-8 and 0-9: the reference programs\' numbers hit, the starters\' do not', () => {
    expect(hitsAtSpeed(m('0-8'), 34 / 2)).toBe(true)
    expect(hitsAtSpeed(m('0-8'), 0)).toBe(false)
    expect(hitsAtSpeed(m('0-9'), 28 / Math.sqrt((2 * 12) / 9.81))).toBe(true)
    expect(hitsAtSpeed(m('0-9'), 28 / ((2 * 12) / 9.81))).toBe(false) // forgot the root
  })
  it('practice forgives misses in aiming steps, never in predictions (a shot would reveal the answer)', () => {
    const miss = { hits: [], predictionError: 5 }
    expect(['0-1', '0-2'].map((id) => costsLife(m(id), miss, ''))).toEqual([false, false])
    expect(costsLife(m('0-3'), miss, '')).toBe(true)
    expect(costsLife(m('0-4'), miss, '')).toBe(true)
  })
  it('every step trains one named school subject', () => {
    for (const x of CHAPTER_0.missions) expect(x.subject, x.id).toBeDefined()
  })
})
