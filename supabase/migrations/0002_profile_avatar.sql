-- FLUXO NEO — foto de perfil
-- Executar no Supabase: SQL Editor → New query → colar → Run.
--
-- A foto é guardada como data URL JPEG já reduzida no navegador
-- (até 320×320 px, normalmente 20–60 KB), por isso cabe numa coluna de
-- texto e herda as políticas RLS do perfil: cada usuário só lê e
-- altera a própria foto.

alter table public.profiles
  add column if not exists avatar text
  check (
    avatar is null
    or (char_length(avatar) <= 400000 and avatar like 'data:image/jpeg;base64,%')
  );
