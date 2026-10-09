/** All three lives spent: no more guessing — compute from the table and start the mission again. */
export function OutOfLives({ formal, onRestart }: { formal: boolean; onRestart: () => void }) {
  return (
    <div className="w-full" role="alert">
      <div className="lab-panel px-4 py-3 flex flex-col gap-2" style={{ borderColor: 'rgba(255,107,107,0.55)' }}>
        <div className="font-semibold" style={{ color: 'var(--lab-bad)' }}>
          {formal ? 'Допуск к установке приостановлен' : 'Жизни кончились'}
        </div>
        <p className="text-sm" style={{ color: 'var(--lab-dim)' }}>
          {formal
            ? 'Три неудачных пуска. Посчитайте следующий по данным и таблице пусков, прежде чем стрелять: формулы в панели «Данные для расчёта».'
            : 'Три промаха подряд — значит, пора считать, а не угадывать. Открой «Данные для расчёта»: там скорость и угол вылета, формулы и таблица твоих выстрелов.'}
        </p>
        <button type="button" className="lab-btn lab-btn-primary self-start" onClick={onRestart}>
          ↺ {formal ? 'Повторить испытание' : 'Начать миссию заново'}
        </button>
      </div>
    </div>
  )
}
