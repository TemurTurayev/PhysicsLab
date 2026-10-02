import { beforeEach, describe, expect, it } from 'vitest'
import { useLabProgress } from './labProgress'

describe('lab progress', () => {
  beforeEach(() => useLabProgress.getState().reset())

  it('reports a failure type as new only once', () => {
    expect(useLabProgress.getState().recordIncident('self_hit')).toBe(true)
    expect(useLabProgress.getState().recordIncident('self_hit')).toBe(false)
    expect(useLabProgress.getState().incidents).toEqual(['self_hit'])
  })

  it('keeps the best star count', () => {
    useLabProgress.getState().complete('1-1', 3)
    useLabProgress.getState().complete('1-1', 1)
    expect(useLabProgress.getState().completed['1-1']).toBe(3)
  })
})

describe('universe choice', () => {
  it('is a setting: resetting progress keeps it', () => {
    useLabProgress.getState().setUniverse('sigma')
    useLabProgress.getState().complete('1-1', 2)
    useLabProgress.getState().reset()
    expect(useLabProgress.getState().universe).toBe('sigma')
    expect(useLabProgress.getState().completed).toEqual({})
  })
})
