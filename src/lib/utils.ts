export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export const uid = () => crypto.randomUUID()

export const nowISO = () => new Date().toISOString()

export function pluralize(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** Mensagem de erro legível a partir de qualquer valor lançado. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e && 'message' in e) return String((e as { message: unknown }).message)
  return 'Ocorreu um erro inesperado.'
}
