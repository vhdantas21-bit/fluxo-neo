import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, CalendarCheck, CalendarDays, CalendarX2, CircleCheck, CircleDashed, Flame, Plus, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ProgressBar } from '@/components/ui/misc'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { ColorDot, DueChip, PriorityBadge, StatusBadge } from '@/components/tasks/TaskBits'
import { STATUS_THEME } from '@/components/tasks/statusTheme'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { ProfilePhotoButton, useAvatarPicker, useDisplayName } from '@/components/profile/Avatar'
import { useData } from '@/store/DataProvider'
import { activeTasks, countByStatus, priorityTasks, todayProgress, upcomingDeadlines } from '@/store/selectors'
import { formatLong } from '@/lib/dates'
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
  const focus = tasks.filter((t) => t.status === 'doing').slice(0, 3)

  const name = useDisplayName()
  const avatarPicker = useAvatarPicker()
  const isEmpty = tasks.length === 0

  return (
    <div className="mx-auto max-w-6xl">
      {/* Destaque: foto e nome do usuário + tarefas em andamento */}
      <section className="surface-panel relative mb-6 overflow-hidden rounded-2xl px-6 py-7 sm:px-8 sm:py-9">
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
            <ProfilePhotoButton size="lg" />
            {/* Seletor próprio do atalho "Adicionar foto" abaixo da foto */}
            {avatarPicker.input}
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
            <Stat status="todo" icon={<CircleDashed size={16} />} label="Por concluir" value={counts.todo} hint="a fazer" />
            <Stat status="doing" icon={<Timer size={16} />} label="Em andamento" value={counts.doing} hint="fazendo" />
            <Stat status="done" icon={<CircleCheck size={16} />} label="Concluídas" value={counts.done} hint="concluídas" />
            <div className="surface-panel flex flex-col rounded-2xl p-5">
              <p className="flex items-center gap-2 text-[13px] text-fg-muted">
                <CalendarCheck size={16} className="text-fg-subtle" aria-hidden />
                {today.total || !focus.length ? 'Previstas para hoje' : 'Foco de hoje'}
              </p>
              {!today.total && focus.length > 0 ? (
                // Sem tarefas com data para hoje: o foco do dia é o que está em Fazendo.
                <ul className="mt-3 flex flex-col gap-1">
                  {focus.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openTask(t.id)}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] hover:bg-fg/5"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" aria-hidden />
                        <span className="truncate">{t.title}</span>
                      </button>
                    </li>
                  ))}
                  {counts.doing > focus.length && (
                    <li className="px-1.5 text-xs text-fg-subtle">+{counts.doing - focus.length} em andamento</li>
                  )}
                </ul>
              ) : today.total ? (
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

          <Panel tone="sky" icon={<CalendarClock size={16} />} title="Próximos prazos" to="/semana">
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

          <section className="lg:col-span-3" aria-labelledby="inicio-calendario">
            <h2 id="inicio-calendario" className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <CalendarDays size={16} className="text-graphite-fg" aria-hidden />
              Calendário do mês
            </h2>
            <MonthCalendar />
          </section>
        </div>
      )}
    </div>
  )
}

/** Acento de cada card: azul da marca (A Fazer), laranja (Fazendo), branco/cinza claro (Feito). */
const statAccent: Record<Exclude<TaskStatus, 'backlog'>, { border: string; text: string; orb: string }> = {
  todo: { border: '[--bar:var(--color-brand-blue)]', text: 'text-primary-text', orb: '[--orb:var(--color-primary)]' },
  doing: { border: '[--bar:var(--color-brand-orange)]', text: 'text-ember-fg', orb: '[--orb:var(--color-accent)]' },
  done: { border: '[--bar:var(--color-fg)]', text: 'text-fg', orb: '[--orb:#5a5a5a]' },
}

function Stat({ status, icon, label, value, hint }: { status: Exclude<TaskStatus, 'backlog'>; icon: ReactNode; label: string; value: number; hint: string }) {
  const theme = STATUS_THEME[status]
  const accent = statAccent[status]
  return (
    <Link
      to="/quadro"
      className={cn(
        'surface-panel accent-bar group rounded-2xl p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift',
        theme.line,
        accent.border,
      )}
    >
      <p className={cn('flex items-center gap-2 text-[13px]', accent.text)}>
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <span className={cn('orb h-14 w-14 text-xl transition-transform group-hover:scale-105', accent.orb)} aria-hidden>
          {value}
        </span>
        <span className="sr-only">{value}</span>
        <span className="text-xs text-fg-subtle">{hint}</span>
      </div>
    </Link>
  )
}

const panelTone = {
  sky: { border: '[--bar:var(--color-brand-blue)]', icon: 'text-primary-text' },
  ember: { border: '[--bar:var(--color-brand-orange)]', icon: 'text-accent-text' },
  navy: { border: '[--bar:var(--color-navy)]', icon: 'text-navy-fg' },
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
    <section className={cn('surface-panel accent-bar rounded-2xl p-5', panelTone[tone].border, className)}>
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
