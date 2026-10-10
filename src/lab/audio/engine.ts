import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Music and interface-sound settings, kept between visits. Effects keep their own mute in sfx.ts. */
interface AudioSettings {
  music: boolean
  musicVolume: number // 0..1
  uiSounds: boolean
  setMusic: (on: boolean) => void
  setMusicVolume: (v: number) => void
  setUiSounds: (on: boolean) => void
}

export const useAudioSettings = create<AudioSettings>()(
  persist(
    (set) => ({
      music: true,
      musicVolume: 0.45,
      uiSounds: true,
      setMusic: (music) => set({ music }),
      setMusicVolume: (musicVolume) => set({ musicVolume: Math.max(0, Math.min(1, musicVolume)) }),
      setUiSounds: (uiSounds) => set({ uiSounds }),
    }),
    { name: 'physicslab-audio' },
  ),
)

export interface Bus {
  ctx: AudioContext
  music: GainNode // music → reverb send + dry
  ui: GainNode
  reverb: ConvolverNode
}

let bus: Bus | null = null

/** A soft hall: exponentially decaying stereo noise, generated once. */
function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

/** The shared audio graph, created lazily (browsers allow sound only after a click or key). */
export function getBus(): Bus | null {
  if (typeof window === 'undefined') return null
  if (bus) {
    if (bus.ctx.state === 'suspended') void bus.ctx.resume().catch(() => {})
    return bus
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    const ctx = new AC()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.ratio.value = 6
    limiter.connect(ctx.destination)
    const reverb = ctx.createConvolver()
    reverb.buffer = impulse(ctx, 3.2, 2.6)
    const wet = ctx.createGain()
    wet.gain.value = 0.35
    reverb.connect(wet).connect(limiter)
    const music = ctx.createGain()
    const { music: on, musicVolume } = useAudioSettings.getState()
    music.gain.value = on ? musicVolume * 0.5 : 0
    music.connect(limiter)
    music.connect(reverb)
    const ui = ctx.createGain()
    ui.gain.value = 0.5
    ui.connect(limiter)
    bus = { ctx, music, ui, reverb }
    useAudioSettings.subscribe((s) => {
      if (!bus) return
      bus.music.gain.setTargetAtTime(s.music ? s.musicVolume * 0.5 : 0, bus.ctx.currentTime, 0.3)
    })
    return bus
  } catch {
    return null
  }
}

let noise: AudioBuffer | null = null
export function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noise
}

/** Note number → frequency (A4 = 69 = 440 Hz). */
export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)
