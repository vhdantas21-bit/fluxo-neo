-- FLUXO NEO — esquema inicial
-- Executar no Supabase: SQL Editor → New query → colar → Run
-- (ou `supabase db push` com a CLI).
--
-- Cada tabela tem user_id e Row Level Security: cada utilizador só lê e
-- escreve as suas próprias linhas. As chaves estrangeiras compostas
-- (id, user_id) impedem associar uma tarefa a um projeto de outra pessoa.

-- ---------------------------------------------------------------------------
-- Funções utilitárias
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  wip_limit    integer default 3 check (wip_limit between 1 and 20),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente no registo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Projetos
-- ---------------------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  color       text not null default '#3055A0' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  start_date  date,
  due_date    date,
  status      text not null default 'active' check (status in ('planned', 'active', 'paused', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  check (due_date is null or start_date is null or due_date >= start_date)
);
create index projects_user_idx on public.projects (user_id);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  color      text not null default '#A3A3A3' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index categories_user_name_idx on public.categories (user_id, lower(name));

-- ---------------------------------------------------------------------------
-- Tarefas
-- ---------------------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id   uuid,
  category_id  uuid,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  description  text not null default '' check (char_length(description) <= 5000),
  notes        text not null default '' check (char_length(notes) <= 10000),
  status       text not null default 'todo' check (status in ('backlog', 'todo', 'doing', 'done')),
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  start_date   date,
  due_date     date,
  position     double precision not null default 0,
  completed_at timestamptz,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  check (due_date is null or start_date is null or due_date >= start_date),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete set null (project_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);
create index tasks_user_status_idx on public.tasks (user_id, status, position);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_category_idx on public.tasks (category_id);

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Mantém completed_at coerente com o estado, mesmo que o cliente falhe.
create or replace function public.sync_task_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    if new.completed_at is null then
      new.completed_at = now();
    end if;
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_completion before insert or update on public.tasks
  for each row execute function public.sync_task_completion();

-- ---------------------------------------------------------------------------
-- Subtarefas
-- ---------------------------------------------------------------------------
create table public.subtasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id    uuid not null,
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  done       boolean not null default false,
  position   double precision not null default 0,
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);
create index subtasks_task_idx on public.subtasks (task_id);
create index subtasks_user_idx on public.subtasks (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.projects   enable row level security;
alter table public.categories enable row level security;
alter table public.tasks      enable row level security;
alter table public.subtasks   enable row level security;

create policy "Perfil: ler o próprio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Perfil: criar o próprio" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Perfil: atualizar o próprio" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare
  t text;
begin
  foreach t in array array['projects', 'categories', 'tasks', 'subtasks'] loop
    execute format('create policy "Dono: ler" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "Dono: criar" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Dono: atualizar" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "Dono: eliminar" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- Visitantes não autenticados não têm acesso a nada.
revoke all on public.profiles, public.projects, public.categories, public.tasks, public.subtasks from anon;

-- ---------------------------------------------------------------------------
-- Realtime (sincronização entre dispositivos)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.tasks, public.subtasks, public.projects, public.categories;
