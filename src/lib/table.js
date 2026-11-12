import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

// Canal de broadcast da mesa: abertura, transmissões, alertas, saltos, holocron e medalhas.
// Cada evento recebido vira um window event 'holocron:fx' que o <TableFx /> desenha na tela.
export const emitFx = (type, payload = {}) =>
  window.dispatchEvent(new CustomEvent('holocron:fx', { detail: { type, payload } }));

export function useTableChannel(campaignId, userId, onCrawl) {
  const chRef = useRef(null);
  const cb = useRef(onCrawl);
  cb.current = onCrawl;
  useEffect(() => {
    if (!campaignId) return undefined;
    const ch = supabase.channel(`mesa-${campaignId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'fx' }, ({ payload }) => {
        const { type, data } = payload || {};
        if (!type) return;
        if (data?.to && data.to !== 'all' && data.to !== userId) return; // mensagem privada para outro jogador
        if (type === 'crawl') cb.current?.(data?.crawl || null);
        else emitFx(type, data);
      })
      .subscribe();
    chRef.current = ch;
    // componentes fora da página da campanha (ex.: a ficha) pedem envios por este evento
    const onRequest = (e) => send(e.detail.type, e.detail.data);
    window.addEventListener('holocron:send-fx', onRequest);
    return () => { supabase.removeChannel(ch); window.removeEventListener('holocron:send-fx', onRequest); };
  }, [campaignId, userId]);

  // Envia para a mesa e mostra também na tela de quem enviou
  function send(type, data = {}, { local = true } = {}) {
    chRef.current?.send({ type: 'broadcast', event: 'fx', payload: { type, data } });
    if (!local) return;
    if (type === 'crawl') cb.current?.(data.crawl || null);
    else emitFx(type, { ...data, echo: true });
  }
  return send;
}

// Pede para a página da campanha transmitir um efeito para a mesa (sem campanha aberta, só mostra local)
export function requestFx(type, data = {}) {
  window.dispatchEvent(new CustomEvent('holocron:send-fx', { detail: { type, data } }));
}
