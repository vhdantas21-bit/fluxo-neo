import { CalendarClock } from 'lucide-react'
import type { Priority, Task, TaskStatus } from '@/types'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/types'
import { formatRelative, isDueSoon, isOverdue } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { STATUS_THEME } from './statusTheme'

/** Etiquetas preenchidas: laranja (alta), azul (média), cinza (baixa). */
const priorityStyle: Record<Priority, string> = {
  high: 'bg-accent text-white',
  medium: 'bg-primary text-white',
  low: 'bg-line-strong text-fg',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        priorityStyle[priority],
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          priority === 'low' ? 'bg-fg-muted' : 'bg-white/85',
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
