import { useMemo, useState } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, Flag, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/misc'
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
import type { Task } from '@/types'

type View = 'month' | 'week'
interface Entry {
  key: string
  task: Task
  kind: 'due' | 'start'
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function AgendaPage() {
  const { data, updateTask } = useData()
  const { openTask } = useTaskModal()
  const toast = useToast()
  const sensors = usePointerSensors()
  const [view, setView] = useState<View>(() => (window.innerWidth < 640 ? 'week' : 'month'))
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
    const first = view === 'month' ? startOfWeek(startOfMonth(cursor)) : startOfWeek(cursor)
    return Array.from({ length: view === 'month' ? 42 : 7 }, (_, i) => addDays(first, i))
  }, [cursor, view])

  const move = (n: number) => setCursor((c) => (view === 'month' ? addMonths(c, n) : addDays(c, 7 * n)))
  const title =
    view === 'month' ? formatMonth(cursor) : `${formatShort(toDateOnly(days[0]))} – ${formatShort(toDateOnly(days[6]))}`

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    if (!over) return
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
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Agenda"
        description="Prazos e datas de execução planejadas. Arraste uma tarefa para outro dia para mudar a data."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={() => move(-1)} aria-label={view === 'month' ? 'Mês anterior' : 'Semana anterior'}>
            <ChevronLeft size={18} />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => move(1)} aria-label={view === 'month' ? 'Mês seguinte' : 'Semana seguinte'}>
            <ChevronRight size={18} />
          </Button>
        </div>
        <h2 className="min-w-40 text-lg font-semibold first-letter:uppercase" aria-live="polite">
          {title}
        </h2>
        <Button
          size="sm"
          onClick={() => {
            setCursor(new Date())
            setSelected(today)
          }}
        >
          Hoje
        </Button>
        <div role="tablist" aria-label="Visualização" className="ml-auto flex rounded-lg border border-line bg-surface p-0.5">
          {(['month', 'week'] as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn('h-8 rounded-md px-3 text-[13px] font-medium', view === v ? 'bg-deep text-fg' : 'text-fg-subtle hover:text-fg')}
            >
              {v === 'month' ? 'Mês' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className={cn('grid grid-cols-7 border-b border-line', view === 'week' && 'max-sm:hidden')}>
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-[11px] font-medium tracking-wide text-fg-subtle uppercase">
                  {d}
                </div>
              ))}
            </div>
            <div className={cn('grid', view === 'month' ? 'grid-cols-7' : 'grid-cols-1 sm:grid-cols-7')}>
              {days.map((d) => {
                const iso = toDateOnly(d)
                return (
                  <DayCell
                    key={iso}
                    iso={iso}
                    date={d}
                    view={view}
                    entries={byDay.get(iso) ?? []}
                    outside={view === 'month' && iso.slice(0, 7) !== monthKey}
                    isToday={iso === today}
                    selected={iso === selected}
                    onSelect={() => setSelected(iso)}
                    onOpen={openTask}
                  />
                )
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-line bg-surface p-4" aria-live="polite">
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
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
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
  view: View
  entries: Entry[]
  outside: boolean
  isToday: boolean
  selected: boolean
  onSelect: () => void
  onOpen: (id: string) => void
}

function DayCell({ iso, date, view, entries, outside, isToday, selected, onSelect, onOpen }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}` })
  const limit = view === 'month' ? 3 : 50
  const hasOverdue = entries.some((e) => e.kind === 'due' && isOverdue(e.task.dueDate, e.task.status))
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex flex-col border-line transition-colors',
        view === 'month' ? 'min-h-16 border-r border-b p-1 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0' : 'min-h-24 border-b p-2 sm:min-h-[60vh] sm:border-r sm:border-b-0 sm:last:border-r-0',
        outside && 'bg-bg/40',
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
        {view === 'week' && <span className="text-[11px] text-fg-subtle uppercase sm:hidden">{WEEKDAYS[(date.getDay() + 6) % 7]}</span>}
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
      {view === 'month' && entries.length > 0 && (
        <span className="pointer-events-none relative z-[1] flex flex-wrap gap-0.5 px-1 sm:hidden" aria-hidden>
          {entries.slice(0, 4).map((e) => (
            <span key={e.key} className={cn('h-1.5 w-1.5 rounded-full', e.task.status === 'done' ? 'bg-fg-subtle' : 'bg-primary-text')} />
          ))}
        </span>
      )}
      <div className={cn('relative z-[1] flex flex-col gap-1', view === 'month' && 'max-sm:hidden')}>
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
