import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Check, CloudOff, Ellipsis, HardDrive, LoaderCircle, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { useSafeSignOut } from '@/auth/useSafeSignOut'
import { Avatar, useDisplayName } from '@/components/profile/Avatar'
import { useData } from '@/store/DataProvider'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { Button } from '@/components/ui/Button'
import ExpandableSearchBar from '@/components/ui/expandable-search-bar'
import NovaTarefaButton from '@/components/NovaTarefaButton'
import { SunMoonThemeToggle } from '@/components/ui/sun-moon-theme-toggle'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { HidePreloadOnMount, afterPreload, useHidePreload } from '@/lib/preload'
import { prefetchAllPages } from '@/pages/lazyPages'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { useSyncState } from '@/lib/syncState'
import { Logo, LogoMark } from './Logo'
import { MOBILE_PRIMARY, NAV } from './nav'
import { ShortcutsDialog } from '@/components/ShortcutsDialog'

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export function AppShell() {
  const { state, loadError, reload } = useData()
  const sync = useSyncState()
  // Em erro de carga o preload sai já; no caso normal, sai quando a página montar (HidePreloadOnMount).
  useHidePreload(state === 'error')
  useEffect(() => afterPreload(prefetchAllPages), [])
  const { openNewTask } = useTaskModal()
  const [searchOpen, setSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const location = useLocation()

  // Atalhos de teclado globais.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      const mod = e.metaKey || e.ctrlKey
      if ((mod && e.key.toLowerCase() === 'k') || (!mod && e.key === '/' && !isTyping(e.target))) {
        e.preventDefault()
        setSearchOpen(true)
      } else if (!mod && !e.altKey && e.key === '?' && !isTyping(e.target)) {
        e.preventDefault()
        setShortcutsOpen(true)
      } else if (!mod && !e.altKey && e.key.toLowerCase() === 'n' && !isTyping(e.target)) {
        e.preventDefault()
        openNewTask(location.pathname === '/backlog' ? { status: 'backlog' } : undefined)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openNewTask, location.pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <Topbar searchOpen={searchOpen} onSearchOpenChange={setSearchOpen} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main id="conteudo" className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-7 lg:pb-10">
          {state === 'loading' ? (
            <div className="flex h-[60vh] items-center justify-center">
              <Spinner label="Carregando suas tarefas…" />
            </div>
          ) : state === 'error' && !sync.online ? (
            <OfflineScreen onRetry={() => reload().catch(() => undefined)} />
          ) : state === 'error' ? (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
              <p className="font-medium">Não foi possível carregar os dados</p>
              <p className="mt-1 text-sm text-fg-subtle">{loadError}</p>
              <Button className="mt-4" variant="primary" onClick={() => reload().catch(() => undefined)}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div key={location.pathname} className="animate-fade-in">
              <Suspense
                fallback={
                  <div className="flex h-[60vh] items-center justify-center">
                    <Spinner label="Carregando…" />
                  </div>
                }
              >
                <Outlet />
                {/* Só monta quando a página (arquivo próprio) e os dados já estão prontos. */}
                <HidePreloadOnMount />
              </Suspense>
            </div>
          )}
        </main>
      </div>
      <MobileNav onMore={() => setMoreOpen(true)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais" size="sm">
        <nav aria-label="Mais seções" className="-mx-2 flex flex-col">
          {NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to)).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm',
                  isActive ? 'bg-primary text-white' : 'text-fg-muted hover:bg-surface-2',
                )
              }
            >
              <Icon size={18} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
      </Modal>
    </div>
  )
}

function Topbar({ searchOpen, onSearchOpenChange }: { searchOpen: boolean; onSearchOpenChange: (open: boolean) => void }) {
  const { openNewTask } = useTaskModal()
  const { pending, repoKind } = useData()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-glass-border bg-bg/85 shadow-[0_8px_24px_-16px_rgb(0_0_0/0.6)] backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <BrandStripes />
      <div className="relative flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-0">
        <Link to="/" className="shrink-0 rounded-lg lg:w-60 lg:px-6" aria-label="FLUXO NEO — início">
          <Logo className="hidden sm:flex" />
          <LogoMark className="sm:hidden" />
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:pr-8">
          <ExpandableSearchBar
            expandDirection="left"
            placeholder="Pesquisar tarefas..."
            width={300}
            open={searchOpen}
            onOpenChange={onSearchOpenChange}
            onSearch={(q) => {
              if (q.trim()) navigate(`/pesquisa?q=${encodeURIComponent(q.trim())}`)
            }}
          />
          <SunMoonThemeToggle size={36} defaultTheme="dark" storageKey={THEME_STORAGE_KEY} sky />
          <SyncStatus pending={pending} local={repoKind === 'local'} />
          <NovaTarefaButton
            title="Nova tarefa (N)"
            onClick={() => openNewTask(location.pathname === '/backlog' ? { status: 'backlog' } : undefined)}
          />
        </div>
      </div>
    </header>
  )
}

/** Faixas diagonais da paleta (assinatura visual da marca), só decorativas. */
function BrandStripes() {
  const stripes = ['#2C50A1', '#132967', '#C43004', '#FEFEFE', '#424242']
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 64"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-y-0 left-[184px] hidden h-full w-36 md:block lg:left-[272px] lg:w-44"
    >
      {stripes.map((color, i) => {
        const x = i * 30
        return <polygon key={color} points={`${x},64 ${x + 24},64 ${x + 60},0 ${x + 36},0`} fill={color} className={color === '#FEFEFE' ? 'brand-stripe-white' : undefined} />
      })}
    </svg>
  )
}

type SyncPhase = 'idle' | 'syncing' | 'done'
const MIN_SYNC_VISIBLE_MS = 900
const DONE_HIGHLIGHT_MS = 1400

/**
 * Indicador de gravação: mostra "Sincronizando…" com um spinner enquanto há
 * gravações (no mínimo ~1 s, para ser perceptível) e depois confirma com o
 * ✓ animado antes de voltar ao estado discreto.
 */
function SyncStatus({ pending: writing, local }: { pending: number; local: boolean }) {
  const [phase, setPhase] = useState<SyncPhase>('idle')
  const startedAt = useRef(0)
  const toast = useToast()
  const sync = useSyncState()
  const offline = !local && !sync.online
  // Fila offline também conta como "sincronizando" quando a conexão volta.
  const pending = writing + (local || offline ? 0 : sync.queued)

  // Avisos ao perder e ao recuperar a conexão (só no modo com conta).
  const wasOffline = useRef(false)
  const hadQueue = useRef(false)
  useEffect(() => {
    if (local) return
    if (offline && !wasOffline.current) {
      toast.error('Você está offline. Pode continuar usando: as alterações ficam salvas neste aparelho e são enviadas quando a conexão voltar.')
    }
    if (!offline && wasOffline.current && !sync.queued && !hadQueue.current) toast.success('Conexão restabelecida.')
    if (!offline && hadQueue.current && sync.queued === 0) toast.success('Conexão restabelecida. Alterações sincronizadas.')
    wasOffline.current = offline
    hadQueue.current = sync.queued > 0
  }, [offline, sync.queued, local, toast])

  useEffect(() => {
    if (pending > 0) {
      if (phase !== 'syncing') {
        startedAt.current = Date.now()
        setPhase('syncing')
      }
      return
    }
    if (phase === 'syncing') {
      const t = window.setTimeout(() => setPhase('done'), Math.max(0, MIN_SYNC_VISIBLE_MS - (Date.now() - startedAt.current)))
      return () => window.clearTimeout(t)
    }
    if (phase === 'done') {
      const t = window.setTimeout(() => setPhase('idle'), DONE_HIGHLIGHT_MS)
      return () => window.clearTimeout(t)
    }
  }, [pending, phase])

  if (offline) {
    const label = sync.queued ? `Offline · ${sync.queued} ${sync.queued === 1 ? 'pendente' : 'pendentes'}` : 'Offline'
    return (
      <span
        role="status"
        aria-live="polite"
        title={sync.queued ? `${label}: serão enviadas quando a conexão voltar` : 'Sem conexão'}
        className="flex animate-fade-in items-center gap-1.5 rounded-full bg-accent/12 px-2 py-1 text-xs font-medium text-accent-text"
      >
        <CloudOff size={14} aria-hidden />
        <span>{label}</span>
      </span>
    )
  }

  const label = phase === 'syncing' ? (local ? 'Salvando…' : 'Sincronizando…') : local ? 'Salvo neste dispositivo' : 'Sincronizado'
  const Icon = phase === 'syncing' ? LoaderCircle : local ? HardDrive : Check

  return (
    <span
      role="status"
      aria-live="polite"
      title={label}
      className={cn(
        'flex items-center gap-1.5 text-xs transition-colors duration-300',
        phase === 'idle' ? 'text-fg-subtle' : 'text-primary-text',
      )}
    >
      <Icon
        key={phase}
        size={14}
        aria-hidden
        className={cn(phase === 'syncing' && 'animate-spin', phase === 'done' && 'animate-sync-pop')}
      />
      <span key={label} className="hidden animate-fade-in md:inline">
        {label}
      </span>
      <span className="sr-only md:hidden">{label}</span>
    </span>
  )
}

function Sidebar() {
  const { mode, user } = useAuth()
  const safeSignOut = useSafeSignOut()
  const { data } = useData()
  const name = useDisplayName()

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col border-r border-glass-border bg-bg/40 px-3 py-5 backdrop-blur-xl lg:flex">
      <nav aria-label="Navegação principal" className="flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-primary font-semibold text-white shadow-lift' : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-white' : 'text-fg-subtle'} aria-hidden />
                {label}
                {isActive && (
                  // Corte diagonal com as cores da marca, como nas faixas do topo.
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2 flex gap-1">
                    <span className="h-full w-1.5 -skew-x-[24deg] bg-accent" />
                    <span className="h-full w-1.5 -skew-x-[24deg] bg-white/85" />
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="surface-panel mt-auto rounded-xl p-3">
        {mode === 'local' ? (
          <Link to="/configuracoes" className="flex items-start gap-2.5 text-xs">
            <HardDrive size={16} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
            <span>
              <span className="block font-medium text-fg">Modo local</span>
              <span className="text-fg-subtle">Sem conta. Configure o Supabase para sincronizar.</span>
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link to="/configuracoes" className="flex shrink-0 rounded-full" aria-label="Editar perfil" title="Editar perfil">
              <Avatar src={data.profile.avatar} name={name} className="h-9 w-9 text-[18px]" />
            </Link>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{name || 'Sem nome'}</span>
              <span className="block truncate text-xs text-fg-subtle">{user?.email}</span>
            </span>
            <button
              type="button"
              onClick={() => void safeSignOut()}
              className="rounded-md p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function MobileNav({ onMore }: { onMore: () => void }) {
  const location = useLocation()
  const moreActive = !MOBILE_PRIMARY.includes(location.pathname) && location.pathname !== '/pesquisa'
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-glass-border bg-bg/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgb(0_0_0/0.6)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary-text' : 'text-fg-subtle',
              )
            }
          >
            <Icon size={20} aria-hidden />
            {short}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMore}
          className={cn(
            'flex flex-col items-center justify-center gap-1 text-[11px] font-medium',
            moreActive ? 'text-primary-text' : 'text-fg-subtle',
          )}
        >
          <Ellipsis size={20} aria-hidden />
          Mais
        </button>
      </div>
    </nav>
  )
}

/** Sem internet e sem cópia dos dados neste aparelho: não há o que mostrar ainda. */
function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  // Tenta de novo sozinho quando a conexão voltar.
  useEffect(() => {
    window.addEventListener('online', onRetry)
    return () => window.removeEventListener('online', onRetry)
  }, [onRetry])
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center px-2 text-center sm:mt-20">
      <div className="relative">
        <LogoMark className="h-16 w-16 opacity-90" />
        <span className="absolute -right-2 -bottom-2 grid h-8 w-8 place-items-center rounded-full bg-accent text-white shadow-card">
          <CloudOff size={16} aria-hidden />
        </span>
      </div>
      <h1 className="mt-6 text-xl font-semibold">Sem conexão</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Para usar o FLUXO NEO sem internet, ele precisa ter carregado suas tarefas neste aparelho pelo menos uma vez. Conecte-se e
        tente de novo: depois disso, o app funciona mesmo offline.
      </p>
      <Button className="mt-6" variant="primary" onClick={onRetry}>
        <RefreshCw size={15} aria-hidden /> Tentar de novo
      </Button>
      <p className="mt-3 text-xs text-fg-subtle">Vamos tentar sozinhos assim que a conexão voltar.</p>
    </div>
  )
}
