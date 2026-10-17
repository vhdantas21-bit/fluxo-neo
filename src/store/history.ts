import type { Task } from '@/types'
import { addDays, addMonths, formatShort, startOfMonth, startOfWeek, toDateOnly } from '@/lib/dates'
import { completedOn } from './selectors'

const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const monthLongFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

/** Tarefas concluídas por semana (segunda a domingo), últimas `weeks` semanas. */
export function completedPerWeek(tasks: Task[], weeks = 8) {
  const thisWeek = startOfWeek(new Date())
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, -7 * (weeks - 1 - i))
    const from = toDateOnly(start)
    const to = toDateOnly(addDays(start, 6))
    const value = tasks.filter((t) => {
      const d = completedOn(t)
      return d && d >= from && d <= to
    }).length
    return {
      label: i === weeks - 1 ? 'Esta' : formatShort(from),
      fullLabel: `semana de ${formatShort(from)} a ${formatShort(to)}`,
      value,
    }
  })
}

/** Tarefas concluídas por mês, últimos `months` meses. */
export function completedPerMonth(tasks: Task[], months = 6) {
  const cur = startOfMonth(new Date())
  return Array.from({ length: months }, (_, i) => {
    const m = addMonths(cur, -(months - 1 - i))
    const key = toDateOnly(m).slice(0, 7)
    return {
      label: monthFmt.format(m).replace('.', ''),
      fullLabel: monthLongFmt.format(m),
      value: tasks.filter((t) => completedOn(t)?.startsWith(key)).length,
      created: tasks.filter((t) => t.createdAt.slice(0, 7) === key).length,
    }
  })
}

/** Conclusões por dia da semana atual (seg–dom). */
export function completedThisWeekByDay(tasks: Task[]) {
  const start = startOfWeek(new Date())
  const names = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  return names.map((label, i) => {
    const day = toDateOnly(addDays(start, i))
    return { label, fullLabel: formatShort(day), value: tasks.filter((t) => completedOn(t) === day).length }
  })
}
