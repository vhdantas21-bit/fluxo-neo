import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * ExpandableSearchBar (adaptado para o FLUXO NEO):
 * - cores trocadas pelos tokens do tema do app (funciona no claro e no escuro);
 * - `open` / `onOpenChange` opcionais, para abrir pelo atalho "/";
 * - a largura nunca passa da borda da tela (importante no celular);
 * - Enter pesquisa uma única vez (pelo submit do formulário);
 * - textos e rótulos de acessibilidade em português.
 */

export type ExpandableSearchBarProps = {
  expandDirection?: 'left' | 'right'
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
  defaultOpen?: boolean
  width?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const COLLAPSED_SIZE = 40
const EDGE_GAP = 12

export default function ExpandableSearchBar(props: ExpandableSearchBarProps) {
  const {
    expandDirection = 'right',
    placeholder = 'Pesquisar...',
    onSearch,
    className = '',
    defaultOpen = false,
    width = 280,
    open: openProp,
    onOpenChange,
  } = props

  const [openState, setOpenState] = useState(defaultOpen)
  const open = openProp ?? openState
  const setOpen = (next: boolean | ((o: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(open) : next
    if (openProp === undefined) setOpenState(value)
    onOpenChange?.(value)
  }

  const [value, setValue] = useState('')
  const [fitWidth, setFitWidth] = useState(width)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const inputPadding = expandDirection === 'right' ? 'pl-11' : 'pl-10'
  const placeholderLeft = expandDirection === 'right' ? 'left-11' : 'left-10'

  // Limita a largura ao espaço disponível até à borda da tela.
  useEffect(() => {
    if (!open) return
    const measure = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const available = expandDirection === 'left' ? rect.right - EDGE_GAP : window.innerWidth - rect.left - EDGE_GAP
      setFitWidth(Math.max(COLLAPSED_SIZE, Math.min(width, available)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, width, expandDirection])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node) && open && value === '') {
        setOpen(false)
        setValue('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  })

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 120)
      return () => clearTimeout(id)
    } else {
      setValue('')
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(value)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setValue('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: COLLAPSED_SIZE, height: COLLAPSED_SIZE }}
    >
      <button
        type="button"
        aria-label={open ? 'Fechar pesquisa' : 'Abrir pesquisa'}
        aria-expanded={open}
        title={open ? 'Fechar pesquisa (Esc)' : 'Pesquisar (/)'}
        onClick={() => setOpen((s) => !s)}
        className={cn(
          'absolute inset-0 z-20 grid place-items-center rounded-full border border-line-strong',
          'bg-surface-2 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg',
        )}
      >
        {open ? <X className="size-4" /> : <Search className="size-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            key="form"
            role="search"
            onSubmit={handleSubmit}
            className={cn(
              'absolute top-0 z-10 flex h-10 items-center overflow-hidden rounded-full border border-line-strong bg-surface text-fg shadow-pop',
              'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
              expandDirection === 'left' ? 'right-0' : 'left-0',
            )}
            initial={{ width: COLLAPSED_SIZE, opacity: 0.98 }}
            animate={{ width: fitWidth, opacity: 1 }}
            exit={{
              width: COLLAPSED_SIZE,
              opacity: 0,
              transition: { type: 'spring', stiffness: 260, damping: 26 },
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <span className="absolute left-3 z-10 text-fg-subtle">
              <Search className="size-4" />
            </span>
            <div className="relative flex min-w-0 flex-1 items-center">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                aria-label="Pesquisar tarefas"
                className={cn(
                  'w-full overflow-x-auto bg-transparent text-sm whitespace-nowrap placeholder-transparent outline-none focus-visible:outline-none',
                  inputPadding,
                  expandDirection === 'left' && 'pr-12',
                )}
              />
              <AnimatePresence>
                {open && !value && (
                  <motion.span
                    key="ph"
                    className={cn(
                      'pointer-events-none absolute top-1/2 w-full -translate-y-1/2 truncate text-left text-sm text-fg-subtle select-none',
                      placeholderLeft,
                    )}
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: 0.9, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {placeholder}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence initial={false}>
              {open && expandDirection === 'right' && (
                <motion.button
                  key="go"
                  type="submit"
                  className="grid h-10 w-10 place-items-center text-fg-subtle hover:text-fg"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  aria-label="Pesquisar"
                >
                  <Search className="size-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
