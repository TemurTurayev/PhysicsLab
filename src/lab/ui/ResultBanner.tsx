import { localeTag, tr } from '../../i18n'
import type { Mission } from '../levels/types'
import type { ShotRecord } from './useMissionRun'

export interface ResultBannerProps {
  mission: Mission
  record: ShotRecord | null
  won: boolean
  stars: number
  onNext?: () => void
  /** Shown instead of «Дальше» after the last mission of the course. */
  onFinish?: () => void
  /** Address the student as «вы» (the complex) instead of «ты». */
  formal?: boolean
}

const fmt = (v: number, d = 1) => Math.abs(v).toLocaleString(localeTag(), { maximumFractionDigits: d, minimumFractionDigits: d })

function verdict(m: Mission, r: ShotRecord, formal: boolean): { text: string; good: boolean } {
  if (m.predict && r.predictionError !== null) {
    const ok = Math.abs(r.predictionError) <= m.predict.tolerance
    if (Math.abs(r.predictionError) < (m.predict.unit === tr('с') ? 0.01 : 0.05)) return { good: true, text: tr('Прогноз сбылся: точно в цель.') }
    const v = { d: fmt(r.predictionError, m.predict.unit === tr('с') ? 2 : 1), u: m.predict.unit ?? tr('м') }
    // Whole sentences per case, so every language can build its own grammar.
    const over = r.predictionError > 0
    const text = ok
      ? over
        ? formal ? tr('Прогноз сбылся: ваш ответ на {d} {u} больше настоящего.', v) : tr('Прогноз сбылся: твой ответ на {d} {u} больше настоящего.', v)
        : formal ? tr('Прогноз сбылся: ваш ответ на {d} {u} меньше настоящего.', v) : tr('Прогноз сбылся: твой ответ на {d} {u} меньше настоящего.', v)
      : over
        ? formal ? tr('Прогноз мимо: ваш ответ на {d} {u} больше настоящего.', v) : tr('Прогноз мимо: твой ответ на {d} {u} больше настоящего.', v)
        : formal ? tr('Прогноз мимо: ваш ответ на {d} {u} меньше настоящего.', v) : tr('Прогноз мимо: твой ответ на {d} {u} меньше настоящего.', v)
    return { good: ok, text }
  }
  if (r.hits.length > 0) return { good: true, text: tr('Попадание!') }
  return { good: false, text: formal ? tr('Мимо. Скорректируйте и повторите пуск.') : tr('Мимо. Поправь и стреляй ещё.') }
}

export function ResultBanner({ mission, record, won, stars, onNext, onFinish, formal = false }: ResultBannerProps) {
  if (!record) return null
  const v = verdict(mission, record, formal)
  // After a win, later misses still read as misses; the win stays as a footnote.
  const headline = won && v.good ? (onNext ? tr('Миссия пройдена') : tr('Все миссии мира пройдены!')) : v.text
  const footnote = won ? (v.good ? v.text : tr('Миссия уже пройдена.')) : null
  const nextAction = onNext ?? onFinish
  const lifeNote = record.lifeLost ? (formal ? tr(' Списан один допуск.') : ' −1 ❤') : ''
  return (
    <div className="w-full lab-rise" role="status">
      <div className="lab-panel px-4 py-3 flex items-center gap-3" style={{ borderColor: v.good ? 'rgba(126,224,138,0.5)' : undefined }}>
        <div className="flex-1">
          <div className="font-semibold" style={{ color: v.good ? 'var(--lab-good)' : 'var(--lab-text)' }}>
            {headline}
            {lifeNote && <span style={{ color: 'var(--lab-bad)' }}>{lifeNote}</span>}
          </div>
          {footnote && (
            <div className="text-sm" style={{ color: 'var(--lab-dim)' }}>
              {footnote}{' '}
              <span className="lab-mono" style={{ color: 'var(--lab-accent)' }} aria-label={tr(`{0} из 3 звёзд`, [stars])}>
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className="lab-pop text-base" style={{ animationDelay: `${0.15 + i * 0.14}s`, opacity: i < stars ? 1 : 0.3 }}>
                    {i < stars ? '★' : '☆'}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
        {won && nextAction && (
          <button type="button" className="lab-btn lab-btn-primary" onClick={nextAction}>
            {onNext ? tr('Дальше →') : tr('К карте мира')}
          </button>
        )}
      </div>
    </div>
  )
}
