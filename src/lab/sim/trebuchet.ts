import type { ArmSample, Breakage, TrebuchetParams } from './types'

/**
 * Fixed-counterweight trebuchet with a sling, two degrees of freedom:
 *   theta — long-arm angle from +x, phi — absolute sling angle.
 * Lagrangian derivation and symbols: docs/superpowers/plans/2026-10-01-trebuchet-lab-v1.md
 * The ground under the stone is a stiff penalty spring, so the stone can rest
 * in the trough and lift off naturally when the sling pulls it up.
 * Structural loads come from the same accelerations: the counterweight presses on
 * the short arm with mc·(a − g), the sling pulls the stone with mp·(a − g) − N.
 */

const DT = 1 / 2000
const SAMPLE_DT = 1 / 120
const GROUND_K = 2e5 // N/m
const GROUND_C = 2e3 // N·s/m
const ARM_DAMPING = 400 // N·m·s, only after release so the beam settles visibly
const DEG = Math.PI / 180

export interface ArmState {
  t: number
  theta: number
  phi: number
  omega: number // dθ/dt
  psi: number // dφ/dt
  stoneX: number
  stoneY: number
  moment: number
  tension: number
}

export interface ArmRun {
  arm: ArmSample[]
  states: ArmState[] // sampled like `arm`, for diagnostics and tests
  release: { t: number; x: number; y: number; vx: number; vy: number } | null
  breakage: Breakage | null
  peakMoment: number
  peakTension: number
}

export interface ArmOptions {
  ground?: boolean
  duration?: number // seconds of mechanism to simulate in total
}

interface Derived {
  Ia: number
  d: number
}

function derived(p: TrebuchetParams): Derived {
  const len = p.L1 + p.L2
  return {
    Ia: (p.ma * (p.L1 ** 3 + p.L2 ** 3)) / (3 * len),
    d: (p.L1 - p.L2) / 2,
  }
}

function stonePos(p: TrebuchetParams, theta: number, phi: number) {
  return {
    x: p.L1 * Math.cos(theta) + p.Ls * Math.cos(phi),
    y: p.H + p.L1 * Math.sin(theta) + p.Ls * Math.sin(phi),
  }
}

function stoneVel(p: TrebuchetParams, theta: number, phi: number, omega: number, psi: number) {
  return {
    vx: -p.L1 * omega * Math.sin(theta) - p.Ls * psi * Math.sin(phi),
    vy: p.L1 * omega * Math.cos(theta) + p.Ls * psi * Math.cos(phi),
  }
}

/** Total mechanical energy of the loaded machine (no ground spring term). */
export function armEnergy(p: TrebuchetParams, g: number, s: Pick<ArmState, 'theta' | 'phi' | 'omega' | 'psi'>): number {
  const { Ia, d } = derived(p)
  const M11 = Ia + p.mc * p.L2 ** 2 + p.mp * p.L1 ** 2
  const M12 = p.mp * p.L1 * p.Ls * Math.cos(s.theta - s.phi)
  const M22 = p.mp * p.Ls ** 2
  const T = 0.5 * (M11 * s.omega ** 2 + 2 * M12 * s.omega * s.psi + M22 * s.psi ** 2)
  const V =
    g * Math.sin(s.theta) * (p.ma * d - p.mc * p.L2 + p.mp * p.L1) +
    g * p.mp * p.Ls * Math.sin(s.phi)
  return T + V
}

type Vec4 = readonly [number, number, number, number] // theta, phi, omega, psi

/** Upward ground reaction on the stone (penalty spring), 0 when it is in the air. */
function groundForce(p: TrebuchetParams, y: Vec4): number {
  const [theta, phi, omega, psi] = y
  const { y: yB } = stonePos(p, theta, phi)
  if (yB >= p.r) return 0
  const { vy } = stoneVel(p, theta, phi, omega, psi)
  return Math.max(0, GROUND_K * (p.r - yB) - GROUND_C * vy)
}

function loadedDerivative(p: TrebuchetParams, g: number, ground: boolean, y: Vec4): Vec4 {
  const [theta, phi, omega, psi] = y
  const { Ia, d } = derived(p)
  const c = Math.cos(theta - phi)
  const s = Math.sin(theta - phi)
  const M11 = Ia + p.mc * p.L2 ** 2 + p.mp * p.L1 ** 2
  const M12 = p.mp * p.L1 * p.Ls * c
  const M22 = p.mp * p.Ls ** 2

  const Fy = ground ? groundForce(p, y) : 0
  const Qtheta = Fy * p.L1 * Math.cos(theta) // F · ∂B/∂θ, only the y component is non-zero
  const Qphi = Fy * p.Ls * Math.cos(phi)

  const rhs1 = -p.mp * p.L1 * p.Ls * s * psi ** 2 - g * Math.cos(theta) * (p.ma * d - p.mc * p.L2 + p.mp * p.L1) + Qtheta
  const rhs2 = p.mp * p.L1 * p.Ls * s * omega ** 2 - g * p.mp * p.Ls * Math.cos(phi) + Qphi
  const det = M11 * M22 - M12 * M12
  const alpha = (rhs1 * M22 - rhs2 * M12) / det
  const beta = (M11 * rhs2 - M12 * rhs1) / det
  return [omega, psi, alpha, beta]
}

/** Bending moment at the axle and sling tension for the loaded machine in state y. */
function loads(p: TrebuchetParams, g: number, ground: boolean, y: Vec4): { moment: number; tension: number } {
  const [theta, phi, omega, psi] = y
  const [, , alpha, beta] = loadedDerivative(p, g, ground, y)
  const ct = Math.cos(theta)
  const st = Math.sin(theta)
  const cp = Math.cos(phi)
  const sp = Math.sin(phi)
  // counterweight C = P − L2(cos θ, sin θ)
  const aCx = p.L2 * (ct * omega ** 2 + st * alpha)
  const aCy = p.L2 * (st * omega ** 2 - ct * alpha)
  const Fx = p.mc * aCx
  const Fy = p.mc * (aCy + g)
  const moment = Math.abs(-p.L2 * ct * Fy + p.L2 * st * Fx)
  // stone B = A + Ls(cos φ, sin φ)
  const aBx = p.L1 * (-ct * omega ** 2 - st * alpha) + p.Ls * (-cp * psi ** 2 - sp * beta)
  const aBy = p.L1 * (-st * omega ** 2 + ct * alpha) + p.Ls * (-sp * psi ** 2 + cp * beta)
  const N = ground ? groundForce(p, y) : 0
  const tension = Math.hypot(p.mp * aBx, p.mp * (aBy + g) - N)
  return { moment, tension }
}

function freeArmDerivative(p: TrebuchetParams, g: number, y: Vec4): Vec4 {
  const [theta, , omega] = y
  const { Ia, d } = derived(p)
  const I = Ia + p.mc * p.L2 ** 2
  const torque = -g * Math.cos(theta) * (p.ma * d - p.mc * p.L2) - ARM_DAMPING * omega
  return [omega, 0, torque / I, 0]
}

function rk4(f: (y: Vec4) => Vec4, y: Vec4, h: number): Vec4 {
  const add = (a: Vec4, b: Vec4, k: number): Vec4 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k, a[3] + b[3] * k]
  const k1 = f(y)
  const k2 = f(add(y, k1, h / 2))
  const k3 = f(add(y, k2, h / 2))
  const k4 = f(add(y, k3, h))
  return [0, 1, 2, 3].map((i) => y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as unknown as Vec4
}

/** Sling angle at rest: lying forward on the ground, or hanging straight down if it cannot reach. */
function initialPhi(p: TrebuchetParams, theta0: number): number {
  const tipY = p.H + p.L1 * Math.sin(theta0)
  const sinPhi = (p.r - tipY) / p.Ls
  return sinPhi <= -1 ? -Math.PI / 2 : Math.asin(sinPhi)
}

function checkBreak(p: TrebuchetParams, t: number, l: { moment: number; tension: number }): Breakage | null {
  const beam = p.beamStrength ?? Infinity
  const sling = p.slingStrength ?? Infinity
  if (l.moment > beam) return { kind: 'beam', t, load: l.moment, limit: beam }
  if (l.tension > sling) return { kind: 'sling', t, load: l.tension, limit: sling }
  return null
}

export function simulateArm(p: TrebuchetParams, g: number, opts: ArmOptions = {}): ArmRun {
  const ground = opts.ground ?? true
  // Every motion of the machine slows by √(g_earth/g): on the Moon the swing takes ~2.5× longer.
  const duration = opts.duration ?? 4 * Math.sqrt(9.81 / g)
  const theta0 = p.theta0Deg * DEG
  const releaseAt = p.releaseDeg * DEG
  let y: Vec4 = [theta0, initialPhi(p, theta0), 0, 0]
  let released = false
  let broken = false
  let release: ArmRun['release'] = null
  let breakage: Breakage | null = null
  let peakMoment = 0
  let peakTension = 0
  let current = loads(p, g, ground, y)

  const arm: ArmSample[] = []
  const states: ArmState[] = []
  const record = (t: number) => {
    const phi = released ? -Math.PI / 2 : y[1]
    const l = released ? { moment: 0, tension: 0 } : current
    arm.push({ t, theta: y[0], phi, released, broken, moment: l.moment, tension: l.tension })
    const stone = stonePos(p, y[0], y[1])
    states.push({ t, theta: y[0], phi: y[1], omega: y[2], psi: y[3], stoneX: stone.x, stoneY: stone.y, ...l })
  }
  const letGo = (t: number) => {
    release = { t, ...stonePos(p, y[0], y[1]), ...stoneVel(p, y[0], y[1], y[2], y[3]) }
    released = true
  }

  const steps = Math.round(duration / DT)
  const every = Math.round(SAMPLE_DT / DT)
  record(0)
  for (let i = 1; i <= steps; i++) {
    const t = i * DT
    y = released ? rk4((v) => freeArmDerivative(p, g, v), y, DT) : rk4((v) => loadedDerivative(p, g, ground, v), y, DT)
    if (!released) {
      current = loads(p, g, ground, y)
      peakMoment = Math.max(peakMoment, current.moment)
      peakTension = Math.max(peakTension, current.tension)
      breakage = checkBreak(p, t, current)
      if (breakage) {
        broken = breakage.kind === 'beam'
        letGo(t)
      } else if (y[0] <= releaseAt) {
        letGo(t)
      }
    }
    if (i % every === 0) record(t)
  }
  return { arm, states, release, breakage, peakMoment, peakTension }
}
