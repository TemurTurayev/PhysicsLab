import type { Mission } from '../levels/types'
import type { ShotRecord } from './useMissionRun'

export interface ResultBannerProps {
  mission: Mission
  record: ShotRecord | null
  won: boolean
  stars: number
  onNext?: () => void
}

const fmt = (v: number) => Math.abs(v).toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

function verdict(m: Mission, r: ShotRecord): { text: string; good: boolean } {
  if (m.predict && r.predictionError !== null) {
    const ok = Math.abs(r.predictionError) <= m.predict.tolerance
    const dir = r.predictionError > 0 ? 'больше' : 'меньше'
    return { good: ok, text: `${ok ? 'Прогноз сбылся' : 'Прогноз мимо'}: твой ответ на ${fmt(r.predictionError)} м ${dir} настоящего.` }
  }
  if (r.hits.length > 0) return { good: true, text: 'Попадание!' }
  return { good: false, text: 'Мимо. Поправь и стреляй ещё.' }
}

export function ResultBanner({ mission, record, won, stars, onNext }: ResultBannerProps) {
  if (!record) return null
  const v = verdict(mission, record)
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-[72px] z-10 w-[min(420px,calc(100%-16px))]" role="status">
      <div className="lab-panel px-4 py-3 flex items-center gap-3" style={{ borderColor: v.good ? 'rgba(126,224,138,0.5)' : undefined }}>
        <div className="flex-1">
          <div className="font-semibold" style={{ color: v.good ? 'var(--lab-good)' : 'var(--lab-text)' }}>
            {won ? 'Миссия пройдена' : v.text}
          </div>
          {won && (
            <div className="text-sm" style={{ color: 'var(--lab-dim)' }}>
              {v.text}{' '}
              <span className="lab-mono" style={{ color: 'var(--lab-accent)' }} aria-label={`${stars} из 3 звёзд`}>
                {'★'.repeat(stars)}
                {'☆'.repeat(3 - stars)}
              </span>
            </div>
          )}
        </div>
        {won && onNext && (
          <button type="button" className="lab-btn lab-btn-primary" onClick={onNext}>
            Дальше →
          </button>
        )}
      </div>
    </div>
  )
}
