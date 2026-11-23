import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck2, TriangleAlert, Zap } from 'lucide-react'
import { StatusBadge } from '@/components/tasks/TaskBits'
import { fromDateOnly, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateOnly, Task } from '@/types'
import { ItemIcon, TONE_DOT } from './AgendaItems'
import { durationLabel, taskTone, type AgendaItem } from './model'

const BATCH = 30
const fmtMonthDay = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const fmtWeekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

/**
 * Vista Programação: lista cronológica a partir do dia escolhido, só com os dias
 * que têm itens. No topo, o que está em andamento e o que já passou do prazo.
 */
export function ScheduleView({
  from,
  byDay,
  tasks,
  showDone,
  onOpen,
}: {
  from: DateOnly
  byDay: Map<DateOnly, AgendaItem[]>
  tasks: Task[]
  showDone: boolean
  onOpen: (it: AgendaItem, anchor: HTMLElement) => void
}) {
  const today = todayISO()
  const [limit, setLimit] = useState(BATCH)
  const sentinel = useRef<HTMLDivElement>(null)

  const days = useMemo(
    () => [...byDay.keys()].filter((d) => d >= from && (byDay.get(d) ?? []).some((it) => it.kind !== 'doing' && !(it.task?.status === 'doing' && it.kind === 'due'))).sort(),
    [byDay, from],
  )
  // Em andamento: todas as tarefas "Fazendo", primeiro. Atrasadas: prazo vencido e não concluídas.
  const doing = useMemo<AgendaItem[]>(
    () =>
      tasks
        .filter((t) => !t.archivedAt && t.status === 'doing')
        .map((t) => ({ key: `doing-top:${t.id}`, kind: 'doing', date: t.dueDate ?? today, task: t, title: t.title, time: t.startTime, endTime: t.endTime, tone: taskTone(t, today), high: t.priority === 'high' })),
    [tasks, today],
  )
  const late = useMemo<AgendaItem[]>(
    () =>
      from === today
        ? tasks
            .filter((t) => !t.archivedAt && t.status !== 'done' && t.status !== 'doing' && t.dueDate && t.dueDate < today)
            .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
            .map((t) => ({ key: `late:${t.id}`, kind: 'due', date: t.dueDate!, task: t, title: t.title, time: t.startTime, endTime: t.endTime, tone: 'late', high: t.priority === 'high' }))
        : [],
    [tasks, today, from],
  )

  useEffect(() => setLimit(BATCH), [from])
  // "Rolagem infinita": mais dias quando o fim da lista aparece.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setLimit((l) => l + BATCH)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [days.length])

  const shown = days.slice(0, limit)
  const nothing = !shown.length && !doing.length && !late.length

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-graphite-line bg-graphite-soft [box-shadow:inset_0_3px_0_var(--color-brand-blue),var(--shadow-card)]">
      <div className="h-[3px]" />
      {doing.length > 0 && (
        <Group icon={<Zap size={14} />} title="Em andamento" tone="text-ember-fg" className="bg-accent/[0.07]">
          {doing.map((it) => (
            <Row
              key={it.key}
              it={it}
              onOpen={onOpen}
              showDate={!!it.task?.dueDate && it.task.dueDate !== today}
              badge={<span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">Em andamento</span>}
            />
          ))}
        </Group>
      )}
      {late.length > 0 && (
        <Group icon={<TriangleAlert size={14} />} title="Atrasadas" tone="text-accent-text">
          {late.map((it) => (
            <Row key={it.key} it={it} onOpen={onOpen} showDate />
          ))}
        </Group>
      )}
      {shown.map((d) => {
        const date = fromDateOnly(d)
        // Tarefas em andamento já aparecem no topo (com a data): não se repetem nos dias.
        const items = (byDay.get(d) ?? []).filter((it) => it.kind !== 'doing' && !(it.task?.status === 'doing' && it.kind === 'due'))
        if (!items.length) return null
        const isToday = d === today
        return (
          <section key={d} id={`agenda-day-${d}`} className="flex gap-3 border-b border-graphite-line px-3 py-3 last:border-b-0 sm:gap-5 sm:px-5">
            <div className="flex w-14 shrink-0 flex-col items-center sm:w-24 sm:flex-row sm:items-start sm:gap-2.5">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-full text-2xl font-semibold tabular-nums', isToday && 'bg-primary text-white')}>
                {date.getDate()}
              </span>
              <span className={cn('mt-1 text-center text-[10px] font-semibold tracking-wide uppercase sm:mt-2 sm:text-left sm:text-[11px]', isToday ? 'text-primary-text' : 'text-fg-subtle')}>
                {fmtMonthDay.format(date).replace('.', '')}., {fmtWeekday.format(date).replace('.', '')}.
              </span>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-0.5">
              {items.map((it) => (
                <Row key={it.key} it={it} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        )
      })}
      {nothing && (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-fg-subtle">
          <CalendarCheck2 size={28} strokeWidth={1.5} aria-hidden />
          <p className="text-sm">Nada programado a partir desta data{showDone ? '' : ' (concluídas ocultas)'}.</p>
        </div>
      )}
      {days.length > limit && <div ref={sentinel} className="h-10" aria-hidden />}
    </div>
  )
}

function Group({ icon, title, tone, className, children }: { icon: React.ReactNode; title: string; tone: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('border-b border-graphite-line px-3 py-3 sm:px-5', className)}>
      <h3 className={cn('mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase', tone)}>
        <span aria-hidden>{icon}</span> {title}
      </h3>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  )
}

function Row({ it, onOpen, badge, showDate }: { it: AgendaItem; onOpen: (it: AgendaItem, a: HTMLElement) => void; badge?: React.ReactNode; showDate?: boolean }) {
  return (
    <li>
      <button type="button" onClick={(e) => onOpen(it, e.currentTarget)} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-2 text-left hover:bg-fg/5 sm:gap-3 sm:px-2">
        <span
          className={cn('h-2.5 w-2.5 shrink-0 rounded-full', TONE_DOT[it.tone])}
          style={it.reminder?.color && !it.reminder.done ? { background: it.reminder.color } : undefined}
          aria-hidden
        />
        <span className="w-[4.25rem] shrink-0 text-[11px] leading-tight text-fg-muted tabular-nums sm:w-28 sm:text-xs">
          {showDate ? fromDateOnly(it.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : durationLabel(it)}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="text-fg-subtle">
            <ItemIcon it={it} size={12} />
          </span>
          <span className={cn('truncate text-[13px] font-medium', it.tone === 'done' && 'text-fg-subtle line-through')}>{it.title}</span>
          {it.high && it.tone !== 'done' && <span className="shrink-0 text-xs font-bold text-accent-text">!</span>}
        </span>
        <span className="hidden shrink-0 sm:block">{badge ?? (it.task ? <StatusBadge status={it.task.status} /> : <span className="text-[11px] text-reminder-fg">Lembrete</span>)}</span>
      </button>
    </li>
  )
}
