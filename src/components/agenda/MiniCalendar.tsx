import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, addMonths, formatMonth, startOfMonth, startOfWeek, toDateOnly, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateOnly } from '@/types'
import { TONE_DOT, dotStyle } from './AgendaItems'
import { monthDays, type AgendaItem } from './model'

const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const FULL = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']

/** Mini calendário da lateral (como no Google Agenda): clicar num dia leva o calendário até ele. */
export function MiniCalendar({
  selected,
  onPick,
  byDay,
}: {
  selected: DateOnly
  onPick: (d: DateOnly) => void
  byDay: Map<DateOnly, AgendaItem[]>
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date(`${selected}T00:00:00`)))
  // Acompanha a navegação do calendário principal.
  useEffect(() => {
    setCursor(startOfMonth(new Date(`${selected}T00:00:00`)))
  }, [selected])
  const today = todayISO()
  const days = monthDays(cursor)
  const month = cursor.getMonth()

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="pl-1 text-sm font-semibold first-letter:uppercase">{formatMonth(cursor)}</p>
        <div className="flex">
          <button type="button" onClick={() => setCursor((c) => addMonths(c, -1))} className="rounded-md p-1.5 text-fg-subtle hover:bg-fg/5 hover:text-fg" aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-md p-1.5 text-fg-subtle hover:bg-fg/5 hover:text-fg" aria-label="Mês seguinte">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-fg-subtle" aria-hidden>
        {LETTERS.map((l, i) => (
          <span key={i} className="py-1">
            {l}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const iso = toDateOnly(d)
          const items = byDay.get(iso) ?? []
          const isToday = iso === today
          const isSel = iso === selected
          const doing = items.some((i) => i.task?.status === 'doing')
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              aria-label={`${d.getDate()} de ${formatMonth(d)}, ${FULL[(d.getDay() + 6) % 7]}${items.length ? `, ${items.length} item(ns)` : ''}`}
              aria-pressed={isSel}
              className={cn(
                'relative mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-full text-xs tabular-nums transition-colors',
                d.getMonth() !== month && 'text-fg-subtle/50',
                isToday ? 'bg-primary font-semibold text-white' : isSel ? 'bg-primary/20 font-semibold text-primary-text' : 'hover:bg-fg/5',
              )}
            >
              {d.getDate()}
              {items.length > 0 && !isToday && (
                <span className={cn('absolute bottom-1 h-1 w-1 rounded-full', doing ? 'bg-accent' : 'bg-fg-subtle')} aria-hidden />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Faixa de dias com rolagem horizontal (celular): a semana do dia escolhido e as vizinhas. */
export function DayStrip({ selected, onPick, byDay }: { selected: DateOnly; onPick: (d: DateOnly) => void; byDay: Map<DateOnly, AgendaItem[]> }) {
  const ref = useRef<HTMLDivElement>(null)
  const start = addDays(startOfWeek(new Date(`${selected}T00:00:00`)), -7)
  const days = Array.from({ length: 28 }, (_, i) => addDays(start, i))
  const today = todayISO()
  useEffect(() => {
    ref.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [selected])
  return (
    <div ref={ref} className="-mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {days.map((d) => {
        const iso = toDateOnly(d)
        const items = byDay.get(iso) ?? []
        const sel = iso === selected
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onPick(iso)}
            aria-pressed={sel}
            aria-label={`${FULL[(d.getDay() + 6) % 7]}, ${d.getDate()}${items.length ? `, ${items.length} item(ns)` : ''}`}
            className={cn(
              'flex w-12 shrink-0 snap-center flex-col items-center gap-1 rounded-xl border py-2 text-xs transition-colors',
              sel ? 'border-primary bg-primary text-white' : iso === today ? 'border-primary/60 text-primary-text' : 'border-line bg-surface-2/50 text-fg-muted',
            )}
          >
            <span className="text-[10px] font-medium uppercase">{FULL[(d.getDay() + 6) % 7].slice(0, 3)}</span>
            <span className="text-base font-semibold tabular-nums">{d.getDate()}</span>
            <span className="flex h-1.5 gap-0.5" aria-hidden>
              {items.slice(0, 3).map((it) => (
                <span key={it.key} className={cn('h-1.5 w-1.5 rounded-full', sel ? 'bg-white/90' : TONE_DOT[it.tone])} style={sel ? undefined : dotStyle(it)} />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}
