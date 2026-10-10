import { tr } from '../../i18n'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

export function TheoryPanel({ formulas }: { formulas: string[] }) {
  const html = useMemo(
    () => formulas.map((f) => katex.renderToString(f, { throwOnError: false, displayMode: true })),
    [formulas],
  )
  if (formulas.length === 0) return null
  return (
    <div className="lab-panel p-3">
      <div className="lab-label mb-1">{tr("Формулы этой сцены")}</div>
      {html.map((h, i) => (
        <div key={i} className="overflow-x-auto text-sm" dangerouslySetInnerHTML={{ __html: h }} />
      ))}
    </div>
  )
}
