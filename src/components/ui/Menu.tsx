import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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

/** Onde o menu é desenhado: no <dialog> aberto que contém o botão (para ficar acima do modal) ou no <body>. */
function portalTarget(el: HTMLElement | null): HTMLElement {
  return el?.closest<HTMLElement>('dialog[open]') ?? document.body
}

/** transform/filter/backdrop-filter fazem o elemento virar a referência do `position: fixed` dos filhos. */
function createsContainingBlock(el: HTMLElement) {
  const cs = getComputedStyle(el)
  return (
    cs.transform !== 'none' ||
    cs.filter !== 'none' ||
    cs.backdropFilter !== 'none' ||
    cs.perspective !== 'none' ||
    /paint|layout|strict|content/.test(cs.contain)
  )
}

/** Menu de ações acessível: setas para navegar, Esc para fechar. */
export function Menu({ trigger, label, items, align = 'right', triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  const [pos, setPos] = useState<CSSProperties>({})
  const inside = (t: EventTarget | null) => t instanceof Node && (!!root.current?.contains(t) || !!menu.current?.contains(t))

  // O menu é desenhado num portal (no <body>, ou no <dialog> aberto que contém o
  // botão, para continuar acima do modal). Dentro do cartão ele ficava preso:
  // vidro (backdrop-filter) e transform nos ancestrais mudam a referência do
  // `position: fixed`, e o overflow das colunas o cortava.
  // Posição fixa calculada a partir do botão; abre para cima quando falta espaço em baixo.
  useLayoutEffect(() => {
    if (!open || !btn.current) return
    const r = btn.current.getBoundingClientRect()
    // Área de referência do `position: fixed`: a tela, ou o <dialog> quando ele cria
    // um bloco de contenção próprio (o modal usa backdrop-filter).
    const host = portalTarget(btn.current)
    let box = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
    if (host !== document.body && createsContainingBlock(host)) {
      const h = host.getBoundingClientRect()
      box = {
        left: h.left + host.clientLeft,
        top: h.top + host.clientTop,
        right: h.left + host.clientLeft + host.clientWidth,
        bottom: h.top + host.clientTop + host.clientHeight,
      }
    }
    const below = window.innerHeight - r.bottom
    const vertical = below < 320 && r.top > below ? { bottom: box.bottom - r.top + 4 } : { top: r.bottom + 4 - box.top }
    const horizontal = align === 'right' ? { right: Math.max(8, box.right - r.right) } : { left: Math.max(8, r.left - box.left) }
    setPos({ position: 'fixed', ...vertical, ...horizontal })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (inside(e.target)) return
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
      if (!inside(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    menu.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not([disabled])')?.focus({ preventScroll: true })
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not([disabled])') ?? [])
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
      {open &&
        createPortal(
          <div
            ref={menu}
            id={id}
            data-no-dnd
            role="menu"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={pos}
            className="z-50 max-h-[70vh] min-w-48 animate-pop-in overflow-y-auto rounded-xl border border-glass-border bg-surface-2/90 p-1 shadow-pop backdrop-blur-xl"
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
          </div>,
          portalTarget(btn.current),
        )}
    </div>
  )
}
