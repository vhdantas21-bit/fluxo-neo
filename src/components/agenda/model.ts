import type { DateOnly, Reminder, Task } from '@/types'
import { addDays, fromDateOnly, startOfMonth, startOfWeek, toDateOnly, todayISO } from '@/lib/dates'

/**
 * Modelo da Agenda: transforma tarefas e lembretes em itens posicionados no tempo.
 * As tarefas são as mesmas do quadro (nenhuma entidade nova); lembretes são à parte.
 */
export type AgendaKind = 'due' | 'start' | 'doing' | 'reminder'

/** Tom visual de um item (cores da marca por estado). */
export type AgendaTone = 'doing' | 'todo' | 'backlog' | 'done' | 'late' | 'reminder'

export interface AgendaItem {
  key: string
  kind: AgendaKind
  date: DateOnly
  task?: Task
  reminder?: Reminder
  /** `HH:MM` quando o item tem horário. */
  time: string | null
  endTime: string | null
  title: string
  tone: AgendaTone
  high: boolean
}

export type AgendaView = 'week' | 'month' | 'quarter' | 'schedule'

export const VIEW_LABEL: Record<AgendaView, string> = { week: 'Semana', month: 'Mês', quarter: '3 Meses', schedule: 'Programação' }
export const VIEW_KEY: Record<AgendaView, string> = { week: 'W', month: 'M', quarter: 'Q', schedule: 'A' }

const pad = (n: number) => String(n).padStart(2, '0')

/** Data e hora locais de um lembrete. */
export function reminderParts(r: Reminder): { date: DateOnly; time: string } {
  const d = new Date(r.remindAt)
  return { date: toDateOnly(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
}

/** Monta o instante ISO a partir de dia e hora locais. */
export function localInstant(date: DateOnly, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = fromDateOnly(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
export function fromMinutes(n: number) {
  const c = Math.max(0, Math.min(23 * 60 + 59, Math.round(n)))
  return `${pad(Math.floor(c / 60))}:${pad(c % 60)}`
}

export function taskTone(t: Task, today = todayISO()): AgendaTone {
  if (t.status === 'done') return 'done'
  if (t.dueDate && t.dueDate < today) return 'late'
  if (t.status === 'doing') return 'doing'
  if (t.status === 'backlog') return 'backlog'
  return 'todo'
}

const TONE_ORDER: Record<AgendaTone, number> = { doing: 0, late: 1, todo: 2, backlog: 3, reminder: 4, done: 5 }

/** Ordem dentro de um dia: em andamento primeiro, depois atrasadas, horários e prioridade. */
export function sortItems(a: AgendaItem, b: AgendaItem) {
  const doingA = a.task?.status === 'doing' ? 0 : 1
  const doingB = b.task?.status === 'doing' ? 0 : 1
  if (doingA !== doingB) return doingA - doingB
  if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time)
  if (!!a.time !== !!b.time) return a.time ? 1 : -1
  if (TONE_ORDER[a.tone] !== TONE_ORDER[b.tone]) return TONE_ORDER[a.tone] - TONE_ORDER[b.tone]
  if (a.high !== b.high) return a.high ? -1 : 1
  return a.title.localeCompare(b.title)
}

export interface BuildOptions {
  showDone: boolean
}

/**
 * Itens por dia. Cada tarefa aparece na data limite (▶ principal) e, se tiver,
 * no início planejado (▷). Tarefas "Fazendo" sem data limite aparecem HOJE,
 * para a Agenda mostrar logo o que deveria estar em andamento.
 */
export function buildItems(tasks: Task[], reminders: Reminder[], opts: BuildOptions): Map<DateOnly, AgendaItem[]> {
  const today = todayISO()
  const map = new Map<DateOnly, AgendaItem[]>()
  const push = (it: AgendaItem) => {
    const list = map.get(it.date) ?? []
    list.push(it)
    map.set(it.date, list)
  }
  for (const t of tasks) {
    if (t.archivedAt) continue
    if (t.status === 'done' && !opts.showDone) continue
    const tone = taskTone(t, today)
    const base = { task: t, title: t.title, tone, high: t.priority === 'high' }
    if (t.dueDate) push({ ...base, key: `due:${t.id}`, kind: 'due', date: t.dueDate, time: t.startTime, endTime: t.endTime })
    if (t.startDate && t.startDate !== t.dueDate) push({ ...base, key: `start:${t.id}`, kind: 'start', date: t.startDate, time: null, endTime: null })
    if (t.status === 'doing' && !t.dueDate) push({ ...base, key: `doing:${t.id}`, kind: 'doing', date: today, time: null, endTime: null })
  }
  for (const r of reminders) {
    if (r.done && !opts.showDone) continue
    const { date, time } = reminderParts(r)
    push({ key: `rem:${r.id}`, kind: 'reminder', date, reminder: r, title: r.title, time, endTime: null, tone: r.done ? 'done' : 'reminder', high: false })
  }
  for (const list of map.values()) list.sort(sortItems)
  return map
}

/** Dias do grid mensal (semanas completas, segunda a domingo). */
export function monthDays(cursor: Date): Date[] {
  const first = startOfWeek(startOfMonth(cursor))
  const month = startOfMonth(cursor)
  const lead = Math.round((month.getTime() - first.getTime()) / 86_400_000)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i))
}

export const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']

const fmtMonthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const fmtMonthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const fmtDayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clean = (s: string) => s.replace('.', '')

/** Título do período: "Novembro de 2026", "23 – 29 nov. 2026", "Nov. 2026 – Jan. 2027". */
export function periodTitle(view: AgendaView, cursor: Date): string {
  if (view === 'month' || view === 'schedule') return cap(fmtMonthYear.format(cursor))
  if (view === 'week') {
    const a = startOfWeek(cursor)
    const b = addDays(a, 6)
    const sameMonth = a.getMonth() === b.getMonth()
    const left = sameMonth ? String(a.getDate()) : clean(fmtDayMonth.format(a))
    return `${left} – ${clean(fmtDayMonth.format(b))} ${b.getFullYear()}`
  }
  const a = startOfMonth(cursor)
  const c = new Date(a.getFullYear(), a.getMonth() + 2, 1)
  const ya = a.getFullYear()
  const yc = c.getFullYear()
  return ya === yc
    ? `${cap(clean(fmtMonthShort.format(a)))} – ${cap(clean(fmtMonthShort.format(c)))} ${yc}`
    : `${cap(clean(fmtMonthShort.format(a)))} ${ya} – ${cap(clean(fmtMonthShort.format(c)))} ${yc}`
}

/** "09:00 – 10:30", "09:00" ou "Dia inteiro". */
export function durationLabel(it: AgendaItem) {
  if (!it.time) return it.kind === 'start' ? 'Início planejado' : 'Dia inteiro'
  return it.endTime ? `${it.time} – ${it.endTime}` : it.time
}
