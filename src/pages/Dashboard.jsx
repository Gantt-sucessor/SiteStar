import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { createCampaign, joinCampaign, listMyCampaigns, listMyCharacters } from '../lib/data';
import { speciesById, ERAS } from '../data/rules';
import { derive } from '../lib/character';
import { hyperspace } from '../components/Starfield';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [chars, setChars] = useState(null);
  const [camps, setCamps] = useState({ owned: [], joined: [] });
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', era: 'rebeliao' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    listMyCharacters(user.id).then(setChars).catch(() => setChars([]));
    listMyCampaigns(user.id).then(setCamps).catch(() => {});
  };
  useEffect(load, [user.id]);

  const enter = (id) => { hyperspace(); setTimeout(() => navigate(`/campanha/${id}`), 450); };

  const join = async (e) => {
    e.preventDefault();
    setJoinError(''); setBusy(true);
    try {
      const id = await joinCampaign(code);
      enter(id);
    } catch (err) {
      setJoinError(err.message?.includes('inválido') ? 'Nenhuma campanha com esse código nesta galáxia.' : err.message);
    } finally { setBusy(false); }
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const c = await createCampaign({ ...form, userId: user.id });
      enter(c.id);
    } catch (err) {
      alert(err.message);
    } finally { setBusy(false); }
  };

  const removeChar = async (c) => {
    if (!confirm(`Apagar ${c.name} para sempre? Isso não pode ser desfeito.`)) return;
    await supabase.from('characters').delete().eq('id', c.id);
    load();
  };

  const firstName = (profile?.display_name || '').split(' ')[0];

  return (
    <div className="page">
      <div className="kicker">Bem-vindo(a) de volta{firstName ? `, ${firstName}` : ''}</div>
      <h1 className="yellow" style={{ marginTop: 4 }}>Ponte de comando</h1>

      <div className="grid grid-2" style={{ marginTop: 10 }}>
        <section className="panel">
          <div className="panel-title"><span>Entrar numa campanha</span><span className="aurebesh">JOGADOR</span></div>
          <form onSubmit={join} className="stack">
            <input className="code-input" maxLength={8} placeholder="CÓDIGO" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button className="btn primary block" disabled={code.length < 4 || busy}>Saltar para o hiperespaço</button>
            {joinError && <div className="error-box">{joinError}</div>}
          </form>
        </section>
        <section className="panel red">
          <div className="panel-title"><span>Mestrar uma campanha</span><span className="aurebesh">MESTRE</span></div>
          {!creating ? (
            <div className="stack">
              <p className="small muted">Crie uma sala, compartilhe o código e acompanhe fichas e rolagens dos jogadores ao vivo.</p>
              <button className="btn red primary block" onClick={() => setCreating(true)}>Nova campanha</button>
            </div>
          ) : (
            <form onSubmit={create} className="stack">
              <input placeholder="Nome da campanha" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
              <select value={form.era} onChange={(e) => setForm({ ...form, era: e.target.value })}>
                {ERAS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <textarea placeholder="Descrição curta (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: 60 }} />
              <div className="row">
                <button className="btn red primary" disabled={!form.name || busy}>Criar</button>
                <button type="button" className="btn ghost" onClick={() => setCreating(false)}>Cancelar</button>
              </div>
            </form>
          )}
        </section>
      </div>

      <div className="section-head">
        <h2>Seus personagens</h2>
        <Link to="/personagem/novo" className="btn yellow">+ Novo personagem</Link>
      </div>
      {chars === null ? <div className="loader"><div className="saber" /></div> : chars.length === 0 ? (
        <div className="empty">Nenhum herói registrado. A galáxia precisa de você.<div style={{ marginTop: 12 }}><Link to="/personagem/novo" className="btn yellow">Criar o primeiro</Link></div></div>
      ) : (
        <div className="grid grid-auto">
          {chars.map((c) => {
            const d = derive(c.data);
            const camp = [...camps.owned, ...camps.joined].find((x) => x.id === c.campaign_id);
            return (
              <div key={c.id} className="panel char-card" onClick={() => navigate(`/personagem/${c.id}`)}>
                <div className="cname">{c.name}</div>
                <div className="small muted">{speciesById(c.data.species)?.name ?? '?'} · {d.classLabel}</div>
                <div className={`bar ${d.hpCurrent / d.hpMax <= 0.25 ? 'low' : d.hpCurrent / d.hpMax <= 0.5 ? 'mid' : ''}`} style={{ marginTop: 10, height: 16 }}>
                  <i style={{ width: `${Math.max(0, Math.min(100, (d.hpCurrent / (d.hpMax || 1)) * 100))}%` }} /><span style={{ lineHeight: '14px', fontSize: '0.72rem' }}>{d.hpCurrent}/{d.hpMax}</span>
                </div>
                <div className="row between" style={{ marginTop: 10 }}>
                  <span className="tiny muted">{camp ? `⟡ ${camp.name}` : 'Sem campanha'}</span>
                  <button className="btn sm ghost red" onClick={(e) => { e.stopPropagation(); removeChar(c); }}>Apagar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-head"><h2>Suas campanhas</h2></div>
      {camps.owned.length + camps.joined.length === 0 ? (
        <div className="empty">Nenhuma campanha ainda. Crie uma ou peça o código ao seu mestre.</div>
      ) : (
        <div className="grid grid-auto">
          {camps.owned.map((c) => (
            <div key={c.id} className="panel red char-card" onClick={() => enter(c.id)}>
              <div className="row between"><span className="cname">{c.name}</span><span className="tag red">Mestre</span></div>
              <div className="small muted">{ERAS.find((e) => e.id === c.era)?.name}</div>
              <div className="mono small" style={{ marginTop: 8, color: 'var(--sw-yellow)', letterSpacing: '0.3em' }}>{c.code}</div>
            </div>
          ))}
          {camps.joined.map((c) => (
            <div key={c.id} className="panel char-card" onClick={() => enter(c.id)}>
              <div className="row between"><span className="cname">{c.name}</span><span className="tag blue">Jogador</span></div>
              <div className="small muted">{ERAS.find((e) => e.id === c.era)?.name}</div>
              {c.description && <div className="tiny dim" style={{ marginTop: 6 }}>{c.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
