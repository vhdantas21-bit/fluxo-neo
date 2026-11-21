import { useEffect } from 'react'

/** Tempo mínimo na tela (desde o início da navegação): evita "piscar" e dá um momento de entrada na marca. */
const MIN_VISIBLE_MS = 1500
const FADE_MS = 300

let done = false

/**
 * Remove o preload do index.html (#preload) com um fade. Seguro para chamar
 * várias vezes; só a primeira tem efeito.
 */
export function hidePreload() {
  if (done) return
  done = true
  const el = document.getElementById('preload')
  if (!el) return
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now())
  window.setTimeout(() => {
    el.classList.add('pl-hide')
    window.setTimeout(() => {
      el.remove()
      onHidden?.()
    }, FADE_MS)
  }, wait)
}

let onHidden: (() => void) | undefined
/** Registra o que fazer depois que o preload sair (ex.: antecipar as outras páginas). */
export function afterPreload(fn: () => void) {
  onHidden = fn
}

/** Esconde o preload assim que `ready` ficar verdadeiro (a primeira tela real está pronta). */
export function useHidePreload(ready: boolean) {
  useEffect(() => {
    if (ready) hidePreload()
  }, [ready])
}

/** Componente sem visual: ao montar, esconde o preload. Dentro de um <Suspense>, só monta quando a página já carregou. */
export function HidePreloadOnMount() {
  useHidePreload(true)
  return null
}
