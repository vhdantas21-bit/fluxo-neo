import type { CSSProperties } from 'react'

/**
 * Cores dos lembretes. A primeira (turquesa, `null`) é a padrão; as outras
 * incluem as cores do logo e tons complementares, para diferenciar compromissos.
 */
export const REMINDER_COLORS: Array<{ value: string | null; name: string; hex: string }> = [
  { value: null, name: 'Turquesa', hex: '#14b8a6' },
  { value: '#22a55a', name: 'Verde', hex: '#22a55a' },
  { value: '#2c50a1', name: 'Azul', hex: '#2c50a1' },
  { value: '#5b6eac', name: 'Navy', hex: '#5b6eac' },
  { value: '#7c5cd6', name: 'Roxo', hex: '#7c5cd6' },
  { value: '#d6458f', name: 'Rosa', hex: '#d6458f' },
  { value: '#c43004', name: 'Laranja', hex: '#c43004' },
  { value: '#d99a1e', name: 'Âmbar', hex: '#d99a1e' },
  { value: '#8a8a8a', name: 'Cinza', hex: '#8a8a8a' },
]

/** Cor CSS de um lembrete (sem cor própria: turquesa do tema). */
export const reminderColor = (c: string | null | undefined) => c ?? 'var(--color-reminder)'

/**
 * Etiqueta de lembrete: fundo tingido pela cor, borda no mesmo tom e faixa
 * sólida à esquerda — bem colorida, mas com o texto legível nos dois temas.
 */
export function reminderChipStyle(color: string | null | undefined, done = false): CSSProperties {
  if (done) return {}
  const c = reminderColor(color)
  return {
    background: `color-mix(in srgb, ${c} 24%, var(--color-surface))`,
    borderColor: `color-mix(in srgb, ${c} 65%, transparent)`,
    boxShadow: `inset 3px 0 0 ${c}`,
    color: 'var(--color-fg)',
  }
}

const LAST_KEY = 'fluxo-neo:reminder-color'
/** Última cor escolhida (conveniência deste navegador). */
export function lastReminderColor(): string | null {
  try {
    const v = localStorage.getItem(LAST_KEY)
    return v && REMINDER_COLORS.some((c) => c.value === v) ? v : null
  } catch {
    return null
  }
}
export function rememberReminderColor(c: string | null) {
  try {
    if (c) localStorage.setItem(LAST_KEY, c)
    else localStorage.removeItem(LAST_KEY)
  } catch {
    /* só nesta sessão */
  }
}
