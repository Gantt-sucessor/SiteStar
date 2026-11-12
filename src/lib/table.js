import { useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { listMyCampaigns } from './data';

// Canal de broadcast da mesa: abertura, transmissões, alertas, saltos, holocron e medalhas.
// O app assina os canais de todas as campanhas do usuário, então os efeitos chegam em qualquer
// página (painel, ficha avulsa, campanha). Cada evento vira um window event 'holocron:fx'
// que o <TableFx /> global desenha; a abertura vira 'holocron:crawl' (só a página da campanha mostra).
export const emitFx = (type, payload = {}) =>
  window.dispatchEvent(new CustomEvent('holocron:fx', { detail: { type, payload } }));

const channels = new Map(); // campaignId -> { ch, users }
let currentUser = null;

function receive(campaignId, payload) {
  const { type, data } = payload || {};
  if (!type) return;
  if (data?.to && data.to !== 'all' && data.to !== currentUser) return; // mensagem privada para outro jogador
  if (type === 'crawl') window.dispatchEvent(new CustomEvent('holocron:crawl', { detail: { campaignId, crawl: data?.crawl || null } }));
  else emitFx(type, { ...data, campaignId });
}

function acquire(campaignId) {
  let entry = channels.get(campaignId);
  if (!entry) {
    const ch = supabase.channel(`mesa-${campaignId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'fx' }, ({ payload }) => receive(campaignId, payload))
      .subscribe();
    entry = { ch, users: 0 };
    channels.set(campaignId, entry);
  }
  entry.users += 1;
  return () => {
    entry.users -= 1;
    if (entry.users <= 0) { supabase.removeChannel(entry.ch); channels.delete(campaignId); }
  };
}

// No App: mantém assinados os canais de todas as campanhas do usuário (atualiza ao trocar de página)
export function useAllTableChannels(userId, pathname) {
  const held = useRef(new Map());
  currentUser = userId;
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    listMyCampaigns(userId).then(({ owned, joined }) => {
      if (!alive) return;
      const ids = new Set([...owned, ...joined].map((c) => c.id));
      for (const [id, release] of held.current) if (!ids.has(id)) { release(); held.current.delete(id); }
      for (const id of ids) if (!held.current.has(id)) held.current.set(id, acquire(id));
    }).catch(() => { /* sem conexão: tenta de novo na próxima navegação */ });
    return () => { alive = false; };
  }, [userId, pathname]);
  useEffect(() => () => { for (const release of held.current.values()) release(); held.current.clear(); }, [userId]);
}

export function sendTable(campaignId, type, data = {}, { local = true } = {}) {
  const entry = channels.get(campaignId);
  entry?.ch.send({ type: 'broadcast', event: 'fx', payload: { type, data } });
  if (!local) return;
  if (type === 'crawl') window.dispatchEvent(new CustomEvent('holocron:crawl', { detail: { campaignId, crawl: data.crawl || null } }));
  else emitFx(type, { ...data, campaignId, echo: true });
}

// Na página da campanha: garante o canal (mesmo para campanha recém-criada) e recebe a abertura
export function useTableChannel(campaignId, userId, onCrawl) {
  const cb = useRef(onCrawl);
  cb.current = onCrawl;
  currentUser = userId;
  useEffect(() => {
    if (!campaignId) return undefined;
    const release = acquire(campaignId);
    const onCrawlEvt = (e) => { if (e.detail.campaignId === campaignId) cb.current?.(e.detail.crawl); };
    // componentes fora desta página (ex.: a ficha) pedem envios por este evento
    const onRequest = (e) => sendTable(campaignId, e.detail.type, e.detail.data);
    window.addEventListener('holocron:crawl', onCrawlEvt);
    window.addEventListener('holocron:send-fx', onRequest);
    return () => {
      release();
      window.removeEventListener('holocron:crawl', onCrawlEvt);
      window.removeEventListener('holocron:send-fx', onRequest);
    };
  }, [campaignId, userId]);
  return (type, data = {}, opts) => sendTable(campaignId, type, data, opts);
}

// Pede para a página da campanha transmitir um efeito para a mesa
export function requestFx(type, data = {}) {
  window.dispatchEvent(new CustomEvent('holocron:send-fx', { detail: { type, data } }));
}
