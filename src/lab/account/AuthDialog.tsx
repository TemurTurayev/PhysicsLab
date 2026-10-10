import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from './account'

type Mode = 'login' | 'register'

/** Sign in or create an account: a name and a password, nothing else (no email needed). */
export function AuthDialog({ onClose }: { onClose: () => void }) {
  const signIn = useAccount((s) => s.signIn)
  const [mode, setMode] = useState<Mode>('register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await signIn(mode, username.trim(), password)
    setBusy(false)
    if (err) setError(err)
    else onClose()
  }

  const field = 'w-full rounded-[10px] px-3 min-h-[44px] bg-transparent text-[15px]'
  // A portal to <body>: a blurred header would otherwise trap this fixed overlay inside itself.
  return createPortal(
    <div className="lab-root fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto" style={{ background: 'rgba(5,6,8,0.7)' }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? 'Вход' : 'Регистрация'}
        className="lab-panel lab-rise w-full max-w-[380px] p-5 flex flex-col gap-4 my-auto"
        style={{ background: 'var(--lab-panel-solid)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="lab-title text-xl">{mode === 'login' ? 'С возвращением' : 'Сохрани прогресс'}</div>
            <p className="text-sm mt-1" style={{ color: 'var(--lab-dim)' }}>
              Звёзды и журнал будут ждать тебя на любом устройстве.
            </p>
          </div>
          <button type="button" className="lab-btn !min-h-[36px] !px-3" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-[10px] p-0.5" style={{ background: 'var(--lab-raise)' }}>
          {(['register', 'login'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className="min-h-[36px] rounded-[8px] text-sm font-semibold"
              style={mode === m ? { background: 'var(--lab-accent)', color: '#1a1206' } : { color: 'var(--lab-dim)' }}
            >
              {m === 'register' ? 'Новый аккаунт' : 'Уже есть'}
            </button>
          ))}
        </div>

        <form className="flex flex-col gap-3" onSubmit={submit}>
          <label className="flex flex-col gap-1.5">
            <span className="lab-label">Имя</span>
            <input
              ref={first}
              className={field}
              style={{ border: '1px solid var(--lab-line)', color: 'var(--lab-text)' }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={24}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="например, temur_7"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="lab-label">Пароль</span>
            <input
              className={field}
              style={{ border: '1px solid var(--lab-line)', color: 'var(--lab-text)' }}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="не короче 6 символов"
              required
            />
          </label>
          {error && (
            <p role="alert" className="text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(255,130,112,0.12)', color: 'var(--lab-bad)' }}>
              {error}
            </p>
          )}
          <button type="submit" className="lab-btn lab-btn-primary !min-h-[46px]" disabled={busy}>
            {busy ? 'Секунду…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
          Почта не нужна. Пароль хранится только в зашифрованном виде, восстановить его нельзя — запиши. Прогресс из этого браузера не пропадёт: он
          объединится с аккаунтом.
        </p>
      </div>
    </div>,
    document.body,
  )
}
