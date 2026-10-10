import { crash, snare } from '../instruments'
import { playNote, prime, type Instrument } from '../samples'
import { human, vary, type Score } from './types'

/**
 * «Classic» — an orchestral anime-adventure theme, D major, 120 BPM, 32 bars:
 * intro (harp, strings, a flute call) → theme (flute over pizzicato) → climax (violin, horns, timpani,
 * march snare) → bridge (horns carry the tune). Harmony: the royal road IVmaj7–V7–iii7–vi7, resolved ii–V–I.
 */
const CHORDS = [[55, 59, 62, 66], [57, 61, 64, 67], [54, 57, 61, 64], [54, 57, 59, 62], [52, 55, 59, 62], [57, 61, 64, 67], [50, 54, 57, 62], [50, 54, 57, 62]]
const ROOTS = [43, 45, 42, 47, 40, 45, 38, 38]
// [step, midi, length in 16ths] per bar: the theme (lands on chord sevenths, 3+3+2 phrasing).
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
const CALL: Array<[number, number, number]> = [[0, 81, 4], [4, 86, 4], [8, 85, 2], [10, 81, 6]] // intro flute call, bar 4

const notesOf = (): Record<Instrument, number[]> => {
  const chordTones = CHORDS.flat()
  const mel = MELODY.flat().map(([, m]) => m)
  return {
    string_ensemble_1: [...chordTones, ...ROOTS.map((r) => r + 12)],
    pizzicato_strings: [...chordTones.map((c) => c + 12), ...ROOTS],
    flute: [...mel, ...CALL.map(([, m]) => m)],
    violin: mel.map((m) => m + 12).filter((m) => m <= 100),
    french_horn: chordTones.map((c) => c - 12).concat(mel.map((m) => m - 12)),
    orchestral_harp: chordTones.map((c) => c + 12).concat(chordTones.map((c) => c + 24)),
    timpani: [...new Set(ROOTS.map((r) => r))],
  } as Record<Instrument, number[]>
}

export const CLASSIC_SCORE: Score = {
  bpm: 120,
  gain: 2.9,
  prepare: async (ctx) => {
    const notes = notesOf()
    await Promise.all((Object.keys(notes) as Instrument[]).map((name) => prime(ctx, name, notes[name])))
  },
  step(ctx, out, t, n, d) {
    const bar = Math.floor(n / 16) % 8
    const s = n % 16
    const section = Math.floor(n / 128) % 4 // 0 intro · 1 theme · 2 climax · 3 bridge
    const chord = CHORDS[bar]
    const root = ROOTS[bar]
    // Strings hold the harmony, swelling in the climax.
    if (s === 0) for (const m of chord) playNote(ctx, out, human(t), 'string_ensemble_1', m, d * 16, section === 2 ? 0.32 : 0.22, 0.6)
    if (s === 0 && section >= 1) playNote(ctx, out, t, 'string_ensemble_1', root + 12, d * 16, 0.2, 0.6)
    // Harp arpeggios in the intro and the bridge.
    if ((section === 0 || section === 3) && s % 2 === 0) {
      const tones = [...chord, ...chord.map((c) => c + 12)].map((c) => c + 12)
      playNote(ctx, out, human(t, 0.004), 'orchestral_harp', tones[(s / 2) % tones.length], d * 6, vary(0.35))
    }
    // Pizzicato ostinato and bass from the theme on.
    if (section >= 1 && s % 2 === 0) playNote(ctx, out, human(t, 0.005), 'pizzicato_strings', chord[OSTINATO[(s / 2) % 8]] + 12, d * 2, vary(s % 8 === 0 ? 0.5 : 0.35))
    if (section >= 1 && (s === 0 || s === 6 || s === 12)) playNote(ctx, out, t, 'pizzicato_strings', root, d * 4, 0.55)
    // The tune: flute calls in the intro, sings the theme, violin takes it up an octave in the climax, horns in the bridge.
    if (section === 0 && bar === 3) for (const [at, m, len] of CALL) if (at === s) playNote(ctx, out, human(t), 'flute', m, d * len, 0.55)
    for (const [at, m, len] of MELODY[bar]) {
      if (at !== s) continue
      if (section === 1) playNote(ctx, out, human(t), 'flute', m, d * len, vary(0.6, 0.08), 0.25)
      if (section === 2) {
        if (m + 12 <= 100) playNote(ctx, out, human(t), 'violin', m + 12, d * len, vary(0.55, 0.08), 0.3)
        playNote(ctx, out, human(t), 'flute', m, d * len, 0.4, 0.25)
      }
      if (section === 3) playNote(ctx, out, human(t), 'french_horn', m - 12, d * len, vary(0.55, 0.08), 0.4)
    }
    // Horns answer with long chord tones in the climax.
    if (section === 2 && (s === 0 || s === 8)) playNote(ctx, out, human(t), 'french_horn', chord[s === 0 ? 1 : 2] - 12, d * 8, 0.45, 0.5)
    // Timpani open each section; a roll leads into the next one; a march snare drives the climax.
    if (bar === 0 && s === 0) playNote(ctx, out, t, 'timpani', root, d * 8, 0.9)
    if (section >= 1 && bar === 7 && s >= 8) playNote(ctx, out, t, 'timpani', 38, d, 0.25 + (s - 8) * 0.06)
    if (section === 2 && bar === 0 && s === 0) crash(ctx, out, t, 0.08)
    if (section === 2 && (s === 4 || s === 12)) snare(ctx, out, t, 0.12)
    if (section === 2 && bar === 7 && s >= 12) snare(ctx, out, t, 0.05 + (s - 12) * 0.03)
  },
}
