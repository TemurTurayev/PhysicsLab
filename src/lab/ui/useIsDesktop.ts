import { useSyncExternalStore } from 'react'

const DESKTOP = '(min-width: 768px)' // Tailwind md
const SHORT = '(max-height: 520px)' // phones turned sideways: wide but very low

function useMedia(query: string, server: boolean): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => server,
  )
}

/** True at the md breakpoint and up, so a panel can live in one place per layout instead of twice. */
export function useIsDesktop(): boolean {
  return useMedia(DESKTOP, true)
}

/** True on very low screens (a phone in landscape), where side panels must not stack. */
export function useIsShort(): boolean {
  return useMedia(SHORT, false)
}

/** Wide enough for the solution desk and the 3D field side by side. */
export function useIsWide(): boolean {
  return useMedia('(min-width: 1024px) and (min-height: 521px)', true)
}
