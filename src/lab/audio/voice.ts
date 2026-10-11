import { create } from 'zustand'
import { useLocale } from '../../i18n'
import { getBus, useAudioSettings } from './engine'

/**
 * Narration: pre-rendered clips in public/voice/<lang>/<clip>.mp3 (see scripts/voice).
 * Clip ids: `sigma/notice-<n>` for the complex's announcements, `<world>/<missionId>` for briefings.
 * One line at a time; music ducks underneath. Missing clips and blocked audio are silently skipped.
 */
export const VOICE_CREDIT =
  'Voices: Piper (LJSpeech, John, Denis), Silero TTS (CC BY-NC 4.0), Meta MMS-TTS (CC BY-NC 4.0)'

const buffers = new Map<string, Promise<AudioBuffer | null>>()
let current: { src: AudioBufferSourceNode; clip: string } | null = null

/** Which clip is speaking now — for play/stop buttons. */
export const useVoiceNow = create<{ clip: string | null }>(() => ({ clip: null }))

export function clipUrl(clip: string, locale = useLocale.getState().locale): string {
  return `/voice/${locale}/${clip}.mp3`
}

function load(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url)
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => null)
    buffers.set(url, p)
  }
  return p
}

function duck(on: boolean): void {
  const bus = getBus()
  if (bus) bus.duck.gain.setTargetAtTime(on ? 0.3 : 1, bus.ctx.currentTime, on ? 0.15 : 0.6)
}

export function stopVoice(): void {
  if (!current) return
  const { src } = current
  current = null
  useVoiceNow.setState({ clip: null })
  src.onended = null
  try {
    src.stop()
  } catch {
    // already stopped
  }
  duck(false)
}

/** Play a clip (replacing any line in progress). Resolves to its length in seconds, or null if nothing played. */
export async function playVoice(clip: string): Promise<number | null> {
  if (!useAudioSettings.getState().voice) return null
  const bus = getBus()
  if (!bus) return null
  const buf = await load(bus.ctx, clipUrl(clip))
  if (!buf || !useAudioSettings.getState().voice) return null
  stopVoice()
  const src = bus.ctx.createBufferSource()
  src.buffer = buf
  src.connect(bus.voice)
  src.onended = () => {
    if (current?.src === src) {
      current = null
      useVoiceNow.setState({ clip: null })
      duck(false)
    }
  }
  current = { src, clip }
  useVoiceNow.setState({ clip })
  duck(true)
  src.start()
  return buf.duration
}

useAudioSettings.subscribe((s, prev) => {
  if (prev.voice && !s.voice) stopVoice()
})
