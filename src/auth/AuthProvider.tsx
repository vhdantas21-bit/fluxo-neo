import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface AuthApi {
  /** 'local' quando o Supabase não está configurado (sem autenticação). */
  mode: 'local' | 'supabase'
  loading: boolean
  session: Session | null
  user: User | null
  /** Verdadeiro após abrir o link de recuperação de senha. */
  recovering: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean }>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'Email ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (m.includes('already registered')) return 'Já existe uma conta com este email.'
  if (m.includes('password should be')) return 'A senha deve ter pelo menos 8 caracteres.'
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  if (m.includes('fetch')) return 'Sem conexão com o servidor. Verifique sua internet.'
  return message
}

function db() {
  if (!supabase) throw new Error('O Supabase não está configurado.')
  return supabase
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const api = useMemo<AuthApi>(
    () => ({
      mode: isSupabaseConfigured ? 'supabase' : 'local',
      loading,
      session,
      user: session?.user ?? null,
      recovering,
      async signIn(email, password) {
        const { error } = await db().auth.signInWithPassword({ email, password })
        if (error) throw new Error(translateAuthError(error.message))
      },
      async signUp(email, password, name) {
        const { data, error } = await db().auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/` },
        })
        if (error) throw new Error(translateAuthError(error.message))
        return { needsConfirmation: !data.session }
      },
      async sendPasswordReset(email) {
        const { error } = await db().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        })
        if (error) throw new Error(translateAuthError(error.message))
      },
      async updatePassword(password) {
        const { error } = await db().auth.updateUser({ password })
        if (error) throw new Error(translateAuthError(error.message))
        setRecovering(false)
      },
      async signOut() {
        const { error } = await db().auth.signOut()
        if (error) throw new Error(translateAuthError(error.message))
      },
    }),
    [loading, session, recovering],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
