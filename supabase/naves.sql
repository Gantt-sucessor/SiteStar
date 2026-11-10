-- ============================================================
-- Naves do grupo (rode no SQL Editor do Supabase)
-- As naves inimigas usam a tabela npcs (só o mestre vê).
-- ============================================================
alter table public.campaigns add column if not exists vehicles jsonb not null default '[]'::jsonb;
