import type { AppData, Category, Profile, Project, Task } from '@/types'
import { setSyncState } from '@/lib/syncState'
import { OfflineError, isNetworkError, type DataRepository } from './repository'

/**
 * Camada offline sobre o repositório do Supabase.
 *
 * - Cada gravação entra numa fila (outbox) guardada NESTE aparelho e é enviada
 *   pela ordem em que foi feita. Sem rede, a fila espera; nada se perde ao
 *   fechar ou recarregar a página.
 * - Uma cópia dos dados (cache) é mantida a cada carga e a cada alteração, para
 *   o app abrir e funcionar sem internet.
 * - Falha de REDE: a operação fica na fila e é repetida quando a conexão volta
 *   (evento "online" e nova tentativa periódica).
 * - RECUSA do servidor (validação, permissão): a operação sai da fila e o erro
 *   sobe para o DataProvider, que avisa e recarrega o estado real.
 * - Conflitos: a última alteração enviada prevalece (uso pessoal).
 *
 * A cópia e a fila são apagadas ao sair da conta (clearOfflineData).
 */

type Op =
  | { k: 'saveTasks'; tasks: Task[] }
  | { k: 'deleteTasks'; ids: string[] }
  | { k: 'saveProject'; project: Project }
  | { k: 'deleteProject'; id: string }
  | { k: 'saveCategory'; category: Category }
  | { k: 'deleteCategory'; id: string }
  | { k: 'saveProfile'; profile: Profile }

const RETRY_MS = 20_000
const cacheKey = (userId: string) => `fluxo-neo:offline:${userId}:cache`
const outboxKey = (userId: string) => `fluxo-neo:offline:${userId}:outbox`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* armazenamento cheio ou bloqueado: segue só em memória */
  }
}

/** Apaga a cópia local e a fila de um usuário (ao sair da conta). */
export function clearOfflineData(userId: string) {
  try {
    localStorage.removeItem(cacheKey(userId))
    localStorage.removeItem(outboxKey(userId))
  } catch {
    /* nada a fazer */
  }
  setSyncState({ queued: 0 })
}

/** Aplica uma operação à cópia local, com a mesma semântica do servidor. */
function apply(d: AppData, op: Op): AppData {
  switch (op.k) {
    case 'saveTasks': {
      const byId = new Map(op.tasks.map((t) => [t.id, t]))
      const known = new Set(d.tasks.map((t) => t.id))
      return { ...d, tasks: [...d.tasks.map((t) => byId.get(t.id) ?? t), ...op.tasks.filter((t) => !known.has(t.id))] }
    }
    case 'deleteTasks': {
      const ids = new Set(op.ids)
      return { ...d, tasks: d.tasks.filter((t) => !ids.has(t.id)) }
    }
    case 'saveProject': {
      const exists = d.projects.some((p) => p.id === op.project.id)
      return { ...d, projects: exists ? d.projects.map((p) => (p.id === op.project.id ? op.project : p)) : [...d.projects, op.project] }
    }
    case 'deleteProject':
      return {
        ...d,
        projects: d.projects.filter((p) => p.id !== op.id),
        tasks: d.tasks.map((t) => (t.projectId === op.id ? { ...t, projectId: null } : t)),
      }
    case 'saveCategory': {
      const exists = d.categories.some((c) => c.id === op.category.id)
      return {
        ...d,
        categories: exists ? d.categories.map((c) => (c.id === op.category.id ? op.category : c)) : [...d.categories, op.category],
      }
    }
    case 'deleteCategory':
      return {
        ...d,
        categories: d.categories.filter((c) => c.id !== op.id),
        tasks: d.tasks.map((t) => (t.categoryId === op.id ? { ...t, categoryId: null } : t)),
      }
    case 'saveProfile':
      return { ...d, profile: op.profile }
  }
}

export class OfflineRepository implements DataRepository {
  readonly kind = 'supabase' as const
  private outbox: Op[]
  private cache: AppData | null
  private chain: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly inner: DataRepository,
    private readonly userId: string,
  ) {
    this.outbox = read<Op[]>(outboxKey(userId)) ?? []
    this.cache = read<AppData>(cacheKey(userId))
    setSyncState({ queued: this.outbox.length })
  }

  // ---- Persistência local --------------------------------------------------

  private saveOutbox() {
    write(outboxKey(this.userId), this.outbox)
    setSyncState({ queued: this.outbox.length })
  }
  private saveCache() {
    if (this.cache) write(cacheKey(this.userId), this.cache)
  }

  private run(op: Op): Promise<void> {
    switch (op.k) {
      case 'saveTasks':
        return this.inner.saveTasks(op.tasks)
      case 'deleteTasks':
        return this.inner.deleteTasks(op.ids)
      case 'saveProject':
        return this.inner.saveProject(op.project)
      case 'deleteProject':
        return this.inner.deleteProject(op.id)
      case 'saveCategory':
        return this.inner.saveCategory(op.category)
      case 'deleteCategory':
        return this.inner.deleteCategory(op.id)
      case 'saveProfile':
        return this.inner.saveProfile(op.profile)
    }
  }

  /**
   * Envia a fila, uma operação de cada vez e sempre pela ordem. Devolve quantas
   * foram enviadas. Para (sem erro) ao primeiro problema de rede; uma recusa do
   * servidor descarta a operação e é lançada.
   */
  flush(): Promise<number> {
    const p = this.chain.then(async () => {
      let sent = 0
      while (this.outbox.length) {
        if (!navigator.onLine) {
          setSyncState({ online: false })
          return sent
        }
        const op = this.outbox[0]
        try {
          await this.run(op)
        } catch (e) {
          if (isNetworkError(e)) {
            setSyncState({ online: false })
            return sent
          }
          this.outbox.shift()
          this.saveOutbox()
          throw e
        }
        this.outbox.shift()
        this.saveOutbox()
        setSyncState({ online: true })
        sent++
      }
      return sent
    })
    this.chain = p.catch(() => undefined)
    return p
  }

  private async enqueue(op: Op) {
    this.outbox.push(op)
    this.saveOutbox()
    if (this.cache) {
      this.cache = apply(this.cache, op)
      this.saveCache()
    }
    await this.flush()
  }

  // ---- DataRepository ------------------------------------------------------

  async load(): Promise<AppData> {
    // Antes de ler do servidor, tenta enviar o que ficou pendente; se ainda
    // houver fila (sem rede), a verdade é a cópia local.
    await this.flush().catch(() => undefined)
    if (this.outbox.length) {
      if (this.cache) return this.cache
      throw new OfflineError()
    }
    try {
      const fresh = await this.inner.load()
      setSyncState({ online: true })
      this.cache = fresh
      this.saveCache()
      return fresh
    } catch (e) {
      if (!isNetworkError(e)) throw e
      setSyncState({ online: false })
      if (this.cache) return this.cache
      throw new OfflineError()
    }
  }

  saveTasks(tasks: Task[]) {
    return this.enqueue({ k: 'saveTasks', tasks })
  }
  deleteTasks(ids: string[]) {
    return this.enqueue({ k: 'deleteTasks', ids })
  }
  saveProject(project: Project) {
    return this.enqueue({ k: 'saveProject', project })
  }
  deleteProject(id: string) {
    return this.enqueue({ k: 'deleteProject', id })
  }
  saveCategory(category: Category) {
    return this.enqueue({ k: 'saveCategory', category })
  }
  deleteCategory(id: string) {
    return this.enqueue({ k: 'deleteCategory', id })
  }
  saveProfile(profile: Profile) {
    return this.enqueue({ k: 'saveProfile', profile })
  }

  subscribe(onRemoteChange: (deletedId?: string) => void) {
    const unsubscribe = this.inner.subscribe(onRemoteChange)

    // Quando a conexão volta, reenvia a fila e recarrega do servidor (traz o que
    // mudou noutros aparelhos). Enquanto houver fila, tenta de novo periodicamente.
    const retry = async (reloadAfter: boolean) => {
      const sent = await this.flush().catch(() => 0)
      if (reloadAfter || (sent > 0 && !this.outbox.length)) onRemoteChange()
    }
    const onOnline = () => void retry(true)
    window.addEventListener('online', onOnline)
    const timer = window.setInterval(() => {
      if (this.outbox.length) void retry(false)
    }, RETRY_MS)

    return () => {
      window.removeEventListener('online', onOnline)
      window.clearInterval(timer)
      unsubscribe()
    }
  }
}
