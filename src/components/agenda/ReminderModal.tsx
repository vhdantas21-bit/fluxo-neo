import { useMemo, useState, type FormEvent } from 'react'
import { Bell, Check, CircleCheck, Copy, Trash, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { useData } from '@/store/DataProvider'
import { addDays, toDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateOnly } from '@/types'
import { localInstant, reminderParts } from './model'
import { REMINDER_COLORS, lastReminderColor, rememberReminderColor, reminderChipStyle, reminderColor } from './reminderColors'

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Próxima hora cheia (para lembretes de hoje) ou 09:00. */
function defaultTime(date: DateOnly) {
  const now = new Date()
  if (date !== toDateOnly(now) || now.getHours() >= 22) return '09:00'
  return `${pad(now.getHours() + 1)}:00`
}

/** Atalhos de horário, calculados a partir de agora. */
function presets(): Array<{ label: string; date: DateOnly; time: string }> {
  const now = new Date()
  const inHour = new Date(now.getTime() + 60 * 60_000)
  inHour.setMinutes(Math.ceil(inHour.getMinutes() / 5) * 5, 0, 0)
  const today = toDateOnly(now)
  const tomorrow = toDateOnly(addDays(now, 1))
  const monday = addDays(now, ((8 - now.getDay()) % 7) || 7)
  const out = [{ label: 'Em 1 hora', date: toDateOnly(inHour), time: hhmm(inHour) }]
  if (now.getHours() < 18) out.push({ label: 'Hoje, 18:00', date: today, time: '18:00' })
  out.push({ label: 'Amanhã, 09:00', date: tomorrow, time: '09:00' })
  out.push({ label: 'Segunda, 09:00', date: toDateOnly(monday), time: '09:00' })
  out.push({ label: 'Em 1 semana', date: toDateOnly(addDays(now, 7)), time: '09:00' })
  return out
}

/** "daqui a 2 h", "amanhã às 09:00", "já passou"… */
function relative(date: string, time: string): { text: string; past: boolean } {
  if (!date || !time) return { text: '', past: false }
  const at = new Date(localInstant(date, time)).getTime()
  const diff = at - Date.now()
  if (diff < -60_000) return { text: 'Esse horário já passou.', past: true }
  const min = Math.round(diff / 60_000)
  if (min < 60) return { text: min <= 1 ? 'Daqui a instantes.' : `Daqui a ${min} min.`, past: false }
  const today = toDateOnly(new Date())
  const tomorrow = toDateOnly(addDays(new Date(), 1))
  if (date === today) return { text: `Hoje às ${time} (daqui a ${Math.round(min / 60)} h).`, past: false }
  if (date === tomorrow) return { text: `Amanhã às ${time}.`, past: false }
  const days = Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)
  return { text: `Daqui a ${days} dias, às ${time}.`, past: false }
}

/** Criar ou editar um lembrete: título, quando (com atalhos), cor e, na edição, concluir/duplicar/excluir. */
export function ReminderModal({ reminderId, date, onClose }: { reminderId?: string; date: DateOnly; onClose: () => void }) {
  const { data, createReminder, updateReminder, deleteReminder } = useData()
  const existing = reminderId ? data.reminders.find((r) => r.id === reminderId) : undefined
  const parts = existing ? reminderParts(existing) : null
  const [title, setTitle] = useState(existing?.title ?? '')
  const [day, setDay] = useState<string>(parts?.date ?? date)
  const [time, setTime] = useState<string>(parts?.time ?? defaultTime(date))
  const [color, setColor] = useState<string | null>(existing ? existing.color : lastReminderColor())
  const [done, setDone] = useState(existing?.done ?? false)
  const [error, setError] = useState<string | null>(null)
  const quick = useMemo(presets, [])
  const rel = relative(day, time)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) return setError('Dê um título ao lembrete.')
    if (!day || !time) return setError('Escolha o dia e a hora.')
    const remindAt = localInstant(day, time)
    rememberReminderColor(color)
    if (existing) updateReminder(existing.id, { title: title.trim().slice(0, 200), remindAt, color, done })
    else createReminder({ title, remindAt, color })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Editar lembrete' : 'Novo lembrete'}
      description="Compromissos, reuniões e notas de data. Aparecem só na Agenda e no calendário, não no quadro."
      size="sm"
      accent
      footer={
        <>
          {existing && (
            <div className="mr-auto flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Duplicar lembrete"
                title="Duplicar"
                onClick={() => {
                  createReminder({ title: `${existing.title} (cópia)`, remindAt: existing.remindAt, color: existing.color })
                  onClose()
                }}
              >
                <Copy size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Excluir lembrete"
                title="Excluir"
                className="text-accent-text hover:bg-accent/10"
                onClick={() => {
                  deleteReminder(existing.id)
                  onClose()
                }}
              >
                <Trash size={16} />
              </Button>
            </div>
          )}
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
        {/* Prévia: como o lembrete aparece no calendário */}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white" style={{ background: reminderColor(color) }} aria-hidden>
            <Bell size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'flex h-6 items-center gap-1.5 truncate rounded-md border px-2 text-[12px] font-medium',
                done && 'border-line-strong text-fg-subtle line-through',
              )}
              style={reminderChipStyle(color, done)}
            >
              <Bell size={11} className="shrink-0" aria-hidden />
              {time && <span className="tabular-nums opacity-85">{time}</span>}
              <span className="truncate">{title.trim() || 'Título do lembrete'}</span>
            </span>
            <p className={cn('mt-1 flex items-center gap-1 text-[11px]', rel.past ? 'text-accent-text' : 'text-fg-subtle')}>
              {rel.past && <TriangleAlert size={11} aria-hidden />}
              {rel.text}
            </p>
          </div>
        </div>

        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <Bell size={13} style={{ color: reminderColor(color) }} aria-hidden /> Título
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

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-medium text-fg-muted">Quando</legend>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((p) => {
              const active = p.date === day && p.time === time
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setDay(p.date)
                    setTime(p.time)
                  }}
                  aria-pressed={active}
                  className={cn(
                    'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                    active ? 'border-primary bg-primary text-white' : 'border-line-strong text-fg-muted hover:bg-fg/5 hover:text-fg',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} aria-label="Dia do lembrete" />
            <Input type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} aria-label="Hora do lembrete" />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg-muted">Cor</legend>
          <div className="grid grid-cols-9 gap-1.5">
            {REMINDER_COLORS.map((c) => {
              const active = color === c.value
              return (
                <label key={c.name} title={c.name} className="relative flex cursor-pointer justify-center">
                  <input type="radio" name="reminder-color" checked={active} onChange={() => setColor(c.value)} className="peer sr-only" aria-label={c.name} />
                  <span
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-primary-text hover:scale-110',
                      active && 'ring-2 ring-fg',
                    )}
                    style={{ background: c.hex }}
                  >
                    {active && <Check size={15} className="text-white" aria-hidden />}
                  </span>
                </label>
              )
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-fg-subtle">{REMINDER_COLORS.find((c) => c.value === color)?.name ?? 'Turquesa'}</p>
        </fieldset>

        {existing && (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-[13px]">
            <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="h-4 w-4 accent-[#14b8a6]" />
            <CircleCheck size={15} className={done ? 'text-reminder-fg' : 'text-fg-subtle'} aria-hidden />
            Concluído
          </label>
        )}
      </form>
    </Modal>
  )
}
