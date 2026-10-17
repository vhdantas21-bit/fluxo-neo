import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { TaskFiltersBar } from '@/components/tasks/TaskFiltersBar'
import { PageHeader } from '@/components/ui/misc'
import { useData } from '@/store/DataProvider'
import { activeTasks, countActiveFilters, emptyFilters, filterTasks, type TaskFilters } from '@/store/selectors'
import { BOARD_STATUSES, STATUS_LABEL, type BoardStatus } from '@/types'
import { cn } from '@/lib/utils'
import { STATUS_THEME } from '@/components/tasks/statusTheme'

export function BoardPage() {
  const { data } = useData()
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters)
  const [mobileColumn, setMobileColumn] = useState<BoardStatus>('todo')

  const boardTasks = useMemo(() => activeTasks(data.tasks).filter((t) => t.status !== 'backlog'), [data.tasks])
  const visible = useMemo(() => filterTasks(boardTasks, filters), [boardTasks, filters])
  const backlogCount = useMemo(() => activeTasks(data.tasks).filter((t) => t.status === 'backlog').length, [data.tasks])
  const filtered = countActiveFilters(filters) > 0 || !!filters.query.trim()

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col lg:h-[calc(100dvh-7.5rem)]">
      <PageHeader
        title="Meu quadro"
        description="Arraste as tarefas entre colunas à medida que avançam. Concentre-se no que está em “Fazendo”."
        actions={
          <Link
            to="/backlog"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-surface-2 px-3 text-[13px] font-medium text-fg-muted hover:bg-surface-3 hover:text-fg"
          >
            <Inbox size={15} aria-hidden /> Backlog
            <span className="rounded bg-surface-3 px-1.5 text-[11px] tabular-nums">{backlogCount}</span>
          </Link>
        }
      />
      <div className="mb-4">
        <TaskFiltersBar value={filters} onChange={setFilters} show={{ status: false }} />
      </div>

      {/* Celular: uma coluna de cada vez */}
      <div role="tablist" aria-label="Coluna visível" className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1 md:hidden">
        {BOARD_STATUSES.map((s) => {
          const count = visible.filter((t) => t.status === s).length
          return (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={mobileColumn === s}
              onClick={() => setMobileColumn(s)}
              className={cn(
                'flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors',
                mobileColumn === s ? cn(STATUS_THEME[s].soft, STATUS_THEME[s].fg, 'ring-1 ring-inset ring-white/10') : 'text-fg-subtle',
              )}
            >
              {STATUS_LABEL[s]}
              <span className="text-xs tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      <KanbanBoard tasks={visible} mobileColumn={mobileColumn} filtered={filtered} />
    </div>
  )
}
