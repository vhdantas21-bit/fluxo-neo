import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useDraggable } from '@dnd-kit/core'
import { Bell, CircleCheck, Clock, Columns3, Pencil, Play, RotateCcw, Trash, X } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/tasks/TaskBits'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { useTaskActions } from '@/components/tasks/useTaskActions'
import { useData } from '@/store/DataProvider'
import { formatLong, fromDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { durationLabel, type AgendaItem, type AgendaTone } from './model'

/** Cores por estado (paleta da marca): Fazendo laranja, A Fazer azul, Backlog cinza, atrasada com borda laranja-coral. */
const TONE: Record<AgendaTone, string> = {
  doing: 'bg-accent text-white',
  todo: 'bg-primary text-white',
  backlog: 'bg-graphite text-white',
  done: 'border border-line-strong bg-transparent text-fg-subtle line-through decoration-fg-subtle/70',
  late: 'border border-accent bg-accent/15 text-accent-text',
  reminder: 'border border-reminder-line bg-reminder-soft text-reminder-fg',
}

/** Início planejado (▷): mesma cor, em versão contornada, para não competir com a data limite. */
const START_TONE: Record<AgendaTone, string> = {
  doing: 'border border-accent/70 bg-accent/10 text-ember-fg',
  todo: 'border border-primary/70 bg-primary/10 text-sky-fg',
  backlog: 'border border-graphite bg-graphite/10 text-fg-muted',
  done: TONE.done,
  late: TONE.late,
  reminder: TONE.reminder,
}

export function toneClass(it: AgendaItem) {
  return it.kind === 'start' ? START_TONE[it.tone] : TONE[it.tone]
}

/** Cor própria de um lembrete (quando escolhida). */
export function reminderStyle(it: AgendaItem): CSSProperties | undefined {
  const c = it.reminder?.color
  if (!c || it.reminder?.done) return undefined
  return { borderColor: c, background: `color-mix(in srgb, ${c} 20%, transparent)`, color: 'var(--color-fg)' }
}

/** Ponto de cor do item (vista 3 Meses, Programação, listas). */
export const TONE_DOT: Record<AgendaTone, string> = {
  doing: 'bg-accent',
  todo: 'bg-primary',
  backlog: 'bg-graphite',
  done: 'bg-fg-subtle/60',
  late: 'bg-accent ring-2 ring-accent/30',
  reminder: 'bg-reminder',
}

export function ItemIcon({ it, size = 11 }: { it: AgendaItem; size?: number }) {
  if (it.kind === 'reminder') return <Bell size={size} className="shrink-0" aria-hidden />
  if (it.kind === 'start') return <Play size={size} className="shrink-0" aria-hidden />
  if (it.task?.status === 'doing') return <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current" aria-hidden />
  return null
}

const kindLabel = (it: AgendaItem) =>
  it.kind === 'reminder' ? 'Lembrete' : it.kind === 'start' ? 'Início planejado' : it.task?.status === 'doing' ? 'Em andamento' : 'Tarefa'

/** Etiqueta (pill) de um item no calendário. Clicar abre os detalhes; arrastar reagenda. */
export function AgendaChip({
  it,
  onOpen,
  showTime = true,
  draggable = true,
  className,
}: {
  it: AgendaItem
  onOpen: (it: AgendaItem, anchor: HTMLElement) => void
  showTime?: boolean
  draggable?: boolean
  className?: string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: it.key, data: it, disabled: !draggable })
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
      title={`${kindLabel(it)}: ${it.title}${it.time ? ` · ${durationLabel(it)}` : ''}`}
      aria-label={`${kindLabel(it)}: ${it.title}${it.time ? `, ${durationLabel(it)}` : ''}`}
      style={reminderStyle(it)}
      className={cn(
        'relative z-[1] flex w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-[3px] text-left text-[11.5px] leading-tight font-medium shadow-sm transition-[filter,opacity]',
        'hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-text',
        toneClass(it),
        it.task?.status === 'doing' && it.tone === 'doing' && 'animate-doing-pulse',
        isDragging && 'opacity-30',
        className,
      )}
    >
      <ItemIcon it={it} />
      {showTime && it.time && <span className="shrink-0 tabular-nums opacity-85">{it.time}</span>}
      <span className="min-w-0 flex-1 truncate">{it.title}</span>
      {it.high && it.tone !== 'done' && (
        <span className="shrink-0 rounded-sm bg-white/25 px-[3px] text-[10px] leading-none font-bold" aria-label="Prioridade alta">
          !
        </span>
      )}
    </button>
  )
}

/** Popover ancorado a um elemento (portal no body: nunca fica preso dentro do calendário). */
export function AnchoredPopover({
  anchor,
  onClose,
  children,
  label,
  width = 320,
}: {
  anchor: HTMLElement
  onClose: () => void
  children: ReactNode
  label: string
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' })

  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect()
    const el = ref.current
    const h = el?.offsetHeight ?? 240
    const w = Math.min(width, window.innerWidth - 16)
    let left = r.left + r.width / 2 - w / 2
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
    const below = window.innerHeight - r.bottom
    const top = below >= h + 12 || below > r.top ? Math.min(r.bottom + 6, window.innerHeight - h - 8) : Math.max(8, r.top - h - 6)
    setStyle({ position: 'fixed', left, top: Math.max(8, top), width: w })
  }, [anchor, width])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node) || anchor.contains(e.target as Node)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        anchor.focus()
      }
    }
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    ref.current?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      style={style}
      className="z-50 max-h-[min(70vh,480px)] animate-pop-in overflow-y-auto rounded-xl border border-glass-border bg-surface-2/95 p-4 text-fg shadow-pop backdrop-blur-xl focus:outline-none"
    >
      {children}
    </div>,
    document.body,
  )
}

/** Detalhes de um item com ações rápidas (editar, concluir, excluir, ver no quadro). */
export function ItemDetails({ it, onClose, onEditReminder }: { it: AgendaItem; onClose: () => void; onEditReminder: (id: string) => void }) {
  const { data, moveTask, updateReminder, deleteReminder } = useData()
  const { openTask } = useTaskModal()
  const { confirmDelete } = useTaskActions()

  if (it.kind === 'reminder' && it.reminder) {
    const r = data.reminders.find((x) => x.id === it.reminder!.id) ?? it.reminder
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-reminder-soft text-reminder-fg" style={r.color ? { color: r.color } : undefined}>
            <Bell size={14} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-semibold break-words', r.done && 'text-fg-subtle line-through')}>{r.title}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle first-letter:uppercase">
              <Clock size={12} aria-hidden /> {formatLong(fromDateOnly(it.date))} · {it.time}
            </p>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={r.done ? <RotateCcw size={14} /> : <CircleCheck size={14} />}
            onClick={() => {
              updateReminder(r.id, { done: !r.done })
              onClose()
            }}
          >
            {r.done ? 'Reabrir' : 'Concluir'}
          </ActionButton>
          <ActionButton icon={<Pencil size={14} />} onClick={() => onEditReminder(r.id)}>
            Editar
          </ActionButton>
          <ActionButton
            danger
            icon={<Trash size={14} />}
            onClick={() => {
              deleteReminder(r.id)
              onClose()
            }}
          >
            Excluir
          </ActionButton>
        </div>
      </div>
    )
  }

  const t = it.task && (data.tasks.find((x) => x.id === it.task!.id) ?? it.task)
  if (!t) return null
  const project = data.projects.find((p) => p.id === t.projectId)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold break-words', t.status === 'done' && 'text-fg-subtle line-through')}>{t.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={t.status} />
            <PriorityBadge priority={t.priority} />
            {it.tone === 'late' && <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-accent-text">Atrasada</span>}
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {t.dueDate && (
          <>
            <dt className="text-fg-subtle">Data limite</dt>
            <dd className="first-letter:uppercase">
              {formatLong(fromDateOnly(t.dueDate))}
              {t.startTime && ` · ${t.startTime}${t.endTime ? ` – ${t.endTime}` : ''}`}
            </dd>
          </>
        )}
        {t.startDate && (
          <>
            <dt className="text-fg-subtle">Início</dt>
            <dd className="first-letter:uppercase">{formatLong(fromDateOnly(t.startDate))}</dd>
          </>
        )}
        {project && (
          <>
            <dt className="text-fg-subtle">Projeto</dt>
            <dd className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: project.color }} aria-hidden />
              {project.name}
            </dd>
          </>
        )}
      </dl>
      {t.description && <p className="line-clamp-3 text-xs text-fg-muted">{t.description}</p>}
      <div className="flex flex-wrap gap-2">
        <ActionButton
          icon={<Pencil size={14} />}
          onClick={() => {
            onClose()
            openTask(t.id)
          }}
        >
          Editar
        </ActionButton>
        {t.status !== 'done' ? (
          <ActionButton
            icon={<CircleCheck size={14} />}
            onClick={() => {
              moveTask(t.id, 'done')
              onClose()
            }}
          >
            Concluir
          </ActionButton>
        ) : (
          <ActionButton
            icon={<RotateCcw size={14} />}
            onClick={() => {
              moveTask(t.id, 'todo')
              onClose()
            }}
          >
            Reabrir
          </ActionButton>
        )}
        <ActionButton
          danger
          icon={<Trash size={14} />}
          onClick={() => {
            onClose()
            void confirmDelete([t])
          }}
        >
          Excluir
        </ActionButton>
      </div>
      <Link to="/quadro" onClick={onClose} className="inline-flex items-center gap-1.5 text-xs text-primary-text hover:underline">
        <Columns3 size={13} aria-hidden /> Ver no quadro
      </Link>
    </div>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Fechar" className="-mt-1 -mr-1 rounded-md p-1 text-fg-subtle hover:bg-fg/5 hover:text-fg">
      <X size={16} />
    </button>
  )
}

function ActionButton({ icon, children, onClick, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
        danger ? 'border-accent/40 text-accent-text hover:bg-accent/10' : 'border-line-strong text-fg hover:bg-fg/5',
      )}
    >
      <span aria-hidden>{icon}</span>
      {children}
    </button>
  )
}

/** Lista simples de itens (painel do dia, popover "+N mais"). */
export function ItemList({ items, onOpen, empty }: { items: AgendaItem[]; onOpen: (it: AgendaItem, anchor: HTMLElement) => void; empty: string }) {
  if (!items.length) return <p className="text-[13px] text-fg-subtle">{empty}</p>
  return (
    <ul className="flex flex-col gap-1">
      {items.map((it) => (
        <li key={it.key}>
          <button
            type="button"
            onClick={(e) => onOpen(it, e.currentTarget)}
            className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-fg/5"
          >
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[it.tone])} style={it.reminder?.color && !it.reminder.done ? { background: it.reminder.color } : undefined} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[13px] leading-snug', it.tone === 'done' && 'text-fg-subtle line-through')}>{it.title}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-subtle">
                <ItemIcon it={it} size={10} />
                {kindLabel(it)} · {durationLabel(it)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
