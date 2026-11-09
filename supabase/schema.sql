-- ============================================================
-- HOLOCRON — Star Wars Saga RPG
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Perfis ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name',
             new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set display_name = excluded.display_name, avatar_url = excluded.avatar_url;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfis para usuários que já existiam antes deste script
insert into public.profiles (id, display_name, avatar_url)
select id,
       coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', split_part(email, '@', 1)),
       raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

-- ---------- Campanhas ----------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  era text default 'rebeliao',
  code text not null unique,
  master_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- crawl: { episode, title, text }   initiative: { order: [...], turn, round }
  crawl jsonb not null default '{}'::jsonb,
  initiative jsonb not null default '{"order": [], "turn": 0, "round": 1}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- Anotações privadas do mestre (separadas para não vazarem aos jogadores)
create table if not exists public.campaign_secrets (
  campaign_id uuid primary key references public.campaigns (id) on delete cascade,
  notes text not null default ''
);

-- ---------- Personagens ----------
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  name text not null default 'Sem nome',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists characters_touch on public.characters;
create trigger characters_touch before update on public.characters
  for each row execute function public.touch_updated_at();

-- ---------- Rolagens ----------
create table if not exists public.rolls (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  character_name text,
  label text,
  formula text not null,
  kind text default 'free',
  result jsonb not null,
  total integer not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists rolls_campaign_idx on public.rolls (campaign_id, created_at desc);

-- ---------- Funções auxiliares (security definer evita recursão de RLS) ----------
create or replace function public.is_campaign_master(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from campaigns where id = cid and master_id = auth.uid());
$$;

create or replace function public.is_campaign_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from campaigns where id = cid and master_id = auth.uid())
      or exists (select 1 from campaign_members where campaign_id = cid and user_id = auth.uid());
$$;

-- Entrar numa campanha pelo código
create or replace function public.join_campaign(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  select id into cid from campaigns where code = upper(trim(p_code));
  if cid is null then raise exception 'Código de campanha inválido'; end if;
  insert into campaign_members (campaign_id, user_id) values (cid, auth.uid())
  on conflict do nothing;
  return cid;
end $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.campaign_secrets enable row level security;
alter table public.characters enable row level security;
alter table public.rolls enable row level security;

drop policy if exists "perfis visíveis" on public.profiles;
create policy "perfis visíveis" on public.profiles for select to authenticated using (true);
drop policy if exists "editar meu perfil" on public.profiles;
create policy "editar meu perfil" on public.profiles for update to authenticated using (id = auth.uid());

drop policy if exists "ver campanhas" on public.campaigns;
create policy "ver campanhas" on public.campaigns for select to authenticated
  using (public.is_campaign_member(id));
drop policy if exists "criar campanha" on public.campaigns;
create policy "criar campanha" on public.campaigns for insert to authenticated
  with check (master_id = auth.uid());
drop policy if exists "mestre edita" on public.campaigns;
create policy "mestre edita" on public.campaigns for update to authenticated
  using (master_id = auth.uid());
drop policy if exists "mestre apaga" on public.campaigns;
create policy "mestre apaga" on public.campaigns for delete to authenticated
  using (master_id = auth.uid());

drop policy if exists "ver membros" on public.campaign_members;
create policy "ver membros" on public.campaign_members for select to authenticated
  using (public.is_campaign_member(campaign_id));
drop policy if exists "sair ou expulsar" on public.campaign_members;
create policy "sair ou expulsar" on public.campaign_members for delete to authenticated
  using (user_id = auth.uid() or public.is_campaign_master(campaign_id));

drop policy if exists "segredos do mestre" on public.campaign_secrets;
create policy "segredos do mestre" on public.campaign_secrets for all to authenticated
  using (public.is_campaign_master(campaign_id))
  with check (public.is_campaign_master(campaign_id));

drop policy if exists "ver personagens" on public.characters;
create policy "ver personagens" on public.characters for select to authenticated
  using (owner_id = auth.uid() or (campaign_id is not null and public.is_campaign_member(campaign_id)));
drop policy if exists "criar personagem" on public.characters;
create policy "criar personagem" on public.characters for insert to authenticated
  with check (owner_id = auth.uid() and (campaign_id is null or public.is_campaign_member(campaign_id)));
drop policy if exists "editar personagem" on public.characters;
create policy "editar personagem" on public.characters for update to authenticated
  using (owner_id = auth.uid() or (campaign_id is not null and public.is_campaign_master(campaign_id)))
  with check (campaign_id is null or public.is_campaign_member(campaign_id));
drop policy if exists "apagar personagem" on public.characters;
create policy "apagar personagem" on public.characters for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "ver rolagens" on public.rolls;
create policy "ver rolagens" on public.rolls for select to authenticated
  using (public.is_campaign_member(campaign_id)
         and (not hidden or user_id = auth.uid() or public.is_campaign_master(campaign_id)));
drop policy if exists "rolar" on public.rolls;
create policy "rolar" on public.rolls for insert to authenticated
  with check (user_id = auth.uid() and public.is_campaign_member(campaign_id));
drop policy if exists "mestre limpa rolagens" on public.rolls;
create policy "mestre limpa rolagens" on public.rolls for delete to authenticated
  using (public.is_campaign_master(campaign_id));

grant execute on function public.join_campaign(text) to authenticated;

-- ---------- Realtime ----------
do $$
begin
  begin alter publication supabase_realtime add table public.rolls; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.characters; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.campaigns; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.campaign_members; exception when duplicate_object then null; end;
end $$;

-- ---------- NPCs do mestre (também disponível separado em supabase/npcs.sql) ----------
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
