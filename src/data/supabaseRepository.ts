import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { AppData, Category, Priority, Profile, Project, ProjectStatus, Subtask, Task, TaskStatus } from '@/types'
import type { DataRepository } from './repository'

// Linhas tal como existem no PostgreSQL (ver supabase/migrations).
interface TaskRow {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  start_date: string | null
  due_date: string | null
  project_id: string | null
  category_id: string | null
  notes: string
  position: number
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}
interface SubtaskRow {
  id: string
  task_id: string
  title: string
  done: boolean
  position: number
}
interface ProjectRow {
  id: string
  name: string
  description: string
  color: string
  start_date: string | null
  due_date: string | null
  status: ProjectStatus
  created_at: string
  updated_at: string
}
interface CategoryRow {
  id: string
  name: string
  color: string
  created_at: string
}

const PAGE = 1000

function check(error: PostgrestError | null) {
  if (error) throw new Error(translateError(error))
}

/** Traduz erros do PostgREST/PostgreSQL em mensagens compreensíveis. */
function translateError(e: PostgrestError): string {
  if (e.code === '23514') return 'Os dados enviados não passaram na validação do servidor.'
  if (e.code === '23505') return 'Já existe um registro com esse nome.'
  if (e.code === '23503') return 'O projeto ou a categoria associada não existe mais.'
  if (e.code === '42501' || e.code === 'PGRST301') return 'Sem permissão. Faça login novamente.'
  if (e.message?.toLowerCase().includes('fetch')) return 'Sem conexão com o servidor. Verifique sua internet.'
  return e.message || 'Erro ao se comunicar com o servidor.'
}

export class SupabaseRepository implements DataRepository {
  readonly kind = 'supabase' as const

  constructor(
    private readonly db: SupabaseClient,
    private readonly userId: string,
  ) {}

  private async fetchAll<T>(table: string, order: string): Promise<T[]> {
    const out: T[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.db
        .from(table)
        .select('*')
        .order(order)
        .range(from, from + PAGE - 1)
      check(error)
      out.push(...((data ?? []) as T[]))
      if (!data || data.length < PAGE) return out
    }
  }

  async load(): Promise<AppData> {
    const [taskRows, subRows, projectRows, categoryRows, profileRes] = await Promise.all([
      this.fetchAll<TaskRow>('tasks', 'position'),
      this.fetchAll<SubtaskRow>('subtasks', 'position'),
      this.fetchAll<ProjectRow>('projects', 'created_at'),
      this.fetchAll<CategoryRow>('categories', 'name'),
      this.db.from('profiles').select('display_name, wip_limit, avatar').eq('id', this.userId).maybeSingle(),
    ])
    check(profileRes.error)

    const subsByTask = new Map<string, Subtask[]>()
    for (const s of subRows) {
      const list = subsByTask.get(s.task_id) ?? []
      list.push({ id: s.id, title: s.title, done: s.done, position: s.position })
      subsByTask.set(s.task_id, list)
    }

    return {
      tasks: taskRows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        startDate: r.start_date,
        dueDate: r.due_date,
        projectId: r.project_id,
        categoryId: r.category_id,
        notes: r.notes,
        position: r.position,
        completedAt: r.completed_at,
        archivedAt: r.archived_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        subtasks: subsByTask.get(r.id) ?? [],
      })),
      projects: projectRows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        color: r.color,
        startDate: r.start_date,
        dueDate: r.due_date,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      categories: categoryRows.map((r) => ({ id: r.id, name: r.name, color: r.color, createdAt: r.created_at })),
      profile: {
        displayName: (profileRes.data?.display_name as string | undefined) ?? '',
        wipLimit: profileRes.data ? ((profileRes.data.wip_limit as number | null) ?? null) : 3,
        avatar: (profileRes.data?.avatar as string | null | undefined) ?? null,
      },
    }
  }

  async saveTasks(tasks: Task[]) {
    if (!tasks.length) return
    // user_id é preenchido pelo servidor (default auth.uid()) e validado pela RLS.
    const rows = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      start_date: t.startDate,
      due_date: t.dueDate,
      project_id: t.projectId,
      category_id: t.categoryId,
      notes: t.notes,
      position: t.position,
      completed_at: t.completedAt,
      archived_at: t.archivedAt,
      created_at: t.createdAt,
    }))
    check((await this.db.from('tasks').upsert(rows)).error)

    const ids = tasks.map((t) => t.id)
    const keep = tasks.flatMap((t) => t.subtasks.map((s) => s.id))
    let del = this.db.from('subtasks').delete().in('task_id', ids)
    if (keep.length) del = del.not('id', 'in', `(${keep.join(',')})`)
    check((await del).error)

    const subRows = tasks.flatMap((t) =>
      t.subtasks.map((s) => ({ id: s.id, task_id: t.id, title: s.title, done: s.done, position: s.position })),
    )
    if (subRows.length) check((await this.db.from('subtasks').upsert(subRows)).error)
  }

  async deleteTasks(ids: string[]) {
    if (!ids.length) return
    check((await this.db.from('tasks').delete().in('id', ids)).error)
  }

  async saveProject(p: Project) {
    const { error } = await this.db.from('projects').upsert({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      start_date: p.startDate,
      due_date: p.dueDate,
      status: p.status,
      created_at: p.createdAt,
    })
    check(error)
  }

  async deleteProject(id: string) {
    check((await this.db.from('projects').delete().eq('id', id)).error)
  }

  async saveCategory(c: Category) {
    const { error } = await this.db
      .from('categories')
      .upsert({ id: c.id, name: c.name, color: c.color, created_at: c.createdAt })
    check(error)
  }

  async deleteCategory(id: string) {
    check((await this.db.from('categories').delete().eq('id', id)).error)
  }

  async saveProfile(profile: Profile) {
    const { error } = await this.db
      .from('profiles')
      .upsert({ id: this.userId, display_name: profile.displayName, wip_limit: profile.wipLimit, avatar: profile.avatar })
    check(error)
  }

  subscribe(onRemoteChange: (deletedId?: string) => void) {
    // Sincronização entre dispositivos via Supabase Realtime (respeita a RLS).
    // Eventos DELETE não aceitam filtro e só trazem a chave primária, por
    // isso o fornecedor de dados ignora ids que não conhece.
    const channel = this.db.channel(`fluxo-${this.userId}`)
    for (const table of ['tasks', 'subtasks', 'projects', 'categories']) {
      const filter = `user_id=eq.${this.userId}`
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, () => onRemoteChange())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, () => onRemoteChange())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (payload) =>
          onRemoteChange((payload.old as { id?: string }).id),
        )
    }
    channel.subscribe()
    return () => {
      void this.db.removeChannel(channel)
    }
  }
}
