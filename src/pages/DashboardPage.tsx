import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Camera, CalendarClock, CalendarCheck, CalendarX2, ChartColumn, CircleCheck, CircleDashed, Flame, Plus, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ProgressBar } from '@/components/ui/misc'
import { BarChart } from '@/components/charts/BarChart'
import { ColorDot, DueChip, PriorityBadge, StatusBadge } from '@/components/tasks/TaskBits'
import { STATUS_THEME } from '@/components/tasks/statusTheme'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { Avatar, useAvatarPicker, useDisplayName } from '@/components/profile/Avatar'
import { useData } from '@/store/DataProvider'
import { activeTasks, completedOn, countByStatus, priorityTasks, todayProgress, upcomingDeadlines } from '@/store/selectors'
import { completedThisWeekByDay } from '@/store/history'
import { addDays, formatLong, isOverdue, startOfWeek, toDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

export function DashboardPage() {
  const { data } = useData()
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

  const name = useDisplayName()
  const avatarPicker = useAvatarPicker()
  const isEmpty = tasks.length === 0

  return (
    <div className="mx-auto max-w-6xl">
      {/* Destaque: foto e nome do usuário + tarefas em andamento */}
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-line bg-surface px-6 py-7 sm:px-8 sm:py-9">
        {avatarPicker.input}
        <div className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 flex-col items-start gap-5">
            <div className="min-w-0">
              <p className="text-sm text-navy-fg first-letter:uppercase">{formatLong(new Date())}</p>
              <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight sm:text-4xl">{name || 'Olá!'}</h1>
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ember/15 px-3 py-1.5 text-sm text-ember-fg">
                <Timer size={16} aria-hidden />
                {counts.doing > 0 ? (
                  <span>
                    <strong className="text-base font-semibold text-fg tabular-nums">{counts.doing}</strong>{' '}
                    {counts.doing === 1 ? 'tarefa em andamento' : 'tarefas em andamento'}
                  </span>
                ) : (
                  <span>Nenhuma tarefa em andamento</span>
                )}
              </p>
            </div>
            <Link
              to="/quadro"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-primary-hover"
            >
              Ver meu quadro <ArrowRight size={16} aria-hidden />
            </Link>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2">
            <button
              type="button"
              onClick={avatarPicker.choose}
              disabled={avatarPicker.busy}
              className="group relative rounded-full ring-4 ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-text"
              aria-label={avatarPicker.hasPhoto ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
              title={avatarPicker.hasPhoto ? 'Trocar foto' : 'Adicionar foto'}
            >
              <Avatar src={data.profile.avatar} name={name} className="h-20 w-20 text-[40px] sm:h-32 sm:w-32 sm:text-[64px]" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {avatarPicker.busy ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                ) : (
                  <Camera size={22} aria-hidden />
                )}
              </span>
            </button>
            {!avatarPicker.hasPhoto && (
              <button type="button" onClick={avatarPicker.choose} className="text-xs text-navy-fg hover:text-fg hover:underline">
                Adicionar foto
              </button>
            )}
          </div>
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
            <div className="flex flex-col rounded-2xl border border-line-strong bg-surface p-5">
              <p className="flex items-center gap-2 text-[13px] text-fg-muted">
                <CalendarCheck size={16} className="text-fg-subtle" aria-hidden /> Previstas para hoje
              </p>
              {today.total ? (
                <>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">{today.pct}%</p>
                  <div className="mt-3">
                    <ProgressBar value={today.pct} color="var(--color-sky)" label="Conclusão das tarefas de hoje" />
                    <p className="mt-2 text-xs text-fg-subtle">
                      {today.done} de {today.total} concluídas
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 text-center text-fg-subtle">
                  <CalendarX2 size={26} strokeWidth={1.5} aria-hidden />
                  <p className="text-xs">Nada agendado para hoje</p>
                </div>
              )}
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

          <Panel tone="sky" icon={<CalendarClock size={16} />} title="Próximos prazos" to="/calendario">
            {deadlines.length ? (
              <ul className="-mx-2 flex flex-col">
                {deadlines.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openTask(t.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-fg/5"
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

/** Acento de cada card: azul da marca (A Fazer), laranja (Fazendo), branco/cinza claro (Feito). */
const statAccent: Record<Exclude<TaskStatus, 'backlog'>, { border: string; text: string }> = {
  todo: { border: 'border-t-primary', text: 'text-primary-text' },
  doing: { border: 'border-t-accent', text: 'text-ember-fg' },
  done: { border: 'border-t-fg', text: 'text-fg' },
}

function Stat({ status, icon, label, value, hint }: { status: Exclude<TaskStatus, 'backlog'>; icon: ReactNode; label: string; value: number; hint: string }) {
  const theme = STATUS_THEME[status]
  const accent = statAccent[status]
  return (
    <Link
      to="/quadro"
      className={cn('rounded-2xl border border-t-[3px] p-5 transition-[filter] hover:brightness-110', theme.soft, theme.line, accent.border)}
    >
      <p className={cn('flex items-center gap-2 text-[13px]', accent.text)}>
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{hint}</p>
    </Link>
  )
}

const panelTone = {
  sky: { border: 'border-t-primary', icon: 'text-primary-text' },
  ember: { border: 'border-t-accent', icon: 'text-accent-text' },
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
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-fg/5">
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
