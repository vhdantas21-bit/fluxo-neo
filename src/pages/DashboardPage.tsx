import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, CalendarCheck, ChartColumn, CircleCheck, CircleDashed, Flame, Plus, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ProgressBar } from '@/components/ui/misc'
import { BarChart } from '@/components/charts/BarChart'
import { ColorDot, DueChip, PriorityBadge, StatusBadge } from '@/components/tasks/TaskBits'
import { STATUS_THEME } from '@/components/tasks/statusTheme'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/store/DataProvider'
import { activeTasks, completedOn, countByStatus, priorityTasks, todayProgress, upcomingDeadlines } from '@/store/selectors'
import { completedThisWeekByDay } from '@/store/history'
import { addDays, formatLong, greeting, isOverdue, startOfWeek, toDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

export function DashboardPage() {
  const { data } = useData()
  const { user } = useAuth()
  const { openNewTask, openTask } = useTaskModal()
  const tasks = useMemo(() => activeTasks(data.tasks), [data.tasks])
  const counts = countByStatus(tasks)
  const today = todayProgress(tasks)
  const priorities = priorityTasks(tasks).slice(0, 5)
  const deadlines = upcomingDeadlines(tasks, 7).slice(0, 6)
  const weekDays = completedThisWeekByDay(data.tasks)

  const weekStart = toDateOnly(startOfWeek(new Date()))
  const weekEnd = toDateOnly(addDays(startOfWeek(new Date()), 6))
  const doneThisWeek = data.tasks.filter((t) => {
    const d = completedOn(t)
    return d && d >= weekStart && d <= weekEnd
  }).length
  const createdThisWeek = data.tasks.filter((t) => toDateOnly(new Date(t.createdAt)) >= weekStart).length
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length

  const name = data.profile.displayName || (user?.user_metadata?.full_name as string | undefined) || ''
  const isEmpty = tasks.length === 0

  return (
    <div className="mx-auto max-w-6xl">
      {/* Destaque com as faixas do logotipo */}
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-navy-line bg-navy-soft px-6 py-7 sm:px-8 sm:py-9">
        <svg aria-hidden viewBox="40 120 1170 950" className="pointer-events-none absolute right-8 bottom-6 hidden h-40 w-48 opacity-60 sm:block">
          <path d="M628 140 L703 255 L296 887 L128 887 Z" fill="var(--color-sky)" />
          <path d="M736 318 L1186 1056 L1007 1056 L651 446 Z" fill="var(--color-navy)" />
          <path d="M130 944 L868 944 L932 1056 L53 1056 Z" fill="var(--color-ember)" />
        </svg>
        <div className="relative flex flex-col items-start gap-5 sm:pr-64">
          <div>
            <p className="text-sm text-navy-fg first-letter:uppercase">{formatLong(new Date())}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Vamos fazer acontecer</h1>
            <p className="mt-2 text-fg-muted">
              {greeting()}
              {name ? `, ${name.split(' ')[0]}` : ''}.{' '}
              {counts.doing > 0
                ? `Você tem ${counts.doing} tarefa${counts.doing > 1 ? 's' : ''} em andamento.`
                : counts.todo > 0
                  ? 'Escolha uma tarefa e comece por ela.'
                  : 'Comece anotando o que está na sua cabeça.'}
            </p>
          </div>
          <Link
            to="/quadro"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-primary-hover"
          >
            Ver meu quadro <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      {isEmpty ? (
        <EmptyState
          icon={<Plus />}
          title="Boas-vindas ao FLUXO NEO"
          description="Crie sua primeira tarefa. Ideias para depois vão para o Backlog; o que você vai começar vai para “A Fazer”. Depois é só mover pelo quadro até “Feito”."
          action={
            <Button variant="primary" onClick={() => openNewTask()}>
              <Plus size={16} aria-hidden /> Criar primeira tarefa
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-3">
            <Stat status="todo" icon={<CircleDashed size={16} />} label="Por concluir" value={counts.todo} hint="em A Fazer" />
            <Stat status="doing" icon={<Timer size={16} />} label="Em andamento" value={counts.doing} hint="em Fazendo" />
            <Stat status="done" icon={<CircleCheck size={16} />} label="Concluídas" value={counts.done} hint="no total" />
            <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5">
              <p className="flex items-center gap-2 text-[13px] text-fg-muted">
                <CalendarCheck size={16} className="text-sky" aria-hidden /> Previstas para hoje
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{today.total ? `${today.pct}%` : '—'}</p>
              <div className="mt-3">
                <ProgressBar value={today.pct} color="var(--color-sky)" label="Conclusão das tarefas de hoje" />
                <p className="mt-2 text-xs text-fg-subtle">
                  {today.total ? `${today.done} de ${today.total} concluídas` : 'Nada agendado para hoje'}
                </p>
              </div>
            </div>
          </div>

          <Panel className="lg:col-span-2" tone="ember" icon={<Flame size={16} />} title="Tarefas prioritárias" to="/quadro">
            {priorities.length ? (
              <ul className="-mx-2 flex flex-col">
                {priorities.map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={() => openTask(t.id)} />
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-fg-subtle">Nenhuma tarefa de prioridade alta pendente. Bom equilíbrio.</p>
            )}
          </Panel>

          <Panel tone="sky" icon={<CalendarClock size={16} />} title="Próximos prazos" to="/agenda">
            {deadlines.length ? (
              <ul className="-mx-2 flex flex-col">
                {deadlines.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openTask(t.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-white/5"
                    >
                      <span className="min-w-0 truncate text-sm">{t.title}</span>
                      <DueChip task={t} showIcon={false} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-fg-subtle">Nenhum prazo nos próximos 7 dias.</p>
            )}
          </Panel>

          <Panel className="lg:col-span-3" tone="navy" icon={<ChartColumn size={16} />} title="Resumo da semana" to="/estatisticas">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <dl className="grid grid-cols-3 gap-4 md:w-64 md:grid-cols-1">
                <div>
                  <dt className="text-xs text-fg-subtle">Concluídas</dt>
                  <dd className="text-2xl font-semibold text-navy-fg tabular-nums">{doneThisWeek}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">Criadas</dt>
                  <dd className="text-2xl font-semibold text-sky-fg tabular-nums">{createdThisWeek}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">Com prazo vencido</dt>
                  <dd className={cn('text-2xl font-semibold tabular-nums', overdue ? 'text-accent-text' : 'text-fg')}>{overdue}</dd>
                </div>
              </dl>
              <div className="min-w-0 flex-1">
                <p className="mb-3 text-xs text-fg-subtle">Tarefas concluídas por dia</p>
                <BarChart
                  data={weekDays}
                  unit="tarefas concluídas"
                  height={120}
                  highlight={(new Date().getDay() + 6) % 7}
                  caption="Tarefas concluídas por dia nesta semana"
                />
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

function Stat({ status, icon, label, value, hint }: { status: TaskStatus; icon: ReactNode; label: string; value: number; hint: string }) {
  const theme = STATUS_THEME[status]
  return (
    <Link
      to="/quadro"
      className={cn('rounded-2xl border border-t-[3px] p-5 transition-[filter] hover:brightness-110', theme.soft, theme.line, theme.accent)}
    >
      <p className={cn('flex items-center gap-2 text-[13px]', theme.fg)}>
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
    </Link>
  )
}

const panelTone = {
  sky: { border: 'border-t-sky', icon: 'text-sky' },
  ember: { border: 'border-t-ember', icon: 'text-ember' },
  navy: { border: 'border-t-navy', icon: 'text-navy-fg' },
}

function Panel({
  tone,
  icon,
  title,
  to,
  className,
  children,
}: {
  tone: keyof typeof panelTone
  icon: ReactNode
  title: string
  to: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('rounded-2xl border border-t-[3px] border-line bg-surface p-5', panelTone[tone].border, className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className={panelTone[tone].icon} aria-hidden>
            {icon}
          </span>
          {title}
        </h2>
        <Link to={to} className="shrink-0 text-xs text-fg-subtle hover:text-fg">
          Ver tudo
        </Link>
      </div>
      {children}
    </section>
  )
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { data } = useData()
  const project = data.projects.find((p) => p.id === task.projectId)
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-white/5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{task.title}</span>
          {project && (
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
              <ColorDot color={project.color} /> {project.name}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <StatusBadge status={task.status} />
          <span className="hidden sm:inline">
            <PriorityBadge priority={task.priority} />
          </span>
          <DueChip task={task} showIcon={false} />
        </span>
      </button>
    </li>
  )
}
