import { addMonths, formatMonth, startOfMonth, toDateOnly, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DateOnly } from '@/types'
import { TONE_DOT, dotStyle } from './AgendaItems'
import { monthDays, type AgendaItem } from './model'

const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

/** Vista 3 Meses: panorama de prazos com pontos coloridos; clicar num dia abre a vista Mês nele. */
export function QuarterView({
  cursor,
  byDay,
  onPickDay,
}: {
  cursor: Date
  byDay: Map<DateOnly, AgendaItem[]>
  onPickDay: (d: DateOnly) => void
}) {
  const first = startOfMonth(cursor)
  const months = [0, 1, 2].map((i) => addMonths(first, i))
  const today = todayISO()
  return (
    <div className="grid h-full min-h-0 grid-cols-1 content-start items-start gap-4 overflow-y-auto md:grid-cols-3">
      {months.map((m) => {
        const days = monthDays(m)
        const month = m.getMonth()
        const count = days.filter((d) => d.getMonth() === month).reduce((n, d) => n + (byDay.get(toDateOnly(d))?.length ?? 0), 0)
        return (
          <section
            key={m.toISOString()}
            className="flex flex-col rounded-2xl border border-graphite-line bg-graphite-soft p-3 [box-shadow:inset_0_3px_0_var(--color-brand-blue),var(--shadow-card)] sm:p-4"
          >
            <header className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold first-letter:uppercase">{formatMonth(m)}</h3>
              <span className="text-[11px] text-fg-subtle">{count ? `${count} ${count === 1 ? 'item' : 'itens'}` : 'Livre'}</span>
            </header>
            <div className="grid grid-cols-7 text-center text-[10px] font-medium text-fg-subtle" aria-hidden>
              {LETTERS.map((l, i) => (
                <span key={i} className="py-1">
                  {l}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d) => {
                const iso = toDateOnly(d)
                const items = d.getMonth() === month ? (byDay.get(iso) ?? []) : []
                const isToday = iso === today
                const tip = items.length
                  ? `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}\n${items
                      .slice(0, 6)
                      .map((it) => `• ${it.time ? `${it.time} ` : ''}${it.title}`)
                      .join('\n')}${items.length > 6 ? `\n+${items.length - 6} mais` : ''}`
                  : undefined
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => onPickDay(iso)}
                    title={tip}
                    aria-label={`${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}${items.length ? `: ${items.map((i) => i.title).join(', ')}` : ''}`}
                    className={cn(
                      'flex aspect-square min-h-9 flex-col items-center justify-center gap-0.5 rounded-lg text-xs tabular-nums transition-colors',
                      d.getMonth() !== month ? 'text-fg-subtle/40' : 'hover:bg-fg/10',
                      isToday && 'bg-primary font-semibold text-white hover:bg-primary-hover',
                      items.some((i) => i.task?.status === 'doing') && !isToday && 'ring-1 ring-accent/60 ring-inset',
                    )}
                  >
                    {d.getDate()}
                    <span className="flex h-1.5 gap-0.5" aria-hidden>
                      {items.slice(0, 3).map((it) => (
                        <span
                          key={it.key}
                          className={cn('h-1.5 w-1.5 rounded-full', isToday ? 'bg-white/90' : TONE_DOT[it.tone])}
                          style={isToday ? undefined : dotStyle(it)}
                        />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
