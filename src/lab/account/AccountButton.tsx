import { useEffect, useRef, useState } from 'react'
import { useAccount } from './account'
import { AuthDialog } from './AuthDialog'

const SYNC_TEXT = { idle: 'Прогресс в облаке', saving: 'Сохраняю…', saved: 'Прогресс сохранён', offline: 'Нет связи — сохраню позже' } as const

/** «Войти» for guests; the name with a small menu (sync status, sign out) for signed-in students. */
export function AccountButton({ className = '' }: { className?: string }) {
  const { username, sync, signOut } = useAccount()
  const [dialog, setDialog] = useState(false)
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setMenu(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  if (!username) {
    return (
      <>
        <button type="button" className={`lab-btn !min-h-[36px] !px-3 ${className}`} onClick={() => setDialog(true)}>
          Войти
        </button>
        {dialog && <AuthDialog onClose={() => setDialog(false)} />}
      </>
    )
  }
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" className="lab-btn !min-h-[36px] !px-3 max-w-[160px]" onClick={() => setMenu(!menu)} aria-expanded={menu}>
        <span aria-hidden>{sync === 'offline' ? '⚠️' : '☁️'}</span>
        <span className="truncate">{username}</span>
      </button>
      {menu && (
        <div role="menu" className="lab-panel lab-rise absolute right-0 top-[44px] z-30 p-2 w-[230px] flex flex-col gap-1" style={{ background: 'var(--lab-panel-solid)' }}>
          <div className="px-2 py-1.5 text-xs" style={{ color: sync === 'offline' ? 'var(--lab-bad)' : 'var(--lab-dim)' }}>
            {SYNC_TEXT[sync]}
          </div>
          <button
            type="button"
            role="menuitem"
            className="lab-btn justify-start w-full"
            onClick={() => {
              setMenu(false)
              void signOut()
            }}
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
