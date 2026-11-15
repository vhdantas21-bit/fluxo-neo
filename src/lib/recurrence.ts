import type { DateOnly, Recurrence, RecurrenceFreq, Subtask, Task } from '@/types'
import { fromDateOnly, toDateOnly, todayISO } from './dates'
import { uid } from './utils'

export const RECURRENCE_LABEL: Record<RecurrenceFreq, string> = {
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  monthly: 'Mensalmente',
  yearly: 'Anualmente',
}

const UNIT: Record<RecurrenceFreq, [string, string]> = {
  daily: ['dia', 'dias'],
  weekly: ['semana', 'semanas'],
  monthly: ['mês', 'meses'],
  yearly: ['ano', 'anos'],
}

/** "Semanalmente" ou "A cada 2 semanas". */
export function describeRecurrence(rule: Recurrence): string {
  if (rule.interval <= 1) return RECURRENCE_LABEL[rule.freq]
  return `A cada ${rule.interval} ${UNIT[rule.freq][1]}`
}

/** Soma meses mantendo o dia (31 jan + 1 mês = 28/29 fev, não 3 mar). */
function addMonthsKeepDay(d: Date, n: number): Date {
  const day = d.getDate()
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()
  r.setDate(Math.min(day, last))
  return r
}

/** Avança `times` ocorrências a partir de `from` (sempre da data original, para o dia 31 não derivar). */
export function advanceDate(from: DateOnly, rule: Recurrence, times = 1): DateOnly {
  const d = fromDateOnly(from)
  const n = Math.max(1, rule.interval) * Math.max(1, times)
  switch (rule.freq) {
    case 'daily':
      d.setDate(d.getDate() + n)
      return toDateOnly(d)
    case 'weekly':
      d.setDate(d.getDate() + 7 * n)
      return toDateOnly(d)
    case 'monthly':
      return toDateOnly(addMonthsKeepDay(d, n))
    case 'yearly':
      return toDateOnly(addMonthsKeepDay(d, 12 * n))
  }
}

/**
 * Próxima ocorrência de uma tarefa recorrente que acabou de ser concluída.
 * As datas avançam a partir da data limite (ou do dia da conclusão, se não
 * houver), sempre para o futuro; as subtarefas voltam a "não feitas".
 */
export function nextOccurrence(task: Task, rule: Recurrence, now: string, position: number): Task {
  const today = todayISO()
  const base = task.dueDate ?? today
  // Se a tarefa estava atrasada, salta as ocorrências já passadas (até 1000).
  let due = advanceDate(base, rule)
  for (let k = 2; due <= today && k <= 1000; k++) due = advanceDate(base, rule, k)
  let start: DateOnly | null = null
  if (task.startDate && task.dueDate) {
    const gap = Math.round((fromDateOnly(task.dueDate).getTime() - fromDateOnly(task.startDate).getTime()) / 86_400_000)
    const s = fromDateOnly(due)
    s.setDate(s.getDate() - Math.max(0, gap))
    start = toDateOnly(s)
  } else if (task.startDate) {
    start = advanceDate(task.startDate, rule)
  }
  const subtasks: Subtask[] = task.subtasks.map((s) => ({ ...s, id: uid(), done: false }))
  return {
    ...task,
    id: uid(),
    status: 'todo',
    startDate: start,
    dueDate: task.dueDate ? due : null,
    position,
    completedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    subtasks,
    recurrence: rule,
  }
}
