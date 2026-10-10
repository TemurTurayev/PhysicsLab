import { describe, expect, it } from 'vitest'
import { CHAPTERS, MISSIONS } from '../lab/levels'
import { summarize } from './progress'

describe('home progress summary', () => {
  it('a fresh student starts at the first mission with nothing done', () => {
    const s = summarize({})
    expect(s.done).toBe(0)
    expect(s.total).toBe(MISSIONS.length)
    expect(s.stars).toBe(0)
    expect(s.maxStars).toBe(MISSIONS.length * 3)
    expect(s.next?.id).toBe(MISSIONS[0].id)
    expect(s.started).toBe(false)
  })

  it('points to the first unlocked, unfinished mission and counts stars', () => {
    const s = summarize({ [MISSIONS[0].id]: 3, [MISSIONS[1].id]: 2 })
    expect(s.done).toBe(2)
    expect(s.stars).toBe(5)
    expect(s.next?.id).toBe(MISSIONS[2].id)
    expect(s.started).toBe(true)
  })

  it('reports each chapter separately', () => {
    const first = CHAPTERS[0]
    const s = summarize(Object.fromEntries(first.missions.map((m) => [m.id, 1])))
    expect(s.chapters[0]).toEqual({ id: first.id, done: first.missions.length, total: first.missions.length, stars: first.missions.length, open: true })
    expect(s.chapters[1].done).toBe(0)
    expect(s.chapters[1].open).toBe(true)
    expect(summarize({}).chapters[1].open).toBe(false)
  })

  it('has no next mission once everything is done', () => {
    const s = summarize(Object.fromEntries(MISSIONS.map((m) => [m.id, 3])))
    expect(s.next).toBeUndefined()
    expect(s.stars).toBe(s.maxStars)
  })
})
