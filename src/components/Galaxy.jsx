import { useMemo, useState } from 'react';
import { PLANETS, REGIONS, GALAXY_CENTER, planetById, parseHyperdrive, ASTRO_MODS } from '../data/planets';
import { sendRoll } from '../lib/rolls';
import { Panel } from './Sheet';

const W = 1000;
const H = 700;
const RX = 1.3;
const RY = 0.92;

// Estrelas de fundo e braços espirais, sempre iguais (semente fixa)
function seeded(n, seed = 7) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return Array.from({ length: n }, () => {
    const arm = Math.floor(rnd() * 4);
    const t = rnd() * 5.2;
    const spread = (rnd() - 0.5) * (18 + t * 18);
    const ang = arm * (Math.PI / 2) + t * 1.05;
    const rad = 30 + t * 68;
    return {
      x: GALAXY_CENTER.x + Math.cos(ang) * rad * RX + spread,
      y: GALAXY_CENTER.y + Math.sin(ang) * rad * RY + spread * 0.7,
      r: rnd() * 1.4 + 0.3,
      o: rnd() * 0.6 + 0.15,
    };
  });
}

export default function Galaxy({ galaxy = {}, isMaster, ships = [], campaignId, onSave, send, missingColumn }) {
  const custom = galaxy.custom || [];
  const all = useMemo(() => [...PLANETS, ...custom], [custom]);
  const here = planetById(galaxy.location, custom);
  const travel = galaxy.travel || null;
  const [sel, setSel] = useState(galaxy.location || null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(null);
  const [filter, setFilter] = useState('');
  const stars = useMemo(() => seeded(900), []);
  const selected = planetById(sel, custom);
  const dest = travel ? planetById(travel.to, custom) : null;
  const from = travel ? planetById(travel.from, custom) : null;

  const save = (patch) => onSave({ ...galaxy, ...patch });

  const clickMap = (e) => {
    if (!adding) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    setDraft({ x: Math.round(p.x), y: Math.round(p.y), name: '', region: 'Orla Exterior', desc: '' });
    setAdding(false);
  };

  const addCustom = () => {
    const id = `custom-${Date.now().toString(36)}`;
    save({ custom: [...custom, { ...draft, id, climate: draft.climate || '—', capital: '—', custom: true }] });
    setDraft(null);
    setSel(id);
  };

  const list = filter ? all.filter((p) => `${p.name} ${p.region}`.toLowerCase().includes(filter.toLowerCase())) : all;

  return (
    <div className="grid galaxy-layout">
      <Panel title="Mapa da galáxia" className="galaxy-panel" aside={
        here ? <span className="tag yellow">Localização: {here.name}</span> : <span className="tiny dim">o mestre ainda não marcou onde o grupo está</span>
      }>
        {missingColumn && <div className="error-box small" style={{ marginBottom: 8 }}>Rode o arquivo supabase/extras.sql no SQL Editor do Supabase para salvar o mapa.</div>}
        {travel && (
          <div className="info-box small" style={{ marginBottom: 8 }}>
            <b className="yellow">Em hiperespaço:</b> {from?.name ?? '?'} → {dest?.name ?? '?'}{travel.days ? ` · ${travel.days} dia${travel.days > 1 ? 's' : ''} de viagem` : ''}
          </div>
        )}
        <div className={`galaxy-wrap ${adding ? 'adding' : ''}`}>
          <svg viewBox={`0 0 ${W} ${H}`} className="galaxy-svg" onClick={clickMap} role="img" aria-label="Mapa da galáxia">
            <defs>
              <radialGradient id="gcore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff6d8" stopOpacity="0.95" />
                <stop offset="25%" stopColor="#ffd98a" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#5a7bd6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx={GALAXY_CENTER.x} cy={GALAXY_CENTER.y} rx={420 * RX} ry={420 * RY} fill="url(#gcore)" opacity="0.6" />
            {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cfe6ff" opacity={s.o} />)}
            {REGIONS.map((r) => (
              <g key={r.id}>
                <ellipse cx={GALAXY_CENTER.x} cy={GALAXY_CENTER.y} rx={r.r * RX} ry={r.r * RY} className="galaxy-ring" />
                <text x={GALAXY_CENTER.x} y={GALAXY_CENTER.y - r.r * RY + 12} className="galaxy-ring-label" textAnchor="middle">{r.name.toUpperCase()}</text>
              </g>
            ))}
            {travel && from && dest && (
              <line x1={from.x} y1={from.y} x2={dest.x} y2={dest.y} className="galaxy-route" />
            )}
            {all.map((p) => {
              const isHere = p.id === galaxy.location;
              const isSel = p.id === sel;
              return (
                <g key={p.id} className={`galaxy-planet ${isHere ? 'here' : ''} ${isSel ? 'sel' : ''} ${p.custom ? 'custom' : ''}`}
                  onClick={(e) => { if (adding) return; e.stopPropagation(); setSel(p.id); }}>
                  {isHere && <circle cx={p.x} cy={p.y} r="16" className="galaxy-here-ring" />}
                  <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
                  <circle cx={p.x} cy={p.y} r={isSel ? 6 : 4.5} className="galaxy-dot" />
                  <text x={p.x + 8} y={p.y - 7} className="galaxy-label">{p.name}</text>
                </g>
              );
            })}
            {draft && <circle cx={draft.x} cy={draft.y} r="6" className="galaxy-dot draft" />}
          </svg>
        </div>
        <div className="row between" style={{ marginTop: 8 }}>
          <span className="tiny dim">Clique num planeta para ver os dados. {isMaster ? 'Você pode marcar onde o grupo está, traçar o salto ou criar planetas.' : ''}</span>
          {isMaster && <button className={`btn sm ${adding ? 'yellow primary' : ''}`} onClick={() => { setAdding((x) => !x); setDraft(null); }}>{adding ? 'Clique no mapa...' : '+ Planeta da campanha'}</button>}
        </div>
        {draft && (
          <div className="info-box stack" style={{ gap: 6, marginTop: 8 }}>
            <div className="grid grid-2">
              <input value={draft.name} placeholder="Nome do planeta" onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
              <select value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })}>
                {['Centro', 'Colônias', 'Orla Interior', 'Região da Expansão', 'Orla Intermediária', 'Orla Exterior', 'Regiões Desconhecidas'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <input value={draft.climate || ''} placeholder="Clima" onChange={(e) => setDraft({ ...draft, climate: e.target.value })} />
            <textarea value={draft.desc} placeholder="Descrição que os jogadores vão ler" onChange={(e) => setDraft({ ...draft, desc: e.target.value })} style={{ minHeight: 60 }} />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn sm ghost" onClick={() => setDraft(null)}>Cancelar</button>
              <button className="btn sm yellow primary" disabled={!draft.name} onClick={addCustom}>Adicionar</button>
            </div>
          </div>
        )}
      </Panel>

      <div className="stack" style={{ gap: 16 }}>
        <Panel title={selected ? selected.name : 'Planetas'}>
          {selected ? (
            <div>
              <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                <span className="tag">{selected.region}</span>
                {selected.climate && selected.climate !== '—' && <span className="tag blue">{selected.climate}</span>}
                {selected.book ? <span className="tag yellow">Cap. 13 do livro</span> : selected.custom ? <span className="tag green">da campanha</span> : <span className="tag">dos filmes</span>}
              </div>
              {selected.capital && selected.capital !== '—' && <div className="small"><b className="yellow">Capital:</b> {selected.capital}</div>}
              <p className="small" style={{ margin: '6px 0' }}>{selected.desc}</p>
              {isMaster && (
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm" disabled={galaxy.location === selected.id} onClick={() => save({ location: selected.id })}>📍 O grupo está aqui</button>
                  {selected.custom && <button className="btn sm ghost red" onClick={() => { save({ custom: custom.filter((x) => x.id !== selected.id) }); setSel(null); }}>Apagar planeta</button>}
                </div>
              )}
              <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={() => setSel(null)}>Ver lista</button>
            </div>
          ) : (
            <>
              <input value={filter} placeholder="Buscar planeta ou região" onChange={(e) => setFilter(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
              <div className="list" style={{ maxHeight: 340, overflow: 'auto' }}>
                {list.map((p) => (
                  <button key={p.id} className="list-row list-button" onClick={() => setSel(p.id)}>
                    <div><div className="name small">{p.name}</div><div className="sub">{p.region}</div></div>
                    {p.id === galaxy.location && <span className="tag yellow">aqui</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </Panel>

        {isMaster && <TravelPanel galaxy={galaxy} here={here} target={selected} ships={ships} campaignId={campaignId} save={save} send={send} />}
        {!isMaster && (galaxy.log || []).length > 0 && (
          <Panel title="Diário de bordo">
            <div className="list">
              {[...galaxy.log].reverse().slice(0, 8).map((l, i) => (
                <div key={i} className="list-row"><div className="small">{planetById(l.from, custom)?.name ?? '?'} → {planetById(l.to, custom)?.name ?? '?'}</div><span className="tiny muted">{l.days ? `${l.days} d` : ''}</span></div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

// Astronavegação (Cap. 13): Usar Computador CD 10 com dados atuais (1 minuto) ou CD 30 sem dados (1 hora);
// viagem leva 1d6 × multiplicador do hiperdrive em dias.
function TravelPanel({ galaxy, here, target, ships, campaignId, save, send }) {
  const withDrive = ships.map((s) => ({ s, hd: parseHyperdrive(s.hyperdrive) })).filter((x) => x.hd);
  const [shipId, setShipId] = useState(withDrive[0]?.s.uid || 'manual');
  const [manual, setManual] = useState(2);
  const [useBackup, setUseBackup] = useState(false);
  const [noData, setNoData] = useState(false);
  const [mods, setMods] = useState({});
  const [days, setDays] = useState(null);
  const travel = galaxy.travel;
  const chosen = withDrive.find((x) => x.s.uid === shipId);
  const mult = chosen ? (useBackup && chosen.hd.backup ? chosen.hd.backup : chosen.hd.main) : Number(manual) || 1;
  const dc = noData ? 30 : 10;
  const modSum = ASTRO_MODS.reduce((s, [k, , v]) => s + (mods[k] ? v : 0), 0);
  const canJump = here && target && target.id !== here.id && !travel;

  const rollDays = async () => {
    const e = await sendRoll({ formula: '1d6', label: `Viagem ${here?.name ?? '?'} → ${target?.name ?? '?'} (1d6 × hiperdrive ${mult})`, kind: 'travel', campaignId, character: { id: null, name: 'Navegação' } });
    setDays(Math.max(1, Math.round(e.total * mult * 10) / 10));
  };
  const jump = () => {
    save({ travel: { from: here.id, to: target.id, days, at: new Date().toISOString() } });
    send('jump', { from: here.name, to: target.name, days });
  };
  const arrive = (failed) => {
    const to = planetById(travel.to, galaxy.custom);
    const log = [...(galaxy.log || []), { from: travel.from, to: travel.to, days: travel.days, at: new Date().toISOString() }].slice(-40);
    save({ location: travel.to, travel: null, log });
    send('exit', { to: to?.name ?? '' });
    if (failed) send('alert', { text: 'SAÍDA DE EMERGÊNCIA DO HIPERESPAÇO' });
  };

  if (travel) {
    const to = planetById(travel.to, galaxy.custom);
    return (
      <Panel title="Em hiperespaço" className="yellow">
        <p className="small">Rumo a <b className="yellow">{to?.name}</b>{travel.days ? `, ${travel.days} dia${travel.days > 1 ? 's' : ''} de viagem` : ''}. Quando a cena chegar ao destino:</p>
        <div className="row">
          <button className="btn yellow primary" onClick={() => arrive(false)}>⟪ Sair do hiperespaço</button>
          <button className="btn ghost" onClick={() => save({ travel: null })}>Cancelar viagem</button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Salto para o hiperespaço" className="yellow">
      {!here && <div className="tiny muted">Primeiro marque onde o grupo está (📍) e depois clique no destino.</div>}
      {here && (
        <div className="small" style={{ marginBottom: 8 }}>
          De <b className="yellow">{here.name}</b> para <b className="yellow">{target && target.id !== here.id ? target.name : '— escolha o destino no mapa —'}</b>
        </div>
      )}
      <label className="field">Nave
        <select value={shipId} onChange={(e) => { setShipId(e.target.value); setDays(null); }}>
          {withDrive.map(({ s, hd }) => <option key={s.uid} value={s.uid}>{s.name} (hiperdrive ×{hd.main}{hd.backup ? `, apoio ×${hd.backup}` : ''})</option>)}
          <option value="manual">Outra nave (informar multiplicador)</option>
        </select>
      </label>
      {shipId === 'manual' && (
        <label className="field" style={{ marginTop: 6 }}>Multiplicador do hiperdrive
          <input type="number" step="0.5" min="0.5" value={manual} onChange={(e) => { setManual(e.target.value); setDays(null); }} />
        </label>
      )}
      {chosen?.hd.backup && <label className="check tiny" style={{ marginTop: 6 }}><input type="checkbox" checked={useBackup} onChange={(e) => { setUseBackup(e.target.checked); setDays(null); }} /> Usar hiperdrive de apoio (×{chosen.hd.backup})</label>}

      <div className="info-box tiny" style={{ marginTop: 10 }}>
        <div><b className="yellow">Astronavegação:</b> teste de Usar Computador <b>CD {dc}</b> {noData ? '(sem dados: 1 hora calculando)' : '(dados atuais da HoloNet: 1 minuto)'}.</div>
        <label className="check" style={{ marginTop: 4 }}><input type="checkbox" checked={noData} onChange={(e) => setNoData(e.target.checked)} /> Sem dados da rota</label>
        {ASTRO_MODS.map(([k, label, v]) => (
          <label key={k} className="check"><input type="checkbox" checked={!!mods[k]} onChange={(e) => setMods({ ...mods, [k]: e.target.checked })} /> {label} ({v > 0 ? '+' : ''}{v} no teste)</label>
        ))}
        {modSum !== 0 && <div style={{ marginTop: 4 }}>Modificador total no teste: <b>{modSum > 0 ? '+' : ''}{modSum}</b></div>}
        <div style={{ marginTop: 4 }} className="muted">Se falhar: novo teste. Falhou de novo? A nave desce −1 na condição e sofre 5% dos PV por ponto de falha; chega no dobro do tempo.</div>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn sm" disabled={!canJump} onClick={rollDays}>Rolar tempo de viagem (1d6 × {mult})</button>
        {days != null && <span className="tag yellow">{days} dia{days > 1 ? 's' : ''}</span>}
      </div>
      <button className="btn yellow primary" style={{ marginTop: 10, width: '100%' }} disabled={!canJump} onClick={jump}>⟫ Saltar para o hiperespaço (todos veem)</button>
    </Panel>
  );
}
