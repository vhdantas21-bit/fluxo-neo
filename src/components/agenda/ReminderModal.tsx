import { useState, type FormEvent } from 'react'
import { Bell, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { useData } from '@/store/DataProvider'
import { cn } from '@/lib/utils'
import type { DateOnly } from '@/types'
import { localInstant, reminderParts } from './model'

/** Cores dos lembretes: turquesa (padrão) e as cores do logo. */
const COLORS: Array<{ value: string | null; label: string; swatch: string }> = [
  { value: null, label: 'Turquesa (padrão)', swatch: 'var(--color-reminder)' },
  { value: '#2c50a1', label: 'Azul', swatch: '#2c50a1' },
  { value: '#c43004', label: 'Laranja', swatch: '#c43004' },
  { value: '#5b6eac', label: 'Navy', swatch: '#5b6eac' },
  { value: '#7c5cd6', label: 'Roxo', swatch: '#7c5cd6' },
  { value: '#8a8a8a', label: 'Cinza', swatch: '#8a8a8a' },
]

/** Próxima hora cheia (para lembretes de hoje) ou 09:00. */
function defaultTime(date: DateOnly) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (date !== today || now.getHours() >= 22) return '09:00'
  return `${String(now.getHours() + 1).padStart(2, '0')}:00`
}

/** Criar ou editar um lembrete (título, dia, hora e cor). */
export function ReminderModal({ reminderId, date, onClose }: { reminderId?: string; date: DateOnly; onClose: () => void }) {
  const { data, createReminder, updateReminder } = useData()
  const existing = reminderId ? data.reminders.find((r) => r.id === reminderId) : undefined
  const parts = existing ? reminderParts(existing) : null
  const [title, setTitle] = useState(existing?.title ?? '')
  const [day, setDay] = useState<string>(parts?.date ?? date)
  const [time, setTime] = useState<string>(parts?.time ?? defaultTime(date))
  const [color, setColor] = useState<string | null>(existing?.color ?? null)
  const [error, setError] = useState<string | null>(null)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) return setError('Dê um título ao lembrete.')
    if (!day || !time) return setError('Escolha o dia e a hora.')
    const remindAt = localInstant(day, time)
    if (existing) updateReminder(existing.id, { title: title.trim().slice(0, 200), remindAt, color })
    else createReminder({ title, remindAt, color })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Editar lembrete' : 'Novo lembrete'}
      description="Compromissos, reuniões e notas de data. Aparecem só na Agenda, não no quadro."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="reminder-form">
            {existing ? 'Salvar' : 'Criar lembrete'}
          </Button>
        </>
      }
    >
      <form
        id="reminder-form"
        onSubmit={submit}
        noValidate
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
        className="flex flex-col gap-4"
      >
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <Bell size={13} className="text-reminder-fg" aria-hidden /> Título
            </span>
          }
          htmlFor="reminder-title"
          required
          error={error ?? undefined}
        >
          <Input
            id="reminder-title"
            data-autofocus
            value={title}
            maxLength={200}
            onChange={(e) => {
              setTitle(e.target.value)
              setError(null)
            }}
            placeholder="Ex.: Reunião com o cliente"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia" htmlFor="reminder-day">
            <Input id="reminder-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
          <Field label="Hora" htmlFor="reminder-time">
            <Input id="reminder-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg-muted">Cor</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <label key={c.label} title={c.label} className="relative cursor-pointer">
                <input type="radio" name="reminder-color" checked={color === c.value} onChange={() => setColor(c.value)} className="peer sr-only" aria-label={c.label} />
                <span
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow peer-focus-visible:ring-2 peer-focus-visible:ring-primary-text',
                    color === c.value && 'ring-2 ring-fg',
                  )}
                  style={{ background: c.swatch }}
                >
                  {color === c.value && <Check size={15} className="text-white" aria-hidden />}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
