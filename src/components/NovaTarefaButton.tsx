import { useCallback, useEffect, useRef, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import styles from './NovaTarefaButton.module.css'

const DEFAULT_ROUTE = '/tarefas/nova'

interface NovaTarefaButtonProps {
  /** Handler próprio; se passado, substitui a navegação. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  /** Rota de destino quando não há onClick (padrão: "/tarefas/nova"). */
  to?: string
  /** Texto do botão (padrão: "Nova tarefa"). */
  label?: string
  title?: string
  className?: string
}

/**
 * NovaTarefaButton
 *
 * Botão azul com efeito vermelho + scale down ao pressionar.
 * Adaptado ao FLUXO NEO: cores da paleta (tokens do tema), versão só com
 * ícone em telas pequenas e proteção contra duplo disparo sem desativar o
 * botão (desativar tirava o foco e fazia a opacidade piscar).
 */
export const NovaTarefaButton = ({
  onClick,
  disabled = false,
  to = DEFAULT_ROUTE,
  label = 'Nova tarefa',
  title,
  className,
}: NovaTarefaButtonProps) => {
  const navigate = useNavigate()
  const guard = useRef(false)
  const frameRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    },
    [],
  )

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (disabled || guard.current) {
        event.preventDefault()
        return
      }

      // Guard de 1 frame contra duplo disparo
      guard.current = true
      frameRef.current = requestAnimationFrame(() => {
        guard.current = false
        frameRef.current = null
      })

      if (onClick) {
        onClick(event)
        return
      }

      navigate(to)
    },
    [disabled, onClick, navigate, to],
  )

  return (
    <button
      type="button"
      className={cn(styles.button, className)}
      onClick={handleClick}
      disabled={disabled}
      aria-label="Criar nova tarefa"
      title={title}
      data-testid="nova-tarefa-button"
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span className={styles.label}>{label}</span>
    </button>
  )
}

export default NovaTarefaButton
