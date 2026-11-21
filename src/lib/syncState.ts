import { useSyncExternalStore } from 'react'

/**
 * Estado da sincronização com o servidor, compartilhado entre a camada de dados
 * (OfflineRepository) e a interface (indicador do topo, tela sem conexão).
 */
export interface SyncState {
  /** Há conexão com o servidor (navigator.onLine e a última requisição não falhou por rede). */
  online: boolean
  /** Alterações guardadas neste aparelho à espera de envio. */
  queued: number
}

let state: SyncState = { online: typeof navigator === 'undefined' ? true : navigator.onLine, queued: 0 }
const listeners = new Set<() => void>()

export function setSyncState(patch: Partial<SyncState>) {
  const next = { ...state, ...patch }
  if (next.online === state.online && next.queued === state.queued) return
  state = next
  listeners.forEach((l) => l())
}

export function getSyncState() {
  return state
}

export function useSyncState() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => setSyncState({ online: false }))
  // "online" só diz que há rede; a camada de dados confirma ao reenviar a fila.
  window.addEventListener('online', () => setSyncState({ online: true }))
}
