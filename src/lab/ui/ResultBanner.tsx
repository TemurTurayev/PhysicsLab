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

const fmt = (v: number) => Math.abs(v).toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

function verdict(m: Mission, r: ShotRecord, formal: boolean): { text: string; good: boolean } {
  if (m.predict && r.predictionError !== null) {
    const ok = Math.abs(r.predictionError) <= m.predict.tolerance
    if (Math.abs(r.predictionError) < 0.05) return { good: true, text: 'Прогноз сбылся: точно в цель.' }
    const dir = r.predictionError > 0 ? 'больше' : 'меньше'
    return { good: ok, text: `${ok ? 'Прогноз сбылся' : 'Прогноз мимо'}: ${formal ? 'ваш' : 'твой'} ответ на ${fmt(r.predictionError)} ${m.predict.unit ?? 'м'} ${dir} настоящего.` }
  }
  if (r.hits.length > 0) return { good: true, text: 'Попадание!' }
  return { good: false, text: formal ? 'Мимо. Скорректируйте и повторите пуск.' : 'Мимо. Поправь и стреляй ещё.' }
}

export function ResultBanner({ mission, record, won, stars, onNext, onFinish, formal = false }: ResultBannerProps) {
  if (!record) return null
  const v = verdict(mission, record, formal)
  // After a win, later misses still read as misses; the win stays as a footnote.
  const headline = won && v.good ? (onNext ? 'Миссия пройдена' : 'Все миссии мира пройдены!') : v.text
  const footnote = won ? (v.good ? v.text : 'Миссия уже пройдена.') : null
  const nextAction = onNext ?? onFinish
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-[72px] z-10 w-[min(420px,calc(100%-16px))]" role="status">
      <div className="lab-panel px-4 py-3 flex items-center gap-3" style={{ borderColor: v.good ? 'rgba(126,224,138,0.5)' : undefined }}>
        <div className="flex-1">
          <div className="font-semibold" style={{ color: v.good ? 'var(--lab-good)' : 'var(--lab-text)' }}>
            {headline}
          </div>
          {footnote && (
            <div className="text-sm" style={{ color: 'var(--lab-dim)' }}>
              {footnote}{' '}
              <span className="lab-mono" style={{ color: 'var(--lab-accent)' }} aria-label={`${stars} из 3 звёзд`}>
                {'★'.repeat(stars)}
                {'☆'.repeat(3 - stars)}
              </span>
            </div>
          )}
        </div>
        {won && nextAction && (
          <button type="button" className="lab-btn lab-btn-primary" onClick={nextAction}>
            {onNext ? 'Дальше →' : 'К карте мира'}
          </button>
        )}
      </div>
    </div>
  )
}
