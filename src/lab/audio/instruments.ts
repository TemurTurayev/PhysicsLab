import { hz, noiseBuffer } from './engine'

/** Small synthesized instruments. Each schedules one note at time t into `out`; nothing is downloaded. */

const plucks = new Map<string, AudioBuffer>()

/** Karplus–Strong string (koto / harp): a noise burst circulating through a damped delay line. */
export function pluck(ctx: AudioContext, out: AudioNode, t: number, midi: number, vel = 0.5, bright = 0.5): void {
  const key = `${midi}:${bright}:${ctx.sampleRate}`
  let buf = plucks.get(key)
  if (!buf) {
    const sr = ctx.sampleRate
    const len = Math.floor(sr * 2.4)
    buf = ctx.createBuffer(1, len, sr)
    const d = buf.getChannelData(0)
    const period = Math.max(2, Math.round(sr / hz(midi)))
    const line = Float32Array.from({ length: period }, () => Math.random() * 2 - 1)
    const damp = 0.494 + bright * 0.005
    for (let i = 0, p = 0; i < len; i++, p = (p + 1) % period) {
      const next = line[(p + 1) % period]
      d[i] = line[p]
      line[p] = (line[p] + next) * damp
    }
    plucks.set(key, buf)
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.setValueAtTime(vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 2.3)
  src.connect(g).connect(out)
  src.start(t)
  src.stop(t + 2.4)
}

/** Breathy end-blown flute (shakuhachi-like): sine + soft triangle, delayed vibrato, a puff of breath. */
export function flute(ctx: AudioContext, out: AudioNode, t: number, midi: number, dur: number, vel = 0.3): void {
  const f = hz(midi)
  const o1 = ctx.createOscillator()
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o1.frequency.value = f
  o2.frequency.value = f * 2
  const vib = ctx.createOscillator()
  const vibAmt = ctx.createGain()
  vib.frequency.value = 5.2
  vibAmt.gain.setValueAtTime(0, t)
  vibAmt.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.5, dur * 0.6))
  vib.connect(vibAmt)
  vibAmt.connect(o1.frequency)
  vibAmt.connect(o2.frequency)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel, t + 0.08)
  g.gain.setValueAtTime(vel * 0.85, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25)
  const g2 = ctx.createGain()
  g2.gain.value = 0.18
  const breath = ctx.createBufferSource()
  breath.buffer = noiseBuffer(ctx)
  const bf = ctx.createBiquadFilter()
  bf.type = 'bandpass'
  bf.frequency.value = f * 2
  bf.Q.value = 1.5
  const bg = ctx.createGain()
  bg.gain.setValueAtTime(vel * 0.5, t)
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
  o1.connect(g)
  o2.connect(g2).connect(g)
  breath.connect(bf).connect(bg).connect(out)
  g.connect(out)
  for (const o of [o1, o2, vib]) {
    o.start(t)
    o.stop(t + dur + 0.3)
  }
  breath.start(t)
  breath.stop(t + 0.25)
}

/** Slow string/synth pad: detuned saws per note through a lowpass that opens with `bright`. */
export function pad(ctx: AudioContext, out: AudioNode, t: number, notes: number[], dur: number, vel = 0.12, bright = 900): void {
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(bright * 0.6, t)
  lp.frequency.linearRampToValueAtTime(bright, t + dur * 0.5)
  lp.frequency.linearRampToValueAtTime(bright * 0.6, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel, t + Math.min(1.5, dur * 0.3))
  g.gain.setValueAtTime(vel, t + dur * 0.75)
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8)
  lp.connect(g).connect(out)
  for (const n of notes) {
    for (const det of [-7, 6]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = hz(n)
      o.detune.value = det
      const og = ctx.createGain()
      og.gain.value = 1 / (notes.length * 2)
      o.connect(og).connect(lp)
      o.start(t)
      o.stop(t + dur + 0.9)
    }
  }
}

/** Taiko-like drum: a pitch-dropping sine body and a short skin slap. */
export function taiko(ctx: AudioContext, out: AudioNode, t: number, vel = 0.6, low = 62): void {
  const o = ctx.createOscillator()
  o.frequency.setValueAtTime(low * 1.6, t)
  o.frequency.exponentialRampToValueAtTime(low * 0.7, t + 0.35)
  const g = ctx.createGain()
  g.gain.setValueAtTime(vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.65)
  noiseHit(ctx, out, t, vel * 0.35, 900, 0.06, 'lowpass')
}

/** Filtered noise burst: hats, snares, slaps, ventilation puffs. */
export function noiseHit(ctx: AudioContext, out: AudioNode, t: number, vel: number, freq: number, len: number, type: BiquadFilterType = 'highpass', q = 0.8): void {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + len)
  src.connect(f).connect(g).connect(out)
  src.start(t, Math.random() * 1.5)
  src.stop(t + len + 0.02)
}

export function kick(ctx: AudioContext, out: AudioNode, t: number, vel = 0.7): void {
  const o = ctx.createOscillator()
  o.frequency.setValueAtTime(130, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
  const g = ctx.createGain()
  g.gain.setValueAtTime(vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.34)
}

/** Resonant pulse lead/arp, the late-90s synth voice. */
export function pulse(ctx: AudioContext, out: AudioNode, t: number, midi: number, len: number, vel = 0.12, cutoff = 1400): void {
  const o = ctx.createOscillator()
  o.type = 'square'
  o.frequency.value = hz(midi)
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.Q.value = 9
  f.frequency.setValueAtTime(cutoff * 2.2, t)
  f.frequency.exponentialRampToValueAtTime(cutoff * 0.5, t + len)
  const g = ctx.createGain()
  g.gain.setValueAtTime(vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + len)
  o.connect(f).connect(g).connect(out)
  o.start(t)
  o.stop(t + len + 0.02)
}

/** A distant metallic clank: a few inharmonic resonances ringing out. */
export function clank(ctx: AudioContext, out: AudioNode, t: number, vel = 0.15): void {
  const base = 180 + Math.random() * 260
  for (const ratio of [1, 2.76, 5.4, 8.93]) {
    const o = ctx.createOscillator()
    o.frequency.value = base * ratio
    const g = ctx.createGain()
    g.gain.setValueAtTime(vel / ratio, t)
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.6 / Math.sqrt(ratio))
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + 1.7)
  }
  noiseHit(ctx, out, t, vel * 0.6, 2400, 0.05, 'bandpass', 2)
}

/** Short bowed-string stroke (spiccato ostinato): bright saw, fast decay. */
export function spiccato(ctx: AudioContext, out: AudioNode, t: number, midi: number, vel = 0.08): void {
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  o.frequency.value = hz(midi)
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 2600
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16)
  o.connect(f).connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.18)
}

/** French horn: two soft saws, slow swell, dark filter. */
export function horn(ctx: AudioContext, out: AudioNode, t: number, midi: number, dur: number, vel = 0.07): void {
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(500, t)
  f.frequency.linearRampToValueAtTime(1300, t + 0.25)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel, t + 0.18)
  g.gain.setValueAtTime(vel, t + dur * 0.8)
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2)
  f.connect(g).connect(out)
  for (const det of [-5, 5]) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = hz(midi)
    o.detune.value = det
    o.connect(f)
    o.start(t)
    o.stop(t + dur + 0.25)
  }
}

/** Snare: a tuned body plus bright noise; `roll` makes it a soft roll stroke. */
export function snare(ctx: AudioContext, out: AudioNode, t: number, vel = 0.3): void {
  const o = ctx.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(240, t)
  o.frequency.exponentialRampToValueAtTime(160, t + 0.08)
  const g = ctx.createGain()
  g.gain.setValueAtTime(vel * 0.6, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 0.12)
  noiseHit(ctx, out, t, vel, 1900, 0.15, 'bandpass', 0.7)
}

export function crash(ctx: AudioContext, out: AudioNode, t: number, vel = 0.12): void {
  noiseHit(ctx, out, t, vel, 5200, 1.6, 'highpass', 0.5)
}

/** Electric piano (tine + FM bell), the warm late-90s chord voice. */
export function rhodes(ctx: AudioContext, out: AudioNode, t: number, midi: number, dur: number, vel = 0.08): void {
  const f = hz(midi)
  const car = ctx.createOscillator()
  car.frequency.value = f
  const mod = ctx.createOscillator()
  mod.frequency.value = f
  const idx = ctx.createGain()
  idx.gain.setValueAtTime(f * 1.6, t)
  idx.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.9)
  mod.connect(idx).connect(car.frequency)
  const trem = ctx.createOscillator()
  trem.frequency.value = 4.5
  const tremAmt = ctx.createGain()
  tremAmt.gain.value = vel * 0.15
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel, t + 0.008)
  g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4)
  trem.connect(tremAmt).connect(g.gain)
  car.connect(g).connect(out)
  for (const o of [car, mod, trem]) {
    o.start(t)
    o.stop(t + dur + 0.45)
  }
}

/** Round sub bass with a little growl on top. */
export function bass(ctx: AudioContext, out: AudioNode, t: number, midi: number, dur: number, vel = 0.22): void {
  const o = ctx.createOscillator()
  o.frequency.value = hz(midi)
  const o2 = ctx.createOscillator()
  o2.type = 'sawtooth'
  o2.frequency.value = hz(midi)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  const g2 = ctx.createGain()
  g2.gain.value = 0.25
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel, t + 0.01)
  g.gain.setValueAtTime(vel * 0.8, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  o2.connect(lp).connect(g2).connect(g)
  g.connect(out)
  for (const x of [o, o2]) {
    x.start(t)
    x.stop(t + dur + 0.02)
  }
}
