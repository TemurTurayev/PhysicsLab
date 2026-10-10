import { noiseBuffer } from '../engine'
import { clank, kick, noiseHit, snare } from '../instruments'
import { playNote, prime, type Instrument } from '../samples'
import { human, vary, type Score } from './types'

/**
 * «Complex» — a warm late-90s downtempo groove for a research facility, 90 BPM:
 * electric piano comping Fmaj7–Em7–Dm9–Am9 over a fingered bass line and a warm pad, a swung breakbeat
 * with ghost notes, and an echoing electric-piano melody in the second half. Vents hum underneath.
 */
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60, 64], [57, 60, 64, 67, 71]]
const ROOTS = [41, 40, 38, 45]
const GROOVE: Array<[number, number, number]> = [[0, 0, 3], [3, 12, 2], [6, 0, 2], [10, 7, 4], [14, 12, 2]]
const LEAD: Array<[number, number, number]> = [[0, 76, 4], [4, 74, 2], [6, 72, 4], [10, 69, 6], [16, 71, 6], [22, 72, 4], [26, 74, 2], [28, 76, 4]]

const NOTES: Record<string, number[]> = {
  electric_piano_1: [...CHORDS.flat(), ...CHORDS.flat().map((c) => c + 12), ...LEAD.map(([, m]) => m)],
  electric_bass_finger: ROOTS.flatMap((r) => [r, r + 7, r + 12]),
  pad_2_warm: CHORDS.flat(),
}

export const SIGMA_SCORE: Score = {
  bpm: 90,
  gain: 1.5,
  prepare: async (ctx) => {
    await Promise.all(Object.entries(NOTES).map(([name, notes]) => prime(ctx, name as Instrument, notes)))
  },
  step(ctx, out, t, n, d) {
    const bar = Math.floor(n / 16) % 8
    const s = n % 16
    const section = Math.floor(n / 128) % 4
    const pair = Math.floor(bar / 2) % 4
    const chord = CHORDS[pair]
    const swing = s % 4 === 2 ? d * 0.2 : 0
    if (s === 0 && bar % 2 === 0) for (const m of chord) playNote(ctx, out, t, 'pad_2_warm', m, d * 32, 0.16, 1.2)
    // Electric piano comping, pushed off the beat.
    if (s === 0 || s === 10) for (const m of chord) playNote(ctx, out, human(t), 'electric_piano_1', m, d * 6, vary(0.42), 0.4)
    if (s === 6 && bar % 2 === 1) for (const m of chord.slice(1)) playNote(ctx, out, human(t + swing), 'electric_piano_1', m + 12, d * 2, 0.25)
    for (const [at, off, len] of GROOVE) if (at === s) playNote(ctx, out, human(t, 0.006), 'electric_bass_finger', ROOTS[pair] + off, d * len, vary(0.75, 0.1), 0.1)
    if (section >= 1) {
      if (s === 0 || s === 10) kick(ctx, out, t, 0.55)
      if (s === 4 || s === 12) snare(ctx, out, human(t, 0.004), 0.26)
      if (s === 7 || s === 15) snare(ctx, out, t + d * 0.15, 0.05)
      if (s % 2 === 0) noiseHit(ctx, out, t + swing, s === 14 ? 0.05 : vary(0.028, 0.3), 7500, s === 14 ? 0.25 : 0.04)
    }
    if (section >= 2) {
      const at = (bar % 2) * 16 + s
      for (const [k, midi, len] of LEAD) if (k === at) {
        playNote(ctx, out, human(t), 'electric_piano_1', midi + 12, d * len, 0.5, 0.5)
        playNote(ctx, out, t + d * 3, 'electric_piano_1', midi + 12, d * len, 0.18, 0.5) // dotted-eighth echo
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
    g.gain.value = 0.025
    src.connect(f).connect(g).connect(out)
    src.start()
    return () => src.stop()
  },
}
