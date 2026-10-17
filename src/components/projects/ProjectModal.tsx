import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { useToast } from '@/components/ui/Toast'
import { useData, type ProjectDraft } from '@/store/DataProvider'
import { PALETTE_SWATCHES, PROJECT_STATUS_LABEL, type Project, type ProjectStatus } from '@/types'
import { todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  project?: Project
  onClose: () => void
  onCreated?: (p: Project) => void
}

export function ProjectModal({ open, project, onClose, onCreated }: Props) {
  const { createProject, updateProject } = useData()
  const toast = useToast()
  const [draft, setDraft] = useState<ProjectDraft>(() =>
    project
      ? { name: project.name, description: project.description, color: project.color, startDate: project.startDate, dueDate: project.dueDate, status: project.status }
      : { name: '', description: '', color: PALETTE_SWATCHES[0].value, startDate: todayISO(), dueDate: null, status: 'active' },
  )
  const [errors, setErrors] = useState<{ name?: string; dueDate?: string }>({})
  const set = <K extends keyof ProjectDraft>(k: K, v: ProjectDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = { ...draft, name: draft.name.trim(), description: draft.description.trim() }
    const errs: typeof errors = {}
    if (!clean.name) errs.name = 'Dê um nome ao projeto.'
    else if (clean.name.length > 80) errs.name = 'Máximo de 80 caracteres.'
    if (clean.startDate && clean.dueDate && clean.dueDate < clean.startDate)
      errs.dueDate = 'A data limite não pode ser anterior à data de início.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (project) {
      updateProject(project.id, clean)
      toast.success('Projeto atualizado.')
    } else {
      const p = createProject(clean)
      toast.success(`Projeto “${p.name}” criado.`)
      onCreated?.(p)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Editar projeto' : 'Novo projeto'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="project-form">
            {project ? 'Salvar' : 'Criar projeto'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Nome" htmlFor="project-name" required error={errors.name}>
          <Input
            id="project-name"
            data-autofocus
            value={draft.name}
            maxLength={100}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={!!errors.name}
            placeholder="Ex.: Lançamento do site"
          />
        </Field>
        <Field label="Descrição" htmlFor="project-desc">
          <Textarea id="project-desc" rows={3} value={draft.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg-muted">Cor identificadora</legend>
          <div className="flex flex-wrap gap-2">
            {PALETTE_SWATCHES.map((s) => (
              <label
                key={s.value}
                title={s.label}
                className={cn(
                  'relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg ring-offset-2 ring-offset-surface transition-shadow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-text',
                  draft.color === s.value && 'ring-2 ring-fg',
                )}
                style={{ background: s.value }}
              >
                <input type="radio" name="project-color" value={s.value} checked={draft.color === s.value} onChange={() => set('color', s.value)} className="sr-only" />
                <span className="sr-only">{s.label}</span>
                {draft.color === s.value && <Check size={16} className="text-white drop-shadow" aria-hidden />}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Data de início" htmlFor="project-start">
            <Input id="project-start" type="date" value={draft.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || null)} />
          </Field>
          <Field label="Data limite" htmlFor="project-due" error={errors.dueDate}>
            <Input
              id="project-due"
              type="date"
              value={draft.dueDate ?? ''}
              min={draft.startDate ?? undefined}
              onChange={(e) => set('dueDate', e.target.value || null)}
              aria-invalid={!!errors.dueDate}
            />
          </Field>
          <Field label="Estado" htmlFor="project-status">
            <Select id="project-status" value={draft.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
              {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}
