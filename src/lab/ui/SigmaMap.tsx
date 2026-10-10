import { tr } from '../../i18n'
import { useEffect, useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccountButton } from '../account/AccountButton'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
import { MusicToggle } from '../audio/MusicToggle'
import { FAILURES } from '../failures/catalog'
import { CHAPTERS, chapterLabel, isUnlocked } from '../levels'
import type { Mission } from '../levels/types'
import { useLabProgress } from '../state/labProgress'
import { applyCopy, getUniverse } from '../universe'
import './sigmaMap.css'

const KIND: Record<Mission['kind'], string> = { tune: tr('Настройка'), predict: tr('Прогноз'), write: tr('Программа'), fix: tr('Ремонт'), challenge: tr('Испытание') }

/**
 * The complex's mission map, styled after the windowed menus of early-2000s PC games:
 * bevelled olive panels, chapter tabs, a list of tests like a server browser, details on the right.
 */
export function SigmaMap(): JSX.Element {
  const navigate = useNavigate()
  const universe = getUniverse('sigma')
  const completed = useLabProgress((s) => s.completed)
  const incidents = useLabProgress((s) => s.incidents.length)
  const setUniverse = useLabProgress((s) => s.setUniverse)
  const all = CHAPTERS.flatMap((c) => c.missions)
  const next = all.find((m) => isUnlocked(m, completed) && (completed[m.id] ?? 0) === 0)
  const [tab, setTab] = useState(next?.chapter ?? 0)
  const chapter = CHAPTERS.find((c) => c.id === tab) ?? CHAPTERS[0]
  const [selected, setSelected] = useState<string | null>(next?.id ?? null)
  const pick = chapter.missions.find((m) => m.id === selected) ?? chapter.missions.find((m) => isUnlocked(m, completed)) ?? chapter.missions[0]
  const pickOpen = isUnlocked(pick, completed)
  const started = Object.keys(completed).length > 0

  // ↑/↓ walk the list, Enter starts the selected test — like a keyboard-driven game menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, .game-console')) return
      const i = chapter.missions.findIndex((m) => m.id === pick.id)
      if (e.key === 'ArrowDown') setSelected(chapter.missions[Math.min(chapter.missions.length - 1, i + 1)].id)
      else if (e.key === 'ArrowUp') setSelected(chapter.missions[Math.max(0, i - 1)].id)
      else if (e.key === 'Enter' && pickOpen) navigate(`/trebuchet/${pick.id}`)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chapter, pick, pickOpen, navigate])

  return (
    <div className="lab-root sigma-map" data-universe="sigma">
      <div className="vg-window">
        <div className="vg-titlebar">
          <span className="vg-title">{tr("НИИ «СИГМА-7» — ВЫБОР ИСПЫТАНИЯ")}</span>
          <span className="vg-titlebar-tools">
            <LanguageSwitch />
            <MusicToggle />
            <AccountButton />
            <button type="button" className="vg-btn vg-x" onClick={() => navigate('/')} aria-label={tr("На главную")} title={tr("На главную")}>
              ✕
            </button>
          </span>
        </div>

        <div className="vg-toolbar">
          {next ? (
            <button type="button" className="vg-btn vg-btn-hot" onClick={() => navigate(`/trebuchet/${next.id}`)}>
              {started ? tr('Продолжить') : tr('Начать')} · {applyCopy(next, universe).title}
            </button>
          ) : (
            <span className="vg-note">{tr("Все испытания пройдены.")}</span>
          )}
          <span className="vg-note vg-grow">{tr("Архив протоколов:") + ' '}{incidents} / {Object.keys(FAILURES).length}</span>
          <button type="button" className="vg-btn" onClick={() => setUniverse('classic')}>
            
            {tr("Классика")}
          </button>
        </div>

        <div className="vg-tabs" role="tablist" aria-label={tr("Сектора")}>
          {CHAPTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === tab}
              className={`vg-tab ${c.id === tab ? 'vg-tab-on' : ''}`}
              onClick={() => {
                setTab(c.id)
                setSelected(null)
              }}
            >
              {universe.chapterTitles[c.id] ?? c.title}
            </button>
          ))}
        </div>

        <div className="vg-body">
          <div className="vg-list" role="listbox" aria-label={tr("Испытания")}>
            <div className="vg-row vg-head" aria-hidden>
              <span>№</span>
              <span>{tr("Испытание")}</span>
              <span className="vg-col-kind">{tr("Тип")}</span>
              <span>{tr("Статус")}</span>
              <span className="vg-col-stars">{tr("Оценка")}</span>
            </div>
            {chapter.missions.map((m) => {
              const told = applyCopy(m, universe)
              const open = isUnlocked(m, completed)
              const stars = completed[m.id] ?? 0
              const state = !open ? tr('закрыто') : stars > 0 ? tr('пройдено') : m.id === next?.id ? tr('ДАЛЕЕ') : tr('открыто')
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={m.id === pick.id}
                  data-state={!open ? 'locked' : m.id === next?.id ? 'next' : stars > 0 ? 'done' : 'open'}
                  className={`vg-row ${m.id === pick.id ? 'vg-row-on' : ''}`}
                  onClick={() => setSelected(m.id)}
                  onDoubleClick={() => open && navigate(`/trebuchet/${m.id}`)}
                >
                  <span className="vg-mono">{m.id}</span>
                  <span className="vg-name">{told.title}</span>
                  <span className="vg-col-kind">{m.subject ?? KIND[m.kind]}</span>
                  <span className="vg-state">{open ? state : '🔒 ' + state}</span>
                  <span className="vg-col-stars vg-mono">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
                </button>
              )
            })}
          </div>

          <aside className="vg-info">
            <div className="vg-shot" style={{ backgroundImage: `url('/previews/sigma-${chapter.id}.webp')` }} aria-hidden />
            <div className="vg-label">{chapterLabel(chapter.id)} · {pick.id}</div>
            <div className="vg-info-title">{applyCopy(pick, universe).title}</div>
            <p className="vg-info-text">{applyCopy(pick, universe).goal}</p>
            <p className="vg-info-dim">{universe.chapterTaglines[chapter.id] ?? chapter.tagline}</p>
            <button type="button" className={`vg-btn vg-wide ${pickOpen ? 'vg-btn-hot' : ''}`} disabled={!pickOpen} onClick={() => navigate(`/trebuchet/${pick.id}`)}>
              {pickOpen ? ((completed[pick.id] ?? 0) > 0 ? tr('Повторить испытание') : tr('Начать испытание')) : tr('Закрыто: пройдите предыдущее')}
            </button>
          </aside>
        </div>

        <div className="vg-status">
          <span>{tr("↑↓ — выбор · Enter — начать · ~ — консоль")}</span>
          <button type="button" className="vg-btn" onClick={() => navigate('/')}>
            
            {tr("Главное меню")}
          </button>
        </div>
      </div>
    </div>
  )
}
