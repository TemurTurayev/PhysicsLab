import { tr } from '../../i18n'
import { useAudioSettings } from './engine'

/** A one-tap music switch for the home page and the map. */
export function MusicToggle() {
  const on = useAudioSettings((s) => s.music)
  const setMusic = useAudioSettings((s) => s.setMusic)
  return (
    <button type="button" className="lab-btn !min-h-[36px] !px-3" aria-pressed={on} aria-label={on ? tr('Выключить музыку') : tr('Включить музыку')} title={on ? tr('Выключить музыку') : tr('Включить музыку')} onClick={() => setMusic(!on)}>
      {on ? '♪' : '♪̸'}
    </button>
  )
}
