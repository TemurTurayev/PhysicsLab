import type { ReactNode } from 'react'
import { tr } from '../../i18n'
import { Portrait } from '../../home/Portrait'
import { MAX_LIVES } from '../levels/lives'
import type { Mission } from '../levels/types'
import type { UniverseId } from '../universe/types'
import { HintLadder } from './HintLadder'

export interface SolutionDeskProps {
  mission: Mission // already told in the current world and language
  world: UniverseId
  story: string | null
  lives: number
  shots: number
  feedback: ReactNode
  calc: ReactNode // the data, formulas and step-by-step check, stacked
  answer: ReactNode // sliders / prediction / code and the fire button
  /** A program is a long answer: it goes into the scroll after the formulas instead of the pinned footer. */
  answerInline?: boolean
  onField: () => void
  onReread: () => void
}

/**
 * The solution desk: where a mission is actually solved. The hero says why it matters, the task says what to
 * do, then the givens, the formulas, a step-by-step check of one's own numbers, hints, and only then the shot.
 */
export function SolutionDesk(p: SolutionDeskProps) {
  const m = p.mission
  const formal = p.world === 'sigma'
  const practice = m.practice && !m.predict
  return (
    <section className="desk lab-panel flex-1 min-h-0 w-full" aria-label={tr('Стол решений')}>
      <header className="desk-top">
        <div className="lab-title text-lg leading-tight truncate min-w-0">{tr('Стол решений')}</div>
        <span className="ml-auto text-sm shrink-0" aria-label={tr('Жизней: {0} из {1}', [p.lives, MAX_LIVES])}>
          {practice ? '🎓' : Array.from({ length: MAX_LIVES }, (_, i) => (i < p.lives ? '❤️' : '🤍')).join('')}
        </span>
        <button type="button" className="lab-btn !min-h-[34px] !px-3 text-sm shrink-0 max-lg:!hidden" onClick={p.onField} title={tr('Свернуть стол и смотреть на поле')}>
          {tr('Поле')} ⤢
        </button>
      </header>

      <div className="desk-scroll">
        <div className="desk-story" data-coach="goal">
          <Portrait world={p.world} mood={p.shots > 0 && p.lives < MAX_LIVES ? 'think' : 'smile'} className="desk-portrait" />
          <div className="flex flex-col gap-2 min-w-0">
            {p.story && <p className="desk-bubble">{p.story}</p>}
            <div className="desk-task">
              <span className="lab-label">{formal ? tr('Задание') : tr('Что сделать')}</span>
              <span className="lab-title text-[17px] leading-snug" style={{ color: 'var(--lab-accent)' }}>
                {m.goal}
              </span>
            </div>
            <button type="button" className="lab-btn self-start !min-h-[32px] !px-3 text-xs" onClick={p.onReread}>
              {tr('Полное условие')}
            </button>
          </div>
        </div>

        {p.feedback}
        {p.calc}
        {p.answerInline && (
          <div className="flex flex-col gap-2" data-coach="fire">
            <h3 className="desk-h">{tr('Ответ — программа')}</h3>
            {p.answer}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="desk-h">{tr('Подсказки')}</h3>
          <HintLadder hints={m.hints} shots={p.shots} />
        </div>
      </div>

      {!p.answerInline && (
        <footer className="desk-answer">
          <h3 className="desk-h">{tr('Ответ')}</h3>
          {p.answer}
        </footer>
      )}
    </section>
  )
}
