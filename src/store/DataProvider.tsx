import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isNetworkError, type DataRepository } from '@/data/repository'
import type { AppData, Category, Profile, Project, Subtask, Task, TaskStatus } from '@/types'
import { errorMessage, nowISO, uid } from '@/lib/utils'
import { nextOccurrence } from '@/lib/recurrence'
import { formatRelative } from '@/lib/dates'
import { useToast } from '@/components/ui/Toast'
import type { ImportPlan } from '@/lib/importData'

export type TaskDraft = Omit<Task, 'id' | 'position' | 'completedAt' | 'archivedAt' | 'createdAt' | 'updatedAt'>
export type ProjectDraft = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>

type LoadState = 'loading' | 'ready' | 'error'

interface DataApi {
  data: AppData
  state: LoadState
  loadError: string | null
  /** Número de gravações em curso (para o indicador "Salvando…"). */
  pending: number
  repoKind: DataRepository['kind']
  reload: () => Promise<void>

  createTask: (draft: TaskDraft) => Task
  updateTask: (id: string, patch: Partial<TaskDraft>) => void
  /** Move uma tarefa para `status`, opcionalmente com a nova ordem da coluna de destino. */
  moveTask: (id: string, status: TaskStatus, orderedIds?: string[]) => void
  moveTasks: (ids: string[], status: TaskStatus) => void
  setTasksStartDate: (ids: string[], date: string | null) => void
  duplicateTask: (id: string) => Task | undefined
  archiveTasks: (ids: string[]) => void
  restoreTasks: (ids: string[]) => void
  deleteTasks: (ids: string[]) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void

  createProject: (draft: ProjectDraft) => Project
  updateProject: (id: string, patch: Partial<ProjectDraft>) => void
  deleteProject: (id: string) => void

  createCategory: (name: string, color: string) => Category | null
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'color'>>) => void
  deleteCategory: (id: string) => void

  /** Atualiza só os campos indicados do perfil. */
  updateProfile: (patch: Partial<Profile>) => void

  /** Acrescenta projetos, categorias e tarefas de um arquivo importado (ver lib/importData). */
  importData: (plan: ImportPlan) => void
}

const DataContext = createContext<DataApi | null>(null)

const emptyData: AppData = { tasks: [], projects: [], categories: [], profile: { displayName: '', wipLimit: 3, avatar: null } }

/** Aplica a mudança de estado mantendo a data de conclusão coerente. */
function withStatus(t: Task, status: TaskStatus, now: string): Task {
  if (t.status === status) return t
  return { ...t, status, completedAt: status === 'done' ? (t.completedAt ?? now) : null }
}

/**
 * Tarefas recorrentes: para cada tarefa de `changed` que acabou de passar a
 * "done" com uma regra, limpa a regra da concluída e acrescenta a próxima
 * ocorrência em "A Fazer". Devolve a lista final a gravar e as criadas.
 */
function spawnRecurring(changed: Task[], before: Map<string, Task>, all: Task[], now: string) {
  const spawned: Task[] = []
  let top = topPosition(all, 'todo', new Set(changed.map((t) => t.id)))
  const out = changed.map((t) => {
    const prev = before.get(t.id)
    if (!t.recurrence || t.status !== 'done' || !prev || prev.status === 'done') return t
    // A nova ocorrência nasce no mesmo instante da conclusão: é o elo usado por revertRecurring.
    spawned.push(nextOccurrence(t, t.recurrence, t.completedAt ?? now, (top -= 1024)))
    return { ...t, recurrence: null }
  })
  return { tasks: [...out, ...spawned], spawned }
}

/**
 * Recorrente concluída por engano: quando uma tarefa sai de "done", a
 * ocorrência criada na conclusão (mesmo título, criada no instante da
 * conclusão, ainda em "A Fazer" e sem subtarefas feitas) é removida e a regra
 * volta para a original. Se a ocorrência já foi mexida, fica como está.
 */
function revertRecurring(changed: Task[], before: Map<string, Task>, all: Task[]) {
  const removed: Task[] = []
  const changedIds = new Set(changed.map((t) => t.id))
  const tasks = changed.map((t) => {
    const prev = before.get(t.id)
    if (!prev || prev.status !== 'done' || t.status === 'done' || t.recurrence || !prev.completedAt) return t
    const at = new Date(prev.completedAt).getTime()
    const child = all.find(
      (x) =>
        !changedIds.has(x.id) &&
        !removed.includes(x) &&
        x.recurrence &&
        x.status === 'todo' &&
        !x.archivedAt &&
        x.title === t.title &&
        new Date(x.createdAt).getTime() === at &&
        x.subtasks.every((st) => !st.done),
    )
    if (!child) return t
    removed.push(child)
    return { ...t, recurrence: child.recurrence }
  })
  return { tasks, removed }
}

/** Posição para colocar no topo de uma coluna. */
function topPosition(tasks: Task[], status: TaskStatus, exclude?: Set<string>) {
  const col = tasks.filter((t) => t.status === status && !t.archivedAt && !exclude?.has(t.id))
  return col.length ? Math.min(...col.map((t) => t.position)) - 1024 : 0
}

export function DataProvider({ repo, children }: { repo: DataRepository; children: ReactNode }) {
  const toast = useToast()
  const [data, setData] = useState<AppData>(emptyData)
  const [state, setState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)

  // Referência síncrona aos dados, para calcular alterações sem esperar re-render.
  const dataRef = useRef(data)
  const commit = useCallback((next: AppData) => {
    dataRef.current = next
    setData(next)
  }, [])

  // Fila de gravação: as operações chegam ao servidor pela ordem em que foram feitas.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const pendingRef = useRef(0)
  const reloadAfterWrites = useRef(false)

  const reload = useCallback(async () => {
    try {
      const fresh = await repo.load()
      commit(fresh)
      setLoadError(null)
      setState('ready')
    } catch (e) {
      setLoadError(errorMessage(e))
      setState((s) => (s === 'ready' ? s : 'error'))
      throw e
    }
  }, [repo, commit])

  const persist = useCallback(
    (op: () => Promise<void>) => {
      pendingRef.current++
      setPending(pendingRef.current)
      queue.current = queue.current
        .then(op)
        .catch(async (e) => {
          toast.error(`Não foi possível salvar: ${errorMessage(e)}`)
          // Repõe o estado real a partir do servidor.
          await reload().catch(() => undefined)
        })
        .finally(() => {
          pendingRef.current--
          setPending(pendingRef.current)
          if (pendingRef.current === 0 && reloadAfterWrites.current) {
            reloadAfterWrites.current = false
            void reload().catch(() => undefined)
          }
        })
    },
    [toast, reload],
  )

  useEffect(() => {
    setState('loading')
    reload().catch(() => undefined)
  }, [reload])

  // Alterações vindas de outro separador/dispositivo.
  useEffect(() => {
    let timer: number | undefined
    const unsubscribe = repo.subscribe((deletedId) => {
      if (deletedId) {
        const d = dataRef.current
        const known =
          d.tasks.some((t) => t.id === deletedId || t.subtasks.some((s) => s.id === deletedId)) ||
          d.projects.some((p) => p.id === deletedId) ||
          d.categories.some((c) => c.id === deletedId)
        if (!known) return
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (pendingRef.current > 0) reloadAfterWrites.current = true
        else void reload().catch(() => undefined)
      }, 400)
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [repo, reload])

  // ---- Tarefas -------------------------------------------------------------

  const saveTasks = useCallback(
    (changed: Task[]) => {
      if (!changed.length) return
      const now = nowISO()
      const stamped = changed.map((t) => ({ ...t, updatedAt: now }))
      const byId = new Map(stamped.map((t) => [t.id, t]))
      const d = dataRef.current
      const existing = new Set(d.tasks.map((t) => t.id))
      commit({
        ...d,
        tasks: [...d.tasks.map((t) => byId.get(t.id) ?? t), ...stamped.filter((t) => !existing.has(t.id))],
      })
      persist(() => repo.saveTasks(stamped))
    },
    [commit, persist, repo],
  )

  /** Grava mudanças de estado aplicando a recorrência e avisando. */
  const saveWithRecurrenceRef = useRef<(changed: Task[]) => void>(() => undefined)
  const saveWithRecurrence = useCallback(
    (changed: Task[]) => {
      const d = dataRef.current
      const before = new Map(d.tasks.map((t) => [t.id, t]))
      // Saiu de "Feito"? Desfaz a ocorrência gerada (concluída por engano).
      const reverted = revertRecurring(changed, before, d.tasks)
      if (reverted.removed.length) {
        const gone = new Set(reverted.removed.map((t) => t.id))
        commit({ ...dataRef.current, tasks: dataRef.current.tasks.filter((t) => !gone.has(t.id)) })
        persist(() => repo.deleteTasks([...gone]))
      }
      const { tasks, spawned } = spawnRecurring(reverted.tasks, before, d.tasks, nowISO())
      saveTasks(tasks)
      for (const t of spawned) {
        const original = tasks.find((x) => x.status === 'done' && x.completedAt === t.createdAt && x.title === t.title)
        const prev = original && before.get(original.id)
        toast.success(
          t.dueDate ? `Próxima ocorrência criada em A Fazer para ${formatRelative(t.dueDate)}.` : 'Próxima ocorrência criada em A Fazer.',
          prev
            ? {
                label: 'Desfazer',
                // Devolve a tarefa ao estado e posição anteriores; revertRecurring remove a ocorrência.
                onClick: () => {
                  const cur = dataRef.current.tasks.find((x) => x.id === prev.id)
                  if (cur?.status === 'done') saveWithRecurrenceRef.current([{ ...cur, status: prev.status, position: prev.position, completedAt: null }])
                },
              }
            : undefined,
        )
      }
    },
    [saveTasks, toast, commit, persist, repo],
  )
  useEffect(() => {
    saveWithRecurrenceRef.current = saveWithRecurrence
  }, [saveWithRecurrence])

  const createTask = useCallback(
    (draft: TaskDraft): Task => {
      const now = nowISO()
      const task: Task = {
        ...draft,
        id: uid(),
        position: topPosition(dataRef.current.tasks, draft.status),
        completedAt: draft.status === 'done' ? now : null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      saveTasks([task])
      return task
    },
    [saveTasks],
  )

  const updateTask = useCallback(
    (id: string, patch: Partial<TaskDraft>) => {
      const d = dataRef.current
      const t = d.tasks.find((x) => x.id === id)
      if (!t) return
      let next: Task = { ...t, ...patch, status: t.status }
      if (patch.status && patch.status !== t.status) {
        next = withStatus(next, patch.status, nowISO())
        next.position = topPosition(d.tasks, patch.status, new Set([id]))
      }
      saveWithRecurrence([next])
    },
    [saveWithRecurrence],
  )

  const moveTask = useCallback(
    (id: string, status: TaskStatus, orderedIds?: string[]) => {
      const d = dataRef.current
      const t = d.tasks.find((x) => x.id === id)
      if (!t) return
      const now = nowISO()
      if (!orderedIds) {
        if (t.status === status) return
        saveWithRecurrence([{ ...withStatus(t, status, now), position: topPosition(d.tasks, status, new Set([id])) }])
        return
      }
      // Reatribui posições apenas às tarefas cuja ordem ou estado mudou.
      const byId = new Map(d.tasks.map((x) => [x.id, x]))
      const changed: Task[] = []
      orderedIds.forEach((tid, i) => {
        const cur = byId.get(tid)
        if (!cur) return
        const position = i * 1024
        const moved = tid === id ? withStatus(cur, status, now) : cur
        if (moved !== cur || cur.position !== position) changed.push({ ...moved, position })
      })
      saveWithRecurrence(changed)
    },
    [saveWithRecurrence],
  )

  const moveTasks = useCallback(
    (ids: string[], status: TaskStatus) => {
      const d = dataRef.current
      const now = nowISO()
      let top = topPosition(d.tasks, status, new Set(ids))
      const changed = d.tasks
        .filter((t) => ids.includes(t.id) && t.status !== status)
        .map((t) => ({ ...withStatus(t, status, now), position: (top -= 1024) }))
      saveWithRecurrence(changed)
    },
    [saveWithRecurrence],
  )

  const setTasksStartDate = useCallback(
    (ids: string[], date: string | null) => {
      const changed = dataRef.current.tasks
        .filter((t) => ids.includes(t.id))
        .map((t) => ({ ...t, startDate: date, dueDate: date && t.dueDate && t.dueDate < date ? date : t.dueDate }))
      saveTasks(changed)
    },
    [saveTasks],
  )

  const duplicateTask = useCallback(
    (id: string) => {
      const t = dataRef.current.tasks.find((x) => x.id === id)
      if (!t) return
      const { id: _id, position: _p, completedAt: _c, archivedAt: _a, createdAt: _cr, updatedAt: _u, ...rest } = t
      const copy = createTask({
        ...rest,
        title: `${t.title} (cópia)`.slice(0, 200),
        subtasks: t.subtasks.map((s) => ({ ...s, id: uid() })),
      })
      toast.success('Tarefa duplicada.')
      return copy
    },
    [createTask, toast],
  )

  const restoreSnapshot = useCallback(
    (snapshot: Task[]) => {
      const d = dataRef.current
      const ids = new Set(snapshot.map((t) => t.id))
      commit({ ...d, tasks: [...d.tasks.filter((t) => !ids.has(t.id)), ...snapshot] })
      persist(() => repo.saveTasks(snapshot))
    },
    [commit, persist, repo],
  )

  const archiveTasks = useCallback(
    (ids: string[]) => {
      const before = dataRef.current.tasks.filter((t) => ids.includes(t.id) && !t.archivedAt)
      if (!before.length) return
      const now = nowISO()
      saveTasks(before.map((t) => ({ ...t, archivedAt: now })))
      toast.success(before.length === 1 ? 'Tarefa arquivada.' : `${before.length} tarefas arquivadas.`, {
        label: 'Desfazer',
        onClick: () => restoreSnapshot(before),
      })
    },
    [saveTasks, toast, restoreSnapshot],
  )

  const restoreTasks = useCallback(
    (ids: string[]) => {
      const d = dataRef.current
      const changed = d.tasks
        .filter((t) => ids.includes(t.id) && t.archivedAt)
        .map((t) => ({ ...t, archivedAt: null, position: topPosition(d.tasks, t.status) }))
      saveTasks(changed)
      toast.success(changed.length === 1 ? 'Tarefa restaurada.' : `${changed.length} tarefas restauradas.`)
    },
    [saveTasks, toast],
  )

  const deleteTasks = useCallback(
    (ids: string[]) => {
      const d = dataRef.current
      const removed = d.tasks.filter((t) => ids.includes(t.id))
      if (!removed.length) return
      commit({ ...d, tasks: d.tasks.filter((t) => !ids.includes(t.id)) })
      persist(() => repo.deleteTasks(ids))
      toast.success(removed.length === 1 ? 'Tarefa excluída.' : `${removed.length} tarefas excluídas.`, {
        label: 'Desfazer',
        onClick: () => restoreSnapshot(removed),
      })
    },
    [commit, persist, repo, toast, restoreSnapshot],
  )

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const t = dataRef.current.tasks.find((x) => x.id === taskId)
      if (!t) return
      const subtasks: Subtask[] = t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
      saveTasks([{ ...t, subtasks }])
    },
    [saveTasks],
  )

  // ---- Projetos ------------------------------------------------------------

  const createProject = useCallback(
    (draft: ProjectDraft) => {
      const now = nowISO()
      const project: Project = { ...draft, id: uid(), createdAt: now, updatedAt: now }
      const d = dataRef.current
      commit({ ...d, projects: [...d.projects, project] })
      persist(() => repo.saveProject(project))
      return project
    },
    [commit, persist, repo],
  )

  const updateProject = useCallback(
    (id: string, patch: Partial<ProjectDraft>) => {
      const d = dataRef.current
      const p = d.projects.find((x) => x.id === id)
      if (!p) return
      const next = { ...p, ...patch, updatedAt: nowISO() }
      commit({ ...d, projects: d.projects.map((x) => (x.id === id ? next : x)) })
      persist(() => repo.saveProject(next))
    },
    [commit, persist, repo],
  )

  const deleteProject = useCallback(
    (id: string) => {
      const d = dataRef.current
      const project = d.projects.find((p) => p.id === id)
      if (!project) return
      const affected = d.tasks.filter((t) => t.projectId === id)
      commit({
        ...d,
        projects: d.projects.filter((p) => p.id !== id),
        tasks: d.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
      })
      persist(() => repo.deleteProject(id))
      toast.success(`Projeto "${project.name}" excluído.`, {
        label: 'Desfazer',
        onClick: () => {
          const cur = dataRef.current
          const ids = new Set(affected.map((t) => t.id))
          const relinked = cur.tasks.filter((t) => ids.has(t.id)).map((t) => ({ ...t, projectId: id }))
          commit({ ...cur, projects: [...cur.projects, project] })
          persist(() => repo.saveProject(project))
          saveTasks(relinked)
        },
      })
    },
    [commit, persist, repo, toast, saveTasks],
  )

  // ---- Categorias ----------------------------------------------------------

  const createCategory = useCallback(
    (name: string, color: string) => {
      const d = dataRef.current
      const clean = name.trim()
      if (!clean) return null
      const dup = d.categories.find((c) => c.name.toLowerCase() === clean.toLowerCase())
      if (dup) return dup
      const category: Category = { id: uid(), name: clean.slice(0, 40), color, createdAt: nowISO() }
      commit({ ...d, categories: [...d.categories, category] })
      persist(() => repo.saveCategory(category))
      return category
    },
    [commit, persist, repo],
  )

  const updateCategory = useCallback(
    (id: string, patch: Partial<Pick<Category, 'name' | 'color'>>) => {
      const d = dataRef.current
      const c = d.categories.find((x) => x.id === id)
      if (!c) return
      const next = { ...c, ...patch }
      commit({ ...d, categories: d.categories.map((x) => (x.id === id ? next : x)) })
      persist(() => repo.saveCategory(next))
    },
    [commit, persist, repo],
  )

  const deleteCategory = useCallback(
    (id: string) => {
      const d = dataRef.current
      commit({
        ...d,
        categories: d.categories.filter((c) => c.id !== id),
        tasks: d.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
      })
      persist(() => repo.deleteCategory(id))
    },
    [commit, persist, repo],
  )

  // ---- Importação ----------------------------------------------------------

  const importData = useCallback(
    (plan: ImportPlan) => {
      const d = dataRef.current
      // As tarefas importadas entram no fim de cada coluna, mantendo a ordem do arquivo.
      const last = new Map<TaskStatus, number>()
      for (const t of d.tasks) last.set(t.status, Math.max(last.get(t.status) ?? -1, t.position))
      const tasks = [...plan.tasks]
        .sort((a, b) => a.position - b.position)
        .map((t) => {
          const position = (last.get(t.status) ?? -1) + 1
          last.set(t.status, position)
          return { ...t, position }
        })
      commit({
        ...d,
        projects: [...d.projects, ...plan.projects],
        categories: [...d.categories, ...plan.categories],
        tasks: [...d.tasks, ...tasks],
      })
      // Projetos e categorias primeiro (as tarefas apontam para eles); tarefas em lotes.
      // Se o servidor recusar um lote, reenvia tarefa por tarefa: só as recusadas ficam de fora.
      persist(async () => {
        for (const p of plan.projects) await repo.saveProject(p)
        for (const c of plan.categories) await repo.saveCategory(c)
        const refused: Task[] = []
        for (let i = 0; i < tasks.length; i += 200) {
          const batch = tasks.slice(i, i + 200)
          try {
            await repo.saveTasks(batch)
          } catch (e) {
            if (isNetworkError(e)) throw e
            for (const t of batch) {
              try {
                await repo.saveTasks([t])
              } catch (err) {
                if (isNetworkError(err)) throw err
                refused.push(t)
              }
            }
          }
        }
        if (refused.length) {
          const ids = new Set(refused.map((t) => t.id))
          commit({ ...dataRef.current, tasks: dataRef.current.tasks.filter((t) => !ids.has(t.id)) })
          const names = refused.slice(0, 3).map((t) => `“${t.title}”`).join(', ')
          toast.error(
            `${refused.length === 1 ? '1 tarefa foi recusada' : `${refused.length} tarefas foram recusadas`} pelo servidor e não foi importada: ${names}${refused.length > 3 ? '…' : ''}`,
          )
        }
      })
    },
    [commit, persist, repo, toast],
  )

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      const profile = { ...dataRef.current.profile, ...patch }
      commit({ ...dataRef.current, profile })
      persist(() => repo.saveProfile(profile))
    },
    [commit, persist, repo],
  )

  const api = useMemo<DataApi>(
    () => ({
      data,
      state,
      loadError,
      pending,
      repoKind: repo.kind,
      reload,
      createTask,
      updateTask,
      moveTask,
      moveTasks,
      setTasksStartDate,
      duplicateTask,
      archiveTasks,
      restoreTasks,
      deleteTasks,
      toggleSubtask,
      createProject,
      updateProject,
      deleteProject,
      createCategory,
      updateCategory,
      deleteCategory,
      updateProfile,
      importData,
    }),
    [
      data, state, loadError, pending, repo.kind, reload, createTask, updateTask, moveTask, moveTasks,
      setTasksStartDate, duplicateTask, archiveTasks, restoreTasks, deleteTasks, toggleSubtask, createProject,
      updateProject, deleteProject, createCategory, updateCategory, deleteCategory, updateProfile, importData,
    ],
  )

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}
