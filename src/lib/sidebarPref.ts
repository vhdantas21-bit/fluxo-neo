import { useSyncExternalStore } from 'react'

/** Menu lateral recolhido (só ícones)? Preferência deste navegador. */
const KEY = 'fluxo-neo:sidebar'
const listeners = new Set<() => void>()

function read() {
  try {
    return localStorage.getItem(KEY) === 'collapsed'
  } catch {
    return false
  }
}
let collapsed = read()

export function setSidebarCollapsed(v: boolean) {
  collapsed = v
  try {
    if (v) localStorage.setItem(KEY, 'collapsed')
    else localStorage.removeItem(KEY)
  } catch {
    /* só nesta sessão */
  }
  listeners.forEach((l) => l())
}

export const toggleSidebar = () => setSidebarCollapsed(!collapsed)

export function useSidebarCollapsed() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => collapsed,
  )
}
