import { useMemo, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { LocalRepository } from '@/data/localRepository'
import { SupabaseRepository } from '@/data/supabaseRepository'
import { supabase } from '@/lib/supabase'
import { DataProvider } from '@/store/DataProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { Spinner } from '@/components/ui/misc'
import { TaskModalProvider } from '@/components/tasks/TaskModalProvider'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { BoardPage } from '@/pages/BoardPage'
import { BacklogPage } from '@/pages/BacklogPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { AgendaPage } from '@/pages/AgendaPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SearchPage } from '@/pages/SearchPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '@/pages/AuthPages'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

function AppRoutes() {
  const { mode, loading, session, recovering } = useAuth()

  if (loading)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Iniciando…" />
      </div>
    )

  // Supabase configurado e sem sessão: só as páginas de autenticação.
  if (mode === 'supabase' && !session)
    return (
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="*" element={<RedirectToLogin />} />
      </Routes>
    )

  if (recovering)
    return (
      <Routes>
        <Route path="*" element={<ResetPasswordPage />} />
      </Routes>
    )

  return (
    <Workspace>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="quadro" element={<BoardPage />} />
          <Route path="backlog" element={<BacklogPage />} />
          <Route path="projetos" element={<ProjectsPage />} />
          <Route path="projetos/:id" element={<ProjectDetailPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="estatisticas" element={<StatsPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
          <Route path="pesquisa" element={<SearchPage />} />
          <Route path="entrar" element={<Navigate to="/" replace />} />
          <Route path="cadastro" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Workspace>
  )
}

function RedirectToLogin() {
  const location = useLocation()
  return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
}

/** Escolhe o backend de dados e monta os fornecedores da área de trabalho. */
function Workspace({ children }: { children: ReactNode }) {
  const { mode, user } = useAuth()
  const userId = user?.id
  const repo = useMemo(
    () => (mode === 'supabase' && supabase && userId ? new SupabaseRepository(supabase, userId) : new LocalRepository()),
    [mode, userId],
  )
  return (
    <DataProvider key={userId ?? 'local'} repo={repo}>
      <TaskModalProvider>{children}</TaskModalProvider>
    </DataProvider>
  )
}
