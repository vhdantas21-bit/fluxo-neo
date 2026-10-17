import type { AppData, Category, Profile, Project, Task } from '@/types'

/**
 * Contrato da camada de dados. A interface é independente do backend:
 * `LocalRepository` salva no navegador e `SupabaseRepository` salva no
 * PostgreSQL do Supabase, isolado por usuário através de RLS.
 *
 * Futuras funcionalidades (recorrência, colaboração, notificações, IA) devem
 * ser acrescentadas aqui primeiro e depois implementadas em cada backend.
 */
export interface DataRepository {
  readonly kind: 'local' | 'supabase'
  load(): Promise<AppData>
  /** Cria ou atualiza tarefas, incluindo as respetivas subtarefas. */
  saveTasks(tasks: Task[]): Promise<void>
  deleteTasks(ids: string[]): Promise<void>
  saveProject(project: Project): Promise<void>
  /** Exclui o projeto; as tarefas associadas ficam sem projeto. */
  deleteProject(id: string): Promise<void>
  saveCategory(category: Category): Promise<void>
  /** Exclui a categoria; as tarefas associadas ficam sem categoria. */
  deleteCategory(id: string): Promise<void>
  saveProfile(profile: Profile): Promise<void>
  /**
   * Notifica alterações feitas em outro separador ou dispositivo. Em
   * excluições, `deletedId` indica o registro removido (quando conhecido).
   */
  subscribe(onRemoteChange: (deletedId?: string) => void): () => void
}
