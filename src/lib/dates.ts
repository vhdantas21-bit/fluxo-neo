import type { DateOnly } from '@/types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Converte um Date para `YYYY-MM-DD` no fuso local. */
export function toDateOnly(d: Date): DateOnly {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Converte `YYYY-MM-DD` num Date à meia-noite local. */
export function fromDateOnly(s: DateOnly): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toDateOnly(new Date())

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/** Semana começa à segunda-feira. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = (r.getDay() + 6) % 7
  r.setDate(r.getDate() - day)
  return r
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function diffDays(a: DateOnly, b: DateOnly): number {
  return Math.round((fromDateOnly(a).getTime() - fromDateOnly(b).getTime()) / 86_400_000)
}

export function isOverdue(due: DateOnly | null, status: string): boolean {
  return !!due && status !== 'done' && due < todayISO()
}

/** Prazo nos próximos `days` dias (inclui hoje). */
export function isDueSoon(due: DateOnly | null, status: string, days = 2): boolean {
  if (!due || status === 'done') return false
  const d = diffDays(due, todayISO())
  return d >= 0 && d <= days
}

const fmtDay = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' })
const fmtMonthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
/** "17 out" (o pt-BR por omissão daria "17/10"). */
const shortDate = (d: Date) => `${fmtDay.format(d)} ${fmtMonthShort.format(d).replace('.', '')}`
const fmtLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const fmtWeekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

export const formatLong = (d: Date) => fmtLong.format(d)
export const formatMonth = (d: Date) => fmtMonth.format(d)
export const formatWeekday = (d: Date) => fmtWeekday.format(d).replace('.', '')

/** "Hoje", "Amanhã", "Ontem" ou "12 out". */
export function formatRelative(s: DateOnly): string {
  const d = diffDays(s, todayISO())
  if (d === 0) return 'Hoje'
  if (d === 1) return 'Amanhã'
  if (d === -1) return 'Ontem'
  return shortDate(fromDateOnly(s))
}

export function formatShort(s: DateOnly): string {
  return shortDate(fromDateOnly(s))
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 19) return 'Boa tarde'
  return 'Boa noite'
}
