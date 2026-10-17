import { useState } from 'react'
import { ListFilter, X } from 'lucide-react'
import { useData } from '@/store/DataProvider'
import { countActiveFilters, emptyFilters, type DueFilter, type SortKey, type TaskFilters } from '@/store/selectors'
import { ALL_STATUSES, PRIORITY_LABEL, STATUS_LABEL, type Priority, type TaskStatus } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  value: TaskFilters
  onChange: (f: TaskFilters) => void
  /** Campos a mostrar. */
  show?: { query?: boolean; status?: boolean; sort?: boolean }
  statuses?: TaskStatus[]
}

const selectCls =
  'h-9 rounded-lg border border-line-strong bg-surface-2 pl-2.5 pr-7 text-[13px] text-fg focus:border-primary focus:outline-none appearance-none ' +
  "bg-[length:14px] bg-[right_8px_center] bg-no-repeat bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238c8c8c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]"

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-9 rounded-lg border px-3 text-[13px] font-medium transition-colors',
        active ? 'border-primary bg-deep text-fg' : 'border-line-strong bg-surface-2 text-fg-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Barra de pesquisa, filtros e ordenação reutilizável. */
export function TaskFiltersBar({ value, onChange, show = {}, statuses = ALL_STATUSES }: Props) {
  const { data } = useData()
  const [expanded, setExpanded] = useState(false)
  const active = countActiveFilters(value)
  const set = (patch: Partial<TaskFilters>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {show.query !== false && (
          <div className="relative min-w-48 flex-1 sm:max-w-xs">
            <label htmlFor="filter-query" className="sr-only">
              Filtrar por texto
            </label>
            <input
              id="filter-query"
              type="search"
              value={value.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Filtrar por título ou descrição"
              className="h-9 w-full rounded-lg border border-line-strong bg-surface-2 px-3 text-[13px] text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
            active ? 'border-primary bg-deep text-fg' : 'border-line-strong bg-surface-2 text-fg-muted hover:text-fg',
          )}
        >
          <ListFilter size={15} aria-hidden />
          Filtros
          {active > 0 && (
            <span className="rounded bg-primary px-1.5 text-[11px] text-white tabular-nums">{active}</span>
          )}
        </button>
        {show.sort && (
          <>
            <label htmlFor="filter-sort" className="sr-only">
              Ordenar por
            </label>
            <select id="filter-sort" value={value.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} className={selectCls}>
              <option value="position">Ordem manual</option>
              <option value="due">Data limite</option>
              <option value="priority">Prioridade</option>
              <option value="created">Data de criação</option>
            </select>
          </>
        )}
        {(active > 0 || (show.query !== false && !!value.query)) && (
          <button
            type="button"
            onClick={() => onChange({ ...emptyFilters, sort: value.sort })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-fg-subtle hover:bg-surface-2 hover:text-fg"
          >
            <X size={14} aria-hidden /> Limpar
          </button>
        )}
      </div>

      {expanded && (
        <div className="grid animate-fade-in gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 xl:grid-cols-3">
          {show.status !== false && (
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-fg-subtle">Estado</legend>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((s) => (
                  <Chip key={s} active={value.statuses.includes(s)} onClick={() => set({ statuses: toggle(value.statuses, s) })}>
                    {STATUS_LABEL[s]}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-fg-subtle">Prioridade</legend>
            <div className="flex flex-wrap gap-1.5">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <Chip key={p} active={value.priorities.includes(p)} onClick={() => set({ priorities: toggle(value.priorities, p) })}>
                  {PRIORITY_LABEL[p]}
                </Chip>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <label htmlFor="filter-due" className="text-xs font-medium text-fg-subtle">
              Prazo
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select id="filter-due" value={value.due} onChange={(e) => set({ due: e.target.value as DueFilter })} className={selectCls}>
                <option value="">Qualquer prazo</option>
                <option value="today">Para hoje</option>
                <option value="week">Próximos 7 dias</option>
                <option value="has">Com data limite</option>
                <option value="none">Sem data limite</option>
              </select>
              <Chip active={value.overdueOnly} onClick={() => set({ overdueOnly: !value.overdueOnly })}>
                Só atrasadas
              </Chip>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="filter-project" className="text-xs font-medium text-fg-subtle">
              Projeto
            </label>
            <select id="filter-project" value={value.projectId} onChange={(e) => set({ projectId: e.target.value })} className={selectCls}>
              <option value="">Todos os projetos</option>
              <option value="none">Sem projeto</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="filter-category" className="text-xs font-medium text-fg-subtle">
              Categoria
            </label>
            <select id="filter-category" value={value.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={selectCls}>
              <option value="">Todas as categorias</option>
              <option value="none">Sem categoria</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
