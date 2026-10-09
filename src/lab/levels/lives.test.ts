import { describe, expect, it } from 'vitest'
import { findMission } from './index'
import { costsLife, MAX_LIVES, starsForLives } from './lives'

const miss = { hits: [] as number[], predictionError: null }

describe('lives', () => {
  it('a miss costs a life, a hit or a good prediction does not', () => {
    const m = findMission('1-1')!
    expect(costsLife(m, miss, '')).toBe(true)
    expect(costsLife(m, { hits: [0], predictionError: null }, '')).toBe(false)
    const p = findMission('1-2')!
    expect(costsLife(p, { hits: [], predictionError: p.predict!.tolerance / 2 }, '')).toBe(false)
    expect(costsLife(p, { hits: [], predictionError: p.predict!.tolerance * 3 }, '')).toBe(true)
  })
  it('running the untouched starter code is a free look at the bug', () => {
    const m = findMission('2-3')!
    expect(costsLife(m, miss, m.code!.starter)).toBe(false)
    expect(costsLife(m, miss, m.code!.starter + '\n# changed')).toBe(true)
  })
  it('stars are the lives left at the win', () => {
    expect(starsForLives(MAX_LIVES)).toBe(3)
    expect(starsForLives(1)).toBe(1)
  })
})
