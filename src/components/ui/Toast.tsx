import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'error' | 'info'

interface ToastInput {
  message: string
  tone?: Tone
  action?: { label: string; onClick: () => void }
  duration?: number
}
interface ToastItem extends ToastInput {
  id: number
}

interface ToastApi {
  show: (t: ToastInput) => void
  success: (message: string, action?: ToastInput['action']) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])

  const show = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current
      setItems((l) => [...l.slice(-3), { ...t, id }])
      const ms = t.duration ?? (t.action ? 6000 : t.tone === 'error' ? 6000 : 3500)
      window.setTimeout(() => dismiss(id), ms)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, action) => show({ message, tone: 'success', action }),
      error: (message) => show({ message, tone: 'error' }),
      info: (message) => show({ message, tone: 'info' }),
    }),
    [show],
  )

  // As notificações vivem na "top layer" (popover) para ficarem visíveis
  // mesmo por cima de um modal <dialog> aberto.
  const region = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = region.current
    if (!el || typeof el.showPopover !== 'function') return
    try {
      if (el.matches(':popover-open')) el.hidePopover()
      if (items.length) el.showPopover()
    } catch {
      /* popover não suportado: a região continua visível normalmente */
    }
  }, [items])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={region}
        popover="manual"
        aria-live="polite"
        className="pointer-events-none fixed m-0 border-0 bg-transparent p-0 overflow-visible top-auto left-0 right-0 w-full inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
      >
        {items.map((t) => {
          const Icon = t.tone === 'error' ? CircleAlert : t.tone === 'success' ? CircleCheck : Info
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-sm shadow-pop"
            >
              <Icon
                size={18}
                className={cn(
                  'shrink-0',
                  t.tone === 'error' ? 'text-accent-text' : t.tone === 'success' ? 'text-primary-text' : 'text-fg-muted',
                )}
                aria-hidden
              />
              <p className="min-w-0 flex-1 text-fg">{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  className="shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-primary-text hover:bg-surface-3"
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg"
                aria-label="Fechar notificação"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx
}
