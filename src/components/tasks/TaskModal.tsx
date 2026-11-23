import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Archive, ArchiveRestore, CalendarClock, Clock, Copy, Ellipsis, Flag, FolderKanban, ListChecks, Play, Plus, Repeat, StickyNote, Tag, Trash, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Menu } from '@/components/ui/Menu'
import { ProgressBar } from '@/components/ui/misc'
import { ColorDot } from '@/components/tasks/TaskBits'
import { useConfirm } from '@/components/ui/Confirm'
import { useToast } from '@/components/ui/Toast'
import { useData, type TaskDraft } from '@/store/DataProvider'
import { PALETTE_SWATCHES, PRIORITY_LABEL, STATUS_LABEL, type Priority, type RecurrenceFreq, type Subtask, type TaskStatus } from '@/types'
import { RECURRENCE_LABEL, describeRecurrence } from '@/lib/recurrence'
import { cn, uid } from '@/lib/utils'

interface Props {
  open: boolean
  taskId?: string
  defaults?: Partial<TaskDraft>
  onClose: () => void
}

const LIMITS = { title: 200, description: 5000, notes: 10000 }

const blankDraft = (): TaskDraft => ({
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  startDate: null,
  dueDate: null,
  startTime: null,
  endTime: null,
  projectId: null,
  categoryId: null,
  notes: '',
  recurrence: null,
  subtasks: [],
})

type Errors = Partial<Record<'title' | 'description' | 'notes' | 'dueDate' | 'time', string>>

function validate(d: TaskDraft): Errors {
  const e: Errors = {}
  if (!d.title.trim()) e.title = 'Dê um título à tarefa.'
  else if (d.title.length > LIMITS.title) e.title = `Máximo de ${LIMITS.title} caracteres.`
  if (d.description.length > LIMITS.description) e.description = `Máximo de ${LIMITS.description} caracteres.`
  if (d.notes.length > LIMITS.notes) e.notes = `Máximo de ${LIMITS.notes} caracteres.`
  if (d.startDate && d.dueDate && d.dueDate < d.startDate)
    e.dueDate = 'A data limite não pode ser anterior à data de início.'
  if (d.endTime && !d.startTime) e.time = 'Informe também o horário de início.'
  else if (d.startTime && d.endTime && d.endTime <= d.startTime) e.time = 'O fim precisa ser depois do início.'
  return e
}

export function TaskModal({ open, taskId, defaults, onClose }: Props) {
  const { data, createTask, updateTask, duplicateTask, archiveTasks, restoreTasks, deleteTasks, createCategory } =
    useData()
  const confirm = useConfirm()
  const toast = useToast()
  const existing = taskId ? data.tasks.find((t) => t.id === taskId) : undefined

  const initial = useMemo<TaskDraft>(() => {
    if (existing) {
      const { id: _i, position: _p, completedAt: _c, archivedAt: _a, createdAt: _cr, updatedAt: _u, ...rest } = existing
      return rest
    }
    return { ...blankDraft(), ...defaults }
  }, [])

  const [draft, setDraft] = useState<TaskDraft>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [newSub, setNewSub] = useState('')
  const [newCategory, setNewCategory] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }))
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  const requestClose = async () => {
    if (dirty && !(await confirm({ title: 'Descartar alterações?', message: 'As alterações feitas nesta tarefa ainda não foram salvas.', confirmLabel: 'Descartar', danger: true })))
      return
    onClose()
  }

  if (taskId && !existing && open) {
    // A tarefa foi excluída (por exemplo, em outro dispositivo).
    return (
      <Modal open onClose={onClose} title="Tarefa não encontrada" size="sm">
        <p className="text-sm text-fg-muted">Esta tarefa não existe mais. Ela pode ter sido excluída em outro dispositivo.</p>
      </Modal>
    )
  }

  const addSubtask = () => {
    const title = newSub.trim()
    if (!title) return
    const sub: Subtask = { id: uid(), title: title.slice(0, 200), done: false, position: draft.subtasks.length }
    set('subtasks', [...draft.subtasks, sub])
    setNewSub('')
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const clean: TaskDraft = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      notes: draft.notes.trim(),
      subtasks: draft.subtasks
        .map((s, i) => ({ ...s, title: s.title.trim(), position: i }))
        .filter((s) => s.title),
    }
    const errs = validate(clean)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) {
      if (errs.title) titleRef.current?.focus()
      toast.error('Revise os campos destacados.')
      return
    }
    if (existing) {
      updateTask(existing.id, clean)
      toast.success('Alterações salvas.')
    } else {
      createTask(clean)
      toast.success(clean.status === 'backlog' ? 'Ideia salva no Backlog.' : `Tarefa criada em "${STATUS_LABEL[clean.status]}".`)
    }
    onClose()
  }

  const remove = async () => {
    if (!existing) return
    const ok = await confirm({
      title: 'Excluir tarefa?',
      message: `"${existing.title}" será excluída permanentemente, incluindo subtarefas e notas.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    deleteTasks([existing.id])
    onClose()
  }

  const doneSubs = draft.subtasks.filter((s) => s.done).length
  const selectedProject = data.projects.find((p) => p.id === draft.projectId)
  const selectedCategory = data.categories.find((c) => c.id === draft.categoryId)

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={existing ? 'Editar tarefa' : 'Nova tarefa'}
      description={existing?.archivedAt ? 'Esta tarefa está arquivada.' : undefined}
      size="lg"
      accent
      footer={
        <>
          {existing && (
            <div className="mr-auto">
              <Menu
                label="Mais ações da tarefa"
                align="left"
                triggerClassName="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
                trigger={
                  <>
                    <Ellipsis size={16} /> Mais
                  </>
                }
                items={[
                  {
                    label: 'Duplicar',
                    icon: <Copy />,
                    onSelect: () => {
                      duplicateTask(existing.id)
                      onClose()
                    },
                  },
                  existing.archivedAt
                    ? {
                        label: 'Restaurar',
                        icon: <ArchiveRestore />,
                        onSelect: () => {
                          restoreTasks([existing.id])
                          onClose()
                        },
                      }
                    : {
                        label: 'Arquivar',
                        icon: <Archive />,
                        onSelect: () => {
                          archiveTasks([existing.id])
                          onClose()
                        },
                      },
                  'separator',
                  { label: 'Excluir', icon: <Trash />, danger: true, onSelect: remove },
                ]}
              />
            </div>
          )}
          <Button variant="ghost" onClick={requestClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="task-form">
            {existing ? 'Salvar' : 'Criar tarefa'}
          </Button>
        </>
      }
    >
      <form
        id="task-form"
        onSubmit={submit}
        noValidate
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
        className="flex flex-col gap-5"
      >
        <Field label="Título" htmlFor="task-title" required error={errors.title}>
          <Input
            id="task-title"
            ref={titleRef}
            data-autofocus
            value={draft.title}
            maxLength={LIMITS.title + 20}
            onChange={(e) => set('title', e.target.value)}
            placeholder="O que precisa ser feito?"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'task-title-error' : undefined}
            className="text-[15px]"
          />
        </Field>

        <Field label="Descrição" htmlFor="task-desc" error={errors.description}>
          <Textarea
            id="task-desc"
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Contexto, objetivo ou critério de conclusão (opcional)"
            aria-invalid={!!errors.description}
            rows={3}
          />
        </Field>

        {/* Planejamento: estado, prioridade, repetição e datas (tom azul da marca) */}
        <section aria-labelledby="task-plan" className="flex flex-col gap-4 rounded-xl border border-sky-line/70 bg-sky-soft/60 p-3 sm:p-4">
          <h3 id="task-plan" className="flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-fg uppercase">
            <CalendarClock size={14} aria-hidden /> Planejamento
          </h3>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Segmented legend="Estado" name="status" value={draft.status} onChange={(v) => set('status', v)} options={STATUS_OPTIONS} />
            <Segmented legend="Prioridade" name="priority" value={draft.priority} onChange={(v) => set('priority', v)} options={PRIORITY_OPTIONS} />
          </div>

          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                <Repeat size={13} className={draft.recurrence ? 'text-primary-text' : 'text-fg-subtle'} aria-hidden />
                Repetir
              </span>
            }
            htmlFor="task-recurrence"
            hint={
              draft.recurrence
                ? `${describeRecurrence(draft.recurrence)}. Ao concluir, a próxima ocorrência é criada em A Fazer${draft.dueDate ? ', com a data limite avançada' : ''}.`
                : 'Para rotinas: contas do mês, treino, publicações…'
            }
          >
            <div className="flex gap-2">
              <Select
                id="task-recurrence"
                value={draft.recurrence?.freq ?? ''}
                onChange={(e) =>
                  set('recurrence', e.target.value ? { freq: e.target.value as RecurrenceFreq, interval: draft.recurrence?.interval ?? 1 } : null)
                }
                className="flex-1"
              >
                <option value="">Não repete</option>
                {(Object.keys(RECURRENCE_LABEL) as RecurrenceFreq[]).map((f) => (
                  <option key={f} value={f}>
                    {RECURRENCE_LABEL[f]}
                  </option>
                ))}
              </Select>
              {draft.recurrence && (
                <label className="flex items-center gap-2 text-[13px] text-fg-muted">
                  <span className="whitespace-nowrap">a cada</span>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    inputMode="numeric"
                    aria-label="Intervalo da repetição"
                    value={draft.recurrence.interval}
                    onChange={(e) =>
                      set('recurrence', { ...draft.recurrence!, interval: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })
                    }
                    className="w-20"
                  />
                </label>
              )}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Play size={13} className="text-sky-fg" aria-hidden /> Data de início
                </span>
              }
              htmlFor="task-start"
              hint="Quando você planeja executar"
            >
              <Input id="task-start" type="date" value={draft.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || null)} />
            </Field>

            <Field
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Flag size={13} className="text-accent-text" aria-hidden /> Data limite
                </span>
              }
              htmlFor="task-due"
              error={errors.dueDate}
            >
              <Input
                id="task-due"
                type="date"
                value={draft.dueDate ?? ''}
                min={draft.startDate ?? undefined}
                onChange={(e) => {
                  set('dueDate', e.target.value || null)
                  // Sem data limite, o horário não tem dia: é limpo junto.
                  if (!e.target.value) {
                    set('startTime', null)
                    set('endTime', null)
                  }
                }}
                aria-invalid={!!errors.dueDate}
              />
            </Field>
          </div>

          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} className={draft.startTime ? 'text-primary-text' : 'text-fg-subtle'} aria-hidden /> Horário
                <span className="font-normal text-fg-subtle">(opcional)</span>
              </span>
            }
            htmlFor="task-start-time"
            error={errors.time}
            hint={draft.dueDate ? 'No dia da data limite. Aparece em blocos na vista Semana da Agenda.' : 'Defina a data limite para escolher um horário.'}
          >
            <div className="flex items-center gap-2">
              <Input
                id="task-start-time"
                type="time"
                step={900}
                disabled={!draft.dueDate}
                value={draft.startTime ?? ''}
                onChange={(e) => set('startTime', e.target.value || null)}
                aria-label="Horário de início"
                aria-invalid={!!errors.time}
                className="max-w-36"
              />
              <span className="text-[13px] text-fg-subtle">até</span>
              <Input
                type="time"
                step={900}
                disabled={!draft.dueDate || !draft.startTime}
                value={draft.endTime ?? ''}
                onChange={(e) => set('endTime', e.target.value || null)}
                aria-label="Horário de término"
                aria-invalid={!!errors.time}
                className="max-w-36"
              />
              {(draft.startTime || draft.endTime) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    set('startTime', null)
                    set('endTime', null)
                  }}
                >
                  Dia inteiro
                </Button>
              )}
            </div>
          </Field>
        </section>

        {/* Organização: projeto e categoria */}
        <section aria-labelledby="task-org" className="flex flex-col gap-4 rounded-xl border border-navy-line/70 bg-navy-soft/60 p-3 sm:p-4">
          <h3 id="task-org" className="flex items-center gap-2 text-xs font-semibold tracking-wide text-navy-fg uppercase">
            <FolderKanban size={14} aria-hidden /> Organização
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={
                <span className="inline-flex items-center gap-1.5">
                  {selectedProject ? <ColorDot color={selectedProject.color} /> : <FolderKanban size={13} className="text-fg-subtle" aria-hidden />}
                  Projeto
                </span>
              }
              htmlFor="task-project"
            >
              <Select id="task-project" value={draft.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || null)}>
                <option value="">Sem projeto</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Tag size={13} style={{ color: selectedCategory?.color }} className={selectedCategory ? undefined : 'text-fg-subtle'} aria-hidden />
                  Categoria
                </span>
              }
              htmlFor="task-category"
            >
              {newCategory === null ? (
                <div className="flex gap-2">
                  <Select
                    id="task-category"
                    value={draft.categoryId ?? ''}
                    onChange={(e) => set('categoryId', e.target.value || null)}
                  >
                    <option value="">Sem categoria</option>
                    {data.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Button size="icon" variant="secondary" aria-label="Nova categoria" title="Nova categoria" onClick={() => setNewCategory('')}>
                    <Plus size={16} />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="task-category"
                    autoFocus
                    value={newCategory}
                    maxLength={40}
                    placeholder="Nome da categoria"
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const c = createCategory(newCategory, PALETTE_SWATCHES[data.categories.length % PALETTE_SWATCHES.length].value)
                        if (c) set('categoryId', c.id)
                        setNewCategory(null)
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        e.stopPropagation()
                        setNewCategory(null)
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const c = createCategory(newCategory, PALETTE_SWATCHES[data.categories.length % PALETTE_SWATCHES.length].value)
                      if (c) set('categoryId', c.id)
                      setNewCategory(null)
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              )}
            </Field>

          </div>
        </section>

        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-[13px] font-medium text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks size={14} className="text-primary-text" aria-hidden /> Subtarefas
            </span>
            {draft.subtasks.length > 0 && (
              <span className="text-xs font-normal text-fg-subtle">
                {doneSubs}/{draft.subtasks.length} concluídas
              </span>
            )}
          </legend>
          {draft.subtasks.length > 0 && (
            <div className="mb-2">
              <ProgressBar value={(doneSubs / draft.subtasks.length) * 100} label="Subtarefas concluídas" />
            </div>
          )}
          <ul className="flex flex-col gap-1">
            {draft.subtasks.map((s) => (
              <li key={s.id} className="group flex items-center gap-2 rounded-lg px-1 hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={() => set('subtasks', draft.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                  className="h-4 w-4 shrink-0 accent-[#2C50A1]"
                  aria-label={`Concluir subtarefa ${s.title}`}
                />
                <input
                  value={s.title}
                  onChange={(e) => set('subtasks', draft.subtasks.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                  className={cn(
                    'h-9 min-w-0 flex-1 bg-transparent text-sm focus:outline-none',
                    s.done && 'text-fg-subtle line-through',
                  )}
                  aria-label="Título da subtarefa"
                />
                <button
                  type="button"
                  onClick={() => set('subtasks', draft.subtasks.filter((x) => x.id !== s.id))}
                  className="rounded-md p-1.5 text-fg-subtle opacity-100 hover:bg-surface-3 hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  aria-label={`Remover subtarefa ${s.title}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <Input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault()
                  addSubtask()
                }
              }}
              placeholder="Adicionar subtarefa e pressionar Enter"
              aria-label="Nova subtarefa"
            />
            <Button variant="secondary" onClick={addSubtask} disabled={!newSub.trim()}>
              <Plus size={16} /> Adicionar
            </Button>
          </div>
        </fieldset>

        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <StickyNote size={13} className="text-ember-fg" aria-hidden /> Notas
            </span>
          }
          htmlFor="task-notes"
          error={errors.notes}
        >
          <Textarea
            id="task-notes"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Links, comentários, decisões…"
            rows={3}
            aria-invalid={!!errors.notes}
          />
        </Field>

        {existing && (
          <p className="text-xs text-fg-subtle">
            Criada em {new Date(existing.createdAt).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
            {existing.completedAt &&
              ` · Concluída em ${new Date(existing.completedAt).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}`}
          </p>
        )}
        <p className="hidden text-xs text-fg-subtle sm:block">
          Dica: <kbd className="rounded border border-line-strong px-1">Ctrl</kbd> +{' '}
          <kbd className="rounded border border-line-strong px-1">Enter</kbd> para salvar.
        </p>
      </form>
    </Modal>
  )
}

interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Cor do ponto quando a opção não está selecionada. */
  dot: string
  /** Fundo e texto quando selecionada. */
  on: string
  /** Cor do ponto quando selecionada (padrão: branco). */
  onDot?: string
}

/** Cores do logo: cinza (baixa), azul (média) e laranja (alta), as mesmas da borda dos cartões. */
const PRIORITY_OPTIONS: SegmentOption<Priority>[] = [
  { value: 'low', label: PRIORITY_LABEL.low, dot: 'bg-graphite', on: 'bg-graphite text-white' },
  { value: 'medium', label: PRIORITY_LABEL.medium, dot: 'bg-primary', on: 'bg-primary text-white' },
  { value: 'high', label: PRIORITY_LABEL.high, dot: 'bg-accent', on: 'bg-accent text-white' },
]

/** Mesmas cores das colunas do quadro: Backlog cinza, A Fazer azul, Fazendo laranja, Feito branco. */
const STATUS_OPTIONS: SegmentOption<TaskStatus>[] = [
  { value: 'backlog', label: STATUS_LABEL.backlog, dot: 'bg-graphite', on: 'bg-graphite text-white' },
  { value: 'todo', label: STATUS_LABEL.todo, dot: 'bg-primary', on: 'bg-primary text-white' },
  { value: 'doing', label: STATUS_LABEL.doing, dot: 'bg-accent', on: 'bg-accent text-white' },
  { value: 'done', label: STATUS_LABEL.done, dot: 'bg-fg', on: 'bg-fg text-bg', onDot: 'bg-bg' },
]

/** Seletor em botões (rádios acessíveis) com a cor de cada opção sempre visível. */
function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: ReactNode
  name: string
  value: T
  options: SegmentOption<T>[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium text-fg-muted">{legend}</legend>
      <div
        className="grid h-10 gap-1 rounded-lg border border-line-strong bg-surface-2 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const selected = value === o.value
          return (
            <label
              key={o.value}
              className={cn(
                'relative flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-md px-0.5 text-[12px] font-medium transition-colors sm:gap-1.5 sm:px-1 sm:text-[13px]',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-primary-text',
                selected ? cn(o.on, 'shadow-card') : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
              )}
            >
              <input type="radio" name={name} value={o.value} checked={selected} onChange={() => onChange(o.value)} className="sr-only" />
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2', selected ? (o.onDot ?? 'bg-white/90') : o.dot)} aria-hidden />
              <span className="truncate">{o.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
