import { describe, expect, it } from 'vitest'
import { MISSIONS } from './index'
import { storyFor } from './story'

describe('mission stories', () => {
  it('every mission has a reason to exist in both worlds', () => {
    for (const m of MISSIONS) {
      expect(storyFor(m.id, 'classic'), m.id).toBeTruthy()
      expect(storyFor(m.id, 'sigma'), m.id).toBeTruthy()
    }
  })
  it('the complex speaks formally and borrows no names', () => {
    for (const m of MISSIONS) {
      const s = storyFor(m.id, 'sigma')!
      expect(s, m.id).not.toMatch(/\bты\b|твой/)
      expect(s).not.toMatch(/half[- ]?life|black\s*mesa|freeman|valve/i)
    }
  })
})
