import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, Copy, Ellipsis, Plus, Trash, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Menu } from '@/components/ui/Menu'
import { useConfirm } from '@/components/ui/Confirm'
import { useToast } from '@/components/ui/Toast'
import { useData, type TaskDraft } from '@/store/DataProvider'
import { ALL_STATUSES, PALETTE_SWATCHES, PRIORITY_LABEL, STATUS_LABEL, type Priority, type Subtask } from '@/types'
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
  projectId: null,
  categoryId: null,
  notes: '',
  subtasks: [],
})

type Errors = Partial<Record<'title' | 'description' | 'notes' | 'dueDate', string>>

function validate(d: TaskDraft): Errors {
  const e: Errors = {}
  if (!d.title.trim()) e.title = 'Dê um título à tarefa.'
  else if (d.title.length > LIMITS.title) e.title = `Máximo de ${LIMITS.title} caracteres.`
  if (d.description.length > LIMITS.description) e.description = `Máximo de ${LIMITS.description} caracteres.`
  if (d.notes.length > LIMITS.notes) e.notes = `Máximo de ${LIMITS.notes} caracteres.`
  if (d.startDate && d.dueDate && d.dueDate < d.startDate)
    e.dueDate = 'A data limite não pode ser anterior à data de início.'
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

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={existing ? 'Editar tarefa' : 'Nova tarefa'}
      description={existing?.archivedAt ? 'Esta tarefa está arquivada.' : undefined}
      size="lg"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estado" htmlFor="task-status">
            <Select id="task-status" value={draft.status} onChange={(e) => set('status', e.target.value as TaskDraft['status'])}>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-medium text-fg-muted">Prioridade</legend>
            <div className="grid h-10 grid-cols-3 gap-1 rounded-lg border border-line-strong bg-surface-2 p-1">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <label
                  key={p}
                  className={cn(
                    'relative flex cursor-pointer items-center justify-center rounded-md text-[13px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-text',
                    draft.priority === p
                      ? p === 'high'
                        ? 'bg-accent text-white'
                        : 'bg-deep text-fg'
                      : 'text-fg-subtle hover:text-fg',
                  )}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={draft.priority === p}
                    onChange={() => set('priority', p)}
                    className="sr-only"
                  />
                  {PRIORITY_LABEL[p]}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Data de início" htmlFor="task-start" hint="Quando você planeja executar">
            <Input id="task-start" type="date" value={draft.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || null)} />
          </Field>

          <Field label="Data limite" htmlFor="task-due" error={errors.dueDate}>
            <Input
              id="task-due"
              type="date"
              value={draft.dueDate ?? ''}
              min={draft.startDate ?? undefined}
              onChange={(e) => set('dueDate', e.target.value || null)}
              aria-invalid={!!errors.dueDate}
            />
          </Field>

          <Field label="Projeto" htmlFor="task-project">
            <Select id="task-project" value={draft.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || null)}>
              <option value="">Sem projeto</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Categoria" htmlFor="task-category">
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

        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-[13px] font-medium text-fg-muted">
            Subtarefas
            {draft.subtasks.length > 0 && (
              <span className="text-xs font-normal text-fg-subtle">
                {doneSubs}/{draft.subtasks.length} concluídas
              </span>
            )}
          </legend>
          <ul className="flex flex-col gap-1">
            {draft.subtasks.map((s) => (
              <li key={s.id} className="group flex items-center gap-2 rounded-lg px-1 hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={() => set('subtasks', draft.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                  className="h-4 w-4 shrink-0 accent-[#174CB5]"
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

        <Field label="Notas" htmlFor="task-notes" error={errors.notes}>
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
