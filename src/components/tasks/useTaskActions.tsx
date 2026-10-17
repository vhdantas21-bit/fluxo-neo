import { useCallback } from 'react'
import { useConfirm } from '@/components/ui/Confirm'
import { useData } from '@/store/DataProvider'
import type { Task } from '@/types'

/** Ações de tarefa que exigem confirmação. */
export function useTaskActions() {
  const confirm = useConfirm()
  const { deleteTasks } = useData()

  const confirmDelete = useCallback(
    async (tasks: Pick<Task, 'id' | 'title'>[]) => {
      if (!tasks.length) return
      const ok = await confirm({
        title: tasks.length === 1 ? 'Excluir tarefa?' : `Excluir ${tasks.length} tarefas?`,
        message:
          tasks.length === 1
            ? `"${tasks[0].title}" será excluída permanentemente, incluindo subtarefas e notas.`
            : 'As tarefas selecionadas serão excluídas permanentemente, incluindo subtarefas e notas.',
        confirmLabel: 'Excluir',
        danger: true,
      })
      if (ok) deleteTasks(tasks.map((t) => t.id))
    },
    [confirm, deleteTasks],
  )

  return { confirmDelete }
}
