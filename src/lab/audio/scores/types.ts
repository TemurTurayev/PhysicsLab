/** A piece of generative music: a function of the 16th-note step, scheduled a little ahead of time. */
export interface Score {
  bpm: number
  gain: number // evens out loudness between themes
  step: (ctx: AudioContext, out: AudioNode, t: number, n: number, dur16: number) => void
  bed?: (ctx: AudioContext, out: AudioNode) => () => void
  /** Load and decode the samples the score uses before the first bar. */
  prepare?: (ctx: AudioContext) => Promise<void>
}

/** A touch of human timing and dynamics, so sampled parts do not sound machine-gunned. */
export const human = (t: number, spread = 0.008) => t + (Math.random() * 2 - 1) * spread
export const vary = (v: number, spread = 0.12) => v * (1 + (Math.random() * 2 - 1) * spread)
