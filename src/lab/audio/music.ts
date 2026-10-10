import { getBus } from './engine'
import { CLASSIC_SCORE } from './scores/classic'
import { SIGMA_SCORE } from './scores/sigma'
import type { Score } from './scores/types'

/**
 * Background music, synthesized live (no files): an anime-adventure theme for Classic and a warm
 * late-90s downtempo groove for the complex. See scores/ for how each is written.
 */
export type Theme = 'classic' | 'sigma'

const SCORES: Record<Theme, Score> = { classic: CLASSIC_SCORE, sigma: SIGMA_SCORE }

interface Playing {
  theme: Theme
  gain: GainNode
  timer: ReturnType<typeof setInterval>
  stopBed: (() => void) | null
}
let playing: Playing | null = null

/** Switch the background theme (null = silence). Crossfades; calling with the same theme does nothing. */
export function playMusic(theme: Theme | null): void {
  if (playing?.theme === theme) return
  const bus = getBus()
  if (!bus) return
  const { ctx } = bus
  if (playing) {
    const old = playing
    old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5)
    setTimeout(() => {
      clearInterval(old.timer)
      old.stopBed?.()
      old.gain.disconnect()
    }, 2500)
    playing = null
  }
  if (!theme) return
  const score = SCORES[theme]
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.setTargetAtTime(score.gain, ctx.currentTime + 0.2, 1.2)
  gain.connect(bus.music)
  const dur16 = 60 / score.bpm / 4
  let n = 0
  let next = ctx.currentTime + 0.15
  // Instruments load in the background; the music starts when they are ready (or after 12 s with what there is).
  let loaded = !score.prepare
  void Promise.race([score.prepare?.(ctx) ?? Promise.resolve(), new Promise((r) => setTimeout(r, 12000))])
    .catch(() => undefined) // offline: play with whatever loaded
    .then(() => {
      loaded = true
      next = Math.max(next, ctx.currentTime + 0.1)
    })
  const timer = setInterval(() => {
    if (ctx.state !== 'running' || !loaded) return
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05 // the tab slept: resume, do not burst
    while (next < ctx.currentTime + 0.3) {
      score.step(ctx, gain, next, n, dur16)
      next += dur16
      n++
    }
  }, 60)
  playing = { theme, gain, timer, stopBed: score.bed?.(ctx, gain) ?? null }
}

/** Render a theme offline (tests and previews): `seconds` of audio as a mono Float32Array. */
export async function renderTheme(theme: Theme, seconds: number, sampleRate = 44100): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, Math.floor(seconds * sampleRate), sampleRate)
  const score = SCORES[theme]
  const out = ctx.createGain()
  out.gain.value = 0.5 * score.gain
  const verb = ctx.createConvolver()
  const len = sampleRate * 3
  const ir = ctx.createBuffer(1, len, sampleRate)
  const d = ir.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
  verb.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.35
  out.connect(ctx.destination)
  out.connect(verb).connect(wet).connect(ctx.destination)
  const c = ctx as unknown as AudioContext
  await score.prepare?.(c)
  score.bed?.(c, out)
  const dur16 = 60 / score.bpm / 4
  for (let n = 0, t = 0.05; t < seconds; n++, t += dur16) score.step(c, out, t, n, dur16)
  return (await ctx.startRendering()).getChannelData(0)
}
