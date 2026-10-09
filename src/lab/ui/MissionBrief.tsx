import { useState } from 'react'
import { MAX_LIVES } from '../levels/lives'
import type { Mission } from '../levels/types'

export interface MissionBriefProps {
  mission: Mission
  shots: number
  hitSoFar: ReadonlySet<number>
  lives: number
  onReread: () => void
}

/** The pinned goal: one line to aim at, lives, targets, and the hint ladder on demand. */
export function MissionBrief({ mission, shots, hitSoFar, lives, onReread }: MissionBriefProps) {
  const [hints, setHints] = useState(0)
  // First hint at once, each further one after another attempt: try, then get help.
  const unlocked = Math.min(mission.hints.length, 1 + shots)
  return (
    <div className="lab-panel p-3.5 flex flex-col gap-2.5" data-coach="goal">
      <div className="flex items-center justify-between gap-2">
        <span className="lab-label">Цель</span>
        <span className="text-[15px] tracking-tight" aria-label={`Жизней: ${lives} из ${MAX_LIVES}`} title="Жизни: каждый промах отнимает одну">
          {Array.from({ length: MAX_LIVES }, (_, i) => (
            <span key={i} className={i < lives ? '' : 'opacity-25 grayscale'}>
              ❤️
            </span>
          ))}
        </span>
      </div>
      <div className="lab-title text-[17px] leading-snug" style={{ color: 'var(--lab-accent)' }}>
        {mission.goal}
      </div>
      {mission.targets.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {mission.targets.map((t, i) => (
            <span
              key={i}
              className="lab-mono text-xs px-2 py-1 rounded-md"
              style={{ background: hitSoFar.has(i) ? 'rgba(143,220,150,0.18)' : 'var(--lab-raise)', color: hitSoFar.has(i) ? 'var(--lab-good)' : 'var(--lab-dim)' }}
            >
              {hitSoFar.has(i) ? '✓' : '○'} {t.x} м
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" className="lab-btn !min-h-[32px] !px-2.5 text-xs" onClick={onReread}>
          📄 Условие
        </button>
        {hints < unlocked ? (
          <button type="button" className="lab-btn !min-h-[32px] !px-2.5 text-xs" onClick={() => setHints(hints + 1)} data-coach="hint">
            💡 Подсказка {hints + 1}/{mission.hints.length}
          </button>
        ) : (
          hints < mission.hints.length && (
            <span className="text-xs" style={{ color: 'var(--lab-dim)' }}>
              💡 следующая — после выстрела
            </span>
          )
        )}
        <span className="lab-mono text-xs ml-auto" style={{ color: 'var(--lab-dim)' }}>
          выстрелов: {shots}
        </span>
      </div>
      {hints > 0 && (
        <ol className="flex flex-col gap-1.5">
          {mission.hints.slice(0, hints).map((h, i) => (
            <li key={i} className="lab-rise text-[13px] leading-relaxed rounded-lg px-2.5 py-2 flex gap-2" style={{ background: 'var(--lab-accent-soft)' }}>
              <span className="lab-mono text-[11px] mt-0.5 shrink-0" style={{ color: 'var(--lab-accent)' }}>
                {i + 1}
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
