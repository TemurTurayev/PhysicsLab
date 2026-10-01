import { useEffect, useState, type JSX } from 'react'
import type { FailureEvent } from '../failures/types'
import { FAILURES } from '../failures/catalog'

export interface IncidentCardProps {
  event: FailureEvent
  isNew: boolean
  onReplaySlow: () => void
  onClose: () => void
}

export function IncidentCard({ event, isNew, onReplaySlow, onClose }: IncidentCardProps): JSX.Element {
  const [mounted, setMounted] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true
    }
    return false
  })

  useEffect(() => {
    if (!mounted) {
      const id = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(id)
    }
  }, [mounted])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const entry = FAILURES[event.id]
  if (!entry) {
    return <></>
  }

  const titleId = `incident-title-${event.id}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`lab-panel relative w-full max-w-[420px] p-4 md:p-5 flex flex-col gap-3.5 shadow-2xl transition-all duration-300 ease-out border-l-4 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ borderLeftColor: 'var(--lab-bad)' }}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl shrink-0" aria-hidden="true">
            {entry.icon}
          </span>
          <h2 id={titleId} className="text-base font-bold leading-tight" style={{ color: 'var(--lab-text)' }}>
            {entry.title}
          </h2>
        </div>
        {isNew && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: 'var(--lab-accent-soft)',
              color: 'var(--lab-accent)',
              border: '1px solid rgba(240, 166, 64, 0.35)',
            }}
          >
            Новая запись в журнале
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="lab-label">Что произошло</span>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--lab-text)' }}>
          {entry.what(event.numbers)}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="lab-label">Почему</span>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--lab-text)' }}>
          {entry.why}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="lab-label">Как в жизни</span>
        <p className="text-xs italic leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
          {entry.realLife}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          className="lab-btn flex-1 text-sm whitespace-nowrap"
          onClick={onReplaySlow}
        >
          Повтор в замедлении
        </button>
        <button
          type="button"
          className="lab-btn lab-btn-primary flex-1 text-sm whitespace-nowrap"
          onClick={onClose}
        >
          Понятно
        </button>
      </div>
    </div>
  )
}
