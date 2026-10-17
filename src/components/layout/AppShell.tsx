import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Ellipsis, HardDrive, LogOut, Plus, Search } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/store/DataProvider'
import { useTaskModal } from '@/components/tasks/TaskModalProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { cn, errorMessage } from '@/lib/utils'
import { Logo, LogoMark } from './Logo'
import { MOBILE_PRIMARY, NAV } from './nav'

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export function AppShell() {
  const { state, loadError, reload } = useData()
  const { openNewTask } = useTaskModal()
  const searchRef = useRef<HTMLInputElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

  // Atalhos de teclado globais.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      const mod = e.metaKey || e.ctrlKey
      if ((mod && e.key.toLowerCase() === 'k') || (!mod && e.key === '/' && !isTyping(e.target))) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
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
      <Topbar searchRef={searchRef} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main id="conteudo" className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-7 lg:pb-10">
          {state === 'loading' ? (
            <div className="flex h-[60vh] items-center justify-center">
              <Spinner label="Carregando suas tarefas…" />
            </div>
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
              <Outlet />
            </div>
          )}
        </main>
      </div>
      <MobileNav onMore={() => setMoreOpen(true)} />
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
                  isActive ? 'bg-deep text-fg' : 'text-fg-muted hover:bg-surface-2',
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

function Topbar({ searchRef }: { searchRef: React.RefObject<HTMLInputElement | null> }) {
  const { openNewTask } = useTaskModal()
  const { pending, repoKind } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const onSearchPage = location.pathname === '/pesquisa'
  const [q, setQ] = useState(onSearchPage ? (params.get('q') ?? '') : '')

  useEffect(() => {
    if (!onSearchPage) setQ('')
  }, [onSearchPage])

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-0">
        <Link to="/" className="shrink-0 rounded-lg lg:w-60 lg:px-6" aria-label="FLUXO NEO — início">
          <Logo className="hidden sm:flex" />
          <LogoMark className="sm:hidden" />
        </Link>
        <form
          role="search"
          className="relative min-w-0 flex-1 lg:max-w-xl lg:pl-8"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(`/pesquisa?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle lg:left-11" aria-hidden />
          <label htmlFor="global-search" className="sr-only">
            Pesquisar tarefas
          </label>
          <input
            id="global-search"
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              if (onSearchPage) navigate(`/pesquisa?q=${encodeURIComponent(e.target.value)}`, { replace: true })
            }}
            placeholder="Pesquisar tarefas…"
            className="h-10 w-full rounded-lg border border-line bg-surface pr-12 pl-9 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line-strong px-1.5 text-[11px] text-fg-subtle sm:block">
            /
          </kbd>
        </form>
        <div className="ml-auto flex items-center gap-3 lg:pr-8">
          <span className="hidden items-center gap-1.5 text-xs text-fg-subtle md:flex" aria-live="polite">
            {pending > 0 ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-line-strong border-t-primary-text" aria-hidden />
                Salvando…
              </>
            ) : (
              <>
                {repoKind === 'local' ? <HardDrive size={13} aria-hidden /> : <Check size={13} aria-hidden />}
                {repoKind === 'local' ? 'Salvo neste dispositivo' : 'Sincronizado'}
              </>
            )}
          </span>
          <Button
            variant="primary"
            onClick={() => openNewTask(location.pathname === '/backlog' ? { status: 'backlog' } : undefined)}
            className="max-sm:w-10 max-sm:px-0"
            aria-label="Nova tarefa"
            title="Nova tarefa (N)"
          >
            <Plus size={18} aria-hidden />
            <span className="hidden sm:inline">Nova tarefa</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

function Sidebar() {
  const { mode, user, signOut } = useAuth()
  const { data } = useData()
  const toast = useToast()
  const name = data.profile.displayName || user?.email || ''

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col border-r border-line px-3 py-5 lg:flex">
      <nav aria-label="Navegação principal" className="flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-deep text-fg' : 'text-fg-muted hover:bg-surface hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-primary-text' : 'text-fg-subtle'} aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-xl border border-line bg-surface p-3">
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-deep text-xs font-semibold uppercase">
              {name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{data.profile.displayName || 'Sem nome'}</span>
              <span className="block truncate text-xs text-fg-subtle">{user?.email}</span>
            </span>
            <button
              type="button"
              onClick={() => signOut().catch((e) => toast.error(errorMessage(e)))}
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
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
