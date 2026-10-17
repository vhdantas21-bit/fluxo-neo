import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui/misc'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { useData } from '@/store/DataProvider'
import { activeTasks, countActiveFilters, emptyFilters, filterTasks, sortTasks, type TaskFilters } from '@/store/selectors'

export function SearchPage() {
  const { data } = useData()
  const { openTask } = useTaskModal()
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const [filters, setFilters] = useState<TaskFilters>({ ...emptyFilters, sort: 'due' })

  // O texto vem da barra de pesquisa do topo (URL); os restantes filtros são locais.
  const effective = { ...filters, query }
  const results = useMemo(
    () => sortTasks(filterTasks(activeTasks(data.tasks), effective), effective.sort),
    [data.tasks, query, filters],
  )
  const hasCriteria = !!query.trim() || countActiveFilters(filters) > 0

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={query ? `Resultados para “${query}”` : 'Pesquisa'}
        description={`${results.length} tarefa(s) encontrada(s). Use a barra no topo para buscar no título e na descrição.`}
      />
      <div className="mb-5">
        <TaskFiltersBar value={effective} onChange={(f) => setFilters({ ...f, query: '' })} show={{ query: false, sort: true }} />
      </div>
      {results.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title={hasCriteria ? 'Nenhuma tarefa encontrada' : 'Ainda não há tarefas'}
          description={
            hasCriteria
              ? 'Tente outras palavras ou remova alguns filtros.'
              : 'Crie a primeira tarefa com o botão “Nova tarefa” ou a tecla N.'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((t) => (
            <li key={t.id}>
              <TaskCard task={t} tabIndex={0} role="button" showStatus showStatusSelect={false} onOpen={() => openTask(t.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
