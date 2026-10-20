import { useMemo, useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, ArrowRight, CalendarPlus, Inbox, Lightbulb, Plus, Trash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { EmptyState, PageHeader } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar'
import { ColorDot, PriorityBadge, StatusBadge } from '@/components/tasks/TaskBits'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { useTaskActions } from '@/components/tasks/useTaskActions'
import { useData } from '@/store/DataProvider'
import { emptyFilters, filterTasks, sortTasks, type TaskFilters } from '@/store/selectors'
import { formatShort } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

type Tab = 'ideas' | 'archive'

export function BacklogPage() {
  const { data, createTask, moveTasks, archiveTasks, restoreTasks, setTasksStartDate } = useData()
  const { openTask } = useTaskModal()
  const { confirmDelete } = useTaskActions()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('ideas')
  const [filters, setFilters] = useState<TaskFilters>({ ...emptyFilters, sort: 'created' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [quick, setQuick] = useState('')
  const [date, setDate] = useState('')

  const source = useMemo(
    () => (tab === 'ideas' ? data.tasks.filter((t) => t.status === 'backlog' && !t.archivedAt) : data.tasks.filter((t) => t.archivedAt)),
    [data.tasks, tab],
  )
  const list = useMemo(() => sortTasks(filterTasks(source, filters), filters.sort), [source, filters])
  const selectedTasks = list.filter((t) => selected.has(t.id))
  const allSelected = list.length > 0 && selectedTasks.length === list.length

  const switchTab = (t: Tab) => {
    setTab(t)
    setSelected(new Set())
  }
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const clear = () => setSelected(new Set())
  const ids = selectedTasks.map((t) => t.id)

  const addQuick = (e: FormEvent) => {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    createTask({
      title: title.slice(0, 200),
      description: '',
      status: 'backlog',
      priority: 'medium',
      startDate: null,
      dueDate: null,
      projectId: filters.projectId && filters.projectId !== 'none' ? filters.projectId : null,
      categoryId: null,
      notes: '',
      subtasks: [],
    })
    setQuick('')
    if (tab !== 'ideas') switchTab('ideas')
  }

  const archivedCount = data.tasks.filter((t) => t.archivedAt).length

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Backlog"
        description="Sua caixa de entrada de ideias. Anote tudo aqui e leve para o quadro só o que você vai mesmo começar."
      />

      <form onSubmit={addQuick} className="mb-5 flex gap-2">
        <label htmlFor="quick-backlog" className="sr-only">
          Nova ideia
        </label>
        <div className="group relative flex-1">
          <Lightbulb
            size={20}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-primary-text transition-colors group-focus-within:text-accent-text"
            aria-hidden
          />
          <Input
            id="quick-backlog"
            value={quick}
            maxLength={200}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Escreva uma ideia e pressione Enter…"
            className="h-14 rounded-xl border-primary/40 bg-surface-2 pl-12 text-base shadow-card focus:border-primary focus:ring-4 focus:ring-primary/25"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          className="h-14 rounded-xl px-5 text-[15px] transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:shadow-pop hover:ring-2 hover:ring-primary/40 active:translate-y-0"
          disabled={!quick.trim()}
        >
          <Plus size={16} aria-hidden /> <span className="hidden sm:inline">Anotar</span>
        </Button>
      </form>

      <div role="tablist" aria-label="Visualização do backlog" className="mb-4 flex gap-1 border-b border-line">
        {(
          [
            ['ideas', 'Ideias', data.tasks.filter((t) => t.status === 'backlog' && !t.archivedAt).length],
            ['archive', 'Arquivo', archivedCount],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              tab === key ? 'border-primary-text text-fg' : 'border-transparent text-fg-subtle hover:text-fg',
            )}
          >
            {label} <span className="ml-1 text-xs tabular-nums text-fg-subtle">{count}</span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <TaskFiltersBar value={filters} onChange={setFilters} show={{ status: tab === 'archive', sort: true }} />
      </div>

      {selectedTasks.length > 0 && (
        <div
          role="region"
          aria-label="Ações em lote"
          className="sticky top-[4.5rem] z-20 mb-3 flex animate-fade-in flex-wrap items-center gap-2 rounded-xl border border-primary/50 bg-surface-2 p-2.5 shadow-pop"
        >
          <span className="px-2 text-[13px] font-medium">{selectedTasks.length} selecionada(s)</span>
          {tab === 'ideas' ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  moveTasks(ids, 'todo')
                  toast.success(`${ids.length} movida(s) para “A Fazer”.`)
                  clear()
                }}
              >
                <ArrowRight size={14} aria-hidden /> Mover para A Fazer
              </Button>
              <div className="flex items-center gap-1.5">
                <label htmlFor="bulk-date" className="sr-only">
                  Data de execução
                </label>
                <input
                  id="bulk-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 rounded-lg border border-line-strong bg-surface-2 px-2 text-[13px] text-fg"
                />
                <Button
                  size="sm"
                  disabled={!date}
                  onClick={() => {
                    setTasksStartDate(ids, date)
                    toast.success(`Data de execução definida para ${formatShort(date)}.`)
                    setDate('')
                    clear()
                  }}
                >
                  <CalendarPlus size={14} aria-hidden /> Definir data
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  archiveTasks(ids)
                  clear()
                }}
              >
                <Archive size={14} aria-hidden /> Arquivar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                restoreTasks(ids)
                clear()
              }}
            >
              <ArchiveRestore size={14} aria-hidden /> Restaurar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-accent-text hover:text-accent-text"
            onClick={async () => {
              await confirmDelete(selectedTasks)
              clear()
            }}
          >
            <Trash size={14} aria-hidden /> Excluir
          </Button>
          <button type="button" onClick={clear} className="ml-auto rounded-md px-2 py-1 text-[13px] text-fg-subtle hover:text-fg">
            Cancelar seleção
          </button>
        </div>
      )}

      {list.length === 0 ? (
        tab === 'ideas' ? (
          <EmptyState
            icon={<Inbox />}
            title={source.length ? 'Nenhuma ideia corresponde aos filtros' : 'Seu backlog está vazio'}
            description={
              source.length
                ? 'Tente limpar a pesquisa ou os filtros.'
                : 'Use o campo acima para anotar ideias rapidamente. Quando estiver pronto para começar, mova-as para “A Fazer”.'
            }
          />
        ) : (
          <EmptyState
            icon={<Archive />}
            title="Nada arquivado"
            description="Tarefas e ideias que não são mais relevantes ficam aqui, fora do quadro, e podem ser restauradas a qualquer momento."
          />
        )
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-xs text-fg-subtle">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = selectedTasks.length > 0 && !allSelected
              }}
              onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((t) => t.id)))}
              className="h-4 w-4 accent-[#2C50A1]"
              aria-label="Selecionar todas"
            />
            {list.length} {list.length === 1 ? 'item' : 'itens'}
          </div>
          <ul>
            {list.map((t) => (
              <BacklogRow
                key={t.id}
                task={t}
                archived={tab === 'archive'}
                selected={selected.has(t.id)}
                onToggle={() => toggle(t.id)}
                onOpen={() => openTask(t.id)}
                onPromote={() => {
                  moveTasks([t.id], 'todo')
                  toast.success(`“${t.title}” movida para A Fazer.`)
                }}
                onRestore={() => restoreTasks([t.id])}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface RowProps {
  task: Task
  archived: boolean
  selected: boolean
  onToggle: () => void
  onOpen: () => void
  onPromote: () => void
  onRestore: () => void
}

function BacklogRow({ task, archived, selected, onToggle, onOpen, onPromote, onRestore }: RowProps) {
  const { data } = useData()
  const project = data.projects.find((p) => p.id === task.projectId)
  const category = data.categories.find((c) => c.id === task.categoryId)
  return (
    <li
      className={cn(
        'group flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0',
        selected ? 'bg-deep/40' : 'hover:bg-surface-2',
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-[#2C50A1]"
        aria-label={`Selecionar ${task.title}`}
      />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium">{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-subtle">
          <PriorityBadge priority={task.priority} />
          {archived && <StatusBadge status={task.status} />}
          {project && (
            <span className="inline-flex items-center gap-1.5">
              <ColorDot color={project.color} />
              {project.name}
            </span>
          )}
          {category && <span>{category.name}</span>}
          {task.startDate && <span>Executar em {formatShort(task.startDate)}</span>}
          {task.dueDate && <span>Prazo {formatShort(task.dueDate)}</span>}
        </span>
      </button>
      {archived ? (
        <Button size="sm" variant="ghost" onClick={onRestore} aria-label={`Restaurar ${task.title}`}>
          <ArchiveRestore size={14} aria-hidden /> <span className="hidden sm:inline">Restaurar</span>
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={onPromote} aria-label={`Mover ${task.title} para A Fazer`} title="Mover para A Fazer">
          <ArrowRight size={14} aria-hidden /> <span className="hidden sm:inline">A Fazer</span>
        </Button>
      )}
    </li>
  )
}
