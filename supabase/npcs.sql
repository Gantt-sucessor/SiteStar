-- ============================================================
-- NPCs / ameaças do mestre (rode no SQL Editor do Supabase)
-- Visíveis e editáveis somente pelo mestre da campanha.
-- ============================================================

create table if not exists public.npcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  in_scene boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists npcs_campaign_idx on public.npcs (campaign_id, created_at);

drop trigger if exists npcs_touch on public.npcs;
create trigger npcs_touch before update on public.npcs
  for each row execute function public.touch_updated_at();

alter table public.npcs enable row level security;

drop policy if exists "mestre gerencia npcs" on public.npcs;
create policy "mestre gerencia npcs" on public.npcs for all to authenticated
  using (public.is_campaign_master(campaign_id))
  with check (public.is_campaign_master(campaign_id));
