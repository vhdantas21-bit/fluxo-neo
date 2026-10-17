import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import { Archive, ArrowRight, Copy, ListChecks, Ellipsis, Pencil, StickyNote, Trash } from 'lucide-react'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { useData } from '@/store/DataProvider'
import { ALL_STATUSES, STATUS_LABEL, type Task, type TaskStatus } from '@/types'
import { isOverdue } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ColorDot, DueChip, PriorityBadge, StatusBadge } from './TaskBits'
import { useTaskActions } from './useTaskActions'

interface TaskCardProps extends HTMLAttributes<HTMLDivElement> {
  task: Task
  onOpen?: () => void
  /** Mostra o seletor de estado (alternativa ao arrastar no celular). */
  showStatusSelect?: 'mobile' | 'always' | false
  showStatus?: boolean
  /** Oculta o projeto (ex.: na página do próprio projeto). */
  hideProject?: boolean
  dragging?: boolean
  overlay?: boolean
  style?: CSSProperties
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard(
  { task, onOpen, showStatusSelect = 'mobile', showStatus, hideProject, dragging, overlay, className, style, onKeyDown, ...rest },
  ref,
) {
  const { data, moveTask, duplicateTask, archiveTasks } = useData()
  const { confirmDelete } = useTaskActions()
  const project = task.projectId && !hideProject ? data.projects.find((p) => p.id === task.projectId) : undefined
  const category = task.categoryId ? data.categories.find((c) => c.id === task.categoryId) : undefined
  const subsDone = task.subtasks.filter((s) => s.done).length
  const overdue = isOverdue(task.dueDate, task.status)

  const moveItems: MenuItem[] = ALL_STATUSES.filter((s) => s !== task.status).map((s) => ({
    label: `Mover para ${STATUS_LABEL[s]}`,
    icon: <ArrowRight />,
    onSelect: () => moveTask(task.id, s),
  }))

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        'group relative rounded-xl border bg-surface-2 p-3.5 text-left shadow-card transition-[border-color,box-shadow,opacity] duration-150',
        'cursor-pointer hover:border-line-strong focus-visible:outline-2 focus-visible:outline-primary-text',
        overdue ? 'border-accent/40' : 'border-line',
        task.status === 'done' && 'bg-surface',
        dragging && 'opacity-40',
        overlay && 'rotate-[1.5deg] cursor-grabbing border-primary/60 shadow-pop',
        className,
      )}
      onClick={onOpen}
      {...rest}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen?.()
        else onKeyDown?.(e)
      }}
    >
      {!overlay && (
        <div data-no-dnd className="absolute top-2 right-2">
          <Menu
            label={`Ações para ${task.title}`}
            triggerClassName="rounded-md p-1 text-fg-subtle transition-opacity hover:bg-surface-3 hover:text-fg focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 aria-expanded:opacity-100"
            trigger={<Ellipsis size={16} />}
            items={[
              { label: 'Editar', icon: <Pencil />, onSelect: () => onOpen?.() },
              { label: 'Duplicar', icon: <Copy />, onSelect: () => duplicateTask(task.id) },
              'separator',
              ...moveItems,
              'separator',
              { label: 'Arquivar', icon: <Archive />, onSelect: () => archiveTasks([task.id]) },
              { label: 'Excluir', icon: <Trash />, danger: true, onSelect: () => confirmDelete([task]) },
            ]}
          />
        </div>
      )}
      {(project || category || showStatus) && (
        <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 pr-6 text-[11px] text-fg-subtle">
          {project && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <ColorDot color={project.color} />
              <span className="truncate">{project.name}</span>
            </span>
          )}
          {category && (
            <span className="inline-flex items-center gap-1.5 rounded bg-surface-3 px-1.5 py-px text-fg-muted">{category.name}</span>
          )}
          {showStatus && <StatusBadge status={task.status} />}
        </div>
      )}

      <p
        className={cn(
          'line-clamp-3 pr-6 text-sm leading-snug font-medium text-fg',
          task.status === 'done' && 'text-fg-muted',
        )}
      >
        {task.title}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <PriorityBadge priority={task.priority} />
        <DueChip task={task} />
        {task.subtasks.length > 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-medium',
              subsDone === task.subtasks.length ? 'text-primary-text' : 'text-fg-subtle',
            )}
            title="Subtarefas concluídas"
          >
            <ListChecks size={12} aria-hidden />
            <span className="sr-only">Subtarefas: </span>
            {subsDone}/{task.subtasks.length}
          </span>
        )}
        {task.notes && (
          <span className="inline-flex items-center text-fg-subtle" title="Tem notas">
            <StickyNote size={12} aria-hidden />
            <span className="sr-only">Tem notas</span>
          </span>
        )}
      </div>

      {showStatusSelect && !overlay && (
        <div data-no-dnd className={cn('mt-3', showStatusSelect === 'mobile' && 'md:hidden')} onClick={(e) => e.stopPropagation()}>
          <label className="sr-only" htmlFor={`status-${task.id}`}>
            Estado de {task.title}
          </label>
          <select
            id={`status-${task.id}`}
            value={task.status}
            onChange={(e) => moveTask(task.id, e.target.value as TaskStatus)}
            className="h-9 w-full rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-fg-muted focus:border-primary focus:outline-none"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === task.status ? `Estado: ${STATUS_LABEL[s]}` : `Mover para ${STATUS_LABEL[s]}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
})
