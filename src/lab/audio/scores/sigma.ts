import { noiseBuffer } from '../engine'
import { clank, kick, noiseHit } from '../instruments'
import { playNote, prime, type Instrument } from '../samples'
import { human, vary, type Score } from './types'

/**
 * «Complex» — «Protocol»: a dark, sterile, corporate theme for an underground research institute.
 * D minor with Phrygian colour, 76 BPM, 32 bars:
 *  1. Hum — contrabass drone, a sweeping pad, tremolo strings; a cold celesta; the PA chime.
 *  2. Procedure — a pulsing synth bass and a slow, heavy half-time beat with mechanical ticks.
 *  3. Escalation — low choir, a mournful cello line, strings swelling.
 *  4. Aftermath — the beat drops away; cello, celesta, the chime again.
 */
const CHORDS = [
  [50, 57, 62, 64], // Dm(add9)
  [46, 53, 58, 64], // B♭(#11)
  [43, 50, 55, 57], // Gm(add9)
  [45, 50, 52, 58], // A sus4 ♭9
]
const ROOTS = [38, 34, 31, 33]
// Celesta, two bars (32 sixteenths): cold, regular, slightly wrong.
const CELESTA: Array<[number, number, number]> = [[0, 81, 4], [4, 77, 4], [8, 74, 4], [12, 76, 4], [16, 77, 8], [24, 70, 8]]
// Cello, eight bars: [bar, step, midi, length]
const CELLO: Array<[number, number, number, number]> = [
  [0, 0, 62, 8], [0, 8, 65, 8], [1, 0, 64, 16], [2, 0, 62, 8], [2, 8, 58, 8], [3, 0, 57, 16],
  [4, 0, 55, 8], [4, 8, 58, 8], [5, 0, 57, 8], [5, 8, 62, 8], [6, 0, 61, 12], [6, 12, 57, 4], [7, 0, 62, 16],
]
// The public-address chime: two falling tones, then silence.
const CHIME: Array<[number, number, number]> = [[0, 69, 8], [8, 65, 12]]

const NOTES: Record<string, number[]> = {
  contrabass: ROOTS,
  pad_8_sweep: CHORDS.flat(),
  tremolo_strings: CHORDS.flat().map((c) => c + 12),
  celesta: CELESTA.map(([, m]) => m),
  cello: CELLO.map(([, , m]) => m),
  synth_bass_1: ROOTS.map((r) => r + 12),
  tubular_bells: CHIME.map(([, m]) => m),
  choir_aahs: CHORDS.flat(),
  string_ensemble_2: CHORDS.flat(),
}

/** A metallic snare: a resonant clang of filtered noise, the sound of a closing hatch far away. */
function hatch(ctx: AudioContext, out: AudioNode, t: number, vel: number): void {
  noiseHit(ctx, out, t, vel, 2300, 0.28, 'bandpass', 5)
  noiseHit(ctx, out, t, vel * 0.5, 600, 0.12, 'bandpass', 2)
}

export const SIGMA_SCORE: Score = {
  bpm: 76,
  gain: 1.6,
  prepare: async (ctx) => {
    await Promise.all(Object.entries(NOTES).map(([name, notes]) => prime(ctx, name as Instrument, notes)))
  },
  step(ctx, out, t, n, d) {
    const bar = Math.floor(n / 16) % 8
    const s = n % 16
    const section = Math.floor(n / 128) % 4 // 0 hum · 1 procedure · 2 escalation · 3 aftermath
    const pair = Math.floor(bar / 2) % 4
    const chord = CHORDS[pair]
    const root = ROOTS[pair]
    // The building itself: a drone under everything, the pad breathing every two bars.
    if (s === 0 && bar % 2 === 0) {
      playNote(ctx, out, t, 'contrabass', root, d * 32, 0.55, 1.5)
      for (const m of chord) playNote(ctx, out, human(t, 0.02), 'pad_8_sweep', m, d * 32, 0.22, 2)
      if (section !== 1) for (const m of chord) playNote(ctx, out, human(t, 0.03), 'tremolo_strings', m + 12, d * 32, 0.1, 2)
    }
    // Cold celesta in every section but the climax.
    if (section !== 2) {
      const at = (bar % 2) * 16 + s
      for (const [k, m, len] of CELESTA) if (k === at) playNote(ctx, out, human(t), 'celesta', m, d * len, vary(0.32, 0.15), 1.2)
    }
    // Procedure and escalation: a pulsing bass and a slow, heavy half-time beat.
    if (section === 1 || section === 2) {
      if (s % 2 === 0) playNote(ctx, out, t, 'synth_bass_1', root + 12, d * 1.6, s % 8 === 0 ? 0.5 : 0.32, 0.08)
      if (s === 0 || s === 10) kick(ctx, out, t, 0.6)
      if (s === 8) hatch(ctx, out, t, 0.22)
      noiseHit(ctx, out, t, s % 4 === 0 ? 0.02 : 0.009, 9500, 0.02)
    }
    // Escalation: a low choir and the cello's lament, strings swelling under them.
    if (section === 2) {
      if (s === 0 && bar % 2 === 0) for (const m of chord) playNote(ctx, out, human(t, 0.03), 'choir_aahs', m, d * 32, 0.26, 2)
      if (s === 0) for (const m of chord) playNote(ctx, out, human(t, 0.02), 'string_ensemble_2', m + 12, d * 16, 0.16, 1)
    }
    if (section >= 2) for (const [b, at, m, len] of CELLO) if (b === bar && at === s) playNote(ctx, out, human(t), 'cello', m, d * len, vary(0.55, 0.08), 0.8)
    // The PA chime: once in the hum, once in the aftermath.
    if ((section === 0 && bar === 5) || (section === 3 && bar === 6)) for (const [at, m, len] of CHIME) if (at === s) playNote(ctx, out, t, 'tubular_bells', m, d * len, 0.38, 2)
    if (Math.random() < 0.003) clank(ctx, out, t, 0.05)
  },
  // Ventilation and distant machinery: low air, always.
  bed(ctx, out) {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 260
    const g = ctx.createGain()
    g.gain.value = 0.04
    src.connect(f).connect(g).connect(out)
    src.start()
    return () => src.stop()
  },
}
