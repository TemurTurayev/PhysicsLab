import { describe, expect, it } from 'vitest'
import { simulateShot } from '../sim/shot'
import { armForCode, evaluateShot, looksLikeDegrees, shotFromLaunch, shotFromSteps, withRelease } from './evaluate'
import { findMission, MISSIONS } from './index'

const shotAt = (id: string, deg?: number) => {
  const m = findMission(id)!
  return { m, shot: simulateShot(withRelease(m.base, deg)) }
}

describe('missions', () => {
  it('have unique ids and only point back to existing missions', () => {
    const ids = MISSIONS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const m of MISSIONS) for (const r of m.requires) expect(ids.indexOf(r)).toBeLessThan(ids.indexOf(m.id))
  })

  it.each([
    ['1-1', [104]],
    ['1-4', [96, 102, 107]],
    ['2-1', [111]],
    ['2-4', [100]],
  ])('mission %s is solvable with the slider', (id, angles) => {
    const hit = new Set<number>()
    for (const deg of angles) {
      const { m, shot } = shotAt(id, deg)
      evaluateShot(m, shot, null).hits.forEach((h) => hit.add(h))
    }
    expect(hit.size).toBe(findMission(id)!.targets.length)
  })

  it('prediction missions have answers inside their input range', () => {
    for (const id of ['1-2', '2-2']) {
      const { m, shot } = shotAt(id)
      const actual = m.predict!.quantity === 'landingX' ? shot.landing!.x : shot.apex!.y
      expect(actual).toBeGreaterThan(m.predict!.min)
      expect(actual).toBeLessThan(m.predict!.max)
      expect(evaluateShot(m, shot, actual + 1).predictionError).toBeCloseTo(1, 6)
    }
  })

  it('1-3: the reference launch_velocity hits, the degrees bug misses and is recognised', () => {
    const m = findMission('1-3')!
    const arm = armForCode(m.base)
    const a = (arm.angleDeg * Math.PI) / 180
    const good: [number, number] = [arm.speed * Math.cos(a), arm.speed * Math.sin(a)]
    const bug: [number, number] = [arm.speed * Math.cos(arm.angleDeg), arm.speed * Math.sin(arm.angleDeg)]
    expect(evaluateShot(m, shotFromLaunch(m.base, good), null).hits).toEqual([0])
    expect(evaluateShot(m, shotFromLaunch(m.base, bug), null).hits).toEqual([])
    expect(looksLikeDegrees(arm.speed, arm.angleDeg, bug)).toBe(true)
    expect(looksLikeDegrees(arm.speed, arm.angleDeg, good)).toBe(false)
  })

  it('2-3: an Euler step with gravity hits the flag', () => {
    const m = findMission('2-3')!
    const { run } = armForCode(m.base)
    const dt = 1 / 240
    const samples = [{ x: run.release!.x, y: run.release!.y, vx: run.release!.vx, vy: run.release!.vy }]
    while (samples.length < 20000) {
      const s = samples[samples.length - 1]
      const vy = s.vy - 9.81 * dt
      const next = { x: s.x + s.vx * dt, y: s.y + vy * dt, vx: s.vx, vy }
      samples.push(next)
      if (next.y <= 0 && next.vy < 0) break
    }
    expect(evaluateShot(m, shotFromSteps(m.base, samples, dt), null).hits).toEqual([0])
  })
})
