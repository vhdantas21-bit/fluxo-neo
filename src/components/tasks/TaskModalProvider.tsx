import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { TaskDraft } from '@/store/DataProvider'
import { TaskModal } from './TaskModal'

interface TaskModalApi {
  openNewTask: (defaults?: Partial<TaskDraft>) => void
  openTask: (id: string) => void
}

type ModalState = { kind: 'new'; defaults?: Partial<TaskDraft> } | { kind: 'edit'; id: string } | null

const TaskModalContext = createContext<TaskModalApi | null>(null)

export function TaskModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>(null)
  // A chave força um formulário novo a cada abertura.
  const [key, setKey] = useState(0)

  const openNewTask = useCallback((defaults?: Partial<TaskDraft>) => {
    setKey((k) => k + 1)
    setState({ kind: 'new', defaults })
  }, [])
  const openTask = useCallback((id: string) => {
    setKey((k) => k + 1)
    setState({ kind: 'edit', id })
  }, [])

  const api = useMemo(() => ({ openNewTask, openTask }), [openNewTask, openTask])

  return (
    <TaskModalContext.Provider value={api}>
      {children}
      <TaskModal
        key={key}
        open={!!state}
        taskId={state?.kind === 'edit' ? state.id : undefined}
        defaults={state?.kind === 'new' ? state.defaults : undefined}
        onClose={() => setState(null)}
      />
    </TaskModalContext.Provider>
  )
}

export function useTaskModal() {
  const ctx = useContext(TaskModalContext)
  if (!ctx) throw new Error('useTaskModal fora do TaskModalProvider')
  return ctx
}
