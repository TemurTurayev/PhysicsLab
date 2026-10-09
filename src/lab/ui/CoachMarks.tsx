import { useEffect, useState } from 'react'
import { markCoachDone } from './coachStore'

export interface CoachStep {
  target: string // value of a data-coach attribute
  title: string
  text: string
}

function rectOf(target: string): DOMRect | null {
  const el = document.querySelector(`[data-coach="${target}"]`)
  return el ? el.getBoundingClientRect() : null
}

/** A three-step tour of the first mission: dim everything, ring one panel, say one thing about it. */
export function CoachMarks({ steps, onDone }: { steps: CoachStep[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = steps[i]

  useEffect(() => {
    const update = () => setRect(rectOf(step.target))
    const id = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', update)
    }
  }, [step.target])

  const finish = () => {
    markCoachDone()
    onDone()
  }
  const next = () => (i + 1 < steps.length ? setI(i + 1) : finish())
  if (!rect) return null

  const pad = 6
  const below = rect.top < window.innerHeight / 2
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - 332)
  const bubbleTop = below ? rect.bottom + pad + 10 : undefined
  const bubbleBottom = below ? undefined : window.innerHeight - rect.top + pad + 10

  return (
    <div className="absolute inset-0 z-40" role="dialog" aria-modal="true" aria-label="Знакомство с лабораторией">
      <div
        className="absolute rounded-[16px] transition-all duration-300 pointer-events-none"
        style={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: '0 0 0 9999px rgba(5,6,8,0.62), 0 0 0 2px var(--lab-accent)',
        }}
      />
      <div className="lab-panel lab-rise absolute w-[320px] p-4 flex flex-col gap-2" style={{ left, top: bubbleTop, bottom: bubbleBottom }} key={i}>
        <div className="lab-label">
          {i + 1} из {steps.length}
        </div>
        <div className="lab-title text-lg">{step.title}</div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
          {step.text}
        </p>
        <div className="flex gap-2 mt-1">
          <button type="button" className="lab-btn lab-btn-primary" onClick={next} autoFocus>
            {i + 1 < steps.length ? 'Дальше' : 'Понятно, стреляю'}
          </button>
          <button type="button" className="lab-btn" onClick={finish}>
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}
