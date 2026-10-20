export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'done'
export type BoardStatus = Exclude<TaskStatus, 'backlog'>
export type Priority = 'low' | 'medium' | 'high'
export type ProjectStatus = 'planned' | 'active' | 'paused' | 'completed'

/** Datas sem hora no formato ISO `YYYY-MM-DD`. */
export type DateOnly = string
/** Instantes no formato ISO 8601 completo. */
export type Timestamp = string

export interface Subtask {
  id: string
  title: string
  done: boolean
  position: number
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  /** Data de início / execução planejada. */
  startDate: DateOnly | null
  dueDate: DateOnly | null
  projectId: string | null
  categoryId: string | null
  notes: string
  /** Ordem dentro da coluna (menor = mais acima). */
  position: number
  completedAt: Timestamp | null
  archivedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  subtasks: Subtask[]
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  startDate: DateOnly | null
  dueDate: DateOnly | null
  status: ProjectStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Category {
  id: string
  name: string
  color: string
  createdAt: Timestamp
}

export interface Profile {
  displayName: string
  /** Limite de tarefas em "Fazendo" (WIP). null = sem limite. */
  wipLimit: number | null
  /** Foto de perfil como data URL JPEG já reduzida (ver lib/avatar.ts). null = sem foto. */
  avatar: string | null
}

export interface AppData {
  tasks: Task[]
  projects: Project[]
  categories: Category[]
  profile: Profile
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  doing: 'Fazendo',
  done: 'Feito',
}

export const STATUS_HINT: Record<TaskStatus, string> = {
  backlog: 'Ideias e tarefas ainda não planejadas',
  todo: 'Ideias e objetivos prontos para começar',
  doing: 'Em execução — ainda falta concluir',
  done: 'Concluídas e terminadas',
}

export const BOARD_STATUSES: BoardStatus[] = ['todo', 'doing', 'done']
export const ALL_STATUSES: TaskStatus[] = ['backlog', 'todo', 'doing', 'done']

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}
export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 }

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: 'Planejado',
  active: 'Ativo',
  paused: 'Em pausa',
  completed: 'Concluído',
}

/** Cores identificadoras derivadas exclusivamente da paleta da marca. */
export const PALETTE_SWATCHES = [
  { value: '#5677C4', label: 'Azul' },
  { value: '#9DB3E6', label: 'Azul claro' },
  { value: '#5B6EAC', label: 'Azul escuro' },
  { value: '#DE6A43', label: 'Laranja' },
  { value: '#F2A88B', label: 'Laranja claro' },
  { value: '#8F8F8F', label: 'Cinza' },
  { value: '#E5E5E5', label: 'Branco' },
] as const
