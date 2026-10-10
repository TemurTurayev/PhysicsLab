import { useEffect, useRef } from 'react'
import { chapterLabel } from '../levels'
import { MAX_LIVES } from '../levels/lives'
import type { Mission } from '../levels/types'

const KIND: Record<Mission['kind'], string> = {
  tune: 'Настрой и попади',
  predict: 'Предскажи',
  write: 'Напиши код',
  fix: 'Найди ошибку',
  challenge: 'Испытание',
}

/**
 * The briefing before a mission: one screen to read the story and the goal, then it gets out of the
 * way and the goal stays pinned as a single line. Enter or the button starts.
 */
export function MissionIntro({ mission, formal, onStart }: { mission: Mission; formal: boolean; onStart: () => void }) {
  const start = useRef<HTMLButtonElement>(null)
  useEffect(() => start.current?.focus(), [])
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3" style={{ background: 'rgba(5, 6, 8, 0.55)' }} role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="lab-panel lab-rise w-[min(560px,100%)] p-5 md:p-7 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="lab-label">
            {chapterLabel(mission.chapter)} · {mission.subject ? `${mission.subject} · шаг` : 'миссия'} {mission.order}
          </span>
          <span className="lab-mono text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--lab-accent-soft)', color: 'var(--lab-accent)' }}>
            {KIND[mission.kind]}
          </span>
        </div>
        <h2 id="intro-title" className="lab-title text-2xl md:text-[30px] leading-tight">
          {mission.title}
        </h2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
          {mission.brief}
        </p>
        <div className="rounded-xl px-4 py-3 border-l-4" style={{ background: 'var(--lab-accent-soft)', borderColor: 'var(--lab-accent)' }}>
          <div className="lab-label mb-1">{formal ? 'Задание' : 'Цель'}</div>
          <div className="lab-title text-lg" style={{ color: 'var(--lab-accent)' }}>
            {mission.goal}
          </div>
        </div>
        <ul className="text-sm flex flex-col gap-1.5" style={{ color: 'var(--lab-dim)' }}>
          <li>
            {mission.practice ? (formal ? '🎓 Учебное испытание: допуски не расходуются.' : '🎓 Разминка: жизни не тратятся, пробуй сколько нужно.') : `${'❤️'.repeat(MAX_LIVES)} — ${formal ? 'три допуска: неудачный пуск списывает один.' : 'три жизни: промах отнимает одну.'}`}
          </li>
          <li>📐 {formal ? 'Все числа для расчёта — в панели справа. Проверка расчёта допусков не тратит.' : 'Все числа для расчёта — в панели справа. Проверка расчёта жизни не тратит.'}</li>
          <li>💡 {formal ? 'Подсказки открываются по одной после каждого пуска.' : 'Подсказки открываются по одной после каждого выстрела.'}</li>
        </ul>
        <button ref={start} type="button" className="lab-btn lab-btn-primary self-start !min-h-[46px] !px-6 text-base" onClick={onStart}>
          {formal ? 'Приступить к испытанию' : 'Начать'} <span className="lab-kbd">Enter</span>
        </button>
      </div>
    </div>
  )
}
