import { createPortal } from 'react-dom'
import { tr } from '../i18n'
import { LanguageSwitch } from '../i18n/LanguageSwitch'
import { useLabProgress } from '../lab/state/labProgress'
import { UNIVERSE_META } from '../lab/universe/meta'
import type { UniverseId } from '../lab/universe/types'
import { Portrait } from './Portrait'

const LOOK: Record<UniverseId, { hero: string; mood: string }> = {
  classic: { hero: tr('Нодир, сын мельника и изобретатель-самоучка'), mood: tr('Дерево · верёвка · камень · приключение') },
  sigma: { hero: tr('Стажёр Даниил Орлов, отдел прикладной механики'), mood: tr('Бетон · сталь · протоколы · 1998 год') },
}

/** First visit: choose the world. The same physics, two stories; it can be changed any time at the top. */
export function WorldGate() {
  const setUniverse = useLabProgress((s) => s.setUniverse)
  return createPortal(
    <div className="lab-root fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(6,7,8,0.88)' }} role="dialog" aria-modal="true" aria-label={tr('Выбор мира')}>
      <div className="min-h-full flex flex-col items-center justify-center gap-6 p-4 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <LanguageSwitch />
          <h1 className="home-display text-3xl sm:text-5xl">{tr('Выбери свой мир')}</h1>
          <p className="max-w-xl" style={{ color: 'var(--lab-dim)' }}>
            {tr('Задачи, физика и прогресс одни и те же — меняются герой, история, музыка и весь интерфейс. Сменить мир можно в любой момент.')}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-5xl">
          {UNIVERSE_META.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setUniverse(u.id)}
              className={`world-card world-card-${u.id} text-left overflow-hidden flex flex-col`}
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img src={`/previews/${u.id}-1.webp`} alt="" className="absolute inset-0 w-full h-full object-cover world-card-shot" />
                <div className="absolute left-3 bottom-0 w-[30%] max-w-[150px]">
                  <Portrait world={u.id} />
                </div>
              </div>
              <div className="p-5 flex flex-col gap-2 flex-1">
                <div className="world-card-title">{u.name}</div>
                <div className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--lab-dim)' }}>
                  {LOOK[u.id].mood}
                </div>
                <p className="text-sm leading-relaxed flex-1">{u.tagline}</p>
                <p className="text-sm" style={{ color: 'var(--lab-dim)' }}>
                  {tr('Герой')}: {LOOK[u.id].hero}
                </p>
                <span className="world-card-cta">{tr('Играть в этом мире')} →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
