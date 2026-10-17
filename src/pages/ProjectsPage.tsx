import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader, ProgressBar } from '@/components/ui/misc'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { useData } from '@/store/DataProvider'
import { activeTasks, projectProgress } from '@/store/selectors'
import { PROJECT_STATUS_LABEL, STATUS_LABEL, type ProjectStatus } from '@/types'
import { formatShort, isOverdue } from '@/lib/dates'
import { cn } from '@/lib/utils'

const order: ProjectStatus[] = ['active', 'planned', 'paused', 'completed']

export function ProjectsPage() {
  const { data } = useData()
  const [creating, setCreating] = useState(false)
  const tasks = activeTasks(data.tasks)
  const projects = [...data.projects].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.name.localeCompare(b.name))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Projetos"
        description="Agrupe tarefas por objetivo e acompanhe o progresso de cada um."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={16} aria-hidden /> Novo projeto
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title="Você ainda não tem projetos"
          description="Crie um projeto para agrupar tarefas relacionadas — o progresso é calculado automaticamente a partir das tarefas concluídas."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden /> Criar primeiro projeto
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const prog = projectProgress(tasks, p.id)
            const late = p.status !== 'completed' && isOverdue(p.dueDate, 'todo')
            return (
              <li key={p.id}>
                <Link
                  to={`/projetos/${p.id}`}
                  className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="text-xs text-fg-subtle">{PROJECT_STATUS_LABEL[p.status]}</span>
                      </span>
                    </span>
                    <span className="text-lg font-semibold tabular-nums">{prog.pct}%</span>
                  </div>
                  {p.description && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">{p.description}</p>}
                  <div className="mt-auto pt-5">
                    <ProgressBar value={prog.pct} color={p.color} label={`Progresso de ${p.name}`} />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
                      <span>
                        {(['backlog', 'todo', 'doing', 'done'] as const).filter((s) => s !== 'backlog' || prog.byStatus.backlog > 0).map((s, i) => (
                          <span key={s}>
                            {i > 0 && ' · '}
                            {prog.byStatus[s]} {STATUS_LABEL[s].toLowerCase()}
                          </span>
                        ))}
                      </span>
                      {p.dueDate && <span className={cn(late && 'text-accent-text')}>Até {formatShort(p.dueDate)}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {creating && <ProjectModal open onClose={() => setCreating(false)} />}
    </div>
  )
}
