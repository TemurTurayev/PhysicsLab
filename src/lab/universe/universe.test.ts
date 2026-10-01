import { describe, expect, it } from 'vitest'
import { findMission, MISSIONS } from '../levels'
import { applyCopy } from './copy'
import { getUniverse } from './index'

const sigma = getUniverse('sigma')
const classic = getUniverse('classic')

describe('universes', () => {
  it('a copy overlay changes the words but never the physics', () => {
    const m = findMission('1-1')!
    const told = applyCopy(m, sigma)
    expect(told.title).not.toBe(m.title)
    expect({ ...told, title: m.title, brief: m.brief, goal: m.goal, hints: m.hints }).toEqual(m)
  })

  it('missions without an overlay are told as written', () => {
    expect(applyCopy(findMission('3-4')!, getUniverse('classic'))).toBe(findMission('3-4'))
  })

  it('Classic opens every chapter; the complex opens only the sectors it has built', () => {
    for (const m of MISSIONS) expect(classic.envFor(m.chapter)).not.toBeNull()
    expect(sigma.envFor(1)).not.toBeNull()
    expect(sigma.envFor(2)).not.toBeNull()
    expect(sigma.envFor(4)).not.toBeNull()
    expect(sigma.envFor(5)).toBeNull()
  })

  it('the complex never borrows names or symbols from Valve games', () => {
    const forbidden = /half[- ]?life|black\s*mesa|aperture|\bhev\b|combine|freeman|valve|λ|лямбд|хэв|блэк\s*меса/i
    const strings = JSON.stringify({ ...sigma, envFor: undefined })
    expect(strings).not.toMatch(forbidden)
  })
})
