import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// VITE_* é a configuração manual (.env.local). Os NEXT_PUBLIC_* são criados e
// mantidos pela integração Supabase ↔ Vercel; só as variáveis públicas usam
// esse prefixo, nunca as chaves secretas.
const env = import.meta.env
const url = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined
const anonKey = (env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined

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
