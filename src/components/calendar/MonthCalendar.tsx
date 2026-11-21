import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, Flag, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { StatusBadge } from '@/components/tasks/TaskBits'
import { usePointerSensors } from '@/components/board/dnd'
import { useData } from '@/store/DataProvider'
import { activeTasks } from '@/store/selectors'
import {
  addDays,
  addMonths,
  formatLong,
  formatMonth,
  formatShort,
  fromDateOnly,
  isDueSoon,
  isOverdue,
  startOfMonth,
  startOfWeek,
  toDateOnly,
  todayISO,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { TouchHint, dismissHint } from '@/components/ui/TouchHint'
import type { Task } from '@/types'

interface Entry {
  key: string
  task: Task
  kind: 'due' | 'start'
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/**
 * Calendário mensal com prazos e inícios planejados. Arrastar uma tarefa
 * para outro dia muda a data; clicar num dia mostra as tarefas dele.
 */
export function MonthCalendar() {
  const { data, updateTask } = useData()
  const { openTask } = useTaskModal()
  const toast = useToast()
  const sensors = usePointerSensors()
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(todayISO())
  const [dragging, setDragging] = useState<Entry | null>(null)

  // Entradas por dia: data limite e data de início (execução planejada).
  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>()
    const push = (day: string, e: Entry) => map.set(day, [...(map.get(day) ?? []), e])
    for (const t of activeTasks(data.tasks)) {
      if (t.dueDate) push(t.dueDate, { key: `due:${t.id}`, task: t, kind: 'due' })
      if (t.startDate && t.startDate !== t.dueDate) push(t.startDate, { key: `start:${t.id}`, task: t, kind: 'start' })
    }
    for (const list of map.values())
      list.sort((a, b) => Number(a.task.status === 'done') - Number(b.task.status === 'done') || a.task.title.localeCompare(b.task.title))
    return map
  }, [data.tasks])

  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(cursor))
    // Só as semanas que o mês ocupa (4 a 6 linhas), para o calendário não crescer à toa.
    const month = startOfMonth(cursor)
    const lead = Math.round((month.getTime() - first.getTime()) / 86_400_000)
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const weeks = Math.ceil((lead + daysInMonth) / 7)
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i))
  }, [cursor])

  const move = (n: number) => setCursor((c) => addMonths(c, n))
  const title = formatMonth(cursor)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    if (!over) return
    dismissHint('calendar-drag')
    const entry = active.data.current as Entry
    const day = String(over.id).replace('day:', '')
    const t = data.tasks.find((x) => x.id === entry.task.id)
    if (!t) return
    if (entry.kind === 'due') {
      if (day === t.dueDate) return
      if (t.startDate && day < t.startDate) return toast.error('A data limite não pode ser anterior à data de início.')
      updateTask(t.id, { dueDate: day })
      toast.success(`Data limite alterada para ${formatShort(day)}.`)
    } else {
      if (day === t.startDate) return
      if (t.dueDate && day > t.dueDate) return toast.error('A data de início não pode ser posterior à data limite.')
      updateTask(t.id, { startDate: day })
      toast.success(`Início alterado para ${formatShort(day)}.`)
    }
  }

  const selectedEntries = byDay.get(selected) ?? []
  const monthKey = toDateOnly(cursor).slice(0, 7)
  const today = todayISO()

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={() => move(-1)} aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => move(1)} aria-label="Mês seguinte">
            <ChevronRight size={18} />
          </Button>
        </div>
        <h3 className="min-w-40 text-lg font-semibold first-letter:uppercase" aria-live="polite">
          {title}
        </h3>
        <Button
          size="sm"
          onClick={() => {
            setCursor(new Date())
            setSelected(today)
          }}
        >
          Hoje
        </Button>
      </div>

      {/* No celular o mês mostra só pontos (sem arrastar); a dica vale para tablets. */}
      <TouchHint id="calendar-drag" className="mb-3 hidden sm:flex">
        Toque e segure uma tarefa no calendário para arrastá-la para outro dia. A data muda sozinha.
      </TouchHint>

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Flag size={12} aria-hidden /> Data limite
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Play size={12} aria-hidden /> Início planejado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden /> Atrasada
        </span>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setDragging(active.data.current as Entry)}
        onDragCancel={() => setDragging(null)}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-hidden pt-[3px] rounded-2xl border border-graphite-line bg-graphite-soft [box-shadow:inset_0_3px_0_var(--color-brand-gray),var(--shadow-card)]">
            <div className="grid grid-cols-7 border-b border-graphite-line bg-brand-gray/25">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-[11px] font-medium tracking-wide text-graphite-fg uppercase">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const iso = toDateOnly(d)
                return (
                  <DayCell
                    key={iso}
                    iso={iso}
                    date={d}
                    entries={byDay.get(iso) ?? []}
                    outside={iso.slice(0, 7) !== monthKey}
                    isToday={iso === today}
                    selected={iso === selected}
                    onSelect={() => setSelected(iso)}
                    onOpen={openTask}
                  />
                )
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-graphite-line bg-graphite-soft [box-shadow:inset_0_3px_0_var(--color-brand-gray),var(--shadow-card)] p-4 pt-[19px]" aria-live="polite">
            <h3 className="text-sm font-semibold first-letter:uppercase">{formatLong(fromDateOnly(selected))}</h3>
            {selectedEntries.length === 0 ? (
              <p className="mt-3 text-[13px] text-fg-subtle">Sem tarefas neste dia. Arraste uma tarefa para cá ou defina a data ao editá-la.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1">
                {selectedEntries.map((e) => (
                  <li key={e.key}>
                    <button
                      type="button"
                      onClick={() => openTask(e.task.id)}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-fg/5"
                    >
                      {e.kind === 'due' ? <Flag size={14} className="mt-0.5 shrink-0 text-fg-subtle" aria-label="Data limite" /> : <Play size={14} className="mt-0.5 shrink-0 text-fg-subtle" aria-label="Início planejado" />}
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm', e.task.status === 'done' && 'text-fg-subtle line-through')}>{e.task.title}</span>
                        <span className="mt-1 flex items-center gap-2">
                          <StatusBadge status={e.task.status} />
                          {e.kind === 'due' && isOverdue(e.task.dueDate, e.task.status) && <span className="text-[11px] text-accent-text">Atrasada</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
        <DragOverlay dropAnimation={null}>{dragging ? <ChipView entry={dragging} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}

interface DayCellProps {
  iso: string
  date: Date
  entries: Entry[]
  outside: boolean
  isToday: boolean
  selected: boolean
  onSelect: () => void
  onOpen: (id: string) => void
}

function DayCell({ iso, date, entries, outside, isToday, selected, onSelect, onOpen }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}` })
  const limit = 3
  const hasOverdue = entries.some((e) => e.kind === 'due' && isOverdue(e.task.dueDate, e.task.status))
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex flex-col border-graphite-line transition-colors',
        'min-h-14 border-r border-b p-1 sm:min-h-24 sm:p-1.5 [&:nth-child(7n)]:border-r-0',
        outside && 'bg-bg/35',
        selected && 'bg-deep/30',
        isOver && 'bg-deep/50 ring-1 ring-primary ring-inset',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${formatLong(date)}: ${entries.length} tarefa(s)`}
        aria-pressed={selected}
        className="absolute inset-0 z-0"
      />
      <span className="relative z-[1] pointer-events-none mb-1 flex items-center gap-1.5">
        <span
          className={cn(
            'flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums',
            isToday ? 'bg-primary font-semibold text-white' : outside ? 'text-fg-subtle/60' : 'text-fg-muted',
          )}
        >
          {date.getDate()}
        </span>
        {hasOverdue && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
      </span>
      {/* No celular, a vista mensal mostra apenas pontos; o detalhe fica no painel do dia. */}
      {entries.length > 0 && (
        <span className="pointer-events-none relative z-[1] flex flex-wrap gap-0.5 px-1 sm:hidden" aria-hidden>
          {entries.slice(0, 4).map((e) => (
            <span key={e.key} className={cn('h-1.5 w-1.5 rounded-full', e.task.status === 'done' ? 'bg-fg-subtle' : 'bg-primary-text')} />
          ))}
        </span>
      )}
      <div className="relative z-[1] flex flex-col gap-1 max-sm:hidden">
        {entries.slice(0, limit).map((e) => (
          <DraggableChip key={e.key} entry={e} onOpen={() => onOpen(e.task.id)} />
        ))}
        {entries.length > limit && (
          <button type="button" onClick={onSelect} className="px-1.5 text-left text-[11px] text-fg-subtle hover:text-fg">
            +{entries.length - limit} mais
          </button>
        )}
      </div>
    </div>
  )
}

function DraggableChip({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: entry.key, data: entry })
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      {...listeners}
      {...attributes}
      aria-roledescription="tarefa arrastável"
      // Nome completo ao passar o mouse, já que o chip corta títulos longos.
      title={`${entry.task.title} · ${entry.kind === 'due' ? 'Prazo' : 'Início planejado'}`}
      className={cn('block w-full text-left', isDragging && 'opacity-40')}
    >
      <ChipView entry={entry} />
    </button>
  )
}

function ChipView({ entry, overlay }: { entry: Entry; overlay?: boolean }) {
  const { task, kind } = entry
  const overdue = kind === 'due' && isOverdue(task.dueDate, task.status)
  const soon = kind === 'due' && isDueSoon(task.dueDate, task.status)
  const Icon = kind === 'due' ? Flag : Play
  return (
    <span
      className={cn(
        'flex items-center gap-1 truncate rounded-md border-l-2 px-1.5 py-1 text-[11px] leading-tight',
        task.status === 'done' ? 'border-fg-subtle bg-surface-2 text-fg-subtle line-through' : 'bg-surface-3 text-fg',
        task.status !== 'done' && (overdue ? 'border-accent' : soon ? 'border-primary-text' : 'border-primary'),
        overlay && 'w-40 cursor-grabbing shadow-pop',
      )}
    >
      <Icon size={10} className="shrink-0 opacity-70" aria-label={kind === 'due' ? 'Prazo' : 'Início'} />
      <span className="truncate">{task.title}</span>
    </span>
  )
}
