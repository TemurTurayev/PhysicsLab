import { describe, expect, it } from 'vitest'
import { findMission, MISSIONS } from '../levels'
import { FAILURES } from '../failures/catalog'
import { applyCopy } from './copy'
import { tellFailure } from './failureCopy'
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
    expect(sigma.envFor(5)).not.toBeNull()
    expect(sigma.envFor(6)).toBeNull()
  })

  it('the complex never borrows names or symbols from Valve games', () => {
    const forbidden = /half[- ]?life|black\s*mesa|aperture|\bhev\b|combine|freeman|valve|λ|лямбд|хэв|блэк\s*меса/i
    const strings = JSON.stringify({ ...sigma, envFor: undefined })
    expect(strings).not.toMatch(forbidden)
  })
})

describe('post-mortems per universe', () => {
  it('the complex tells about its projectile and its own machine, with the same numbers', () => {
    const told = tellFailure('early_release', sigma)
    const n = { angleDeg: 114.6, speed: 19.6 }
    expect(told.what(n)).toMatch(/Снаряд/)
    expect(told.what(n)).not.toMatch(/[Кк]ам(ень|ня|нем|ню)/)
    expect(told.realLife).not.toMatch(/требушет/i)
    expect(told.what(n)).toMatch(/114,6/)
  })
  it('Classic keeps the original post-mortem', () => {
    expect(tellFailure('early_release', classic)).toBe(FAILURES.early_release)
  })
})
