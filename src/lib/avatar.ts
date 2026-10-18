const MAX_INPUT_BYTES = 15 * 1024 * 1024
const SIZE = 320

/**
 * Converte a imagem escolhida pelo usuário numa foto de perfil leve:
 * recorte quadrado ao centro, 320×320 px, JPEG. O resultado (normalmente
 * 20–60 KB) é guardado no perfil e sincronizado pelo Supabase.
 */
export async function imageFileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).')
  if (file.size > MAX_INPUT_BYTES) throw new Error('A imagem é muito grande. Escolha uma com até 15 MB.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não foi possível ler esta imagem. Tente uma foto em JPG ou PNG.')
  }

  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
  // Fundo escuro para imagens com transparência (o JPEG não tem canal alfa).
  ctx.fillStyle = '#171717'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** Iniciais para mostrar quando não há foto. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
