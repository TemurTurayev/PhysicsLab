import type { SimParams } from '../sim/types'

export type MissionKind = 'tune' | 'predict' | 'write' | 'fix' | 'challenge'
export type EnvironmentId = 'workshop' | 'range' | 'siege' | 'pass' | 'moon'

export interface Target {
  x: number // distance from the trebuchet pivot at t = 0 (m)
  r: number // hit radius (m)
  moving?: { speed: number } // m/s along +x
  /** Vertical target (wall, gate, tower) of this height: the stone must strike its face at x below h. */
  h?: number
  label?: string
}

export type LauncherKey = 'x0' | 'speed' | 'angleDeg'
export type SliderKey = 'releaseDeg' | 'mc' | LauncherKey
export type SliderValues = Partial<Record<SliderKey, number>>

export interface SliderSpec {
  key: SliderKey
  label: string
  min: number
  max: number
  step: number
  unit: string
  start: number
}

export interface MissionCode {
  /** 'value': the student's script yields one number (a variable, or a function called with args) that sets a launcher field. */
  fn: 'step' | 'launch_velocity' | 'beam_moment' | 'value'
  name?: string // 'value' missions: the variable or function the harness reads
  args?: number[] // 'value' missions: call name(*args) instead of reading a variable
  sets?: LauncherKey // 'value' missions: which launcher field the number becomes
  starter: string
  reference: string
  dt?: number // step() missions: the time step the harness feeds the student's code (default 1/240 s)
}

export interface Prediction {
  quantity: 'landingX' | 'apexY' | 'flightTime'
  label: string
  unit?: string // default 'м'
  tolerance: number // in the quantity's own unit
  min: number
  max: number
}

/** A number in the data panel that can light up its piece of the launch on the scene. */
export type SheetPart = 'v0' | 'alpha' | 'vx' | 'vy' | 'y0' | 'x0'
export type CheckSlot = 'vx' | 'vy' | 't' | 'h' | 'R'

/** Basics missions tailor the data panel: only what this step needs, nothing that gives the answer away. */
export interface PanelSpec {
  show: SheetPart[]
  check: CheckSlot[]
  formulas: string[] // KaTeX
  known?: string[] // plain facts, e.g. «камень летит ровно 2 с»
}

export type ChapterId = 0 | 1 | 2 | 3 | 4 | 5

export interface Mission {
  id: string
  chapter: ChapterId
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
  /** School subject this step trains, shown as a tag in the basics chapter. */
  subject?: string // Алгебра, Геометрия, Физика, Python — translated like any text
  /** Practice steps cost no lives: here you learn, not pass. */
  practice?: boolean
  panel?: PanelSpec
}

export interface Chapter {
  id: ChapterId
  title: string
  env: EnvironmentId
  tagline: string
  missions: Mission[]
}
