import { describe, expect, it } from 'vitest'
import { mergeProgress } from './mergeProgress'

describe('merging this browser with the account', () => {
  it('keeps the best stars of both and every incident once, in discovery order', () => {
    const local = { completed: { '0-1': 2, '0-2': 3 }, incidents: ['short', 'long'], universe: 'classic' as const }
    const remote = { completed: { '0-1': 3, '1-1': 1 }, incidents: ['long', 'self_hit'], universe: 'sigma' as const }
    expect(mergeProgress(local, remote)).toEqual({
      completed: { '0-1': 3, '0-2': 3, '1-1': 1 },
      incidents: ['long', 'self_hit', 'short'],
      universe: 'sigma',
    })
  })
  it('a fresh account takes everything from this browser', () => {
    const local = { completed: { '0-1': 2 }, incidents: ['short'], universe: null }
    expect(mergeProgress(local, null)).toEqual(local)
  })
  it('the account world wins, unless it never chose one', () => {
    expect(mergeProgress({ completed: {}, incidents: [], universe: 'sigma' }, { completed: {}, incidents: [], universe: null }).universe).toBe('sigma')
  })
})
