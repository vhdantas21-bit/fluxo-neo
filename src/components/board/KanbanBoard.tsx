import { useMemo, useRef, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CircleCheck, CircleDashed, Inbox, Plus, Timer } from 'lucide-react'
import { TaskCard } from '@/components/tasks/TaskCard'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { useData } from '@/store/DataProvider'
import { BOARD_STATUSES, STATUS_HINT, STATUS_LABEL, type BoardStatus, type Task } from '@/types'
import { cn } from '@/lib/utils'
import { STATUS_THEME } from '@/components/tasks/statusTheme'
import { makeAnnouncements, screenReaderInstructions, useBoardSensors } from './dnd'

type Columns = Record<BoardStatus, string[]>

const isColumn = (id: UniqueIdentifier): id is BoardStatus => (BOARD_STATUSES as string[]).includes(String(id))

const columnIcon = { todo: CircleDashed, doing: Timer, done: CircleCheck }

/** Moldura, faixa superior e destaques de cada coluna (Feito em tom branco). */
const columnStyle: Record<BoardStatus, { frame: string; head: string; title: string; count: string; add: string }> = {
  todo: {
    frame: 'border-primary/60 border-t-primary bg-sky-soft',
    head: 'bg-primary/15',
    title: 'text-sky-fg',
    count: 'bg-primary text-white',
    add: 'text-sky-fg',
  },
  doing: {
    frame: 'border-accent/60 border-t-accent bg-ember-soft',
    head: 'bg-accent/15',
    title: 'text-ember-fg',
    count: 'bg-accent text-white',
    add: 'text-ember-fg',
  },
  done: {
    frame: 'border-fg/35 border-t-fg bg-surface',
    head: 'bg-fg/[0.06]',
    title: 'text-fg',
    count: 'bg-fg text-bg',
    add: 'text-fg-muted',
  },
}

const emptyCopy: Record<BoardStatus, { title: string; text: string }> = {
  todo: { title: 'Nada por começar', text: 'Adicione aqui ideias e objetivos prontos para executar, ou traga-os do Backlog.' },
  doing: { title: 'Nenhuma tarefa em andamento', text: 'Arraste para cá a tarefa em que você vai trabalhar agora. Foque em poucas de cada vez.' },
  done: { title: 'Ainda sem tarefas concluídas', text: 'Quando terminar uma tarefa, arraste para cá para registrar a conclusão.' },
}

interface Props {
  /** Tarefas visíveis (já filtradas e sem arquivadas). */
  tasks: Task[]
  /** Na vista móvel, apenas esta coluna é apresentada. */
  mobileColumn: BoardStatus
  filtered: boolean
}

// Evita abrir a tarefa com o clique que termina um arrastar.
let lastDragEnd = 0

export function KanbanBoard({ tasks, mobileColumn, filtered }: Props) {
  const { data, moveTask } = useData()
  const { openTask } = useTaskModal()
  const sensors = useBoardSensors()

  const base = useMemo<Columns>(() => {
    const cols: Columns = { todo: [], doing: [], done: [] }
    for (const t of [...tasks].sort((a, b) => a.position - b.position)) {
      if (t.status in cols) cols[t.status as BoardStatus].push(t.id)
    }
    return cols
  }, [tasks])

  const [dragCols, setDragCols] = useState<Columns | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const dragColsRef = useRef<Columns | null>(null)
  const columns = dragCols ?? base
  const byId = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks])

  const setCols = (c: Columns | null) => {
    dragColsRef.current = c
    setDragCols(c)
  }

  const findColumn = (id: UniqueIdentifier, cols: Columns): BoardStatus | undefined =>
    isColumn(id) ? id : BOARD_STATUSES.find((s) => cols[s].includes(String(id)))

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id))
    setCols(base)
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const cols = dragColsRef.current
    if (!over || !cols) return
    const from = findColumn(active.id, cols)
    const to = findColumn(over.id, cols)
    if (!from || !to || from === to) return
    const fromItems = cols[from].filter((id) => id !== active.id)
    const toItems = [...cols[to]]
    const overIndex = isColumn(over.id) ? toItems.length : toItems.indexOf(String(over.id))
    const below =
      over.rect && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height / 2
    toItems.splice(overIndex < 0 ? toItems.length : overIndex + (below ? 1 : 0), 0, String(active.id))
    setCols({ ...cols, [from]: fromItems, [to]: toItems })
  }

  const finish = () => {
    setActiveId(null)
    setCols(null)
    lastDragEnd = Date.now()
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const cols = dragColsRef.current
    const id = String(active.id)
    if (!over || !cols) return finish()
    const to = findColumn(over.id, cols)
    if (!to) return finish()
    let visible = cols[to]
    if (!isColumn(over.id)) {
      const oldIndex = visible.indexOf(id)
      const newIndex = visible.indexOf(String(over.id))
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) visible = arrayMove(visible, oldIndex, newIndex)
    }
    const original = byId.get(id)
    const unchanged = original?.status === to && base[to].join() === visible.join()
    if (!unchanged) {
      // Insere a tarefa na ordem completa da coluna, preservando tarefas ocultas por filtros.
      const full = data.tasks
        .filter((t) => t.status === to && !t.archivedAt && t.id !== id)
        .sort((a, b) => a.position - b.position)
        .map((t) => t.id)
      const idx = visible.indexOf(id)
      const prev = visible[idx - 1]
      const next = visible[idx + 1]
      const at = prev ? full.indexOf(prev) + 1 : next ? Math.max(0, full.indexOf(next)) : 0
      full.splice(at, 0, id)
      moveTask(id, to, full)
    }
    finish()
  }

  const titleOf = (id: UniqueIdentifier) => byId.get(String(id))?.title ?? 'tarefa'
  const placeOf = (id: UniqueIdentifier | undefined) => {
    if (id === undefined) return 'nenhuma coluna'
    const cols = dragColsRef.current
    if (!cols) {
      const col = findColumn(id, base)
      return col ? `coluna ${STATUS_LABEL[col]}` : 'nenhuma coluna'
    }
    const col = findColumn(id, cols)
    if (!col) return 'nenhuma coluna'
    const pos = isColumn(id) ? cols[col].length : cols[col].indexOf(String(id)) + 1
    return `posição ${pos} de ${cols[col].length} na coluna ${STATUS_LABEL[col]}`
  }

  const active = activeId ? byId.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
      accessibility={{ screenReaderInstructions, announcements: makeAnnouncements(titleOf, placeOf) }}
    >
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-3">
        {BOARD_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            ids={columns[status]}
            byId={byId}
            hiddenOnMobile={status !== mobileColumn}
            filtered={filtered}
            wipLimit={status === 'doing' ? data.profile.wipLimit : null}
            onOpen={(id) => {
              if (Date.now() - lastDragEnd > 250) openTask(id)
            }}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {active ? <TaskCard task={active} overlay showStatusSelect={false} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

interface ColumnProps {
  status: BoardStatus
  ids: string[]
  byId: Map<string, Task>
  hiddenOnMobile: boolean
  filtered: boolean
  wipLimit: number | null
  onOpen: (id: string) => void
}

function Column({ status, ids, byId, hiddenOnMobile, filtered, wipLimit, onOpen }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const { openNewTask } = useTaskModal()
  const Icon = columnIcon[status]
  const overLimit = wipLimit !== null && ids.length > wipLimit
  const headingId = `col-${status}`
  const theme = STATUS_THEME[status]
  const style = columnStyle[status]

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex min-h-[50vh] flex-col overflow-hidden rounded-2xl border border-t-[5px] shadow-card transition-[box-shadow,filter] duration-150 md:min-h-0',
        style.frame,
        isOver && 'shadow-pop brightness-125',
        hiddenOnMobile && 'hidden md:flex',
      )}
    >
      <header className={cn('mb-3 flex items-center justify-between gap-2 px-4 pt-3.5 pb-3', style.head)}>
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
            <Icon size={19} strokeWidth={2.25} className={style.title} aria-hidden />
            <span className={style.title}>{STATUS_LABEL[status]}</span>
            <span
              className={cn(
                'rounded-full px-2 py-px text-xs font-semibold tabular-nums normal-case',
                overLimit ? 'bg-accent text-white ring-2 ring-accent-text/60' : style.count,
              )}
              title={wipLimit !== null ? `Limite recomendado: ${wipLimit}` : undefined}
            >
              {ids.length}
              {wipLimit !== null && <span className="opacity-75">/{wipLimit}</span>}
              <span className="sr-only"> tarefas</span>
            </span>
          </h2>
          <p className="mt-0.5 truncate text-xs text-fg-muted">
            {overLimit ? 'Acima do limite — termine uma antes de começar outra.' : STATUS_HINT[status]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewTask({ status })}
          className={cn('rounded-lg p-1.5 transition-colors hover:bg-fg/10', style.title)}
          aria-label={`Adicionar tarefa em ${STATUS_LABEL[status]}`}
          title="Adicionar tarefa"
        >
          <Plus size={18} />
        </button>
      </header>

      <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3">
          {ids.map((id) => {
            const t = byId.get(id)
            return t ? <SortableCard key={id} task={t} onOpen={() => onOpen(id)} /> : null
          })}
          {ids.length === 0 && (
            <div className={cn('flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center', theme.line)}>
              <Inbox size={18} className={theme.fg} aria-hidden />
              <p className="text-[13px] font-medium text-fg-muted">
                {filtered ? 'Nenhuma tarefa corresponde aos filtros' : emptyCopy[status].title}
              </p>
              {!filtered && <p className="max-w-60 text-xs leading-relaxed text-fg-subtle">{emptyCopy[status].text}</p>}
            </div>
          )}
          <QuickAdd status={status} className={style.add} />
        </div>
      </SortableContext>
    </section>
  )
}

function SortableCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      onOpen={onOpen}
      dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="tarefa arrastável"
      aria-label={`${task.title}`}
    />
  )
}

function QuickAdd({ status, className }: { status: BoardStatus; className?: string }) {
  const { createTask } = useData()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')

  const submit = () => {
    const t = title.trim()
    if (!t) return
    createTask({
      title: t.slice(0, 200),
      description: '',
      status,
      priority: 'medium',
      startDate: null,
      dueDate: null,
      projectId: null,
      categoryId: null,
      notes: '',
      subtasks: [],
    })
    setTitle('')
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('mt-auto flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-semibold transition-colors hover:bg-fg/10', className)}
      >
        <Plus size={16} strokeWidth={2.5} /> Adicionar tarefa
      </button>
    )

  return (
    <form
      className="mt-auto animate-fade-in"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label htmlFor={`quick-${status}`} className="sr-only">
        Título da nova tarefa em {STATUS_LABEL[status]}
      </label>
      <input
        id={`quick-${status}`}
        autoFocus
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title.trim() && setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setTitle('')
            setOpen(false)
          }
        }}
        placeholder="Título e Enter…"
        className="h-10 w-full rounded-lg border border-primary/60 bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle focus:ring-2 focus:ring-primary/40 focus:outline-none"
      />
      <div className="mt-2 flex gap-2">
        <button type="submit" className="h-8 rounded-lg bg-primary px-3 text-[13px] font-medium text-white hover:bg-primary-hover">
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => {
            setTitle('')
            setOpen(false)
          }}
          className="h-8 rounded-lg px-3 text-[13px] text-fg-muted hover:bg-surface-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
