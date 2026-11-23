import { lazy, type ComponentType } from 'react'

/**
 * Páginas carregadas sob demanda: cada uma vira um arquivo JS próprio, baixado
 * só quando é aberta (ou antecipado por `prefetchRoute`/`prefetchAllPages`).
 */
const loaders = {
  dashboard: () => import('./DashboardPage'),
  board: () => import('./BoardPage'),
  backlog: () => import('./BacklogPage'),
  projects: () => import('./ProjectsPage'),
  projectDetail: () => import('./ProjectDetailPage'),
  week: () => import('./WeekSummaryPage'),
  agenda: () => import('./AgendaPage'),
  stats: () => import('./StatsPage'),
  settings: () => import('./SettingsPage'),
  search: () => import('./SearchPage'),
  notFound: () => import('./NotFoundPage'),
  auth: () => import('./AuthPages'),
}

type Loaders = typeof loaders
function page<K extends keyof Loaders, N extends keyof Awaited<ReturnType<Loaders[K]>>>(key: K, name: N) {
  return lazy(async () => {
    const mod = (await loaders[key]()) as Record<N, ComponentType>
    return { default: mod[name] }
  })
}

export const DashboardPage = page('dashboard', 'DashboardPage')
export const BoardPage = page('board', 'BoardPage')
export const BacklogPage = page('backlog', 'BacklogPage')
export const ProjectsPage = page('projects', 'ProjectsPage')
export const ProjectDetailPage = page('projectDetail', 'ProjectDetailPage')
export const WeekSummaryPage = page('week', 'WeekSummaryPage')
export const AgendaPage = page('agenda', 'AgendaPage')
export const StatsPage = page('stats', 'StatsPage')
export const SettingsPage = page('settings', 'SettingsPage')
export const SearchPage = page('search', 'SearchPage')
export const NotFoundPage = page('notFound', 'NotFoundPage')
export const LoginPage = page('auth', 'LoginPage')
export const RegisterPage = page('auth', 'RegisterPage')
export const ForgotPasswordPage = page('auth', 'ForgotPasswordPage')
export const ResetPasswordPage = page('auth', 'ResetPasswordPage')

const ROUTES: [RegExp, keyof Loaders][] = [
  [/^\/$/, 'dashboard'],
  [/^\/quadro\/?$/, 'board'],
  [/^\/backlog\/?$/, 'backlog'],
  [/^\/projetos\/?$/, 'projects'],
  [/^\/projetos\/.+/, 'projectDetail'],
  [/^\/semana\/?$/, 'week'],
  [/^\/agenda\/?$/, 'agenda'],
  [/^\/estatisticas\/?$/, 'stats'],
  [/^\/configuracoes\/?$/, 'settings'],
  [/^\/pesquisa\/?$/, 'search'],
  [/^\/(entrar|cadastro|recuperar-senha|redefinir-senha)\/?$/, 'auth'],
]

/** Começa a baixar a página do endereço atual já na abertura, em paralelo com login e dados. */
export function prefetchRoute(pathname: string) {
  const hit = ROUTES.find(([re]) => re.test(pathname))
  void (hit ? loaders[hit[1]]() : loaders.dashboard()).catch(() => undefined)
}

/** Com o app aberto e o navegador ocioso, antecipa as outras páginas para a navegação ser imediata. */
export function prefetchAllPages() {
  const run = () => {
    for (const key of Object.keys(loaders) as (keyof Loaders)[]) {
      if (key !== 'auth') void loaders[key]().catch(() => undefined)
    }
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 1500)
}
