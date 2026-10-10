/**
 * Real instrument samples for the music: the FluidR3 General MIDI soundfont (Frank Wen, CC BY 3.0),
 * as pre-rendered per-note MP3s from the midi-js-soundfonts project, fetched from a CDN.
 * The files are JavaScript wrappers; they are read as text and only the base64 audio is taken out —
 * nothing third-party is executed. Each note is decoded on first use and cached.
 */
export const SOUNDFONT_CREDIT = 'FluidR3_GM soundfont © Frank Wen, CC BY 3.0 (via midi-js-soundfonts)'

const BASE = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/'
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export type Instrument =
  | 'string_ensemble_1'
  | 'pizzicato_strings'
  | 'french_horn'
  | 'flute'
  | 'orchestral_harp'
  | 'timpani'
  | 'violin'
  | 'electric_piano_1'
  | 'electric_bass_finger'
  | 'pad_2_warm'

const noteName = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`

interface Bank {
  data: Map<string, string> // note name → base64 mp3
  decoded: Map<string, Promise<AudioBuffer | null>>
}

const banks = new Map<Instrument, Promise<Bank | null>>()

/** Fetch one instrument (once). Resolves to null when offline — the music then simply leaves it out. */
export function loadInstrument(name: Instrument): Promise<Bank | null> {
  let bank = banks.get(name)
  if (!bank) {
    bank = fetch(`${BASE}${name}-mp3.js`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        const data = new Map<string, string>()
        for (const m of text.matchAll(/"([A-G]b?-?\d)":\s*"data:audio\/mp3;base64,([A-Za-z0-9+/=]+)"/g)) data.set(m[1], m[2])
        return { data, decoded: new Map() }
      })
      .catch(() => null)
    banks.set(name, bank)
  }
  return bank
}

function decode(ctx: BaseAudioContext, bank: Bank, note: string): Promise<AudioBuffer | null> {
  let p = bank.decoded.get(note)
  if (!p) {
    const b64 = bank.data.get(note)
    if (!b64) return Promise.resolve(null)
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    p = ctx.decodeAudioData(bytes.buffer).catch(() => null)
    bank.decoded.set(note, p)
  }
  return p
}

const ready = new Map<string, AudioBuffer>()

/**
 * Play a sampled note at time t. Notes not yet decoded are skipped this time (and decoded for next time),
 * so a slow connection degrades to a thinner arrangement instead of a stall.
 */
export function playNote(ctx: BaseAudioContext, out: AudioNode, t: number, name: Instrument, midi: number, dur: number, vel = 0.6, release = 0.35): void {
  const key = `${name}:${midi}`
  const buf = ready.get(key)
  if (!buf) {
    void loadInstrument(name).then((bank) => bank && decode(ctx, bank, noteName(midi)).then((b) => b && ready.set(key, b)))
    return
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  const end = t + Math.min(dur, buf.duration)
  g.gain.setValueAtTime(vel, t)
  g.gain.setValueAtTime(vel, end)
  g.gain.exponentialRampToValueAtTime(0.0001, end + release)
  src.connect(g).connect(out)
  src.start(t)
  src.stop(end + release + 0.02)
}

/** Mark decoded notes as playable (after warmNotes). */
export async function prime(ctx: BaseAudioContext, name: Instrument, notes: number[]): Promise<void> {
  const bank = await loadInstrument(name)
  if (!bank) return
  await Promise.all(
    [...new Set(notes)].map(async (n) => {
      const b = await decode(ctx, bank, noteName(n))
      if (b) ready.set(`${name}:${n}`, b)
    }),
  )
}
