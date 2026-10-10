import { tr } from '../../i18n'
import { useLabProgress } from '../state/labProgress'
import { UNIVERSES } from './index'
import type { UniverseId } from './types'

const PREVIEW: Record<UniverseId, { background: string; badge: string }> = {
  classic: {
    background: "url('/previews/classic-1.webp') center 60% / cover no-repeat, linear-gradient(160deg, #6f9fd0 0%, #f3cf98 48%, #86a052 49%, #5d6b38 100%)",
    badge: tr('Дерево · камень · закат'),
  },
  sigma: {
    background:
      "repeating-linear-gradient(-45deg, rgba(242,196,0,0.9) 0 12px, rgba(27,27,27,0.9) 12px 24px) bottom / 100% 14px no-repeat, url('/previews/sigma-1.webp') center 60% / cover no-repeat, linear-gradient(180deg, #1a1e20 0%, #3a3d3c 55%, #8a877c 100%)",
    badge: tr('Бетон · сталь · протоколы'),
  },
}

/** First screen of the course: pick the world the same physics will be told in. */
export function UniversePicker({ onChosen }: { onChosen?: (id: UniverseId) => void }) {
  const setUniverse = useLabProgress((s) => s.setUniverse)
  const current = useLabProgress((s) => s.universe)
  const choose = (id: UniverseId) => {
    setUniverse(id)
    onChosen?.(id)
  }
  return (
    <div className="lab-root min-h-screen px-4 py-10 md:py-16">
      <div className="max-w-5xl mx-auto">
        <div className="lab-label mb-2">{tr("Мастерская · Требушет")}</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{tr("Где будем учиться?")}</h1>
        <p className="mb-8 max-w-2xl" style={{ color: 'var(--lab-dim)' }}>
          
          {tr("Физика, задачи и прогресс одни и те же — меняется атмосфера. Вселенную можно сменить в любой момент на карте мира.")}
        </p>
        <div className="grid md:grid-cols-2 gap-5">
          {UNIVERSES.map((u) => {
            const p = PREVIEW[u.id]
            const selected = current === u.id
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => choose(u.id)}
                className="text-left rounded-2xl overflow-hidden border-2 transition-colors focus-visible:outline focus-visible:outline-2"
                style={{ borderColor: selected ? 'var(--lab-accent)' : 'var(--lab-line)', background: 'var(--lab-panel-solid)' }}
                aria-pressed={selected}
              >
                <div className="h-44 md:h-52 relative" style={{ background: p.background }}>
                  <span
                    className="absolute left-4 top-4 text-xs font-semibold px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                  >
                    {p.badge}
                  </span>
                </div>
                <div className="p-5">
                  <div className="text-2xl font-bold mb-1">{u.name}</div>
                  <p className="text-sm mb-4" style={{ color: 'var(--lab-dim)' }}>
                    {u.tagline}
                  </p>
                  <ol className="text-sm space-y-1 mb-5 lab-mono" style={{ color: 'var(--lab-text)' }}>
                    {Object.values(u.chapterTitles).map((l, i) => (
                      <li key={l}>
                        {i + 1}. {l}
                      </li>
                    ))}
                  </ol>
                  <span className="lab-btn lab-btn-primary w-full">{selected ? tr('Выбрано — продолжить') : tr('Выбрать')}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
