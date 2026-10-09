import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 768px)' // Tailwind md

function subscribe(cb: () => void): () => void {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** True at the md breakpoint and up, so a panel can live in one place per layout instead of twice. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true)
}
