interface CameraChipProps {
  free: boolean
  onAuto: () => void
  slow: boolean
  onSlow: () => void
}

/** Camera help or «back to auto», plus slow motion so there is time to look around the flight. */
export function CameraChip({ free, onAuto, slow, onSlow }: CameraChipProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button" className={`lab-btn text-sm ${slow ? 'lab-btn-primary' : ''}`} onClick={onSlow} aria-pressed={slow} title="Полёт в 3 раза медленнее">
        🐢 {slow ? 'Замедление вкл.' : 'Замедлить'}
      </button>
      {free ? (
        <button type="button" className="lab-btn lab-btn-primary text-sm" onClick={onAuto} title="Вернуть автоматическую камеру">
          🎥 Авто-камера
        </button>
      ) : (
        <CameraHelp />
      )}
    </div>
  )
}

function CameraHelp() {
  return (
    <div className="lab-panel px-3 py-1.5 text-xs pointer-events-none" style={{ color: 'var(--lab-dim)' }}>
      <span className="hidden md:inline">Мышь — вращать · колесо — зум · правая кнопка — сдвиг</span>
      <span className="md:hidden">Палец — вращать · два пальца — зум</span>
    </div>
  )
}
