import { useState } from 'react'
import { MAX_LIVES } from '../levels/lives'
import type { Mission } from '../levels/types'

export function MissionBrief({ mission, shots, hitSoFar, lives }: { mission: Mission; shots: number; hitSoFar: ReadonlySet<number>; lives: number }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768)
  const [hints, setHints] = useState(0)
  return (
    <div className="lab-panel p-3 flex flex-col gap-2">
      <button type="button" className="flex items-start justify-between gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          <span className="lab-label block">Задача</span>
          <span className="font-semibold" style={{ color: 'var(--lab-accent)' }}>
            {mission.goal}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-sm tracking-tight" aria-label={`Жизней: ${lives} из ${MAX_LIVES}`} title="Жизни: каждый промах отнимает одну">
            {'❤️'.repeat(lives)}
            {'🖤'.repeat(Math.max(0, MAX_LIVES - lives))}
          </span>
          <span aria-hidden className="text-sm" style={{ color: 'var(--lab-dim)' }}>
            {open ? '▴' : '▾'}
          </span>
        </span>
      </button>
      {open && (
        <>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
            {mission.brief}
          </p>
          {mission.targets.length > 1 && (
            <div className="flex gap-1.5">
              {mission.targets.map((t, i) => (
                <span key={i} className="lab-mono text-xs px-2 py-1 rounded-md" style={{ background: hitSoFar.has(i) ? 'rgba(126,224,138,0.18)' : 'rgba(255,255,255,0.06)', color: hitSoFar.has(i) ? 'var(--lab-good)' : 'var(--lab-dim)' }}>
                  {hitSoFar.has(i) ? '✓' : '○'} {t.x} м
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--lab-dim)' }}>
            <span className="lab-mono">Выстрелов: {shots}</span>
            {hints < mission.hints.length && (
              <button type="button" className="underline underline-offset-2" onClick={() => setHints(hints + 1)}>
                Подсказка ({hints + 1}/{mission.hints.length})
              </button>
            )}
          </div>
          {mission.hints.slice(0, hints).map((h, i) => (
            <p key={i} className="text-sm rounded-lg px-2.5 py-2" style={{ background: 'var(--lab-accent-soft)' }}>
              💡 {h}
            </p>
          ))}
        </>
      )}
    </div>
  )
}
