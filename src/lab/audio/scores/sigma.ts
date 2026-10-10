import { noiseBuffer } from '../engine'
import { bass, clank, kick, noiseHit, pulse, rhodes, snare } from '../instruments'
import type { Score } from './types'

/**
 * «Complex» — a warm late-90s downtempo groove (trip-hop / big-beat feel) for a research facility:
 * electric-piano chords Fmaj7–Em7–Dm9–Am9, a round bass line, a swung breakbeat with ghost notes,
 * a soft echoing lead in the later sections, and the ventilation hum underneath.
 */
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60, 64], [57, 60, 64, 67, 71]]
const ROOTS = [41, 40, 38, 45]
// Bass groove: [step, offset from root, length]
const GROOVE: Array<[number, number, number]> = [[0, 0, 3], [3, 12, 2], [6, 0, 2], [10, 7, 4], [14, 12, 2]]
// Lead phrase over two bars, A minor pentatonic: [step within 32, midi, length]
const LEAD: Array<[number, number, number]> = [[0, 76, 4], [4, 74, 2], [6, 72, 4], [10, 69, 6], [16, 71, 6], [22, 72, 4], [26, 74, 2], [28, 76, 4]]

export const SIGMA_SCORE: Score = {
  bpm: 92,
  gain: 1.4,
  step(ctx, out, t, n, d) {
    const bar = Math.floor(n / 16) % 8
    const s = n % 16
    const section = Math.floor(n / 128) % 4
    const pair = Math.floor(bar / 2) % 4
    const chord = CHORDS[pair]
    const swing = s % 4 === 2 ? d * 0.18 : 0
    // Electric piano comping, pushed off the beat.
    if (s === 0 || s === 10) for (const m of chord) rhodes(ctx, out, t, m, d * 6, 0.035)
    if (s === 6 && bar % 2 === 1) for (const m of chord.slice(1)) rhodes(ctx, out, t + swing, m + 12, d * 2, 0.02)
    for (const [at, off, len] of GROOVE) if (at === s) bass(ctx, out, t, ROOTS[pair] + off, d * len, 0.2)
    if (section >= 1) {
      if (s === 0 || s === 10) kick(ctx, out, t, 0.5)
      if (s === 4 || s === 12) snare(ctx, out, t, 0.24)
      if (s === 7 || s === 15) snare(ctx, out, t + d * 0.15, 0.05)
      if (s % 2 === 0) noiseHit(ctx, out, t + swing, s === 14 ? 0.05 : 0.025, 7500, s === 14 ? 0.25 : 0.04)
    }
    if (section >= 2) {
      const at = (bar % 2) * 16 + s
      for (const [k, midi, len] of LEAD) if (k === at) {
        pulse(ctx, out, t, midi, d * len, 0.05, 1100)
        pulse(ctx, out, t + d * 3, midi, d * len, 0.018, 900) // dotted-eighth echo
      }
    }
    if (Math.random() < 0.002) clank(ctx, out, t, 0.04)
  },
  bed(ctx, out) {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 320
    const g = ctx.createGain()
    g.gain.value = 0.03
    src.connect(f).connect(g).connect(out)
    src.start()
    return () => src.stop()
  },
}
