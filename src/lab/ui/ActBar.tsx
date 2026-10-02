import { Link } from 'react-router-dom'
import type { Mission } from '../levels/types'

export type Act = 'see' | 'understand' | 'build'

const ACTS: Array<{ id: Act; label: string; hint: string }> = [
  { id: 'see', label: 'Увидь', hint: 'Крути и стреляй' },
  { id: 'understand', label: 'Пойми', hint: 'Векторы и формулы' },
  { id: 'build', label: 'Собери', hint: 'Python-движок' },
]

export interface ActBarProps {
  mission: Mission
  act: Act
  onAct: (a: Act) => void
  incidents: number
  onJournal: () => void
  muted: boolean
  onMute: () => void
  retro: boolean
  onRetro: () => void
}

export function ActBar(p: ActBarProps) {
  return (
    <div className="lab-panel flex items-center gap-2 px-2 py-1.5 flex-wrap">
      <Link to="/trebuchet" className="lab-btn !min-h-[36px] !px-3" aria-label="К карте мира">
        ←
      </Link>
      <div className="min-w-0 mr-auto">
        <div className="lab-label">
          Глава {p.mission.chapter} · миссия {p.mission.order}
        </div>
        <div className="font-semibold truncate">{p.mission.title}</div>
      </div>
      <div role="tablist" aria-label="Акт" className="flex rounded-[10px] p-0.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {ACTS.map((a) => {
          const disabled = a.id === 'build' && !p.mission.code
          const active = p.act === a.id
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              title={disabled ? 'В этой миссии код не нужен' : a.hint}
              onClick={() => p.onAct(a.id)}
              className="px-3 min-h-[34px] rounded-[8px] text-sm font-semibold disabled:opacity-35"
              style={active ? { background: 'var(--lab-accent)', color: '#1a1206' } : { color: 'var(--lab-text)' }}
            >
              {a.label}
            </button>
          )
        })}
      </div>
      <button type="button" className="lab-btn !min-h-[36px] !px-3" onClick={p.onJournal} title="Журнал инцидентов">
        📓 <span className="lab-mono">{p.incidents}</span>
      </button>
      <button
        type="button"
        className={`lab-btn !min-h-[36px] !px-3 lab-mono text-xs ${p.retro ? 'lab-btn-primary' : ''}`}
        onClick={p.onRetro}
        aria-pressed={p.retro}
        title="Ретро-режим: пиксели и строки развёртки"
      >
        ЭЛТ
      </button>
      <button type="button" className="lab-btn !min-h-[36px] !px-3" onClick={p.onMute} aria-label={p.muted ? 'Включить звук' : 'Выключить звук'}>
        {p.muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
