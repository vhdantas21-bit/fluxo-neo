import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface BarDatum {
  label: string
  /** Rótulo completo para tooltip e tabela acessível. */
  fullLabel?: string
  value: number
}

interface Props {
  data: BarDatum[]
  /** Descrição do valor, ex.: "tarefas concluídas". */
  unit: string
  height?: number
  caption: string
  /** Barra cujo valor fica sempre visível (por omissão, a última). */
  highlight?: number
}

/** Cor única da série (tom claro do azul principal, validado contra o fundo escuro). */
export const SERIES_COLOR = '#7096E0'

/**
 * Gráfico de barras verticais de uma série. Barras finas ancoradas na base,
 * valor no tooltip (hover e foco) e tabela equivalente para leitores de tela.
 */
export function BarChart({ data, unit, height = 160, caption, highlight }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const last = highlight ?? data.length - 1

  return (
    <figure className="w-full">
      <div className="relative flex items-end gap-[2px] border-b border-line-strong" style={{ height }} aria-hidden>
        {[0.5, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${f * 100}%` }} />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * 100
          const show = i === active || (active === null && i === last)
          return (
            <div
              key={d.label + i}
              className="group relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            >
              {show && (
                <span
                  className={cn(
                    'pointer-events-none absolute z-10 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums',
                    i === active ? 'bg-surface-3 text-fg shadow-pop' : 'text-fg-muted',
                  )}
                  style={{ bottom: `calc(${h}% + 6px)` }}
                >
                  {d.value}
                  {i === active && <span className="ml-1 font-normal text-fg-subtle">{d.fullLabel ?? d.label}</span>}
                </span>
              )}
              <div
                className="w-full max-w-9 rounded-t-[4px] transition-[height,filter] duration-500 ease-out group-hover:brightness-125"
                style={{ height: `${Math.max(h, d.value > 0 ? 2 : 0)}%`, background: SERIES_COLOR }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-[2px] text-center text-[11px] text-fg-subtle" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label + i} className="min-w-0 flex-1 truncate">
            {d.label}
          </span>
        ))}
      </div>
      <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.label + i}>
              <th scope="row">{d.fullLabel ?? d.label}</th>
              <td>
                {d.value} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
