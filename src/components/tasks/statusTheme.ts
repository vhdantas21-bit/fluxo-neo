import type { TaskStatus } from '@/types'

/**
 * Cor de cada estado, em tons pastel escuros da marca:
 * A Fazer = azul claro, Fazendo = laranja, Feito = azul escuro, Backlog = neutro.
 * As classes estão escritas por extenso para o Tailwind as encontrar.
 */
export const STATUS_THEME: Record<
  TaskStatus,
  { soft: string; line: string; fg: string; dot: string; accent: string; chip: string }
> = {
  backlog: {
    soft: 'bg-surface',
    line: 'border-line',
    fg: 'text-fg-muted',
    dot: 'bg-fg-subtle',
    accent: 'border-t-line-strong',
    chip: 'bg-surface-3 text-fg-muted',
  },
  todo: {
    soft: 'bg-sky-soft',
    line: 'border-sky-line',
    fg: 'text-sky-fg',
    dot: 'bg-sky',
    accent: 'border-t-sky',
    chip: 'bg-sky/15 text-sky-fg',
  },
  doing: {
    soft: 'bg-ember-soft',
    line: 'border-ember-line',
    fg: 'text-ember-fg',
    dot: 'bg-ember',
    accent: 'border-t-ember',
    chip: 'bg-ember/15 text-ember-fg',
  },
  done: {
    soft: 'bg-navy-soft',
    line: 'border-navy-line',
    fg: 'text-navy-fg',
    dot: 'bg-navy',
    accent: 'border-t-navy',
    chip: 'bg-navy/20 text-navy-fg',
  },
}
