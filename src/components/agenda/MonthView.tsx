import { useEffect, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { toDateOnly, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateOnly } from '@/types'
import { AgendaChip, TONE_DOT } from './AgendaItems'
import { WEEKDAYS, monthDays, type AgendaItem } from './model'

/** Altura de uma etiqueta (com o espaço entre elas) e do topo da célula (número do dia). */
const CHIP_PX = 21
const HEAD_PX = 32
const fmtFirst = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

interface Props {
  cursor: Date
  byDay: Map<DateOnly, AgendaItem[]>
  selected: DateOnly
  onSelectDay: (d: DateOnly) => void
  onOpen: (it: AgendaItem, anchor: HTMLElement) => void
  onMore: (d: DateOnly, anchor: HTMLElement) => void
}

/** Vista Mês: grade grande (como no Google Agenda), semanas de segunda a domingo. */
export function MonthView({ cursor, byDay, selected, onSelectDay, onOpen, onMore }: Props) {
  const days = monthDays(cursor)
  const month = cursor.getMonth()
  const today = todayISO()
  // Quantas etiquetas cabem: depende da altura real das células (5 ou 6 semanas, tamanho da tela).
  const grid = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(3)
  useEffect(() => {
    const el = grid.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const rowH = el.clientHeight / (days.length / 7)
      setFit(Math.max(1, Math.min(6, Math.floor((rowH - HEAD_PX) / CHIP_PX))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [days.length])
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-graphite-line bg-graphite-soft [box-shadow:inset_0_3px_0_var(--color-brand-blue),var(--shadow-card)]">
      <div className="grid grid-cols-7 border-b border-graphite-line pt-[3px]">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={cn('py-2 text-center text-[11px] font-semibold tracking-wide text-graphite-fg', i >= 5 && 'text-fg-subtle')}>
            {d}
          </div>
        ))}
      </div>
      <div ref={grid} className="grid min-h-0 flex-1 grid-cols-7 [grid-auto-rows:minmax(4.5rem,1fr)] sm:[grid-auto-rows:minmax(7rem,1fr)]">
        {days.map((d) => {
          const iso = toDateOnly(d)
          return (
            <DayCell
              key={iso}
              iso={iso}
              date={d}
              items={byDay.get(iso) ?? []}
              outside={d.getMonth() !== month}
              isToday={iso === today}
              selected={iso === selected}
              weekend={d.getDay() === 0 || d.getDay() === 6}
              onSelect={() => onSelectDay(iso)}
              onOpen={onOpen}
              onMore={onMore}
              fit={fit}
            />
          )
        })}
      </div>
    </div>
  )
}

function DayCell({
  iso,
  date,
  items,
  outside,
  isToday,
  selected,
  weekend,
  onSelect,
  onOpen,
  onMore,
  fit,
}: {
  fit: number
  iso: DateOnly
  date: Date
  items: AgendaItem[]
  outside: boolean
  isToday: boolean
  selected: boolean
  weekend: boolean
  onSelect: () => void
  onOpen: (it: AgendaItem, anchor: HTMLElement) => void
  onMore: (d: DateOnly, anchor: HTMLElement) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}` })
  const doingToday = isToday && items.some((i) => i.task?.status === 'doing')
  // Se tudo cabe, mostra tudo; senão, deixa uma linha para o "+N mais".
  const shown = items.length <= fit ? items.length : Math.max(1, fit - 1)
  const extra = items.length - shown
  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className={cn(
        'relative flex min-w-0 cursor-default flex-col gap-1 overflow-hidden border-r border-b border-graphite-line p-1 transition-colors sm:p-1.5 [&:nth-child(7n)]:border-r-0',
        weekend && 'bg-bg/25',
        outside && 'bg-bg/40',
        isToday && 'bg-fg/[0.05]',
        selected && !isToday && 'bg-primary/10',
        doingToday && 'shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-accent)_70%,transparent),inset_0_0_24px_-8px_var(--color-accent)]',
        isOver && 'bg-primary/20 ring-1 ring-primary ring-inset',
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        aria-label={`Ver ${date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}${items.length ? `, ${items.length} item(ns)` : ''}`}
        aria-pressed={selected}
        className="flex items-center self-start rounded-full focus-visible:outline-2 focus-visible:outline-primary-text"
      >
        <span
          className={cn(
            'flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums',
            isToday ? 'bg-primary font-semibold text-white' : outside ? 'text-fg-subtle/60' : 'font-medium text-fg-muted',
          )}
        >
          {date.getDate() === 1 && !isToday ? fmtFirst.format(date).replace('.', '') : date.getDate()}
        </span>
      </button>

      {/* Telas grandes: etiquetas; celular: pontos (o detalhe fica no painel do dia). */}
      <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
        {items.slice(0, shown).map((it) => (
          <AgendaChip key={it.key} it={it} onOpen={onOpen} />
        ))}
        {extra > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMore(iso, e.currentTarget)
            }}
            className="self-start rounded px-1.5 text-[11px] font-semibold text-fg-muted hover:bg-fg/10 hover:text-fg"
          >
            +{extra} mais
          </button>
        )}
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
          {items.slice(0, 4).map((it) => (
            <span key={it.key} className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[it.tone])} />
          ))}
        </div>
      )}
    </div>
  )
}
