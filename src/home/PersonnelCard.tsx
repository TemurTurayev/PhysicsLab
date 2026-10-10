import { useEffect, useState } from 'react'
import { tr } from '../i18n'
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
          <dd>{tr('Орлов Даниил')}</dd>
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

const NOTICES = [
  tr('Объявление: пуск без расчёта приравнивается к нарушению техники безопасности.'),
  tr('Напоминаем: каждая ошибка заносится в архив протоколов. Архив хранится бессрочно.'),
  tr('Отдел кадров: стажёры без вводного курса к установке ЭМУ-3 не допускаются.'),
  tr('Служба вентиляции: шум в секторе В является штатным. Повода для беспокойства нет.'),
  tr('Охрана труда: находиться на линии огня во время пуска запрещено.'),
  tr('Администрация благодарит сотрудников за пунктуальность. Опоздания учитываются.'),
]

/** Public-address notices, one at a time, in the dry voice of the institute. */
export function Notices() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % NOTICES.length), 9000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="cs-notice" role="status" aria-live="off">
      <span className="cs-notice-tag">{tr('ОПОВЕЩЕНИЕ')}</span>
      <span key={i} className="cs-notice-text">
        {NOTICES[i]}
      </span>
    </div>
  )
}
