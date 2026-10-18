import type { AppData, Category, Profile, Project, Task } from '@/types'
import type { DataRepository } from './repository'

const STORAGE_KEY = 'fluxo-neo:data:v1'

const empty = (): AppData => ({ tasks: [], projects: [], categories: [], profile: { displayName: '', wipLimit: 3, avatar: null } })

/**
 * Modo local: os dados ficam apenas neste navegador (localStorage).
 * Não existe autenticação neste modo — é usado enquanto o Supabase
 * não estiver configurado.
 */
export class LocalRepository implements DataRepository {
  readonly kind = 'local' as const

  private read(): AppData {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    try {
      const parsed = JSON.parse(raw) as Partial<AppData>
      const base = empty()
      return { ...base, ...parsed, profile: { ...base.profile, ...parsed.profile } }
    } catch {
      throw new Error('Os dados locais estão corrompidos e não puderam ser lidos.')
    }
  }

  private write(data: AppData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      throw new Error('Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado.')
    }
  }

  private mutate(fn: (data: AppData) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const data = this.read()
        fn(data)
        this.write(data)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }

  async load(): Promise<AppData> {
    return this.read()
  }

  saveTasks(tasks: Task[]) {
    return this.mutate((d) => {
      const byId = new Map(tasks.map((t) => [t.id, t]))
      d.tasks = d.tasks.map((t) => byId.get(t.id) ?? t)
      for (const t of tasks) if (!d.tasks.some((x) => x.id === t.id)) d.tasks.push(t)
    })
  }

  deleteTasks(ids: string[]) {
    const set = new Set(ids)
    return this.mutate((d) => {
      d.tasks = d.tasks.filter((t) => !set.has(t.id))
    })
  }

  saveProject(project: Project) {
    return this.mutate((d) => {
      const i = d.projects.findIndex((p) => p.id === project.id)
      if (i >= 0) d.projects[i] = project
      else d.projects.push(project)
    })
  }

  deleteProject(id: string) {
    return this.mutate((d) => {
      d.projects = d.projects.filter((p) => p.id !== id)
      d.tasks = d.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t))
    })
  }

  saveCategory(category: Category) {
    return this.mutate((d) => {
      const i = d.categories.findIndex((c) => c.id === category.id)
      if (i >= 0) d.categories[i] = category
      else d.categories.push(category)
    })
  }

  deleteCategory(id: string) {
    return this.mutate((d) => {
      d.categories = d.categories.filter((c) => c.id !== id)
      d.tasks = d.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t))
    })
  }

  saveProfile(profile: Profile) {
    return this.mutate((d) => {
      d.profile = profile
    })
  }

  subscribe(onRemoteChange: () => void) {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onRemoteChange()
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }
}
