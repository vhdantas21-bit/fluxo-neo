import type { TaskStatus } from '@/types'

/**
 * Cor de cada estado, seguindo a paleta da marca:
 * A Fazer = azul, Fazendo = laranja, Feito = branco (neutro, "finalizado"),
 * Backlog = cinza. As classes estão escritas por extenso para o Tailwind as encontrar.
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
    chip: 'bg-line-strong text-fg',
  },
  todo: {
    soft: 'bg-sky-soft',
    line: 'border-sky-line',
    fg: 'text-sky-fg',
    dot: 'bg-sky',
    accent: 'border-t-primary',
    chip: 'bg-primary/25 text-sky-fg',
  },
  doing: {
    soft: 'bg-ember-soft',
    line: 'border-ember-line',
    fg: 'text-ember-fg',
    dot: 'bg-ember',
    accent: 'border-t-accent',
    chip: 'bg-accent/20 text-ember-fg',
  },
  done: {
    soft: 'bg-surface',
    line: 'border-fg/30',
    fg: 'text-fg',
    dot: 'bg-fg',
    accent: 'border-t-fg',
    chip: 'bg-fg/10 text-fg',
  },
}
