-- FLUXO NEO — checagem de atividade
-- Executar no Supabase: SQL Editor → New query → colar → Run.
--
-- No plano grátis, o Supabase pausa projetos sem uso durante cerca de uma
-- semana. A automação .github/workflows/supabase-keepalive.yml chama esta
-- função a cada 3 dias para registar atividade no banco. Ela só devolve
-- 'ok': não lê nem altera nenhuma tabela e não expõe dados.

create or replace function public.keepalive()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select 'ok'::text
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
