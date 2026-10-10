import { tr } from '../../i18n'
import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHAPTERS, chapterLabel, isUnlocked } from '../levels'
import type { EnvironmentId, MissionKind } from '../levels/types'
import { useLabProgress } from '../state/labProgress'
import { FAILURES } from '../failures/catalog'
import './lab.css'
import './sigma.css'
import { applyCopy, UNIVERSES } from '../universe'
import { AccountButton } from '../account/AccountButton'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
import { MusicToggle } from '../audio/MusicToggle'
import { SigmaMap } from './SigmaMap'
import { UniversePicker } from '../universe/UniversePicker'
import { useUniverse } from '../universe/useUniverse'

const KIND_LABELS: Record<MissionKind, string> = {
  tune: tr('Настрой'),
  predict: tr('Предскажи'),
  write: tr('Напиши код'),
  fix: tr('Почини'),
  challenge: tr('Испытание'),
}

const CHAPTER_THEMES: Record<EnvironmentId, { gradient: string; border: string }> = {
  workshop: {
    gradient:
      'linear-gradient(90deg, rgba(14, 17, 23, 0.82) 0%, rgba(14, 17, 23, 0.35) 70%, rgba(14, 17, 23, 0.1) 100%), linear-gradient(135deg, #f6dcae 0%, #c98a3d 100%)',
    border: 'rgba(201, 138, 61, 0.35)',
  },
  range: {
    gradient:
      'linear-gradient(90deg, rgba(14, 17, 23, 0.82) 0%, rgba(14, 17, 23, 0.35) 70%, rgba(14, 17, 23, 0.1) 100%), linear-gradient(135deg, #5fa8e6 0%, #6f9a45 100%)',
    border: 'rgba(95, 168, 230, 0.35)',
  },
  siege: {
    gradient:
      'linear-gradient(90deg, rgba(14, 17, 23, 0.82) 0%, rgba(14, 17, 23, 0.35) 70%, rgba(14, 17, 23, 0.1) 100%), linear-gradient(135deg, #2f4f86 0%, #c9849a 55%, #ffb26b 100%)',
    border: 'rgba(95, 168, 230, 0.35)',
  },
  pass: {
    gradient:
      'linear-gradient(90deg, rgba(14, 17, 23, 0.82) 0%, rgba(14, 17, 23, 0.35) 70%, rgba(14, 17, 23, 0.1) 100%), linear-gradient(135deg, #5b7fa6 0%, #a9b9c6 55%, #dfe6ea 100%)',
    border: 'rgba(95, 168, 230, 0.35)',
  },
  moon: {
    gradient:
      'linear-gradient(90deg, rgba(14, 17, 23, 0.82) 0%, rgba(14, 17, 23, 0.35) 70%, rgba(14, 17, 23, 0.1) 100%), linear-gradient(135deg, #000000 0%, #1b2233 60%, #9a9893 100%)',
    border: 'rgba(95, 168, 230, 0.35)',
  },
}

export function WorldMap(): JSX.Element {
  const navigate = useNavigate()
  const completed = useLabProgress((s) => s.completed)
  const incidents = useLabProgress((s) => s.incidents)
  const totalFailures = Object.keys(FAILURES).length

  const chosen = useLabProgress((s) => s.universe)
  const setUniverse = useLabProgress((s) => s.setUniverse)
  const universe = useUniverse()
  if (chosen === null) return <UniversePicker />
  // The complex has its own map: an old-school windowed game menu.
  if (universe.id === 'sigma') return <SigmaMap />

  const allMissions = CHAPTERS.flatMap((c) => c.missions)
  const nextMission = allMissions.find((m) => isUnlocked(m, completed) && (completed[m.id] ?? 0) === 0)

  return (
    <div className="lab-root min-h-screen px-4 py-6 sm:px-8 sm:py-8" data-universe={universe.id}>
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col gap-4 border-b border-[var(--lab-line)] pb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="lab-btn text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lab-accent)] focus-visible:outline-offset-2"
            >
              
              {tr("← Главная")}
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <LanguageSwitch />
              <MusicToggle />
              <AccountButton />
              <div className="lab-mono text-xs px-3 py-1.5 rounded-full border border-[var(--lab-line)] bg-white/5 text-[var(--lab-dim)]">
                {universe.terms.journal}:{' '}
                <span className="text-[var(--lab-accent)] font-semibold">{incidents.length}</span> / {totalFailures}
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lab-text)]">
              
              {tr("Требушет · карта миссий")}
            </h1>
            <p className="text-sm text-[var(--lab-dim)] mt-1.5 max-w-2xl leading-relaxed">
              
              {tr("Физика броска: от момента отпуска до параболы и собственного движка на Python.")}
            </p>
          </div>
          {nextMission && (
            <button type="button" className="map-cta lab-btn lab-btn-primary self-start !min-h-[52px] !px-6 !text-base" onClick={() => navigate(`/trebuchet/${nextMission.id}`)}>
              {Object.keys(completed).length === 0 ? tr('Начать') : tr('Продолжить')}
              <span className="font-normal opacity-80">· {applyCopy(nextMission, universe).title}</span> <span aria-hidden>→</span>
            </button>
          )}
          <div role="radiogroup" aria-label={tr("Вселенная")} className="flex gap-2 flex-wrap">
            {UNIVERSES.map((u) => (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={u.id === universe.id}
                onClick={() => setUniverse(u.id)}
                className={`lab-btn text-sm ${u.id === universe.id ? 'lab-btn-primary' : ''}`}
              >
                {u.name}
              </button>
            ))}
          </div>
        </header>

        <main className="space-y-12">
          {CHAPTERS.map((chapter) => {
            const theme = CHAPTER_THEMES[chapter.env] ?? CHAPTER_THEMES.workshop
            const sectorOpen = universe.envFor(chapter.id) !== null
            return (
              <section key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
                <div
                  className="rounded-xl p-5 sm:p-6 mb-6 border"
                  style={{ background: universe.bannerFor?.(chapter.id) ?? theme.gradient, borderColor: theme.border }}
                >
                  <div className="lab-label">{chapterLabel(chapter.id)}</div>
                  <h2 id={`chapter-${chapter.id}`} className="text-xl sm:text-2xl font-bold text-[var(--lab-text)] mt-1">
                    {universe.chapterTitles[chapter.id] ?? chapter.title}
                  </h2>
                  {!sectorOpen && (
                    <p className="lab-mono text-xs mt-2" style={{ color: 'var(--lab-accent)' }}>
                      
                      {tr("Сектор на реконструкции — эту главу пока можно пройти в «Классике».")}
                    </p>
                  )}
                  <p className="text-sm text-[var(--lab-dim)] mt-1 max-w-2xl leading-relaxed">
                    {universe.chapterTaglines[chapter.id] ?? chapter.tagline}
                  </p>
                </div>

                <div className="relative grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] items-stretch gap-4 pb-2">
                  {chapter.missions.map((authored) => {
                    const mission = applyCopy(authored, universe)
                    const unlocked = sectorOpen && isUnlocked(mission, completed)
                    const isNext = mission.id === nextMission?.id
                    const stars = completed[mission.id] ?? 0

                    return (
                      <button
                        key={mission.id}
                        type="button"
                        onClick={() => navigate(`/trebuchet/${mission.id}`)}
                        disabled={!unlocked}
                        title={!unlocked ? tr('Сначала пройди предыдущую миссию') : undefined}
                        aria-label={
                          !unlocked
                            ? tr(`{0} — Сначала пройди предыдущую миссию`, [mission.title])
                            : tr(`{0}, {1}, {2} из 3 звёзд`, [mission.title, KIND_LABELS[mission.kind], stars])
                        }
                        data-state={!unlocked ? 'locked' : isNext ? 'next' : stars > 0 ? 'done' : 'open'}
                        className="map-card lab-panel relative z-10 flex flex-col justify-between p-4 sm:p-5 text-left rounded-[var(--lab-radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lab-accent)] focus-visible:outline-offset-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="lab-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-[var(--lab-dim)]">
                                {mission.order}
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[var(--lab-dim)]">
                                {mission.subject ?? KIND_LABELS[mission.kind]}
                              </span>
                            </div>

                            {!unlocked ? (
                              <svg
                                className="w-4 h-4 text-[var(--lab-dim)] shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            ) : isNext ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--lab-accent)] text-[#1a1206] uppercase tracking-wider shrink-0">
                                
                                {tr("Дальше")}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="text-base font-semibold text-[var(--lab-text)] mt-3">
                            {mission.title}
                          </h3>
                          <p className="text-xs text-[var(--lab-dim)] mt-1.5 line-clamp-2 leading-relaxed">
                            {mission.goal}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[var(--lab-line)]">
                          {[1, 2, 3].map((starIndex) => (
                            <svg
                              key={starIndex}
                              className={`w-3.5 h-3.5 ${
                                starIndex <= stars ? 'text-[var(--lab-accent)]' : 'text-white/15'
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </main>
      </div>
    </div>
  )
}
