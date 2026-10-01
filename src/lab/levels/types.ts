import type { SimParams } from '../sim/types'

export type MissionKind = 'tune' | 'predict' | 'write' | 'fix' | 'challenge'
export type EnvironmentId = 'workshop' | 'range'

export interface Target {
  x: number // distance from the trebuchet pivot at t = 0 (m)
  r: number // hit radius (m)
  moving?: { speed: number } // m/s along +x
}

export interface SliderSpec {
  key: 'releaseDeg'
  label: string
  min: number
  max: number
  step: number
  unit: string
  start: number
}

export interface MissionCode {
  fn: 'step' | 'launch_velocity'
  starter: string
  reference: string
}

export interface Prediction {
  quantity: 'landingX' | 'apexY'
  label: string
  tolerance: number // m
  min: number
  max: number
}

export interface Mission {
  id: string
  chapter: 1 | 2
  order: number
  kind: MissionKind
  env: EnvironmentId
  title: string
  brief: string
  goal: string
  sliders: SliderSpec[]
  base: SimParams
  targets: Target[]
  code?: MissionCode
  predict?: Prediction
  hints: string[]
  theory: string[] // KaTeX
  requires: string[]
}

export interface Chapter {
  id: 1 | 2
  title: string
  env: EnvironmentId
  tagline: string
  missions: Mission[]
}
