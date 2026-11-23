import { useEffect, useRef, useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { addDays, startOfWeek, toDateOnly, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateOnly } from '@/types'
import { AgendaChip, ItemIcon, reminderStyle, toneClass } from './AgendaItems'
import { WEEKDAYS, durationLabel, toMinutes, type AgendaItem } from './model'

/** Grade das 07:00 às 23:00. */
export const DAY_START = 7 * 60
export const DAY_END = 23 * 60
export const HOUR_PX = 48
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START / 60 + i)

interface Props {
  cursor: Date
  byDay: Map<DateOnly, AgendaItem[]>
  selected: DateOnly
  onSelectDay: (d: DateOnly) => void
  onOpen: (it: AgendaItem, anchor: HTMLElement) => void
}

/** Item com horário dentro da grade? (fora dela vai para a faixa de dia inteiro, com o horário escrito). */
const inGrid = (it: AgendaItem) => !!it.time && toMinutes(it.time) >= DAY_START && toMinutes(it.time) < DAY_END && it.kind !== 'start'

/** Duração em minutos: fim − início, ou 1 h para tarefas e 30 min para lembretes. */
function duration(it: AgendaItem) {
  if (it.time && it.endTime) return Math.max(15, toMinutes(it.endTime) - toMinutes(it.time))
  return it.kind === 'reminder' ? 30 : 60
}

/** Distribui itens sobrepostos em colunas lado a lado. */
function layout(items: AgendaItem[]) {
  const sorted = [...items].sort((a, b) => toMinutes(a.time!) - toMinutes(b.time!))
  const out: { it: AgendaItem; lane: number; lanes: number }[] = []
  let cluster: { it: AgendaItem; lane: number; end: number }[] = []
  let clusterEnd = -1
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
    for (const c of cluster) out.push({ it: c.it, lane: c.lane, lanes })
    cluster = []
  }
  for (const it of sorted) {
    const start = toMinutes(it.time!)
    const end = start + duration(it)
    if (start >= clusterEnd) {
      flush()
      clusterEnd = -1
    }
    const used = new Set(cluster.filter((c) => c.end > start).map((c) => c.lane))
    let lane = 0
    while (used.has(lane)) lane++
    cluster.push({ it, lane, end })
    clusterEnd = Math.max(clusterEnd, end)
  }
  flush()
  return out
}

/** Vista Semana: 7 colunas, faixa de dia inteiro e grade horária com arrastar para mudar dia e hora. */
export function WeekView({ cursor, byDay, selected, onSelectDay, onOpen }: Props) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const today = todayISO()
  const scroller = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  // Abre a grade perto da hora atual (ou às 08:00).
  useEffect(() => {
    const h = Math.max(DAY_START, Math.min(DAY_END - 180, now.getHours() * 60 - 60))
    scroller.current?.scrollTo({ top: ((h - DAY_START) / 60) * HOUR_PX })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const gridCols = 'grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-graphite-line bg-graphite-soft [box-shadow:inset_0_3px_0_var(--color-brand-blue),var(--shadow-card)]">
      {/* Cabeçalho dos dias */}
      <div className={cn('grid border-b border-graphite-line pt-[3px]', gridCols)}>
        <div />
        {days.map((d, i) => {
          const iso = toDateOnly(d)
          const isToday = iso === today
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              aria-pressed={iso === selected}
              className={cn('flex flex-col items-center gap-0.5 py-2', isToday && 'bg-primary/10', iso === selected && !isToday && 'bg-fg/[0.04]')}
            >
              <span className={cn('text-[11px] font-semibold tracking-wide', isToday ? 'text-primary-text' : 'text-graphite-fg')}>{WEEKDAYS[i]}</span>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-lg tabular-nums',
                  isToday ? 'bg-primary font-semibold text-white' : 'text-fg',
                )}
              >
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Faixa de dia inteiro / sem horário */}
      <div className={cn('grid border-b border-graphite-line', gridCols)}>
        <div className="flex items-start justify-end pt-2 pr-2 text-[10px] text-fg-subtle">dia todo</div>
        {days.map((d) => {
          const iso = toDateOnly(d)
          return <AllDayCell key={iso} iso={iso} isToday={iso === today} items={(byDay.get(iso) ?? []).filter((it) => !inGrid(it))} onOpen={onOpen} />
        })}
      </div>

      {/* Grade horária */}
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className={cn('relative grid', gridCols)} style={{ height: HOURS.length * HOUR_PX }}>
          <div className="relative">
            {HOURS.map((h, i) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-fg-subtle tabular-nums" style={{ top: i * HOUR_PX }}>
                {i === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const iso = toDateOnly(d)
            const isToday = iso === today
            const items = (byDay.get(iso) ?? []).filter(inGrid)
            return (
              <SlotColumn key={iso} iso={iso} isToday={isToday} weekend={d.getDay() === 0 || d.getDay() === 6}>
                {layout(items).map(({ it, lane, lanes }) => (
                  <WeekBlock key={it.key} it={it} lane={lane} lanes={lanes} onOpen={onOpen} />
                ))}
                {isToday && nowMin >= DAY_START && nowMin < DAY_END && (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: ((nowMin - DAY_START) / 60) * HOUR_PX }} aria-label="Agora">
                    <div className="relative h-0.5 bg-accent">
                      <span className="absolute -top-[5px] -left-[6px] h-3 w-3 rounded-full bg-accent" />
                    </div>
                  </div>
                )}
              </SlotColumn>
            )
          })}
          {/* Linhas das horas */}
          <div className="pointer-events-none absolute inset-0 col-start-2 col-end-9" aria-hidden>
            {HOURS.map((h, i) => (
              <div key={h} className="absolute inset-x-0 border-t border-graphite-line/70" style={{ top: i * HOUR_PX }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AllDayCell({ iso, isToday, items, onOpen }: { iso: DateOnly; isToday: boolean; items: AgendaItem[]; onOpen: (it: AgendaItem, a: HTMLElement) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `allday:${iso}` })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex max-h-28 min-h-9 min-w-0 flex-col gap-0.5 overflow-y-auto border-l border-graphite-line p-1',
        isToday && 'bg-primary/[0.07]',
        isOver && 'bg-primary/20',
      )}
    >
      {items.map((it) => (
        <AgendaChip key={it.key} it={it} onOpen={onOpen} />
      ))}
    </div>
  )
}

function SlotColumn({ iso, isToday, weekend, children }: { iso: DateOnly; isToday: boolean; weekend: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${iso}` })
  return (
    <div
      ref={setNodeRef}
      className={cn('relative border-l border-graphite-line', weekend && 'bg-bg/20', isToday && 'bg-primary/[0.07]', isOver && 'bg-primary/15')}
    >
      {children}
    </div>
  )
}

function WeekBlock({ it, lane, lanes, onOpen }: { it: AgendaItem; lane: number; lanes: number; onOpen: (it: AgendaItem, a: HTMLElement) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: it.key, data: it })
  const startMin = toMinutes(it.time!)
  const dur = Math.min(duration(it), DAY_END - startMin)
  const doing = it.task?.status === 'doing' && it.tone === 'doing'
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(it, e.currentTarget)
      }}
      aria-label={`${it.title}, ${durationLabel(it)}`}
      style={{
        top: ((startMin - DAY_START) / 60) * HOUR_PX + 1,
        height: Math.max(20, (dur / 60) * HOUR_PX - 2),
        left: `calc(${(lane / lanes) * 100}% + 2px)`,
        width: `calc(${100 / lanes}% - 4px)`,
        ...reminderStyle(it),
      }}
      className={cn(
        'absolute z-10 flex flex-col overflow-hidden rounded-md px-1.5 py-1 text-left text-[11.5px] leading-tight shadow-card transition-[filter,opacity] hover:brightness-110',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-text',
        toneClass(it),
        doing && 'animate-doing-pulse',
        isDragging && 'opacity-30',
      )}
    >
      <span className="flex min-w-0 items-center gap-1 font-semibold">
        <ItemIcon it={it} />
        <span className="truncate">{it.title}</span>
        {it.high && it.tone !== 'done' && <span className="shrink-0 font-bold">!</span>}
      </span>
      {dur >= 40 && <span className="truncate text-[10.5px] tabular-nums opacity-85">{durationLabel(it)}</span>}
    </button>
  )
}
