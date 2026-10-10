import { tr } from '../i18n'
import { useNavigate } from 'react-router-dom'
import { AccountButton } from '../lab/account/AccountButton'
import { LanguageSwitch } from '../i18n/LanguageSwitch'
import { MusicToggle } from '../lab/audio/MusicToggle'
import { SOUNDFONT_CREDIT } from '../lab/audio/samples'
import { useLabProgress } from '../lab/state/labProgress'
import '../lab/ui/lab.css'
import './home.css'
import { Hero } from './Hero'
import { Logo } from './Logo'
import { summarize } from './progress'
import { SigmaHome } from './SigmaHome'
import { WorldGate } from './WorldGate'
import { WorldSwitch } from './WorldSwitch'
import { Workshop } from './Workshop'

/** The front door: one workshop, two worlds, and a straight path into the next mission. */
export function HomePage() {
  const navigate = useNavigate()
  const completed = useLabProgress((s) => s.completed)
  const universe = useLabProgress((s) => s.universe)
  const summary = summarize(completed)
  const enter = (path: string) => navigate(path)
  const onContinue = () => enter(summary.next ? `/trebuchet/${summary.next.id}` : '/trebuchet')

  // The complex has its own main menu; a first visit chooses the world over the Classic home.
  if (universe === 'sigma') return <SigmaHome summary={summary} />

  return (
    <div className="lab-root min-h-screen">
      <header className="fixed top-0 inset-x-0 z-20 backdrop-blur-md" style={{ background: 'rgba(14,12,10,0.55)', borderBottom: '1px solid var(--lab-line)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2.5" aria-label={tr("PhysicsLab — на главную")}>
            <Logo size={30} />
            <span className="lab-title text-lg hidden min-[400px]:inline">PhysicsLab</span>
          </a>
          <nav className="ml-auto flex items-center gap-1">
            {/* Wrappers carry the breakpoints: .lab-btn sets its own display and would beat `hidden`. */}
            <span className="hidden sm:contents">
              <a href="#workshop" className="lab-btn !min-h-[36px] !px-3 !bg-transparent !border-transparent">
                
                {tr("Главы")}
              </a>
            </span>
            <span className="hidden min-[420px]:contents">
              <button type="button" onClick={() => enter('/trebuchet')} className="lab-btn !min-h-[36px] !px-3">
                
                {tr("Карта миссий")}
              </button>
            </span>
            <span className="hidden md:contents">
              <WorldSwitch />
            </span>
            <LanguageSwitch />
            <MusicToggle />
            <AccountButton />
          </nav>
        </div>
      </header>

      <main>
        <Hero summary={summary} onContinue={onContinue} />
        <Workshop universe="classic" summary={summary} onOpen={() => enter('/trebuchet')} />
      </main>

      <footer className="border-t" style={{ borderColor: 'var(--lab-line)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row sm:items-center gap-3 text-sm" style={{ color: 'var(--lab-dim)' }}>
          <span className="flex items-center gap-2">
            <Logo size={20} /> PhysicsLab
          </span>
          <span className="sm:ml-auto">{tr("Работает в браузере на компьютере, планшете и телефоне. Python запускается прямо на странице — ничего устанавливать не нужно.")}</span>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-6 text-[11px]" style={{ color: 'var(--lab-dim)', opacity: 0.7 }}>{tr('Музыка')}: {SOUNDFONT_CREDIT}</div>
      </footer>
      {universe === null && <WorldGate />}
    </div>
  )
}
