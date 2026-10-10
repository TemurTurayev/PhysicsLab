/** A piece of generative music: a function of the 16th-note step, scheduled a little ahead of time. */
export interface Score {
  bpm: number
  gain: number // evens out loudness between themes
  step: (ctx: AudioContext, out: AudioNode, t: number, n: number, dur16: number) => void
  bed?: (ctx: AudioContext, out: AudioNode) => () => void
}
