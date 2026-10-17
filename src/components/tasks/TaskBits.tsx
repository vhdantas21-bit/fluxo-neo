import { CalendarClock } from 'lucide-react'
import type { Priority, Task, TaskStatus } from '@/types'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/types'
import { formatRelative, isDueSoon, isOverdue } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { STATUS_THEME } from './statusTheme'

const priorityStyle: Record<Priority, string> = {
  high: 'bg-accent/15 text-accent-text ring-accent/30',
  medium: 'bg-primary/20 text-primary-text ring-primary/40',
  low: 'bg-surface-3 text-fg-muted ring-line-strong',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        priorityStyle[priority],
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          priority === 'high' ? 'bg-accent' : priority === 'medium' ? 'bg-primary-text' : 'bg-fg-subtle',
        )}
        aria-hidden
      />
      <span className="sr-only">Prioridade </span>
      {PRIORITY_LABEL[priority]}
    </span>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const theme = STATUS_THEME[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium', theme.chip)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ background: color }} aria-hidden />
}

export function DueChip({ task, showIcon = true }: { task: Pick<Task, 'dueDate' | 'status'>; showIcon?: boolean }) {
  if (!task.dueDate) return null
  const overdue = isOverdue(task.dueDate, task.status)
  const soon = !overdue && isDueSoon(task.dueDate, task.status)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-[11px] font-medium whitespace-nowrap',
        overdue ? 'text-accent-text' : soon ? 'text-fg' : 'text-fg-subtle',
      )}
      title={overdue ? 'Prazo vencido' : 'Data limite'}
    >
      {showIcon && <CalendarClock size={12} aria-hidden />}
      {overdue && <span className="sr-only">Atrasada: </span>}
      {formatRelative(task.dueDate)}
    </span>
  )
}
