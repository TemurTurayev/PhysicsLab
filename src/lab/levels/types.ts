import type { SimParams } from '../sim/types'

export type MissionKind = 'tune' | 'predict' | 'write' | 'fix' | 'challenge'
export type EnvironmentId = 'workshop' | 'range'

export interface Target {
  x: number // distance from the trebuchet pivot (m)
  r: number // hit radius (m)
  moving?: { speed: number } // m/s along +x, starts at x when t = 0
}

export interface SliderSpec {
  key: 'releaseDeg'
  label: string
  min: number
  max: number
  step: number
  unit: string
}

export interface MissionCode {
  fn: 'step' | 'release_angle'
  starter: string
  reference: string
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
  hints: string[]
  theory: string[] // KaTeX strings
  requires: string[] // mission ids that must be completed first
}
