import Editor, { type OnMount } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'
import type { StudentError } from '../python/protocol'

export interface CodeDrawerProps {
  code: string
  onChange: (code: string) => void
  onRun: () => void
  onReset: () => void
  busy: boolean
  error: StudentError | null
  stdout: string
  pythonReady: boolean
}

type Monaco = Parameters<OnMount>[1]
type EditorInstance = Parameters<OnMount>[0]

export function CodeDrawer(p: CodeDrawerProps) {
  const editorRef = useRef<EditorInstance | null>(null)
  const monacoRef = useRef<Monaco | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    const model = editor?.getModel()
    if (!editor || !monaco || !model) return
    const line = p.error?.line
    monaco.editor.setModelMarkers(
      model,
      'student',
      line ? [{ startLineNumber: line, endLineNumber: line, startColumn: 1, endColumn: 200, message: p.error!.message, severity: monaco.MarkerSeverity.Error }] : [],
    )
  }, [p.error])

  return (
    <div className="lab-panel flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--lab-line)' }}>
        <span className="lab-label">Движок · Python</span>
        <span className="text-xs" style={{ color: p.pythonReady ? 'var(--lab-good)' : 'var(--lab-dim)' }}>
          {p.pythonReady ? '● Python готов' : '○ Python загружается…'}
        </span>
      </div>
      <div className="flex-1 min-h-[220px]">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={p.code}
          theme="vs-dark"
          onChange={(v) => p.onChange(v ?? '')}
          onMount={(editor, monaco) => {
            editorRef.current = editor
            monacoRef.current = monaco
          }}
          options={{ minimap: { enabled: false }, fontSize: 14, tabSize: 4, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on' }}
        />
      </div>
      {(p.error || p.stdout) && (
        <pre
          className="lab-mono text-xs px-3 py-2 max-h-28 overflow-auto whitespace-pre-wrap border-t"
          style={{ borderColor: 'var(--lab-line)', color: p.error ? 'var(--lab-bad)' : 'var(--lab-dim)' }}
        >
          {p.error ? `${p.error.line ? `Строка ${p.error.line}: ` : ''}${p.error.message}` : p.stdout}
        </pre>
      )}
      <div className="flex gap-2 p-3 border-t" style={{ borderColor: 'var(--lab-line)' }}>
        <button type="button" className="lab-btn lab-btn-primary flex-1" disabled={p.busy} onClick={p.onRun}>
          {p.busy ? 'Выполняю…' : '▶ Запустить на требушете'}
        </button>
        <button type="button" className="lab-btn" onClick={p.onReset} title="Вернуть исходный код">
          ↺
        </button>
      </div>
    </div>
  )
}
