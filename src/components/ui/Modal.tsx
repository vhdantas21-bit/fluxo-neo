import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Faixa com as cores do logo no topo (janelas principais, como a da tarefa). */
  accent?: boolean
}

const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl' }

/**
 * Modal acessível baseado em <dialog> nativo: foco preso no diálogo,
 * fecho com Esc e devolução do foco ao elemento que o abriu.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', accent }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // Só fecha se o clique começou E terminou no fundo (evita fechar ao selecionar texto).
  const downOnBackdrop = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() foca o primeiro elemento (o botão Fechar); preferimos o campo principal.
      const target =
        dialog.querySelector<HTMLElement>('[data-autofocus]') ??
        dialog.querySelector<HTMLElement>('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea')
      target?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc é tratado aqui (e não pelo "cancel" nativo) e adiado um tick, para que
      // um diálogo de confirmação aberto em resposta fique por cima deste.
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          window.setTimeout(onClose, 0)
        }
      }}
      onCancel={(e) => {
        e.preventDefault()
        window.setTimeout(onClose, 0)
      }}
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === ref.current
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === ref.current) onClose()
      }}
      className={cn(
        'm-0 mt-auto max-h-[92dvh] focus-visible:outline-none w-full max-w-none rounded-t-2xl border border-glass-border bg-surface/95 p-0 text-fg shadow-pop backdrop-blur-2xl',
        'sm:m-auto sm:max-h-[88vh] sm:rounded-2xl',
        widths[size],
        open && 'animate-pop-in',
      )}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          {accent && (
            <div
              aria-hidden
              className="h-1 shrink-0 rounded-t-[inherit] bg-[linear-gradient(90deg,#2c50a1_0_22%,#132967_22%_44%,#c43004_44%_66%,var(--color-brand-white)_66%_82%,#424242_82%_100%)]"
            />
          )}
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-fg-subtle">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
