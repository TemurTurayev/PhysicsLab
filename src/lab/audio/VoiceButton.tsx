import { tr } from '../../i18n'
import { useAudioSettings } from './engine'
import { playVoice, stopVoice, useVoiceNow } from './voice'

/** Listen / stop for one narration clip. Hidden when narration is switched off. */
export function VoiceButton({ clip, className = '' }: { clip: string; className?: string }) {
  const on = useAudioSettings((s) => s.voice)
  const speaking = useVoiceNow((s) => s.clip === clip)
  if (!on) return null
  const label = speaking ? tr('Остановить озвучку') : tr('Прослушать')
  return (
    <button type="button" className={`lab-btn !min-h-[32px] !px-3 text-xs ${className}`} aria-label={label} title={label} onClick={() => (speaking ? stopVoice() : void playVoice(clip))}>
      {speaking ? '■' : '▶'} {label}
    </button>
  )
}
