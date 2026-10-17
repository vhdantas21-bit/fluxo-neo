import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

interface MenuProps {
  /** Conteúdo do botão que abre o menu. */
  trigger: ReactNode
  label: string
  items: Array<MenuItem | 'separator'>
  align?: 'left' | 'right'
  triggerClassName?: string
}

/** Menu de ações acessível: setas para navegar, Esc para fechar. */
export function Menu({ trigger, label, items, align = 'right', triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const id = useId()
  const [pos, setPos] = useState<CSSProperties>({})

  // Posição fixa calculada a partir do botão: o menu nunca fica cortado por
  // colunas com scroll e abre para cima quando falta espaço em baixo.
  useLayoutEffect(() => {
    if (!open || !btn.current) return
    const r = btn.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom
    const vertical = below < 320 && r.top > below ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }
    const horizontal = align === 'right' ? { right: Math.max(8, window.innerWidth - r.right) } : { left: Math.max(8, r.left) }
    setPos({ position: 'fixed', ...vertical, ...horizontal })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.target instanceof Node && root.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    root.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not([disabled])')?.focus({ preventScroll: true })
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not([disabled])') ?? [])
    const i = els.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      btn.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      els[(i + 1) % els.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      els[(i - 1 + els.length) % els.length]?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={root} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={pos}
          className="z-50 max-h-[70vh] min-w-48 animate-pop-in overflow-y-auto rounded-xl border border-line-strong bg-surface-2 p-1 shadow-pop"
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-line-strong" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                  'focus:bg-surface-3 focus:outline-none disabled:opacity-40',
                  item.danger ? 'text-accent-text hover:bg-accent/10' : 'text-fg hover:bg-surface-3',
                )}
              >
                <span className="text-fg-subtle [&>svg]:h-4 [&>svg]:w-4" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
