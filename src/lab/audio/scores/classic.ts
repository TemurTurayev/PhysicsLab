import { bass, crash, flute, horn, kick, noiseHit, pad, snare, spiccato, taiko } from '../instruments'
import type { Score } from './types'

/**
 * «Classic» — an anime adventure theme. D major at 132 BPM on the royal-road progression
 * IVmaj7–V7–iii7–vi7 (G–A–F♯m–Bm), resolved through ii–V–I (Em–A–D). The tin-whistle melody lands on
 * chord sevenths in a 3+3+2 rhythm; strings drive an ostinato; horns, march snare and timpani build up.
 * Sections of 8 bars: intro → theme → full (horns, drums, crash) → theme with horns, then again.
 */
const CHORDS = [[55, 59, 62, 66], [57, 61, 64, 67], [54, 57, 61, 64], [54, 57, 59, 62], [52, 55, 59, 62], [57, 61, 64, 67], [50, 54, 57, 62], [50, 54, 57, 62]]
const ROOTS = [43, 45, 42, 47, 40, 45, 38, 38]
// [step, midi, length in 16ths] per bar — the theme.
const MELODY: Array<Array<[number, number, number]>> = [
  [[0, 74, 6], [6, 76, 6], [12, 78, 4]],
  [[0, 79, 6], [6, 78, 6], [12, 76, 4]],
  [[0, 76, 6], [6, 78, 4], [10, 81, 6]],
  [[0, 81, 12], [12, 78, 4]],
  [[0, 79, 6], [6, 81, 6], [12, 83, 4]],
  [[0, 85, 6], [6, 83, 6], [12, 81, 4]],
  [[0, 86, 12], [12, 85, 2], [14, 83, 2]],
  [[0, 86, 16]],
]
const OSTINATO = [0, 2, 1, 2, 3, 2, 1, 2]

export const CLASSIC_SCORE: Score = {
  bpm: 132,
  gain: 1.1,
  step(ctx, out, t, n, d) {
    const bar = Math.floor(n / 16) % 8
    const s = n % 16
    const section = Math.floor(n / 128) % 4
    const chord = CHORDS[bar]
    if (s === 0 && (section === 0 || section === 2)) pad(ctx, out, t, chord, d * 16, 0.045, 1600)
    if (s % 2 === 0) spiccato(ctx, out, t, chord[OSTINATO[(s / 2) % 8]] + 12, s % 8 === 0 ? 0.075 : 0.05)
    if (s === 0 || s === 6 || s === 12) bass(ctx, out, t, ROOTS[bar], d * (s === 12 ? 4 : 6), 0.2)
    if (section > 0) {
      for (const [at, midi, len] of MELODY[bar]) if (at === s) flute(ctx, out, t, midi, d * len, section === 2 ? 0.2 : 0.16)
    }
    if (section >= 2 && s === 0) horn(ctx, out, t, chord[1], d * 15, 0.05)
    if (section === 3 && s === 8) horn(ctx, out, t, chord[2] - 12, d * 7, 0.04)
    // Drums: timpani opens each section, then a march.
    if (bar === 0 && s === 0) taiko(ctx, out, t, 0.5, 48)
    if (section === 2 && bar === 0 && s === 0) crash(ctx, out, t)
    if (section >= 1) {
      if (s === 0 || s === 8) kick(ctx, out, t, 0.35)
      if ((s === 4 || s === 12) && section === 1) noiseHit(ctx, out, t, 0.08, 2600, 0.05, 'bandpass', 3)
      if ((s === 4 || s === 12) && section > 1) snare(ctx, out, t, 0.2)
      if (section === 2 && bar === 7 && s >= 8) snare(ctx, out, t, 0.06 + (s - 8) * 0.025)
    }
  },
}
