import type { FlightSample } from '../sim/types'

export type StudentJob =
  | { kind: 'step'; init: Omit<FlightSample, 't'>; dt: number; maxSteps: number }
  | { kind: 'launch'; speed: number; angleDeg: number }
  | { kind: 'moment'; masses: number[] }

export interface WorkerRequest {
  id: number
  code: string
  job: StudentJob
}

export interface StudentError {
  message: string
  line: number | null
  kind: 'python' | 'timeout' | 'load'
}

export type WorkerResponse =
  | { id: number; ok: true; kind: 'step'; samples: Array<Omit<FlightSample, 't'>>; stdout: string }
  | { id: number; ok: true; kind: 'launch'; velocity: [number, number]; stdout: string }
  | { id: number; ok: true; kind: 'moment'; moments: number[]; stdout: string }
  | { id: number; ok: false; error: StudentError; stdout: string }
