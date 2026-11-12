import { createClient } from '@supabase/supabase-js';

// trim: variáveis coladas no painel da Vercel às vezes vêm com quebra de linha no fim,
// o que derruba a conexão de tempo real (a chave vai na URL do websocket)
const url = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '').trim();

export const isConfigured = Boolean(url && key);

export const supabase = isConfigured
  ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })
  : null;
