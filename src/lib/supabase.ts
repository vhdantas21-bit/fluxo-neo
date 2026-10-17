import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Verdadeiro quando as variáveis públicas do Supabase estão definidas. */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('SEU-PROJETO'))

/**
 * Cliente Supabase com a chave pública "anon". A segurança dos dados é
 * garantida pelas políticas RLS na base de dados, nunca por esta chave.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
