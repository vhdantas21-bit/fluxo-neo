import { useMemo, useState, type ReactNode } from 'react'
import { CalendarClock, ChartColumn, ChevronLeft, ChevronRight, CircleCheck, CirclePlus, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/misc'
import { BarChart } from '@/components/charts/BarChart'
import { DueChip, StatusBadge } from '@/components/tasks/TaskBits'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { useData } from '@/store/DataProvider'
import { activeTasks, completedOn } from '@/store/selectors'
import { completedByDay } from '@/store/history'
import { addDays, formatRelative, formatShort, startOfWeek, toDateOnly, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

/** Tarefas da semana [from, to] (datas `YYYY-MM-DD`, inclusive). */
function weekStats(all: Task[], from: string, to: string) {
  const active = activeTasks(all)
  const inWeek = (d: string | null) => !!d && d >= from && d <= to
  const completed = all
    .filter((t) => inWeek(completedOn(t)))
    .sort((a, b) => (completedOn(b) ?? '').localeCompare(completedOn(a) ?? ''))
  const created = all.filter((t) => inWeek(toDateOnly(new Date(t.createdAt))))
  const due = active.filter((t) => inWeek(t.dueDate)).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const today = todayISO()
  const late = due.filter((t) => t.status !== 'done' && t.dueDate! < today)
  return { completed, created, due, late }
}

export function WeekSummaryPage() {
  const { data } = useData()
  const { openTask } = useTaskModal()
  const thisWeek = startOfWeek(new Date())
  const [weekStart, setWeekStart] = useState(thisWeek)

  const from = toDateOnly(weekStart)
  const to = toDateOnly(addDays(weekStart, 6))
  const isCurrent = from === toDateOnly(thisWeek)

  const stats = useMemo(() => weekStats(data.tasks, from, to), [data.tasks, from, to])
  const prev = useMemo(
    () => weekStats(data.tasks, toDateOnly(addDays(weekStart, -7)), toDateOnly(addDays(weekStart, -1))),
    [data.tasks, weekStart],
  )
  const perDay = useMemo(() => completedByDay(data.tasks, weekStart), [data.tasks, weekStart])
  const todayIndex = isCurrent ? (new Date().getDay() + 6) % 7 : undefined

  const diff = stats.completed.length - prev.completed.length
  const diffText =
    prev.completed.length === 0 && stats.completed.length === 0
      ? 'Sem conclusões na semana anterior'
      : diff === 0
        ? 'Igual à semana anterior'
        : `${diff > 0 ? '+' : ''}${diff} em relação à semana anterior`
  const dueDone = stats.due.filter((t) => t.status === 'done').length

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Resumo da semana"
        description="O que você concluiu, criou e tem de prazo em cada semana — para planejar a próxima com calma."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Semana seguinte">
            <ChevronRight size={18} />
          </Button>
        </div>
        <h2 className="min-w-40 text-lg font-semibold" aria-live="polite">
          {formatShort(from)} – {formatShort(to)}
        </h2>
        {isCurrent ? (
          <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary-text">Esta semana</span>
        ) : (
          <Button size="sm" onClick={() => setWeekStart(thisWeek)}>
            Esta semana
          </Button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi border="border-t-primary" icon={<CircleCheck size={16} />} tone="text-primary-text" label="Concluídas" value={stats.completed.length} note={diffText} />
        <Kpi border="border-t-navy" icon={<CirclePlus size={16} />} tone="text-navy-fg" label="Criadas" value={stats.created.length} note="tarefas novas na semana" />
        <Kpi
          border="border-t-sky"
          icon={<CalendarClock size={16} />}
          tone="text-sky-fg"
          label="Prazos na semana"
          value={stats.due.length}
          note={stats.due.length ? `${dueDone} de ${stats.due.length} concluídos` : 'Nenhum prazo nesta semana'}
        />
        <Kpi
          border={stats.late.length ? 'border-t-accent' : 'border-t-line-strong'}
          icon={<TriangleAlert size={16} />}
          tone={stats.late.length ? 'text-accent-text' : 'text-fg-muted'}
          label="Atrasadas"
          value={stats.late.length}
          note={stats.late.length ? 'prazo passou sem conclusão' : 'Tudo em dia'}
        />
      </div>

      <section className="surface-panel mb-4 rounded-2xl border-t-[3px] border-t-navy p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ChartColumn size={16} className="text-navy-fg" aria-hidden />
          Tarefas concluídas por dia
        </h2>
        <p className="mt-0.5 mb-5 text-xs text-fg-subtle">Segunda a domingo</p>
        <BarChart
          data={perDay}
          unit="tarefas concluídas"
          height={150}
          highlight={todayIndex}
          caption={`Tarefas concluídas por dia, ${formatShort(from)} a ${formatShort(to)}`}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="surface-panel rounded-2xl border-t-[3px] border-t-primary p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CircleCheck size={16} className="text-primary-text" aria-hidden />
            Concluídas na semana
          </h2>
          {stats.completed.length ? (
            <ul className="-mx-2 flex flex-col">
              {stats.completed.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTask(t.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-fg/5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CircleCheck size={14} className="shrink-0 text-primary-text" aria-hidden />
                      <span className="truncate text-sm">{t.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-fg-subtle">{formatRelative(completedOn(t)!)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={<CircleCheck />}
              title="Nada concluído nesta semana"
              description="Quando você mover uma tarefa para “Feito”, ela aparece aqui."
            />
          )}
        </section>

        <section className="surface-panel rounded-2xl border-t-[3px] border-t-accent p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CalendarClock size={16} className="text-accent-text" aria-hidden />
            Prazos da semana
          </h2>
          {stats.due.length ? (
            <ul className="-mx-2 flex flex-col">
              {stats.due.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTask(t.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-fg/5"
                  >
                    <span className={cn('min-w-0 truncate text-sm', t.status === 'done' && 'text-fg-subtle line-through')}>
                      {t.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={t.status} />
                      <DueChip task={t} showIcon={false} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={<CalendarClock />}
              title="Sem prazos nesta semana"
              description="Tarefas com data limite entre segunda e domingo aparecem aqui."
            />
          )}
        </section>
      </div>
    </div>
  )
}

function Kpi({ border, icon, tone, label, value, note }: { border: string; icon: ReactNode; tone: string; label: string; value: number; note: string }) {
  return (
    <div className={cn('surface-panel rounded-2xl border-t-[3px] p-5', border)}>
      <p className={cn('flex items-center gap-2 text-[13px]', tone)}>
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{note}</p>
    </div>
  )
}
