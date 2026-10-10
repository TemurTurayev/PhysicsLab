import { tr } from '../i18n'
import { Link } from 'react-router-dom'
import '../lab/ui/lab.css'
import './home.css'
import { Logo } from './Logo'

/** A wrong address: the stone flew past the target. */
export function NotFound() {
  return (
    <div className="lab-root min-h-screen grid place-items-center px-4 text-center">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <Logo size={56} />
        <div className="lab-mono text-sm" style={{ color: 'var(--lab-accent)' }}>
          
          {tr("404 · перелёт")}
        </div>
        <h1 className="home-display text-4xl">{tr("Камень улетел мимо")}</h1>
        <p style={{ color: 'var(--lab-dim)' }}>{tr("Такой страницы нет. Вернись в мастерскую и попробуй ещё раз — с поправкой на ветер.")}</p>
        <Link to="/" className="lab-btn lab-btn-primary mt-2">
          
          {tr("На главную")}
        </Link>
      </div>
    </div>
  )
}
