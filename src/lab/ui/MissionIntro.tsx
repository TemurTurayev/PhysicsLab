import { tr } from '../../i18n'
import { useEffect, useRef } from 'react'
import { chapterLabel } from '../levels'
import { MAX_LIVES } from '../levels/lives'
import type { Mission } from '../levels/types'
import { Portrait } from '../../home/Portrait'
import type { UniverseId } from '../universe/types'

const KIND: Record<Mission['kind'], string> = {
  tune: tr('Настрой и попади'),
  predict: tr('Предскажи'),
  write: tr('Напиши код'),
  fix: tr('Найди ошибку'),
  challenge: tr('Испытание'),
}

/**
 * The briefing before a mission: one screen to read the story and the goal, then it gets out of the
 * way and the goal stays pinned as a single line. Enter or the button starts.
 */
export function MissionIntro({ mission, formal, onStart, world, story }: { mission: Mission; formal: boolean; onStart: () => void; world: UniverseId; story: string | null }) {
  const start = useRef<HTMLButtonElement>(null)
  useEffect(() => start.current?.focus(), [])
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3" style={{ background: 'rgba(5, 6, 8, 0.55)' }} role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="lab-panel lab-rise w-[min(560px,100%)] p-5 md:p-7 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="lab-label">
            {chapterLabel(mission.chapter)} · {mission.subject ? tr(`{0} · шаг`, [mission.subject]) : tr('миссия')} {mission.order}
          </span>
          <span className="lab-mono text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--lab-accent-soft)', color: 'var(--lab-accent)' }}>
            {KIND[mission.kind]}
          </span>
        </div>
        <h2 id="intro-title" className="lab-title text-2xl md:text-[30px] leading-tight">
          {mission.title}
        </h2>
        {story && (
          <div className="grid grid-cols-[72px_1fr] gap-3 items-start">
            <Portrait world={world} className="w-[72px] rounded-xl" />
            <p className="desk-bubble">{story}</p>
          </div>
        )}
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
          {mission.brief}
        </p>
        <div className="rounded-xl px-4 py-3 border-l-4" style={{ background: 'var(--lab-accent-soft)', borderColor: 'var(--lab-accent)' }}>
          <div className="lab-label mb-1">{formal ? tr('Задание') : tr('Цель')}</div>
          <div className="lab-title text-lg" style={{ color: 'var(--lab-accent)' }}>
            {mission.goal}
          </div>
        </div>
        <ul className="text-sm flex flex-col gap-1.5" style={{ color: 'var(--lab-dim)' }}>
          <li>
            {mission.practice && !mission.predict ? (formal ? tr('🎓 Учебное испытание: допуски не расходуются.') : tr('🎓 Разминка: жизни не тратятся, пробуй сколько нужно.')) : `${'❤️'.repeat(MAX_LIVES)} — ${formal ? tr('три допуска: неудачный пуск списывает один.') : tr('три жизни: промах отнимает одну.')}`}
          </li>
          <li>📐 {formal ? tr('Данные, формулы и проверка расчёта — на столе решений. Проверка допусков не тратит.') : tr('Данные, формулы и проверка расчёта — на столе решений. Проверка жизни не тратит.')}</li>
          <li>💡 {formal ? tr('Подсказки открываются по одной после каждого пуска.') : tr('Подсказки открываются по одной после каждого выстрела.')}</li>
        </ul>
        <button ref={start} type="button" className="lab-btn lab-btn-primary self-start !min-h-[46px] !px-6 text-base" onClick={onStart}>
          {formal ? tr('К расчёту') : tr('К столу решений')} <span className="lab-kbd">Enter</span>
        </button>
      </div>
    </div>
  )
}
