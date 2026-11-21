import { useEffect } from 'react'

/** Tempo mínimo na tela, para o preload não "piscar" em conexões rápidas. */
const MIN_VISIBLE_MS = 450
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
    window.setTimeout(() => el.remove(), FADE_MS)
  }, wait)
}

/** Esconde o preload assim que `ready` ficar verdadeiro (a primeira tela real está pronta). */
export function useHidePreload(ready: boolean) {
  useEffect(() => {
    if (ready) hidePreload()
  }, [ready])
}
