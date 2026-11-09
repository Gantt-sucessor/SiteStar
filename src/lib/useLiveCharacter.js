import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

// Carrega um personagem, salva automaticamente (debounce) e recebe alterações em tempo real
// (ex.: o mestre aplicando dano na ficha do jogador).
export function useLiveCharacter(id) {
  const [row, setRow] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | saving | saved | error | missing
  const [error, setError] = useState('');
  const pending = useRef(null);
  const timer = useRef(null);
  const lastSent = useRef('');

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setStatus('loading');
    supabase.from('characters').select('*').eq('id', id).maybeSingle().then(({ data, error: e }) => {
      if (!alive) return;
      if (e) { setError(e.message); setStatus('error'); return; }
      if (!data) { setStatus('missing'); return; }
      setRow(data);
      lastSent.current = JSON.stringify(data.data);
      setStatus('ready');
    });
    const ch = supabase.channel(`char-${id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${id}` }, ({ new: r }) => {
        if (pending.current) return; // há edição local aguardando; ela prevalece
        const incoming = JSON.stringify(r.data);
        if (incoming === lastSent.current) return;
        lastSent.current = incoming;
        setRow((cur) => ({ ...cur, ...r }));
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
      if (timer.current) { clearTimeout(timer.current); flush(); }
    };
  }, [id]);

  const flush = async () => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    setStatus('saving');
    const payload = { data: p.data, name: p.data.name || 'Sem nome' };
    if ('campaign_id' in p) payload.campaign_id = p.campaign_id;
    lastSent.current = JSON.stringify(p.data);
    const { error: e } = await supabase.from('characters').update(payload).eq('id', id);
    if (e) { setError(e.message); setStatus('error'); } else setStatus('saved');
  };

  const update = (patch) => {
    setRow((cur) => {
      const next = { ...cur, ...patch };
      pending.current = { ...(pending.current || {}), data: next.data, ...('campaign_id' in patch ? { campaign_id: patch.campaign_id } : {}) };
      return next;
    });
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; flush(); }, 700);
  };

  return {
    row, status, error,
    setData: (data) => update({ data }),
    setCampaign: (campaign_id) => update({ campaign_id }),
  };
}
