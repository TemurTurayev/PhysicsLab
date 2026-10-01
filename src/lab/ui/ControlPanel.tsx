import type { Mission, SliderKey, SliderValues } from '../levels/types'

export interface ControlPanelProps {
  mission: Mission
  values: SliderValues
  onValue: (key: SliderKey, v: number) => void
  prediction: number | null
  onPrediction: (v: number) => void
  canFire: boolean
  busy: boolean
  onFire: () => void
  fireLabel: string
}

const fmt = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 })

export function ControlPanel(p: ControlPanelProps) {
  const { mission } = p
  return (
    <div className="lab-panel p-4 flex flex-col gap-4 w-full">
      {mission.sliders.map((s) => (
        <label key={s.key} className="flex flex-col gap-2">
          <span className="flex justify-between items-baseline">
            <span className="lab-label">{s.label}</span>
            <span className="lab-mono text-lg" style={{ color: 'var(--lab-accent)' }}>
              {(p.values[s.key] ?? s.start).toLocaleString('ru-RU')}
              {s.unit === '°' ? s.unit : `\u00a0${s.unit}`}
            </span>
          </span>
          <input
            className="lab-range"
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={p.values[s.key] ?? s.start}
            onChange={(e) => p.onValue(s.key, Number(e.target.value))}
          />
          {s.key === 'releaseDeg' ? (
            <span className="flex justify-between text-xs" style={{ color: 'var(--lab-dim)' }}>
              <span>раньше ← {s.max}{s.unit}</span>
              <span>{s.min}{s.unit} → позже</span>
            </span>
          ) : (
            <span className="flex justify-between text-xs" style={{ color: 'var(--lab-dim)' }}>
              <span>{s.min.toLocaleString('ru-RU')} {s.unit}</span>
              <span>{s.max.toLocaleString('ru-RU')} {s.unit}</span>
            </span>
          )}
        </label>
      ))}
      {mission.predict && (
        <label className="flex flex-col gap-2">
          <span className="flex justify-between items-baseline">
            <span className="lab-label">{mission.predict.label}</span>
            <span className="lab-mono text-lg" style={{ color: 'var(--lab-accent)' }}>
              {p.prediction === null ? '—' : `${fmt(p.prediction)} м`}
            </span>
          </span>
          <input
            className="lab-range"
            type="range"
            min={mission.predict.min}
            max={mission.predict.max}
            step={0.5}
            value={p.prediction ?? (mission.predict.min + mission.predict.max) / 2}
            onChange={(e) => p.onPrediction(Number(e.target.value))}
          />
          {mission.predict.quantity === 'landingX' && (
            <span className="text-xs" style={{ color: 'var(--lab-dim)' }}>
              Или кликни по земле, чтобы поставить флажок.
            </span>
          )}
        </label>
      )}
      <button type="button" className="lab-btn lab-btn-primary text-base min-h-[48px]" disabled={!p.canFire || p.busy} onClick={p.onFire}>
        {p.busy ? 'Считаю…' : p.fireLabel}
      </button>
    </div>
  )
}
