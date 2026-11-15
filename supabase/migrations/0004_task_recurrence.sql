-- FLUXO NEO — tarefas recorrentes
-- Executar no Supabase: SQL Editor → New query → colar → Run.
--
-- A regra fica em JSON na própria tarefa: {"freq":"weekly","interval":1}.
-- Ao concluir uma tarefa com regra, o app cria a próxima ocorrência em
-- "A Fazer" e limpa a regra da tarefa concluída (ver lib/recurrence.ts).
-- A coluna herda a RLS de tasks.

alter table public.tasks
  add column if not exists recurrence jsonb
  check (
    recurrence is null
    or (
      jsonb_typeof(recurrence) = 'object'
      and recurrence ->> 'freq' in ('daily', 'weekly', 'monthly', 'yearly')
      and (recurrence ->> 'interval') ~ '^[0-9]+$'
      and (recurrence ->> 'interval')::int between 1 and 365
    )
  );
