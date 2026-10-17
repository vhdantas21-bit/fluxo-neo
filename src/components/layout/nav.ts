import { CalendarDays, ChartColumn, Columns3, FolderKanban, House, Inbox, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  short: string
  icon: LucideIcon
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Início', short: 'Início', icon: House },
  { to: '/quadro', label: 'Meu quadro', short: 'Quadro', icon: Columns3 },
  { to: '/backlog', label: 'Backlog', short: 'Backlog', icon: Inbox },
  { to: '/projetos', label: 'Projetos', short: 'Projetos', icon: FolderKanban },
  { to: '/agenda', label: 'Agenda', short: 'Agenda', icon: CalendarDays },
  { to: '/estatisticas', label: 'Estatísticas', short: 'Estatísticas', icon: ChartColumn },
  { to: '/configuracoes', label: 'Configurações', short: 'Configurações', icon: Settings },
]

/** Destinos principais da barra inferior no celular; os restantes ficam em "Mais". */
export const MOBILE_PRIMARY = ['/', '/quadro', '/backlog', '/agenda']
