import { useEffect, useState } from 'react'

const LEARNED_KEY = 'physicslab-camera-learned'

const readLearned = () => {
  try {
    return localStorage.getItem(LEARNED_KEY) === '1'
  } catch {
    return false
  }
}

interface CameraChipProps {
  free: boolean
  onAuto: () => void
  slow: boolean
  onSlow: () => void
  /** Low screens: buttons only, no how-to chip. */
  compact?: boolean
}

/** Camera help or «back to auto», plus slow motion so there is time to look around the flight. */
export function CameraChip({ free, onAuto, slow, onSlow, compact = false }: CameraChipProps) {
  // The how-to chip retires for good once the student has turned the camera themselves.
  const [learned] = useState(readLearned)
  useEffect(() => {
    if (!free) return
    try {
      localStorage.setItem(LEARNED_KEY, '1')
    } catch {
      // private mode: the chip simply keeps showing
    }
  }, [free])
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button" className={`lab-btn lab-btn-float text-sm ${slow ? 'lab-btn-primary' : ''}`} onClick={onSlow} aria-pressed={slow} title="Полёт в 3 раза медленнее">
        🐢<span className="hidden md:inline">{slow ? 'Замедление вкл.' : 'Замедлить'}</span>
      </button>
      {free ? (
        <button type="button" className="lab-btn lab-btn-primary text-sm" onClick={onAuto} title="Вернуть автоматическую камеру">
          🎥<span className="hidden md:inline">Авто-камера</span>
        </button>
      ) : (
        !learned && !compact && <CameraHelp />
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
