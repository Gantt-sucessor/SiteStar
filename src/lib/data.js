import { supabase } from './supabase';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode(len = 6) {
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => CODE_CHARS[n % CODE_CHARS.length]).join('');
}

export async function createCampaign({ name, description, era, userId }) {
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase.from('campaigns')
      .insert({ name, description, era, code: makeCode(), master_id: userId })
      .select().single();
    if (!error) return data;
    if (error.code !== '23505') throw error;
  }
  throw new Error('Não foi possível gerar um código único. Tente de novo.');
}

export async function joinCampaign(code) {
  const { data, error } = await supabase.rpc('join_campaign', { p_code: code });
  if (error) throw error;
  return data;
}

export async function listMyCampaigns(userId) {
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('master_id', userId).order('created_at', { ascending: false }),
    supabase.from('campaign_members').select('campaign_id, campaigns(*)').eq('user_id', userId),
  ]);
  return {
    owned: owned || [],
    joined: (memberships || []).map((m) => m.campaigns).filter(Boolean),
  };
}

export async function listMyCharacters(userId) {
  const { data, error } = await supabase.from('characters').select('*').eq('owner_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveCharacter(row) {
  const payload = { name: row.data.name || 'Sem nome', data: row.data, campaign_id: row.campaign_id ?? null };
  if (row.id) {
    const { data, error } = await supabase.from('characters').update(payload).eq('id', row.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('characters').insert(payload).select().single();
  if (error) throw error;
  return data;
}
