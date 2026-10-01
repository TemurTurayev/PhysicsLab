export type FailureId =
  | 'no_release'
  | 'self_hit'
  | 'early_release'
  | 'late_release'
  | 'short'
  | 'long'
  | 'no_gravity'
  | 'gravity_up'
  | 'exploded'
  | 'degrees_radians'
  | 'beam_break'
  | 'sling_snap'

export interface FailureEvent {
  id: FailureId
  t: number // scene time when it becomes visible, for the slow-motion replay
  numbers: Record<string, number>
}

export interface DetectContext {
  g: number
  targets: Array<{ x: number; r: number }>
  /** Set by "write"/"fix" missions: the flight comes from student code, check its physics. */
  studentFlight?: boolean
  /** Set by the radians mission when the student's angle equals sin/cos of degrees. */
  angleLooksLikeDegrees?: boolean
}
