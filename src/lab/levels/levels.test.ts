import { describe, expect, it } from 'vitest'
import { simulateShot } from '../sim/shot'
import { armForCode, clipAtWalls, evaluateShot, pickCounterweight, SAFETY_MASSES, looksLikeDegrees, shotFromLaunch, shotFromSteps, withRelease, withSliders } from './evaluate'
import { detectFailures } from '../failures/detect'
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

describe('chapter 4 is solvable', () => {
  /** TS twin of the students' Python: explicit Euler with N sub-steps per call of step(dt). */
  const studentFlight = (id: string, opts: { drag: boolean; dt: number; N: number }) => {
    const m = findMission(id)!
    const { mp, r } = m.base.trebuchet
    const K = (1.225 * 0.47 * Math.PI * r * r) / (2 * mp)
    const W = m.base.world.wind
    const { run } = armForCode(m.base)
    let s = { x: run.release!.x, y: run.release!.y, vx: run.release!.vx, vy: run.release!.vy }
    const samples = [s]
    for (let i = 0; i < Math.ceil(40 / opts.dt); i++) {
      let { x, y, vx, vy } = s
      const h = opts.dt / opts.N
      for (let j = 0; j < opts.N; j++) {
        const ux = vx - W
        const u = Math.hypot(ux, vy)
        const ax = opts.drag ? -K * u * ux : 0
        const ay = -9.81 - (opts.drag ? K * u * vy : 0)
        vx += ax * h
        vy += ay * h
        x += vx * h
        y += vy * h
      }
      s = { x, y, vx, vy }
      samples.push(s)
      if ((y <= 0 && vy < 0) || ![x, y, vx, vy].every((v) => Number.isFinite(v) && Math.abs(v) < 1e6)) break
    }
    return { m, shot: shotFromSteps(m.base, samples, opts.dt) }
  }

  it('4-1: about 110° beats the headwind', () => {
    const m = findMission('4-1')!
    expect(evaluateShot(m, simulateShot(withSliders(m, { releaseDeg: 110 })), null).hits).toEqual([0])
  })

  it('4-2: the straw ball lands roughly halfway, inside the prediction range', () => {
    const m = findMission('4-2')!
    const x = simulateShot(m.base).landing!.x
    expect(x).toBeGreaterThan(25)
    expect(x).toBeLessThan(40)
  })

  it('4-3: step() with drag hits; without drag it overshoots and is called out', () => {
    const good = studentFlight('4-3', { drag: true, dt: 1 / 240, N: 1 })
    expect(evaluateShot(good.m, good.shot, null).hits).toEqual([0])
    const bad = studentFlight('4-3', { drag: false, dt: 1 / 240, N: 1 })
    expect(bad.shot.landing!.x).toBeGreaterThan(65)
    const k = (1.225 * 0.47 * Math.PI * 0.15 ** 2) / 24
    const ids = detectFailures(bad.shot, { g: 9.81, targets: bad.m.targets, studentFlight: true, expectDrag: { k, wind: -12 } }).map((e) => e.id)
    expect(ids).toContain('no_drag')
  })

  it('4-4: one Euler step per 0.5 s swings out of control; 50 sub-steps land on the target', () => {
    const bad = studentFlight('4-4', { drag: true, dt: 0.5, N: 1 })
    expect(detectFailures(bad.shot, { g: 9.81, targets: bad.m.targets, studentFlight: true }).map((e) => e.id)).toEqual(['unstable'])
    const good = studentFlight('4-4', { drag: true, dt: 0.5, N: 50 })
    expect(evaluateShot(good.m, good.shot, null).hits).toEqual([0])
    const k = (1.225 * 0.47 * Math.PI * 0.3 ** 2) / 1.2
    expect(detectFailures(good.shot, { g: 9.81, targets: good.m.targets, studentFlight: true, stepDt: 0.5, expectDrag: { k, wind: 0 } })).toEqual([])
  })
})

describe('chapter 5 is solvable', () => {
  const eulerFlight = (id: string, g: number) => {
    const m = findMission(id)!
    const { run } = armForCode(m.base)
    const dt = 1 / 240
    let s = { x: run.release!.x, y: run.release!.y, vx: run.release!.vx, vy: run.release!.vy }
    const samples = [s]
    while (samples.length < 40 / dt) {
      const vy = s.vy - g * dt
      s = { x: s.x + s.vx * dt, y: s.y + vy * dt, vx: s.vx, vy }
      samples.push(s)
      if (s.y <= 0 && s.vy < 0) break
    }
    return { m, shot: shotFromSteps(m.base, samples, dt) }
  }

  it('5-1 and 5-2: answers are inside the prediction ranges', () => {
    const shot = simulateShot(findMission('5-1')!.base)
    expect(shot.landing!.x).toBeGreaterThan(70)
    expect(shot.landing!.x).toBeLessThan(76)
    const t = shot.landing!.t - shot.releaseT!
    expect(t).toBeGreaterThan(8)
    expect(t).toBeLessThan(findMission('5-2')!.predict!.max)
    expect(evaluateShot(findMission('5-2')!, shot, t + 0.5).predictionError).toBeCloseTo(0.5, 6)
  })

  it('5-3: Earth gravity in Moon code misses and is named; the world g hits', () => {
    const bad = eulerFlight('5-3', 9.81)
    expect(evaluateShot(bad.m, bad.shot, null).hits).toEqual([])
    expect(detectFailures(bad.shot, { g: 1.62, targets: bad.m.targets, studentFlight: true }).map((e) => e.id)).toContain('wrong_g')
    const good = eulerFlight('5-3', 1.62)
    expect(evaluateShot(good.m, good.shot, null).hits).toEqual([0])
  })

  it('5-4: the slow lunar flight lets the rover be caught at two angles', () => {
    for (const deg of [100, 114]) {
      const m = findMission('5-4')!
      expect(evaluateShot(m, simulateShot(withSliders(m, { releaseDeg: deg })), null).hits).toEqual([0])
    }
  })
})
