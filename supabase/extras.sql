-- Holocron: extras de imersão (mapa da galáxia, holocron de lore, contratos da Guilda).
-- Rode este arquivo uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.

-- ---------- Mapa da galáxia e holocron ----------
alter table public.campaigns add column if not exists galaxy jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists codex jsonb not null default '[]'::jsonb;   -- registros desbloqueados (jogadores veem)
alter table public.campaign_secrets add column if not exists codex jsonb not null default '[]'::jsonb; -- rascunhos do mestre

-- ---------- Quadro de contratos da Guilda ----------
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  title text not null,
  target text,
  description text,
  location text,
  danger text,
  image text,
  reward integer not null default 0,
  rep integer not null default 1,
  status text not null default 'aberto' check (status in ('aberto', 'aceito', 'concluido', 'falhou')),
  accepted_by uuid references public.characters (id) on delete set null,
  accepted_name text,
  created_at timestamptz not null default now()
);
create index if not exists contracts_campaign_idx on public.contracts (campaign_id, created_at);

alter table public.contracts enable row level security;

drop policy if exists "membros veem contratos" on public.contracts;
create policy "membros veem contratos" on public.contracts for select to authenticated
  using (public.is_campaign_member(campaign_id));
drop policy if exists "mestre gerencia contratos" on public.contracts;
create policy "mestre gerencia contratos" on public.contracts for all to authenticated
  using (public.is_campaign_master(campaign_id))
  with check (public.is_campaign_master(campaign_id));

-- Jogador aceita um contrato aberto com um personagem dele que está na campanha
create or replace function public.accept_contract(p_contract uuid, p_character uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.contracts;
  ch public.characters;
begin
  select * into c from public.contracts where id = p_contract for update;
  if c.id is null then raise exception 'Contrato não encontrado'; end if;
  if c.status <> 'aberto' then raise exception 'Este contrato já foi aceito'; end if;
  select * into ch from public.characters where id = p_character;
  if ch.id is null or ch.owner_id <> auth.uid() or ch.campaign_id is distinct from c.campaign_id then
    raise exception 'Personagem inválido para este contrato';
  end if;
  update public.contracts set status = 'aceito', accepted_by = ch.id, accepted_name = ch.name where id = c.id;
end $$;

-- Jogador desiste de um contrato que ele aceitou
create or replace function public.drop_contract(p_contract uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.contracts c set status = 'aberto', accepted_by = null, accepted_name = null
  where c.id = p_contract and c.status = 'aceito'
    and exists (select 1 from public.characters ch where ch.id = c.accepted_by and ch.owner_id = auth.uid());
end $$;

grant execute on function public.accept_contract(uuid, uuid) to authenticated;
grant execute on function public.drop_contract(uuid) to authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.contracts; exception when duplicate_object then null; end;
end $$;
