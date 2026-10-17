import {
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type KeyboardCoordinateGetter,
  type KeyboardSensorOptions,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { BOARD_STATUSES } from '@/types'
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'

/** Ignora eventos vindos de controlos dentro do cartão (menu, seletor…). */
const fromControl = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('[data-no-dnd], input, textarea, select, a')

class SafeMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: ({ nativeEvent }: ReactMouseEvent) => nativeEvent.button === 0 && !fromControl(nativeEvent.target),
    },
  ]
}

class SafeTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent }: ReactTouchEvent) => !fromControl(nativeEvent.target),
    },
  ]
}

class SafeKeyboardSensor extends KeyboardSensor {
  static activators = [
    {
      eventName: 'onKeyDown' as const,
      handler: (event: ReactKeyboardEvent, opts: KeyboardSensorOptions, ctx: Parameters<(typeof KeyboardSensor.activators)[0]['handler']>[2]) => {
        // Apenas quando o foco está no próprio cartão.
        if (event.target !== event.currentTarget) return false
        return KeyboardSensor.activators[0].handler(event, opts, ctx)
      },
    },
  ]
}

/**
 * Setas ←/→ levam o cartão para o topo da coluna vizinha; ↑/↓ reordenam
 * dentro da coluna (comportamento padrão do dnd-kit).
 */
const boardKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const { active, droppableRects } = args.context
  if (event.code === KeyboardCode.Left || event.code === KeyboardCode.Right) {
    event.preventDefault()
    const from = active?.data.current?.sortable?.containerId as string | undefined
    const i = BOARD_STATUSES.indexOf(from as (typeof BOARD_STATUSES)[number])
    const to = BOARD_STATUSES[i + (event.code === KeyboardCode.Right ? 1 : -1)]
    const rect = to ? droppableRects.get(to) : undefined
    if (i < 0 || !rect || rect.width === 0) return undefined
    return { x: rect.left + 8, y: rect.top + 4 }
  }
  return sortableKeyboardCoordinates(event, args)
}

export function useBoardSensors() {
  return useSensors(
    useSensor(SafeMouseSensor, { activationConstraint: { distance: 5 } }),
    // No toque, um pequeno atraso permite fazer scroll sem arrastar sem querer.
    useSensor(SafeTouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(SafeKeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space, KeyboardCode.Enter],
      },
    }),
  )
}

export const screenReaderInstructions = {
  draggable:
    'Para mover uma tarefa, pressione Espaço. Use as setas para movê-la entre posições e colunas. Pressione Espaço novamente para soltar ou Esc para cancelar. Pressione Enter para abrir a tarefa.',
}

export function makeAnnouncements(
  titleOf: (id: string | number) => string,
  placeOf: (id: string | number | undefined) => string,
): Announcements {
  return {
    onDragStart: ({ active }) => `Tarefa "${titleOf(active.id)}" selecionada.`,
    onDragOver: ({ active, over }) => (over ? `"${titleOf(active.id)}" está sobre ${placeOf(over.id)}.` : `"${titleOf(active.id)}" fora de uma coluna.`),
    onDragEnd: ({ active, over }) => (over ? `"${titleOf(active.id)}" solta em ${placeOf(over.id)}.` : `"${titleOf(active.id)}" solta.`),
    onDragCancel: ({ active }) => `Movimento cancelado. "${titleOf(active.id)}" voltou à posição inicial.`,
  }
}

/** Apenas rato e toque (a alternativa por teclado é editar a data no modal). */
export function usePointerSensors() {
  return useSensors(
    useSensor(SafeMouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(SafeTouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  )
}
