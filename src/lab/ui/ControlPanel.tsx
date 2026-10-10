import { localeTag, tr } from '../../i18n'
import type { Mission, SliderKey, SliderValues } from '../levels/types'
import { NumberField } from './NumberField'

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


export function ControlPanel(p: ControlPanelProps) {
  const { mission } = p
  return (
    <div className="lab-panel p-3 md:p-4 flex flex-col gap-2.5 md:gap-4 w-full" data-coach="fire">
      {mission.sliders.map((s) => (
        <div key={s.key} className="flex flex-col gap-2">
          <span className="flex justify-between items-center gap-2">
            <span className="lab-label">{s.label}</span>
            <NumberField value={p.values[s.key] ?? s.start} min={s.min} max={s.max} step={s.step} unit={s.unit} label={s.label} onCommit={(v) => p.onValue(s.key, v)} />
          </span>
          <input
            className="lab-range"
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={p.values[s.key] ?? s.start}
            onChange={(e) => p.onValue(s.key, Number(e.target.value))}
            aria-label={s.label}
          />
          {s.key === 'releaseDeg' ? (
            <span className="hidden md:flex justify-between text-xs" style={{ color: 'var(--lab-dim)' }}>
              <span>{tr("раньше ←") + ' '}{s.max}{s.unit}</span>
              <span>{s.min}{s.unit} {' ' + tr("→ позже")}</span>
            </span>
          ) : (
            <span className="hidden md:flex justify-between text-xs" style={{ color: 'var(--lab-dim)' }}>
              <span>{s.min.toLocaleString(localeTag())} {s.unit}</span>
              <span>{s.max.toLocaleString(localeTag())} {s.unit}</span>
            </span>
          )}
        </div>
      ))}
      {mission.predict && (
        <div className="flex flex-col gap-2">
          <span className="flex justify-between items-center gap-2">
            <span className="lab-label">{mission.predict.label}</span>
            <NumberField
              value={p.prediction}
              min={mission.predict.min}
              max={mission.predict.max}
              step={0.1}
              unit={mission.predict.unit ?? tr('м')}
              label={mission.predict.label}
              onCommit={p.onPrediction}
            />
          </span>
          <input
            className="lab-range"
            type="range"
            min={mission.predict.min}
            max={mission.predict.max}
            step={mission.predict.quantity === 'flightTime' ? 0.1 : 0.5}
            value={p.prediction ?? (mission.predict.min + mission.predict.max) / 2}
            onChange={(e) => p.onPrediction(Number(e.target.value))}
          />
          {mission.predict.quantity === 'landingX' && (
            <span className="text-xs" style={{ color: 'var(--lab-dim)' }}>
              
              {tr("Впиши посчитанное число, двигай ползунок или кликни по земле.")}
            </span>
          )}
        </div>
      )}
      <button type="button" className="lab-btn lab-btn-primary text-base min-h-[44px] md:min-h-[48px]" disabled={!p.canFire || p.busy} onClick={p.onFire}>
        {p.busy ? tr('Считаю…') : p.fireLabel}
        {!p.busy && <span className="lab-kbd hidden md:inline">{tr("Пробел")}</span>}
      </button>
    </div>
  )
}
