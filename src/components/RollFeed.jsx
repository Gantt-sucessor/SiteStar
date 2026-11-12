import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RollBreakdown, RollTitle, rollTone } from './RollDisplay';
import { sfx } from '../lib/sfx';

const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Histórico de rolagens da campanha, atualizado em tempo real.
export default function RollFeed({ campaignId, userId, profiles = {}, toastOthers = false, onRoll, canClear = false }) {
  const [rolls, setRolls] = useState([]);
  const profilesRef = useRef(profiles);
  const onRollRef = useRef(onRoll);
  const live = useRef(false);
  const lastId = useRef(0);
  profilesRef.current = profiles;
  onRollRef.current = onRoll;

  useEffect(() => {
    if (!campaignId) return;
    let alive = true;
    lastId.current = 0;
    supabase.from('rolls').select('*').eq('campaign_id', campaignId).order('id', { ascending: false }).limit(60)
      .then(({ data }) => {
        if (!alive) return;
        lastId.current = Math.max(lastId.current, ...(data || []).map((r) => r.id));
        setRolls((data || []).filter((r) => r.kind !== 'fx'));
      });
    const seenIds = new Set();
    const onInsert = (r) => {
      lastId.current = Math.max(lastId.current, r.id);
      if (r.kind === 'fx' || seenIds.has(r.id)) return; // efeitos da mesa (transmissões etc.) não são rolagens
      seenIds.add(r.id);
      setRolls((list) => (list.some((x) => x.id === r.id) ? list : [r, ...list].slice(0, 120)));
      onRollRef.current?.(r);
      if (toastOthers && r.user_id !== userId) {
        sfx.notify();
        window.dispatchEvent(new CustomEvent('holocron:remote-roll', {
          detail: { ...r, remote: true, player_name: profilesRef.current[r.user_id]?.display_name },
        }));
      }
    };
    const ch = supabase.channel(`rolls-${campaignId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolls', filter: `campaign_id=eq.${campaignId}` }, ({ new: r }) => onInsert(r))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rolls' }, ({ old }) => {
        setRolls((list) => list.filter((x) => x.id !== old.id));
      })
      .subscribe((status) => { live.current = status === 'SUBSCRIBED'; });
    // reserva sem tempo real: busca rolagens novas a cada 3 s
    const timer = setInterval(async () => {
      if (live.current || !alive) return;
      const { data } = await supabase.from('rolls').select('*').eq('campaign_id', campaignId).gt('id', lastId.current).order('id', { ascending: true }).limit(30);
      for (const r of data || []) { lastId.current = Math.max(lastId.current, r.id); onInsert(r); }
    }, 3000);
    return () => { alive = false; clearInterval(timer); supabase.removeChannel(ch); };
  }, [campaignId, userId, toastOthers]);

  const clear = async () => {
    if (!confirm('Apagar todo o histórico de rolagens desta campanha?')) return;
    await supabase.from('rolls').delete().eq('campaign_id', campaignId);
    setRolls([]);
  };

  return (
    <div>
      {canClear && rolls.length > 0 && (
        <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="btn sm ghost red" onClick={clear}>Limpar histórico</button>
        </div>
      )}
      {rolls.length === 0 && <div className="empty small">Nenhuma rolagem ainda. Os dados aguardam...</div>}
      <div className="feed">
        {rolls.map((r) => {
          const tone = rollTone(r);
          const playerName = profiles[r.user_id]?.display_name;
          return (
            <div key={r.id} className={`feed-item ${tone} ${r.hidden ? 'hidden' : ''}`}>
              <div className={`roll-total ${tone === 'crit' ? 'green-text' : tone === 'fumble' ? 'red-text' : ''}`}>{r.total}</div>
              <div style={{ minWidth: 0 }}>
                <RollTitle entry={{ ...r, player_name: playerName }} />
                <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <RollBreakdown result={r.result} />
                  <span className="tiny dim mono">{timeFmt.format(new Date(r.created_at))}</span>
                </div>
                {r.result?.extra && <div className="tiny muted">{r.result.extra}</div>}
                {r.character_name && playerName && <div className="tiny dim">{playerName}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
