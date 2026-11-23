import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type TouchEvent } from 'react'
import { DndContext, DragOverlay, type DragEndEvent } from '@dnd-kit/core'
import { Bell, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, ListTodo, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { Menu } from '@/components/ui/Menu'
import { useToast } from '@/components/ui/Toast'
import { usePointerSensors } from '@/components/board/dnd'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { AgendaChip, AnchoredPopover, ItemDetails, ItemList } from '@/components/agenda/AgendaItems'
import { DayStrip, MiniCalendar } from '@/components/agenda/MiniCalendar'
import { MonthView } from '@/components/agenda/MonthView'
import { WeekView, DAY_END, DAY_START, HOUR_PX } from '@/components/agenda/WeekView'
import { QuarterView } from '@/components/agenda/QuarterView'
import { ScheduleView } from '@/components/agenda/ScheduleView'
import { ReminderModal } from '@/components/agenda/ReminderModal'
import {
  VIEW_KEY,
  VIEW_LABEL,
  buildItems,
  fromMinutes,
  localInstant,
  periodTitle,
  reminderParts,
  toMinutes,
  type AgendaItem,
  type AgendaView,
} from '@/components/agenda/model'
import { useData } from '@/store/DataProvider'
import { addDays, addMonths, formatLong, formatShort, fromDateOnly, startOfMonth, toDateOnly, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateOnly } from '@/types'

const PREFS_KEY = 'fluxo-neo:agenda'
const VIEWS: AgendaView[] = ['week', 'month', 'quarter', 'schedule']

function readPrefs(): { view?: AgendaView; showDone?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function savePrefs(p: { view: AgendaView; showDone: boolean }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  } catch {
    /* preferência só nesta sessão */
  }
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

type Pop = { kind: 'item'; it: AgendaItem; anchor: HTMLElement } | { kind: 'more'; date: DateOnly; anchor: HTMLElement } | null

/**
 * Agenda: as mesmas tarefas do quadro vistas no tempo (Semana, Mês, 3 Meses,
 * Programação), mais lembretes avulsos. É para visualizar e reagendar; criar
 * só por ação explícita (botão "+ Novo" e atalhos do painel do dia).
 */
export function AgendaPage() {
  const { data, updateTask, updateReminder } = useData()
  const { openNewTask } = useTaskModal()
  const toast = useToast()
  const sensors = usePointerSensors()

  const [view, setView] = useState<AgendaView>(() => {
    const p = readPrefs()
    if (p.view && VIEWS.includes(p.view)) return p.view
    return window.innerWidth < 768 ? 'schedule' : 'month'
  })
  const [showDone, setShowDone] = useState(() => readPrefs().showDone ?? true)
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState<DateOnly>(todayISO())
  const [pop, setPop] = useState<Pop>(null)
  const [reminderModal, setReminderModal] = useState<{ id?: string; date: DateOnly } | null>(null)
  const [dragging, setDragging] = useState<AgendaItem | null>(null)
  const [sideOpen, setSideOpen] = useState(false)

  useEffect(() => savePrefs({ view, showDone }), [view, showDone])

  const byDay = useMemo(() => buildItems(data.tasks, data.reminders, { showDone }), [data.tasks, data.reminders, showDone])
  const closePop = useCallback(() => setPop(null), [])
  const openItem = useCallback((it: AgendaItem, anchor: HTMLElement) => setPop({ kind: 'item', it, anchor }), [])
  const openMore = useCallback((date: DateOnly, anchor: HTMLElement) => setPop({ kind: 'more', date, anchor }), [])

  // ---- Navegação ------------------------------------------------------------
  const move = useCallback(
    (n: number) => {
      setPop(null)
      if (view === 'week') {
        const next = addDays(cursor, 7 * n)
        setCursor(next)
        setSelected(toDateOnly(next))
      } else if (view === 'quarter') setCursor((c) => addMonths(c, 3 * n))
      else if (view === 'schedule') {
        const first = startOfMonth(addMonths(fromDateOnly(selected), n))
        const now = new Date()
        const d = first.getMonth() === now.getMonth() && first.getFullYear() === now.getFullYear() ? todayISO() : toDateOnly(first)
        setSelected(d)
        setCursor(fromDateOnly(d))
      } else setCursor((c) => addMonths(c, n))
    },
    [view, cursor, selected],
  )
  const goToday = useCallback(() => {
    setPop(null)
    setCursor(new Date())
    setSelected(todayISO())
  }, [])
  const pickDay = useCallback((d: DateOnly) => {
    setSelected(d)
    setCursor(fromDateOnly(d))
  }, [])

  // Atalhos (como no Google Agenda): T hoje · W/M/Q/A vistas · ← → período.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector('dialog[open], [role=dialog]')) return
      const k = e.key.toLowerCase()
      if (k === 't') goToday()
      else if (k === 'w') setView('week')
      else if (k === 'm') setView('month')
      else if (k === 'q') setView('quarter')
      else if (k === 'a') setView('schedule')
      else if (e.key === 'ArrowLeft') move(-1)
      else if (e.key === 'ArrowRight') move(1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToday, move])

  // Deslizar para os lados (celular) muda o período.
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current
    touch.current = null
    if (!s || dragging) return
    const dx = e.changedTouches[0].clientX - s.x
    const dy = e.changedTouches[0].clientY - s.y
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45) move(dx < 0 ? 1 : -1)
  }

  // ---- Reagendar (arrastar) -------------------------------------------------
  const reschedule = (it: AgendaItem, day: DateOnly, time: string | null | undefined) => {
    if (it.reminder) {
      const cur = reminderParts(it.reminder)
      const t = time ?? cur.time
      if (day === cur.date && t === cur.time) return
      updateReminder(it.reminder.id, { remindAt: localInstant(day, t) })
      toast.success(`Lembrete movido para ${formatShort(day)} às ${t}.`)
      return
    }
    const t = it.task
    if (!t) return
    if (it.kind === 'start') {
      if (t.startDate === day) return
      if (t.dueDate && day > t.dueDate) return toast.error('O início não pode ficar depois da data limite.')
      updateTask(t.id, { startDate: day })
      toast.success(`Início planejado movido para ${formatShort(day)}.`)
      return
    }
    if (t.startDate && day < t.startDate) return toast.error('A data limite não pode ficar antes do início.')
    let startTime = t.startTime
    let endTime = t.endTime
    if (time === null) {
      startTime = null
      endTime = null
    } else if (time !== undefined) {
      const dur = t.startTime && t.endTime ? toMinutes(t.endTime) - toMinutes(t.startTime) : null
      startTime = time
      endTime = dur ? fromMinutes(Math.min(23 * 60 + 59, toMinutes(time) + dur)) : null
    }
    if (t.dueDate === day && t.startTime === startTime && t.endTime === endTime) return
    updateTask(t.id, { dueDate: day, startTime, endTime })
    toast.success(startTime ? `Reagendada para ${formatShort(day)} às ${startTime}.` : `Data limite: ${formatShort(day)}.`)
  }

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const it = e.active.data.current as AgendaItem | undefined
    if (!it || !e.over) return
    const id = String(e.over.id)
    const zone = id.slice(0, id.indexOf(':'))
    const day = id.slice(id.indexOf(':') + 1)
    if (zone === 'slot') {
      // Hora pelo ponto onde o bloco foi solto, em passos de 15 min.
      const top = (e.active.rect.current.translated?.top ?? e.over.rect.top) - e.over.rect.top
      const min = DAY_START + Math.round(((top / HOUR_PX) * 60) / 15) * 15
      reschedule(it, day, fromMinutes(Math.max(DAY_START, Math.min(DAY_END - 15, min))))
    } else if (zone === 'allday') reschedule(it, day, it.reminder ? undefined : null)
    else reschedule(it, day, undefined)
  }

  const selectedItems = byDay.get(selected) ?? []
  const upcoming = useMemo(() => {
    const now = Date.now()
    return data.reminders
      .filter((r) => !r.done && new Date(r.remindAt).getTime() >= now - 3_600_000)
      .sort((a, b) => a.remindAt.localeCompare(b.remindAt))
      .slice(0, 5)
  }, [data.reminders])

  const title = periodTitle(view, view === 'schedule' ? fromDateOnly(selected) : cursor)

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col lg:h-[calc(100dvh-7.5rem)]">
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-3">
        <h1 className="mr-1 text-2xl font-semibold tracking-tight">Agenda</h1>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={goToday} title="Hoje (T)">
            Hoje
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => move(-1)} aria-label="Período anterior" title="Anterior (←)">
            <ChevronLeft size={18} />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => move(1)} aria-label="Período seguinte" title="Seguinte (→)">
            <ChevronRight size={18} />
          </Button>
        </div>
        <h2 className="min-w-0 text-lg font-semibold" aria-live="polite">
          {title}
        </h2>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-pressed={showDone}
            title={showDone ? 'Esconder concluídas' : 'Mostrar concluídas'}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-[13px] text-fg-muted hover:bg-fg/5 hover:text-fg"
          >
            {showDone ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
            <span className="hidden sm:inline">Concluídas</span>
          </button>

          <div role="radiogroup" aria-label="Vista" className="flex h-9 items-center gap-0.5 rounded-lg border border-line-strong bg-surface-2 p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => setView(v)}
                title={`${VIEW_LABEL[v]} (${VIEW_KEY[v]})`}
                className={cn(
                  'h-full rounded-md px-2 text-[12.5px] font-medium transition-colors sm:px-2.5',
                  view === v ? 'bg-primary text-white shadow-card' : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
                )}
              >
                {v === 'quarter' ? (
                  <>
                    3<span className="hidden sm:inline"> Meses</span>
                    <span className="sm:hidden">M</span>
                  </>
                ) : v === 'schedule' ? (
                  <>
                    <span className="hidden sm:inline">Programação</span>
                    <span className="sm:hidden">Lista</span>
                  </>
                ) : (
                  VIEW_LABEL[v]
                )}
              </button>
            ))}
          </div>

          <Menu
            label="Novo"
            triggerClassName="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-white shadow-card hover:bg-primary-hover"
            trigger={
              <>
                <Plus size={16} aria-hidden /> Novo <ChevronDown size={14} aria-hidden />
              </>
            }
            items={[
              { label: 'Nova tarefa', icon: <ListTodo />, onSelect: () => openNewTask({ status: 'todo', dueDate: selected }) },
              { label: 'Novo lembrete', icon: <Bell />, onSelect: () => setReminderModal({ date: selected }) },
            ]}
          />
        </div>
      </div>

      {/* Celular: faixa de dias */}
      <div className="mb-3 md:hidden">
        <DayStrip selected={selected} onPick={pickDay} byDay={byDay} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Lateral: mini calendário, dia escolhido e lembretes rápidos */}
        <aside className="order-last flex min-h-0 flex-col gap-4 lg:order-first lg:overflow-y-auto lg:pr-1">
          <button
            type="button"
            onClick={() => setSideOpen((o) => !o)}
            aria-expanded={sideOpen}
            className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-sm font-medium lg:hidden"
          >
            Calendário, dia e lembretes
            <ChevronDown size={16} className={cn('transition-transform', sideOpen && 'rotate-180')} aria-hidden />
          </button>
          <div className={cn('flex-col gap-4', sideOpen ? 'flex' : 'hidden lg:flex')}>
            <section className="surface-panel hidden rounded-2xl p-3 md:block">
              <MiniCalendar selected={selected} onPick={pickDay} byDay={byDay} />
            </section>

            <section className="surface-panel accent-bar rounded-2xl p-4 [--bar:var(--color-brand-blue)]" aria-live="polite">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold first-letter:uppercase">{formatLong(fromDateOnly(selected))}</h3>
              </div>
              <ItemList items={selectedItems} onOpen={openItem} empty="Nada neste dia." />
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <button type="button" onClick={() => openNewTask({ status: 'todo', dueDate: selected })} className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline">
                  <Plus size={13} aria-hidden /> Tarefa neste dia
                </button>
                <button type="button" onClick={() => setReminderModal({ date: selected })} className="inline-flex items-center gap-1 text-xs font-medium text-reminder-fg hover:underline">
                  <Bell size={13} aria-hidden /> Lembrete neste dia
                </button>
              </div>
            </section>

            <QuickReminders date={selected} upcoming={upcoming} onOpen={(id, anchor) => {
              const r = data.reminders.find((x) => x.id === id)
              if (!r) return
              const { date, time } = reminderParts(r)
              openItem({ key: `rem:${r.id}`, kind: 'reminder', date, time, endTime: null, reminder: r, title: r.title, tone: r.done ? 'done' : 'reminder', high: false }, anchor)
            }} />
          </div>
        </aside>

        {/* Calendário */}
        <main
          className={cn('min-h-0', view === 'week' ? 'h-[70dvh] lg:h-full' : view === 'month' ? 'min-h-[28rem] lg:h-full' : 'min-h-[24rem] lg:h-full')}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label={`Calendário, vista ${VIEW_LABEL[view]}`}
        >
          <DndContext
            sensors={sensors}
            onDragStart={({ active }) => {
              setPop(null)
              setDragging(active.data.current as AgendaItem)
            }}
            onDragCancel={() => setDragging(null)}
            onDragEnd={onDragEnd}
          >
            <div key={view} className="h-full animate-fade-in">
              {view === 'month' && <MonthView cursor={cursor} byDay={byDay} selected={selected} onSelectDay={setSelected} onOpen={openItem} onMore={openMore} />}
              {view === 'week' && <WeekView cursor={cursor} byDay={byDay} selected={selected} onSelectDay={setSelected} onOpen={openItem} />}
              {view === 'quarter' && (
                <QuarterView
                  cursor={cursor}
                  byDay={byDay}
                  onPickDay={(d) => {
                    pickDay(d)
                    setView('month')
                  }}
                />
              )}
              {view === 'schedule' && <ScheduleView from={selected} byDay={byDay} tasks={data.tasks} showDone={showDone} onOpen={openItem} />}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragging && <AgendaChip it={dragging} onOpen={() => undefined} draggable={false} className="w-48 rotate-2 shadow-pop" />}
            </DragOverlay>
          </DndContext>
        </main>
      </div>

      {pop?.kind === 'item' && (
        <AnchoredPopover anchor={pop.anchor} onClose={closePop} label={`Detalhes: ${pop.it.title}`}>
          <ItemDetails
            it={pop.it}
            onClose={closePop}
            onEditReminder={(id) => {
              setPop(null)
              setReminderModal({ id, date: pop.it.date })
            }}
          />
        </AnchoredPopover>
      )}
      {pop?.kind === 'more' && (
        <AnchoredPopover anchor={pop.anchor} onClose={closePop} label={`Itens de ${formatLong(fromDateOnly(pop.date))}`} width={300}>
          <p className="mb-2 text-sm font-semibold first-letter:uppercase">{formatLong(fromDateOnly(pop.date))}</p>
          <ItemList items={byDay.get(pop.date) ?? []} onOpen={(it, anchor) => setPop({ kind: 'item', it, anchor })} empty="Nada neste dia." />
        </AnchoredPopover>
      )}
      {reminderModal && <ReminderModal reminderId={reminderModal.id} date={reminderModal.date} onClose={() => setReminderModal(null)} />}
    </div>
  )
}

/** Lembretes rápidos: texto + dia/hora, e os próximos da lista. */
function QuickReminders({
  date,
  upcoming,
  onOpen,
}: {
  date: DateOnly
  upcoming: { id: string; title: string; remindAt: string; color: string | null }[]
  onOpen: (id: string, anchor: HTMLElement) => void
}) {
  const { createReminder } = useData()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState(`${date}T09:00`)
  useEffect(() => setWhen((w) => `${date}T${w.slice(11) || '09:00'}`), [date])

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const [d, t] = when.split('T')
    if (!d || !t) return toast.error('Escolha o dia e a hora do lembrete.')
    createReminder({ title, remindAt: localInstant(d, t.slice(0, 5)) })
    toast.success(`Lembrete criado para ${formatShort(d)} às ${t.slice(0, 5)}.`)
    setTitle('')
  }

  return (
    <section className="surface-panel accent-bar rounded-2xl p-4 [--bar:var(--color-reminder)]">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Bell size={14} className="text-reminder-fg" aria-hidden /> Lembretes rápidos
      </h3>
      <form onSubmit={add} className="flex flex-col gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ligar para o contador" aria-label="Texto do lembrete" maxLength={200} />
        <div className="flex gap-2">
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Dia e hora do lembrete" className="min-w-0 flex-1 text-[13px]" />
          <Button type="submit" size="icon" variant="secondary" aria-label="Adicionar lembrete" disabled={!title.trim()}>
            <Plus size={16} />
          </Button>
        </div>
      </form>
      {upcoming.length > 0 && (
        <ul className="mt-3 flex flex-col gap-0.5 border-t border-line pt-2">
          {upcoming.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={(e) => onOpen(r.id, e.currentTarget)} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-fg/5">
                <Bell size={12} className="shrink-0 text-reminder-fg" style={r.color ? { color: r.color } : undefined} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.title}</span>
                <span className="shrink-0 text-[11px] text-fg-subtle tabular-nums">
                  {new Date(r.remindAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
