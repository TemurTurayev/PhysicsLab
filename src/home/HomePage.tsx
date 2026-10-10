import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccountButton } from '../lab/account/AccountButton'
import { MusicToggle } from '../lab/audio/MusicToggle'
import { useLabProgress } from '../lab/state/labProgress'
import type { UniverseId } from '../lab/universe/types'
import '../lab/ui/lab.css'
import './home.css'
import { Hero } from './Hero'
import { Logo } from './Logo'
import { summarize } from './progress'
import { Workshop } from './Workshop'

/** The front door: one workshop, two worlds, and a straight path into the next mission. */
export function HomePage() {
  const navigate = useNavigate()
  const completed = useLabProgress((s) => s.completed)
  const chosen = useLabProgress((s) => s.universe)
  const setUniverse = useLabProgress((s) => s.setUniverse)
  const [universe, setLocal] = useState<UniverseId>(chosen ?? 'classic')
  const summary = summarize(completed)

  // Entering commits the world picked here, so the map never asks again.
  const enter = (path: string) => {
    setUniverse(universe)
    navigate(path)
  }
  const onContinue = () => enter(summary.next ? `/trebuchet/${summary.next.id}` : '/trebuchet')

  return (
    <div className="lab-root min-h-screen">
      <header className="fixed top-0 inset-x-0 z-20 backdrop-blur-md" style={{ background: 'rgba(14,12,10,0.55)', borderBottom: '1px solid var(--lab-line)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2.5" aria-label="PhysicsLab — на главную">
            <Logo size={30} />
            <span className="lab-title text-lg">PhysicsLab</span>
          </a>
          <nav className="ml-auto flex items-center gap-1">
            {/* Wrappers carry the breakpoints: .lab-btn sets its own display and would beat `hidden`. */}
            <span className="hidden sm:contents">
              <a href="#workshop" className="lab-btn !min-h-[36px] !px-3 !bg-transparent !border-transparent">
                Главы
              </a>
            </span>
            <span className="hidden min-[420px]:contents">
              <button type="button" onClick={() => enter('/trebuchet')} className="lab-btn !min-h-[36px] !px-3">
                Карта миссий
              </button>
            </span>
            <MusicToggle />
            <AccountButton />
          </nav>
        </div>
      </header>

      <main>
        <Hero summary={summary} onContinue={onContinue} />
        <Workshop universe={universe} onUniverse={setLocal} summary={summary} onOpen={() => enter('/trebuchet')} />
      </main>

      <footer className="border-t" style={{ borderColor: 'var(--lab-line)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row sm:items-center gap-3 text-sm" style={{ color: 'var(--lab-dim)' }}>
          <span className="flex items-center gap-2">
            <Logo size={20} /> PhysicsLab
          </span>
          <span className="sm:ml-auto">Работает в браузере на компьютере, планшете и телефоне. Python запускается прямо на странице — ничего устанавливать не нужно.</span>
        </div>
      </footer>
    </div>
  )
}
