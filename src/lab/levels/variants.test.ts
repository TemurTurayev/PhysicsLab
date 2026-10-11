import { describe, expect, it } from 'vitest'
import { simulateShot } from '../sim/shot'
import { MISSIONS } from '.'
import { variantChanges, withVariant } from './variants'
import type { Mission } from './types'

function quantity(m: Mission): number {
  const shot = simulateShot(m.base)
  expect(shot.breakage).toBeNull()
  const q = m.predict!.quantity
  const v = q === 'landingX' ? shot.landing?.x : q === 'apexY' ? shot.apex?.y : shot.landing && shot.releaseT !== null ? shot.landing.t - shot.releaseT : undefined
  expect(v).toBeDefined()
  return v!
}

describe('prediction variants', () => {
  const predicts = MISSIONS.filter((m) => m.predict)

  it('every prediction mission has at least three variants', () => {
    for (const m of predicts) expect(m.predict!.variants?.length ?? 0, m.id).toBeGreaterThanOrEqual(3)
  })

  it.each(predicts.map((m) => [m.id, m] as const))('%s: each variant flies, stays in range and moves the answer well beyond the tolerance', (_, m) => {
    const p = m.predict!
    const answers = [0, ...p.variants!.map((_, i) => i + 1)].map((n) => quantity(withVariant(m, n)))
    for (const a of answers) {
      expect(a).toBeGreaterThan(p.min)
      expect(a).toBeLessThan(p.max)
    }
    // consecutive conditions differ enough that the last landing spot is no hint
    const order = [...answers, answers[1]] // after the last variant the cycle returns to the first
    for (let i = 1; i < order.length; i++) expect(Math.abs(order[i] - order[i - 1]), `${m.id} v${i}`).toBeGreaterThan(2 * p.tolerance)
  })

  it.each(predicts.map((m) => [m.id, m] as const))('%s: texts quote the current numbers, no placeholder left', (_, m) => {
    for (let n = 0; n <= m.predict!.variants!.length; n++) {
      const told = withVariant(m, n)
      const texts = [told.brief, told.goal, ...told.hints, ...(told.panel?.known ?? [])]
      for (const t of texts) expect(t, `${m.id} v${n}`).not.toMatch(/\{(y0|v0|alpha|sinAlpha|release|mc|earthR|earthT)\}/)
    }
  })

  it('a changed tower shows up in the brief', () => {
    const m = predicts.find((x) => x.id === '0-4')!
    expect(withVariant(m, 0).brief).toContain('12 м')
    expect(withVariant(m, 1).brief).toContain('16 м')
    expect(withVariant(m, 1).brief).toContain('10 м/с')
  })

  it('variant 0 is the mission as written; later ones cycle', () => {
    const m = predicts.find((x) => x.id === '0-4')!
    expect(withVariant(m, 0).base).toEqual(m.base)
    const n = m.predict!.variants!.length
    expect(withVariant(m, n + 1).base).toEqual(withVariant(m, 1).base)
    expect(variantChanges(m, 0)).toEqual([])
    expect(variantChanges(m, 1).length).toBeGreaterThan(0)
  })
})
