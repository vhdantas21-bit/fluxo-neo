import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Hand } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Dica de uso para telas de toque (celular/tablet): aparece até a pessoa tocar
 * em "Entendi" ou fazer o gesto uma vez (dismissHint), e não volta mais.
 * A escolha fica no localStorage deste navegador.
 */

const key = (id: string) => `fluxo-neo:hint:${id}`
const listeners = new Set<() => void>()

function seen(id: string) {
  try {
    return localStorage.getItem(key(id)) === '1'
  } catch {
    return false
  }
}

/** Marca a dica como vista (ex.: depois do primeiro arrasto bem-sucedido). */
export function dismissHint(id: string) {
  try {
    localStorage.setItem(key(id), '1')
  } catch {
    /* sem armazenamento: a dica só some nesta sessão */
  }
  listeners.forEach((l) => l())
}

function useSeen(id: string) {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => seen(id),
  )
}

/** Toque como entrada principal (celular/tablet), sem contar notebooks com tela de toque e mouse. */
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const on = () => setCoarse(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return coarse
}

export function TouchHint({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const isSeen = useSeen(id)
  const coarse = useCoarsePointer()
  if (isSeen || !coarse) return null
  return (
    <div
      role="note"
      className={cn(
        'surface-brand flex animate-pop-in items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] [--brand:var(--color-brand-blue)]',
        className,
      )}
    >
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/20 text-primary-text" aria-hidden>
        {/* Anel que pulsa: sugere "tocar e segurar". */}
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/25 motion-reduce:hidden [animation-duration:1.8s]" />
        <Hand size={17} className="relative" />
      </span>
      <p className="min-w-0 flex-1 text-fg-muted">{children}</p>
      <button
        type="button"
        onClick={() => dismissHint(id)}
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-text hover:bg-fg/5"
      >
        Entendi
      </button>
    </div>
  )
}
