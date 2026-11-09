-- Correção: permite ao mestre ler a campanha logo após criá-la.
-- (A política anterior consultava a própria tabela e não enxergava a linha recém-inserida.)
drop policy if exists "ver campanhas" on public.campaigns;
create policy "ver campanhas" on public.campaigns for select to authenticated
  using (master_id = auth.uid() or public.is_campaign_member(id));
