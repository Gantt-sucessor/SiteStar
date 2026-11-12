import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { sfx } from '../lib/sfx';
import Holo, { resizeImage } from './Holo';
import { Panel } from './Sheet';

const DANGERS = [
  ['baixo', 'Baixo', 'green'],
  ['medio', 'Médio', 'yellow'],
  ['alto', 'Alto', 'red'],
  ['letal', 'Letal', 'red'],
];
const STATUS = { aberto: ['Aberto', 'green'], aceito: ['Em andamento', 'yellow'], concluido: ['Cumprido', 'blue'], falhou: ['Fracassado', 'red'] };

export function useContracts(campaignId) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const load = async () => {
    const { data, error: e } = await supabase.from('contracts').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
    if (e) { setError(e.message); setList([]); return; }
    setError('');
    setList(data || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel(`contracts-${campaignId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: `campaign_id=eq.${campaignId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [campaignId]);
  return { list, error, reload: load };
}

// Quadro de contratos da Guilda: o mestre publica, os jogadores aceitam, o mestre paga ao concluir.
export default function ContractBoard({ campaignId, isMaster, characters = [], myChars = [], send }) {
  const { list, error, reload } = useContracts(campaignId);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [who, setWho] = useState(myChars[0]?.id || '');
  useEffect(() => { if (!who && myChars[0]) setWho(myChars[0].id); }, [myChars.length]);

  const missing = error && /contracts|relation|schema cache/i.test(error);

  const post = async () => {
    setBusy('post');
    const { error: e } = await supabase.from('contracts').insert({ campaign_id: campaignId, ...form, reward: Number(form.reward) || 0, rep: Number(form.rep) || 0 });
    setBusy('');
    if (e) { setMsg(e.message); return; }
    send?.('contract', { title: `Novo contrato: ${form.title}`, text: `${(Number(form.reward) || 0).toLocaleString('pt-BR')} créditos` });
    setForm(null);
    reload();
  };

  const accept = async (c) => {
    setBusy(c.id);
    const { error: e } = await supabase.rpc('accept_contract', { p_contract: c.id, p_character: who });
    setBusy('');
    if (e) { setMsg(e.message); return; }
    sfx.notify();
    const name = myChars.find((x) => x.id === who)?.name;
    send?.('contract', { title: `${name} aceitou: ${c.title}` });
    reload();
  };
  const drop = async (c) => {
    if (!confirm('Desistir deste contrato? Ele volta para o quadro.')) return;
    const { error: e } = await supabase.rpc('drop_contract', { p_contract: c.id });
    if (e) setMsg(e.message);
    reload();
  };

  // Mestre fecha o contrato: paga créditos e ajusta a reputação na Guilda da ficha
  const settle = async (c, ok) => {
    setBusy(c.id);
    const { error: e } = await supabase.from('contracts').update({ status: ok ? 'concluido' : 'falhou' }).eq('id', c.id);
    if (!e && c.accepted_by) {
      const { data: row } = await supabase.from('characters').select('data').eq('id', c.accepted_by).maybeSingle();
      if (row) {
        const d = row.data || {};
        const rep = Math.max(-5, Math.min(5, (d.guildRep ?? 0) + (ok ? c.rep : -1)));
        const next = { ...d, guildRep: rep, credits: (d.credits || 0) + (ok ? c.reward : 0) };
        await supabase.from('characters').update({ data: next }).eq('id', c.accepted_by);
      }
    }
    setBusy('');
    if (e) { setMsg(e.message); return; }
    send?.('contract', { title: ok ? `Contrato cumprido: ${c.title}` : `Contrato fracassado: ${c.title}`, text: ok ? `${c.accepted_name} recebe ${c.reward.toLocaleString('pt-BR')} créditos` : `${c.accepted_name} perde reputação` });
    reload();
  };
  const reopen = async (c) => { await supabase.from('contracts').update({ status: 'aberto', accepted_by: null, accepted_name: null }).eq('id', c.id); reload(); };
  const remove = async (c) => { if (confirm(`Apagar "${c.title}"?`)) { await supabase.from('contracts').delete().eq('id', c.id); reload(); } };

  if (missing) return <div className="error-box">Rode o arquivo supabase/extras.sql no SQL Editor do Supabase para ativar o quadro de contratos.</div>;
  if (list === null) return <div className="loader"><div className="saber" /></div>;

  const open = list.filter((c) => c.status === 'aberto' || c.status === 'aceito');
  const closed = list.filter((c) => c.status === 'concluido' || c.status === 'falhou');

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Panel title="HoloNet · Quadro de contratos da Guilda" className="yellow" aside={isMaster && !form && (
        <button className="btn sm yellow primary" onClick={() => setForm({ title: '', target: '', description: '', location: '', danger: 'medio', reward: 1000, rep: 1, image: null })}>+ Publicar contrato</button>
      )}>
        <p className="small muted" style={{ marginTop: 0 }}>
          {isMaster
            ? 'Publique recompensas e trabalhos. Quando um herói cumprir, clique em Cumprido: os créditos caem na ficha e a reputação na Guilda sobe.'
            : 'Contratos publicados pela Guilda. Aceite um com seu personagem; o mestre paga quando o trabalho estiver feito.'}
        </p>
        {msg && <div className="error-box small" style={{ marginBottom: 8 }} onClick={() => setMsg('')}>{msg}</div>}
        {!isMaster && myChars.length > 1 && (
          <label className="field" style={{ maxWidth: 280, marginBottom: 10 }}>Aceitar com
            <select value={who} onChange={(e) => setWho(e.target.value)}>{myChars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
        )}
        {form && <ContractForm form={form} setForm={setForm} onCancel={() => setForm(null)} onPost={post} busy={busy === 'post'} />}
        {open.length === 0 ? <div className="empty small">Nenhum contrato no quadro. {isMaster ? '' : 'Volte mais tarde, caçador.'}</div> : (
          <div className="contract-grid">
            {open.map((c) => {
              const mine = myChars.some((x) => x.id === c.accepted_by);
              return (
                <ContractCard key={c.id} c={c}>
                  {!isMaster && c.status === 'aberto' && <button className="btn sm yellow primary" disabled={!who || busy === c.id} onClick={() => accept(c)}>{myChars.length ? 'Aceitar contrato' : 'Traga uma ficha para aceitar'}</button>}
                  {!isMaster && mine && <button className="btn sm ghost red" onClick={() => drop(c)}>Desistir</button>}
                  {isMaster && c.status === 'aceito' && (
                    <>
                      <button className="btn sm green" disabled={busy === c.id} onClick={() => settle(c, true)}>Cumprido (pagar)</button>
                      <button className="btn sm red" disabled={busy === c.id} onClick={() => settle(c, false)}>Fracassou</button>
                      <button className="btn sm ghost" onClick={() => reopen(c)}>Reabrir</button>
                    </>
                  )}
                  {isMaster && <button className="btn sm ghost red" onClick={() => remove(c)}>Apagar</button>}
                </ContractCard>
              );
            })}
          </div>
        )}
      </Panel>
      {closed.length > 0 && (
        <Panel title="Histórico de contratos">
          <div className="list">
            {closed.map((c) => (
              <div key={c.id} className="list-row">
                <div><div className="name small">{c.title}</div><div className="sub">{c.accepted_name || '—'} · {c.reward.toLocaleString('pt-BR')} cr</div></div>
                <div className="row" style={{ gap: 4 }}>
                  <span className={`tag ${STATUS[c.status][1]}`}>{STATUS[c.status][0]}</span>
                  {isMaster && <button className="btn sm ghost red" onClick={() => remove(c)}>✕</button>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function ContractCard({ c, children }) {
  const danger = DANGERS.find(([k]) => k === c.danger) || DANGERS[1];
  const st = STATUS[c.status] || STATUS.aberto;
  return (
    <div className={`contract-card ${c.status}`}>
      <div className="contract-head">
        <span className="contract-kind">{c.target ? 'PROCURADO' : 'CONTRATO'}</span>
        <span className={`tag ${st[1]}`}>{st[0]}</span>
      </div>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
        {c.image && <Holo src={c.image} size={78} />}
        <div style={{ minWidth: 0 }}>
          <div className="contract-title">{c.title}</div>
          {c.target && <div className="small"><b className="yellow">Alvo:</b> {c.target}</div>}
          {c.location && <div className="small"><b className="yellow">Local:</b> {c.location}</div>}
        </div>
      </div>
      {c.description && <p className="small muted" style={{ margin: '8px 0' }}>{c.description}</p>}
      <div className="row between" style={{ marginTop: 'auto' }}>
        <span className="contract-reward">{c.reward.toLocaleString('pt-BR')} <small>créditos</small></span>
        <span className={`tag ${danger[2]}`}>Perigo {danger[1]}</span>
      </div>
      {c.rep ? <div className="tiny muted">+{c.rep} de reputação na Guilda ao cumprir</div> : null}
      {c.accepted_name && <div className="tiny yellow" style={{ marginTop: 4 }}>Aceito por {c.accepted_name}</div>}
      <div className="row" style={{ marginTop: 8, gap: 6 }}>{children}</div>
    </div>
  );
}

function ContractForm({ form, setForm, onCancel, onPost, busy }) {
  const input = useRef(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setForm({ ...form, image: await resizeImage(f, 240, 0.78) }); } catch { /* imagem inválida */ }
  };
  return (
    <div className="info-box stack" style={{ gap: 8, marginBottom: 12 }}>
      <div className="grid grid-2">
        <label className="field">Título<input value={form.title} placeholder="Capturar Teeko, o golpista" onChange={set('title')} autoFocus /></label>
        <label className="field">Alvo (opcional)<input value={form.target} placeholder="Teeko (Rodiano) · vivo" onChange={set('target')} /></label>
        <label className="field">Local<input value={form.location} placeholder="Nar Shaddaa, nível 40" onChange={set('location')} /></label>
        <label className="field">Perigo
          <select value={form.danger} onChange={set('danger')}>{DANGERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        <label className="field">Recompensa (créditos)<input type="number" min="0" step="50" value={form.reward} onChange={set('reward')} /></label>
        <label className="field">Reputação na Guilda ao cumprir<input type="number" min="0" max="3" value={form.rep} onChange={set('rep')} /></label>
      </div>
      <label className="field">Descrição<textarea value={form.description} onChange={set('description')} style={{ minHeight: 70 }} placeholder="Contratante anônimo. Entregar no salão da Guilda. Sem desintegrações." /></label>
      <div className="row between">
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm ghost" onClick={() => input.current?.click()}>{form.image ? 'Trocar holo do alvo' : 'Holo do alvo (foto)'}</button>
          {form.image && <button className="btn sm ghost red" onClick={() => setForm({ ...form, image: null })}>Remover foto</button>}
          <input ref={input} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn sm yellow primary" disabled={!form.title || busy} onClick={onPost}>Publicar na HoloNet</button>
        </div>
      </div>
    </div>
  );
}
