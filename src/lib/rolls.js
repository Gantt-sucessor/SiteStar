import { supabase } from './supabase';
import { roll } from './dice';
import { sfx } from './sfx';

// Faz a rolagem localmente, mostra na tela e, se houver campanha, envia para o mestre.
export async function sendRoll({ formula, label, kind = 'free', campaignId, character, hidden = false, extra }) {
  const result = roll(formula);
  if (extra) result.extra = extra;
  const entry = {
    id: `local-${Date.now()}-${Math.random()}`,
    label,
    kind,
    formula: result.formula,
    total: result.total,
    result,
    hidden,
    character_name: character?.name ?? null,
    created_at: new Date().toISOString(),
    local: true,
  };
  window.dispatchEvent(new CustomEvent('holocron:roll', { detail: entry }));
  sfx.roll();
  if (campaignId && supabase) {
    const { error } = await supabase.from('rolls').insert({
      campaign_id: campaignId,
      character_id: character?.id ?? null,
      character_name: character?.name ?? null,
      label,
      formula: result.formula,
      kind,
      result,
      total: result.total,
      hidden,
    });
    if (error) console.error('Falha ao enviar rolagem', error);
  }
  return entry;
}
