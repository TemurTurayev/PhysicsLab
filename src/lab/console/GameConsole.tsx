import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { complete } from './commands'
import { useConsole } from './store'
import './console.css'

/** The developer console: ~ (or Ё) opens it anywhere, like the classics. Esc closes. */
export function GameConsole() {
  const navigate = useNavigate()
  const { open, lines, history, cvars, toggle, submit, setGo } = useConsole()
  const [input, setInput] = useState('')
  const [back, setBack] = useState(-1) // position in history while pressing ↑
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => setGo((p) => navigate(p)), [navigate, setGo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Backquote') return
      const el = e.target as HTMLElement | null
      const typing = el?.closest('input, textarea, [contenteditable], .monaco-editor') && el !== inputRef.current
      if (typing) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [toggle])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [lines, open])

  if (!open) return null

  const send = () => {
    submit(input)
    setInput('')
    setBack(-1)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') send()
    else if (e.key === 'Escape') toggle(false)
    else if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault()
      const i = back < 0 ? history.length - 1 : Math.max(0, back - 1)
      setBack(i)
      setInput(history[i])
    } else if (e.key === 'ArrowDown' && back >= 0) {
      e.preventDefault()
      const i = back + 1
      setBack(i < history.length ? i : -1)
      setInput(i < history.length ? history[i] : '')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const [cmd, ...rest] = input.split(' ')
      const options = complete(cmd)
      if (options.length === 1) setInput([options[0], ...rest].join(' ') + (rest.length ? '' : ' '))
      else if (options.length > 1) submit(`echo ${options.join('  ')}`)
    }
  }

  return (
    <div className="game-console" role="dialog" aria-label="Консоль" onKeyDown={(e) => e.stopPropagation()}>
      <div className="game-console-title">
        <span>Консоль</span>
        {cvars.sv_cheats && <span className="game-console-cheats">sv_cheats 1</span>}
        <button type="button" className="game-console-x" onClick={() => toggle(false)} aria-label="Закрыть консоль">
          ✕
        </button>
      </div>
      <div className="game-console-log" ref={logRef}>
        {lines.map((l, i) => (
          <div key={i}>{l || ' '}</div>
        ))}
      </div>
      <div className="game-console-input">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[`ёЁ~]/g, ''))}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          aria-label="Команда"
        />
        <button type="button" onClick={send}>
          Ввод
        </button>
      </div>
    </div>
  )
}
