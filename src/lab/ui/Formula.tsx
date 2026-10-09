import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useEffect, useRef } from 'react'

/** One display formula, typeset by KaTeX straight into the element (no HTML strings in React). */
export function Formula({ tex, className }: { tex: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) katex.render(tex, ref.current, { throwOnError: false, displayMode: true })
  }, [tex])
  return <div ref={ref} className={className} />
}
