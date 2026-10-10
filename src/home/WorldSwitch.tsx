import { tr } from '../i18n'
import { useLabProgress } from '../lab/state/labProgress'

/** Classic ⇄ Complex: the whole interface, story and music follow. */
export function WorldSwitch() {
  const universe = useLabProgress((s) => s.universe)
  const setUniverse = useLabProgress((s) => s.setUniverse)
  return (
    <div role="radiogroup" aria-label={tr('Мир')} className="flex items-center rounded-[10px] p-0.5" style={{ background: 'var(--lab-raise)', border: '1px solid var(--lab-line)' }}>
      {(['classic', 'sigma'] as const).map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={universe === id}
          onClick={() => setUniverse(id)}
          className="min-h-[30px] px-2.5 rounded-[8px] text-xs font-semibold"
          style={universe === id ? { background: 'var(--lab-accent)', color: '#1a1206' } : { color: 'var(--lab-dim)' }}
        >
          {id === 'classic' ? tr('Классика') : tr('Комплекс')}
        </button>
      ))}
    </div>
  )
}
