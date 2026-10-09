/** Tells how to move the camera; once the student has moved it, offers the cinematic camera back. */
export function CameraChip({ free, onAuto }: { free: boolean; onAuto: () => void }) {
  if (free) {
    return (
      <button type="button" className="lab-btn lab-btn-primary text-sm" onClick={onAuto} title="Вернуть автоматическую камеру">
        🎥 Авто-камера
      </button>
    )
  }
  return (
    <div className="lab-panel px-3 py-1.5 text-xs pointer-events-none" style={{ color: 'var(--lab-dim)' }}>
      <span className="hidden md:inline">Мышь — вращать · колесо — зум · правая кнопка — сдвиг</span>
      <span className="md:hidden">Палец — вращать · два пальца — зум</span>
    </div>
  )
}
