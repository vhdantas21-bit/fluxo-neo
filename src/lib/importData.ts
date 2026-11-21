import type { AppData, Category, Priority, Project, ProjectStatus, Recurrence, Subtask, Task, TaskStatus } from '@/types'
import { uid } from './utils'

/**
 * Importação de um arquivo exportado em Configurações (JSON).
 *
 * Regras (seguras para importar várias vezes e em qualquer conta):
 * - nada é apagado nem sobrescrito: só se ACRESCENTA;
 * - itens que já existem nos dados atuais são ignorados: mesmo id, ou mesmo
 *   título/nome com a mesma data de criação (as cópias importadas ganham id
 *   novo, então reimportar o mesmo arquivo também não duplica nada);
 * - os novos itens recebem ids novos (o id original pode pertencer a outra
 *   conta no Supabase, o que a RLS recusaria), com as ligações tarefa →
 *   projeto/categoria refeitas;
 * - categorias com o mesmo nome de uma existente são reaproveitadas;
 * - todos os campos são validados com as mesmas regras do banco; o que não
 *   puder ser corrigido é descartado e contado em `invalid`.
 */
export interface ImportPlan {
  projects: Project[]
  categories: Category[]
  tasks: Task[]
  /** Já existiam (mesmo id, ou categoria com o mesmo nome). */
  skipped: number
  /** Registros sem os campos mínimos (ex.: tarefa sem título). */
  invalid: number
}

export class ImportError extends Error {}

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'doing', 'done']
const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const PROJECT_STATUSES: ProjectStatus[] = ['planned', 'active', 'paused', 'completed']
const FREQS: Recurrence['freq'][] = ['daily', 'weekly', 'monthly', 'yearly']
const MAX_TASKS = 5000

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const title = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const oneOf = <T extends string>(v: unknown, list: T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)
const color = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback)

function dateOnly(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  return Number.isNaN(new Date(`${v}T00:00:00`).getTime()) ? null : v
}
function timestamp(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString()
}
/** Início depois do fim viola a regra do banco: nesse caso o início é descartado. */
function dates(start: unknown, due: unknown): [string | null, string | null] {
  const s = dateOnly(start)
  const d = dateOnly(due)
  return s && d && d < s ? [null, d] : [s, d]
}
/** Identidade de conteúdo: nome + instante de criação (normalizado). */
function fingerprint(name: string, created: string) {
  const d = new Date(created)
  return `${name.trim().toLowerCase()}|${Number.isNaN(d.getTime()) ? created : d.toISOString()}`
}

function recurrence(v: unknown): Recurrence | null {
  if (!isRec(v) || !FREQS.includes(v.freq as Recurrence['freq'])) return null
  const n = Number(v.interval)
  return { freq: v.freq as Recurrence['freq'], interval: Number.isInteger(n) && n >= 1 && n <= 365 ? n : 1 }
}

/** Lê o texto do arquivo e monta o plano de importação contra os dados atuais. */
export function planImport(text: string, current: AppData): ImportPlan {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ImportError('O arquivo não é um JSON válido.')
  }
  if (!isRec(raw) || !Array.isArray(raw.tasks)) {
    throw new ImportError('Este arquivo não parece uma exportação do FLUXO NEO (falta a lista de tarefas).')
  }
  if (raw.tasks.length > MAX_TASKS) throw new ImportError(`O arquivo tem mais de ${MAX_TASKS} tarefas.`)

  const now = new Date().toISOString()
  let skipped = 0
  let invalid = 0

  // Projetos: id antigo → id usado nesta conta.
  const projectIds = new Map<string, string>()
  const existingProjects = new Set(current.projects.map((p) => p.id))
  const projectByPrint = new Map(current.projects.map((p) => [fingerprint(p.name, p.createdAt), p.id]))
  const projects: Project[] = []
  for (const p of Array.isArray(raw.projects) ? raw.projects : []) {
    if (!isRec(p) || typeof p.id !== 'string') {
      invalid++
      continue
    }
    if (existingProjects.has(p.id)) {
      projectIds.set(p.id, p.id)
      skipped++
      continue
    }
    const name = title(p.name, 80)
    if (!name) {
      invalid++
      continue
    }
    const samePrint = typeof p.createdAt === 'string' ? projectByPrint.get(fingerprint(name, p.createdAt)) : undefined
    if (samePrint) {
      projectIds.set(p.id, samePrint)
      skipped++
      continue
    }
    const [startDate, dueDate] = dates(p.startDate, p.dueDate)
    const project: Project = {
      id: uid(),
      name,
      description: str(p.description, 2000),
      color: color(p.color, '#2c50a1'),
      startDate,
      dueDate,
      status: oneOf(p.status, PROJECT_STATUSES, 'active'),
      createdAt: timestamp(p.createdAt, now),
      updatedAt: now,
    }
    projectIds.set(p.id, project.id)
    projects.push(project)
  }

  // Categorias: reaproveita por id ou por nome (o nome é único por usuário).
  const categoryIds = new Map<string, string>()
  const byName = new Map(current.categories.map((c) => [c.name.toLowerCase(), c.id]))
  const existingCategories = new Set(current.categories.map((c) => c.id))
  const categories: Category[] = []
  for (const c of Array.isArray(raw.categories) ? raw.categories : []) {
    if (!isRec(c) || typeof c.id !== 'string') {
      invalid++
      continue
    }
    const name = title(c.name, 40)
    const sameName = name ? byName.get(name.toLowerCase()) : undefined
    if (existingCategories.has(c.id) || sameName) {
      categoryIds.set(c.id, existingCategories.has(c.id) ? c.id : sameName!)
      skipped++
      continue
    }
    if (!name) {
      invalid++
      continue
    }
    const category: Category = { id: uid(), name, color: color(c.color, '#a3a3a3'), createdAt: timestamp(c.createdAt, now) }
    categoryIds.set(c.id, category.id)
    byName.set(name.toLowerCase(), category.id)
    categories.push(category)
  }

  // Tarefas.
  const existingTasks = new Set(current.tasks.map((t) => t.id))
  const taskPrints = new Set(current.tasks.map((t) => fingerprint(t.title, t.createdAt)))
  const tasks: Task[] = []
  for (const t of raw.tasks) {
    if (!isRec(t)) {
      invalid++
      continue
    }
    if (typeof t.id === 'string' && existingTasks.has(t.id)) {
      skipped++
      continue
    }
    const name = title(t.title, 200)
    if (!name) {
      invalid++
      continue
    }
    if (typeof t.createdAt === 'string') {
      const print = fingerprint(name, t.createdAt)
      if (taskPrints.has(print)) {
        skipped++
        continue
      }
      taskPrints.add(print) // também evita duplicados dentro do próprio arquivo
    }
    const status = oneOf(t.status, STATUSES, 'todo')
    const [startDate, dueDate] = dates(t.startDate, t.dueDate)
    const subtasks: Subtask[] = (Array.isArray(t.subtasks) ? t.subtasks : [])
      .filter(isRec)
      .map((s, i) => ({ id: uid(), title: title(s.title, 200), done: s.done === true, position: i }))
      .filter((s) => s.title)
    const created = timestamp(t.createdAt, now)
    tasks.push({
      id: uid(),
      title: name,
      description: str(t.description, 5000),
      status,
      priority: oneOf(t.priority, PRIORITIES, 'medium'),
      startDate,
      dueDate,
      projectId: typeof t.projectId === 'string' ? (projectIds.get(t.projectId) ?? null) : null,
      categoryId: typeof t.categoryId === 'string' ? (categoryIds.get(t.categoryId) ?? null) : null,
      notes: str(t.notes, 10000),
      recurrence: recurrence(t.recurrence),
      position: typeof t.position === 'number' && Number.isFinite(t.position) ? t.position : tasks.length,
      // O banco exige conclusão só em "Feito"; mantém a data original quando houver.
      completedAt: status === 'done' ? timestamp(t.completedAt, created) : null,
      archivedAt: t.archivedAt ? timestamp(t.archivedAt, now) : null,
      createdAt: created,
      updatedAt: now,
      subtasks,
    })
  }

  return { projects, categories, tasks, skipped, invalid }
}
