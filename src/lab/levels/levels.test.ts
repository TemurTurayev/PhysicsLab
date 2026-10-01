import { describe, expect, it } from 'vitest'
import { simulateShot } from '../sim/shot'
import { armForCode, clipAtWalls, evaluateShot, pickCounterweight, SAFETY_MASSES, looksLikeDegrees, shotFromLaunch, shotFromSteps, withRelease, withSliders } from './evaluate'
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
    ['2-4', [96]],
    ['2-4', [120]],
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

describe('walls', () => {
  const shot = simulateShot(withRelease(findMission('1-1')!.base, 110)) // lands at ~73 m, apex ~23 m

  it('a wall in the path stops the stone on its face', () => {
    const clipped = clipAtWalls(shot, [{ x: 50, r: 0.5, h: 30 }])
    expect(clipped.landing!.x).toBe(50)
    expect(clipped.flight.at(-1)!.x).toBe(50)
    expect(clipped.landing!.t).toBeLessThan(shot.landing!.t)
  })

  it('a stone that clears the top flies on', () => {
    expect(clipAtWalls(shot, [{ x: 50, r: 0.5, h: 3 }]).landing).toEqual(shot.landing)
  })
})

describe('safety check by formula', () => {
  const limit = 11500
  const moments = (k: number) => SAFETY_MASSES.map((m) => m * k)
  it('the correct static moment m·g·L2 loads the heaviest truly safe counterweight', () => {
    expect(pickCounterweight(SAFETY_MASSES, moments(9.81 * 1.2), limit)).toBe(950)
  })
  it('forgetting g lets the master load everything', () => {
    expect(pickCounterweight(SAFETY_MASSES, moments(1.2), limit)).toBe(SAFETY_MASSES.at(-1))
  })
  it('an overcautious formula still fires the lightest weight', () => {
    expect(pickCounterweight(SAFETY_MASSES, moments(9.81 * 5), limit)).toBe(300)
  })
})

describe('chapter 3 is solvable', () => {
  const play = (id: string, values: Record<string, number>) => {
    const m = findMission(id)!
    const shot = clipAtWalls(simulateShot(withSliders(m, values)), m.targets)
    return { m, shot, hits: evaluateShot(m, shot, null).hits }
  }

  it('3-1: about 825 kg hits the wall, 1500 kg breaks the beam', () => {
    expect(play('3-1', { mc: 825 }).hits).toEqual([0])
    expect(play('3-1', { mc: 1500 }).shot.breakage?.kind).toBe('beam')
  })

  it('3-2: the answer is inside the prediction range', () => {
    const { m, shot } = play('3-2', {})
    expect(shot.landing!.x).toBeGreaterThan(2 * 73)
    expect(shot.landing!.x).toBeLessThan(m.predict!.max)
  })

  it('3-3: the safe counterweight from m·g·L2 hits the wall, the empty formula breaks the beam', () => {
    const m = findMission('3-3')!
    const limit = m.base.trebuchet.beamStrength!
    const fire = (mc: number) => clipAtWalls(simulateShot({ ...m.base, trebuchet: { ...m.base.trebuchet, mc } }), m.targets)
    const safe = pickCounterweight(SAFETY_MASSES, SAFETY_MASSES.map((x) => x * 9.81 * 1.2), limit)
    expect(evaluateShot(m, fire(safe), null).hits).toEqual([0])
    const reckless = pickCounterweight(SAFETY_MASSES, SAFETY_MASSES.map(() => 0), limit)
    expect(fire(reckless).breakage?.kind).toBe('beam')
  })

  it('3-4: both the gate and the tower can be hit', () => {
    expect(play('3-4', { mc: 800, releaseDeg: 104 }).hits).toEqual([0])
    expect(play('3-4', { mc: 1000, releaseDeg: 108 }).hits).toEqual([1])
  })
})
