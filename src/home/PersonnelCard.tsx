import { useEffect, useState } from 'react'
import { tr } from '../i18n'
import { playVoice, stopVoice } from '../lab/audio/voice'
import { NOTICES } from './notices'
import { Portrait } from './Portrait'

/** The intern's clearance pass: the complex sees people as records. Clearance grows with finished sectors. */
export function PersonnelCard({ clearance }: { clearance: number }) {
  return (
    <div className="pass" aria-label={tr('Пропуск стажёра')}>
      <div className="pass-head">
        <span>{tr('НИИ «СИГМА-7»')}</span>
        <span className="pass-no">№ 0451-Б</span>
      </div>
      <div className="pass-body">
        <div className="pass-photo">
          <Portrait world="sigma" />
        </div>
        <dl className="pass-fields">
          <dt>{tr('Фамилия, имя')}</dt>
          <dd>{tr('Доу Джон')}</dd>
          <dt>{tr('Должность')}</dt>
          <dd>{tr('Стажёр, отдел прикладной механики')}</dd>
          <dt>{tr('Допуск')}</dt>
          <dd className="pass-level">{tr('Уровень {0}', [clearance])}</dd>
        </dl>
      </div>
      <div className="pass-foot">
        <span className="pass-bars" aria-hidden />
        <span>{tr('Действителен до 31.12.1998')}</span>
      </div>
    </div>
  )
}

/**
 * Public-address notices, one at a time, in the dry voice of the institute — read aloud by the announcer.
 * The next notice waits for the current line to finish.
 */
export function Notices() {
  const [i, setI] = useState(0)
  useEffect(() => {
    let alive = true
    let timer = 0
    void playVoice(`sigma/notice-${i}`).then((sec) => {
      if (alive) timer = window.setTimeout(() => setI((x) => (x + 1) % NOTICES.length), Math.max(9000, (sec ?? 0) * 1000 + 5000))
    })
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [i])
  useEffect(() => stopVoice, [])
  return (
    <div className="cs-notice" role="status" aria-live="off">
      <span className="cs-notice-tag">{tr('ОПОВЕЩЕНИЕ')}</span>
      <span key={i} className="cs-notice-text">
        {NOTICES[i]}
      </span>
    </div>
  )
}
