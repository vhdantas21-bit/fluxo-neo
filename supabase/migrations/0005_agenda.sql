-- FLUXO NEO — Agenda: horário nas tarefas e lembretes
-- Executar no Supabase: SQL Editor → New query → colar → Run.
-- Pode ser executada mais de uma vez sem erro.
--
-- O app detecta sozinho se esta migração já foi aplicada: antes dela, tudo
-- continua funcionando e só os lembretes e horários ficam indisponíveis.

-- ---------------------------------------------------------------------------
-- Horário opcional das tarefas (vista Semana da Agenda)
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists start_time time,
  add column if not exists end_time time;

alter table public.tasks drop constraint if exists tasks_time_order;
alter table public.tasks
  add constraint tasks_time_order check (
    (start_time is null and end_time is null)
    or (start_time is not null and (end_time is null or end_time > start_time))
  );

-- ---------------------------------------------------------------------------
-- Lembretes (itens leves da Agenda, fora do quadro)
-- ---------------------------------------------------------------------------
create table if not exists public.reminders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  remind_at  timestamptz not null,
  color      text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_user_time_idx on public.reminders (user_id, remind_at);

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

alter table public.reminders enable row level security;

drop policy if exists "Dono: ler" on public.reminders;
drop policy if exists "Dono: criar" on public.reminders;
drop policy if exists "Dono: atualizar" on public.reminders;
drop policy if exists "Dono: eliminar" on public.reminders;
create policy "Dono: ler" on public.reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "Dono: criar" on public.reminders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Dono: atualizar" on public.reminders for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Dono: eliminar" on public.reminders for delete to authenticated using ((select auth.uid()) = user_id);

-- Visitantes não autenticados não têm acesso.
revoke all on public.reminders from anon;

-- Realtime (sincronização entre dispositivos).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reminders'
  ) then
    alter publication supabase_realtime add table public.reminders;
  end if;
end;
$$;
