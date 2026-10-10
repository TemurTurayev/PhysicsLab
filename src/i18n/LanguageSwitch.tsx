import { LOCALES, useLocale } from './index'

/** EN · RU · UZ — the whole interface and every mission switch language (the page reloads). */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale()
  return (
    <div role="radiogroup" aria-label="Language / Язык / Til" className={`flex items-center rounded-[10px] p-0.5 ${className}`} style={{ background: 'var(--lab-raise)', border: '1px solid var(--lab-line)' }}>
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={l.id === locale}
          title={l.name}
          onClick={() => setLocale(l.id)}
          className="min-h-[30px] min-w-[34px] px-1.5 rounded-[8px] text-xs font-semibold"
          style={l.id === locale ? { background: 'var(--lab-accent)', color: '#1a1206' } : { color: 'var(--lab-dim)' }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
