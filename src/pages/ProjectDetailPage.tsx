import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FolderKanban, Pencil, Plus, Trash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, ProgressBar } from '@/components/ui/misc'
import { useConfirm } from '@/components/ui/Confirm'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { TaskCard } from '@/components/tasks/TaskCard'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { useData } from '@/store/DataProvider'
import { activeTasks, projectProgress, sortTasks } from '@/store/selectors'
import { ALL_STATUSES, PROJECT_STATUS_LABEL, STATUS_LABEL } from '@/types'
import { formatShort } from '@/lib/dates'

export function ProjectDetailPage() {
  const { id } = useParams()
  const { data, deleteProject } = useData()
  const { openNewTask, openTask } = useTaskModal()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const project = data.projects.find((p) => p.id === id)

  if (!project)
    return (
      <EmptyState
        icon={<FolderKanban />}
        title="Projeto não encontrado"
        description="Ele pode ter sido excluído. Volte à lista de projetos."
        action={
          <Link to="/projetos" className="text-sm font-medium text-primary-text hover:underline">
            Ver projetos
          </Link>
        }
      />
    )

  const tasks = activeTasks(data.tasks).filter((t) => t.projectId === project.id)
  const prog = projectProgress(tasks, project.id)

  const remove = async () => {
    const ok = await confirm({
      title: 'Excluir projeto?',
      message: `“${project.name}” será excluído. As ${tasks.length} tarefa(s) associadas mantêm-se, mas ficam sem projeto.`,
      confirmLabel: 'Excluir projeto',
      danger: true,
    })
    if (!ok) return
    deleteProject(project.id)
    navigate('/projetos')
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/projetos" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-fg-subtle hover:text-fg">
        <ArrowLeft size={14} aria-hidden /> Projetos
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-10 w-1.5 rounded-full" style={{ background: project.color }} aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-1 text-sm text-fg-subtle">
              {PROJECT_STATUS_LABEL[project.status]}
              {project.startDate && ` · Início ${formatShort(project.startDate)}`}
              {project.dueDate && ` · Prazo ${formatShort(project.dueDate)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => openNewTask({ projectId: project.id })}>
            <Plus size={16} aria-hidden /> Tarefa
          </Button>
          <Button onClick={() => setEditing(true)}>
            <Pencil size={15} aria-hidden /> Editar
          </Button>
          <Button variant="ghost" onClick={remove} aria-label="Excluir projeto" className="text-accent-text hover:text-accent-text">
            <Trash size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex-1">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">Progresso</span>
              <span className="text-2xl font-semibold tabular-nums">{prog.pct}%</span>
            </div>
            <ProgressBar value={prog.pct} color={project.color} label="Progresso do projeto" />
            <p className="mt-2 text-xs text-fg-subtle">
              {prog.done} de {prog.total} tarefas concluídas
            </p>
          </div>
          <dl className="grid grid-cols-4 gap-4 text-center sm:gap-6">
            {ALL_STATUSES.map((s) => (
              <div key={s}>
                <dt className="text-[11px] text-fg-subtle">{STATUS_LABEL[s]}</dt>
                <dd className="text-lg font-semibold tabular-nums">{prog.byStatus[s]}</dd>
              </div>
            ))}
          </dl>
        </div>
        {project.description && <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed whitespace-pre-line text-fg-muted">{project.description}</p>}
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title="Sem tarefas neste projeto"
          description="Adicione tarefas ao projeto para acompanhar o progresso automaticamente."
          action={
            <Button variant="primary" onClick={() => openNewTask({ projectId: project.id })}>
              <Plus size={16} aria-hidden /> Adicionar tarefa
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ALL_STATUSES.map((s) => {
            const list = sortTasks(tasks.filter((t) => t.status === s), 'position')
            return (
              <section key={s} aria-label={STATUS_LABEL[s]} className="rounded-2xl border border-line bg-surface p-3">
                <h2 className="mb-3 flex items-center justify-between px-1 text-[13px] font-semibold tracking-wide uppercase">
                  {STATUS_LABEL[s]}
                  <span className="rounded-md bg-surface-3 px-1.5 text-xs font-medium text-fg-muted">{list.length}</span>
                </h2>
                <div className="flex flex-col gap-2.5">
                  {list.map((t) => (
                    <TaskCard key={t.id} task={t} tabIndex={0} role="button" hideProject onOpen={() => openTask(t.id)} showStatusSelect="always" />
                  ))}
                  {list.length === 0 && <p className="px-1 py-3 text-xs text-fg-subtle">Nenhuma tarefa.</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {editing && <ProjectModal open project={project} onClose={() => setEditing(false)} />}
    </div>
  )
}
