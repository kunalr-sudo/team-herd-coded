import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'simulate' | 'run' | 'lab' | 'pasture'

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h.startsWith('simulate')) return 'simulate'
  if (h.startsWith('run')) return 'run'
  if (h.startsWith('lab')) return 'lab'
  if (h.startsWith('pasture')) return 'pasture'
  return 'home'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** Minimal hash router: #/ landing, #/simulate setup wizard, #/run clean simulation, #/lab expert view, #/pasture. */
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, parse)
}
