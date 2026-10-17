import type { Priority, Task, TaskStatus } from '@/types'
import { PRIORITY_WEIGHT } from '@/types'
import { addDays, diffDays, isOverdue, toDateOnly, todayISO } from '@/lib/dates'

export type DueFilter = '' | 'today' | 'week' | 'has' | 'none'
export type SortKey = 'position' | 'due' | 'priority' | 'created'

export interface TaskFilters {
  query: string
  statuses: TaskStatus[]
  priorities: Priority[]
  /** '' = todos, 'none' = sem projeto */
  projectId: string
  /** '' = todas, 'none' = sem categoria */
  categoryId: string
  due: DueFilter
  overdueOnly: boolean
  sort: SortKey
}

export const emptyFilters: TaskFilters = {
  query: '',
  statuses: [],
  priorities: [],
  projectId: '',
  categoryId: '',
  due: '',
  overdueOnly: false,
  sort: 'position',
}

export function countActiveFilters(f: TaskFilters): number {
  return (
    (f.statuses.length ? 1 : 0) +
    (f.priorities.length ? 1 : 0) +
    (f.projectId ? 1 : 0) +
    (f.categoryId ? 1 : 0) +
    (f.due ? 1 : 0) +
    (f.overdueOnly ? 1 : 0)
  )
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const activeTasks = (tasks: Task[]) => tasks.filter((t) => !t.archivedAt)

export function filterTasks(tasks: Task[], f: TaskFilters): Task[] {
  const q = normalize(f.query.trim())
  const today = todayISO()
  const weekEnd = toDateOnly(addDays(new Date(), 7))
  return tasks.filter((t) => {
    if (q && !normalize(`${t.title} ${t.description}`).includes(q)) return false
    if (f.statuses.length && !f.statuses.includes(t.status)) return false
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false
    if (f.projectId && (f.projectId === 'none' ? t.projectId : t.projectId !== f.projectId)) return false
    if (f.categoryId && (f.categoryId === 'none' ? t.categoryId : t.categoryId !== f.categoryId)) return false
    if (f.overdueOnly && !isOverdue(t.dueDate, t.status)) return false
    switch (f.due) {
      case 'today':
        return t.dueDate === today
      case 'week':
        return !!t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd
      case 'has':
        return !!t.dueDate
      case 'none':
        return !t.dueDate
      default:
        return true
    }
  })
}

export function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const list = [...tasks]
  switch (key) {
    case 'due':
      return list.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.position - b.position)
    case 'priority':
      return list.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.position - b.position)
    case 'created':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    default:
      return list.sort((a, b) => a.position - b.position)
  }
}

// ---- Indicadores ------------------------------------------------------------

export function countByStatus(tasks: Task[]): Record<TaskStatus, number> {
  const out: Record<TaskStatus, number> = { backlog: 0, todo: 0, doing: 0, done: 0 }
  for (const t of tasks) out[t.status]++
  return out
}

/** Tarefas previstas para hoje: com início ou prazo hoje (ou concluídas hoje). */
export function todayProgress(tasks: Task[]) {
  const today = todayISO()
  const planned = tasks.filter(
    (t) =>
      t.status !== 'backlog' &&
      (t.dueDate === today || t.startDate === today || (t.completedAt && toDateOnly(new Date(t.completedAt)) === today)),
  )
  const done = planned.filter((t) => t.status === 'done').length
  return { total: planned.length, done, pct: planned.length ? Math.round((done / planned.length) * 100) : 0 }
}

export function upcomingDeadlines(tasks: Task[], days = 7): Task[] {
  const today = todayISO()
  return tasks
    .filter((t) => t.status !== 'done' && t.dueDate && diffDays(t.dueDate, today) <= days)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
}

export function priorityTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.priority === 'high' && (t.status === 'todo' || t.status === 'doing'))
    .sort((a, b) => (a.status === 'doing' ? -1 : 0) - (b.status === 'doing' ? -1 : 0) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
}

export const completedOn = (t: Task) => (t.completedAt ? toDateOnly(new Date(t.completedAt)) : null)

export function projectProgress(tasks: Task[], projectId: string) {
  const list = tasks.filter((t) => t.projectId === projectId)
  const done = list.filter((t) => t.status === 'done').length
  return { total: list.length, done, pct: list.length ? Math.round((done / list.length) * 100) : 0, byStatus: countByStatus(list) }
}
