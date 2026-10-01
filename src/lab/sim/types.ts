/** Geometry and masses of a fixed-counterweight trebuchet with a sling. SI units. */
export interface TrebuchetParams {
  L1: number // long arm, pivot → sling attachment (m)
  L2: number // short arm, pivot → counterweight (m)
  Ls: number // sling length (m)
  H: number // pivot height above ground (m)
  ma: number // beam mass (kg)
  mc: number // counterweight mass (kg)
  mp: number // projectile mass (kg)
  r: number // projectile radius (m)
  theta0Deg: number // starting angle of the long arm, measured from +x (220 = cocked back-down)
  releaseDeg: number // the pin opens when the long arm swings down to this angle
}

export interface WorldParams {
  g: number // m/s²
  drag: boolean
  wind: number // m/s along +x
}

export interface SimParams {
  trebuchet: TrebuchetParams
  world: WorldParams
}

export interface ArmSample {
  t: number
  theta: number // rad
  phi: number // rad, absolute sling angle (meaningless after release)
  released: boolean
}

export interface FlightSample {
  t: number // absolute time since the trigger
  x: number
  y: number
  vx: number
  vy: number
}

export interface ShotResult {
  arm: ArmSample[]
  flight: FlightSample[]
  released: boolean
  releaseT: number | null
  launch: { speed: number; angleDeg: number } | null
  landing: { x: number; t: number } | null
  apex: { x: number; y: number } | null
}

export const DEFAULT_TREBUCHET: TrebuchetParams = {
  L1: 5,
  L2: 1.2,
  Ls: 4,
  H: 4.2,
  ma: 120,
  mc: 600,
  mp: 12,
  r: 0.15,
  theta0Deg: 220,
  releaseDeg: 100,
}

export const EARTH: WorldParams = { g: 9.81, drag: false, wind: 0 }
