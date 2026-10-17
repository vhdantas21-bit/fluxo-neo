import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChartColumn } from 'lucide-react'
import { BarChart, SERIES_COLOR } from '@/components/charts/BarChart'
import { Card, EmptyState, PageHeader, ProgressBar } from '@/components/ui/misc'
import { ColorDot } from '@/components/tasks/TaskBits'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { useData } from '@/store/DataProvider'
import { activeTasks, completedOn, countByStatus, projectProgress } from '@/store/selectors'
import { completedPerMonth, completedPerWeek } from '@/store/history'
import { diffDays, formatRelative, formatShort, isOverdue, todayISO } from '@/lib/dates'
import { ALL_STATUSES, STATUS_LABEL } from '@/types'

export function StatsPage() {
  const { data } = useData()
  const { openTask } = useTaskModal()
  const tasks = useMemo(() => activeTasks(data.tasks), [data.tasks])
  const weekly = useMemo(() => completedPerWeek(data.tasks, 8), [data.tasks])
  const monthly = useMemo(() => completedPerMonth(data.tasks, 6), [data.tasks])
  const counts = countByStatus(tasks)
  const maxCount = Math.max(1, ...ALL_STATUSES.map((s) => counts[s]))
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const history = data.tasks
    .filter((t) => t.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))
    .slice(0, 10)

  const doneWithDue = data.tasks.filter((t) => t.status === 'done' && t.dueDate && t.completedAt)
  const onTime = doneWithDue.filter((t) => completedOn(t)! <= t.dueDate!).length
  const last4 = weekly.slice(-4).reduce((s, w) => s + w.value, 0)
  const prev4 = weekly.slice(0, 4).reduce((s, w) => s + w.value, 0)

  if (data.tasks.length === 0)
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title="Estatísticas" />
        <EmptyState
          icon={<ChartColumn />}
          title="Ainda não há dados para analisar"
          description="Conforme você cria e conclui tarefas, aqui aparece a evolução dos seus hábitos de organização."
        />
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Estatísticas"
        description="Uma visão do seu ritmo para entender o que está funcionando — não uma avaliação."
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Concluídas (4 semanas)" value={String(last4)} note={prev4 ? `${prev4} nas 4 anteriores` : 'Início do registro'} />
        <Kpi
          label="Concluídas dentro do prazo"
          value={doneWithDue.length ? `${Math.round((onTime / doneWithDue.length) * 100)}%` : '—'}
          note={doneWithDue.length ? `${onTime} de ${doneWithDue.length} com prazo` : 'Sem tarefas com prazo concluídas'}
        />
        <Kpi label="Em andamento" value={String(counts.doing)} note={data.profile.wipLimit ? `Limite sugerido: ${data.profile.wipLimit}` : 'Sem limite definido'} />
        <Kpi label="Prazos vencidos" value={String(overdue.length)} note={overdue.length ? 'Revise as datas ou o foco' : 'Tudo em dia'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold">Tarefas concluídas por semana</h2>
          <p className="mb-5 text-xs text-fg-subtle">Últimas 8 semanas (segunda a domingo)</p>
          <BarChart data={weekly} unit="tarefas concluídas" caption="Tarefas concluídas por semana" />
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Evolução mensal</h2>
          <p className="mb-5 text-xs text-fg-subtle">Tarefas concluídas nos últimos 6 meses</p>
          <BarChart data={monthly} unit="tarefas concluídas" caption="Tarefas concluídas por mês" />
          <p className="mt-3 text-xs text-fg-subtle">
            Criadas no mesmo período: {monthly.reduce((s, m) => s + m.created, 0)} · concluídas: {monthly.reduce((s, m) => s + m.value, 0)}
          </p>
        </Card>

        <Card>
          <h2 className="mb-5 text-sm font-semibold">Distribuição por estado</h2>
          <ul className="flex flex-col gap-3">
            {ALL_STATUSES.map((s) => (
              <li key={s} className="grid grid-cols-[80px_1fr_32px] items-center gap-3 text-[13px]">
                <span className="text-fg-muted">{STATUS_LABEL[s]}</span>
                <span className="h-5 overflow-hidden rounded-r-[4px] bg-surface-2">
                  <span
                    className="block h-full rounded-r-[4px] transition-[width] duration-500"
                    style={{ width: `${(counts[s] / maxCount) * 100}%`, background: SERIES_COLOR }}
                  />
                </span>
                <span className="text-right font-semibold tabular-nums">{counts[s]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-fg-subtle">Tarefas arquivadas não são contabilizadas.</p>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Progresso por projeto</h2>
          {data.projects.length === 0 ? (
            <p className="text-[13px] text-fg-subtle">
              Sem projetos.{' '}
              <Link to="/projetos" className="text-primary-text hover:underline">
                Criar um projeto
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.projects.map((p) => {
                const prog = projectProgress(tasks, p.id)
                return (
                  <li key={p.id}>
                    <Link to={`/projetos/${p.id}`} className="group block">
                      <span className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                        <span className="flex min-w-0 items-center gap-2">
                          <ColorDot color={p.color} />
                          <span className="truncate group-hover:underline">{p.name}</span>
                        </span>
                        <span className="shrink-0 text-fg-subtle tabular-nums">
                          {prog.done}/{prog.total} · <span className="font-semibold text-fg">{prog.pct}%</span>
                        </span>
                      </span>
                      <ProgressBar value={prog.pct} color={p.color} label={`Progresso de ${p.name}`} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Tarefas atrasadas</h2>
          {overdue.length === 0 ? (
            <p className="text-[13px] text-fg-subtle">Nenhuma tarefa com prazo vencido.</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {overdue.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => openTask(t.id)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                    <span className="truncate text-sm">{t.title}</span>
                    <span className="shrink-0 text-xs text-accent-text">
                      {diffDays(todayISO(), t.dueDate!)} dia(s) · {formatShort(t.dueDate!)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Histórico de conclusão</h2>
          {history.length === 0 ? (
            <p className="text-[13px] text-fg-subtle">Você ainda não concluiu tarefas. A primeira aparecerá aqui.</p>
          ) : (
            <ol className="-mx-2 flex flex-col">
              {history.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => openTask(t.id)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                    <span className="truncate text-sm">{t.title}</span>
                    <span className="shrink-0 text-xs text-fg-subtle">{formatRelative(completedOn(t)!)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  )
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card>
      <p className="text-[13px] text-fg-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{note}</p>
    </Card>
  )
}
