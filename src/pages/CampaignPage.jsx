import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useSetRollTarget } from '../lib/rollTarget';
import { useLiveCharacter } from '../lib/useLiveCharacter';
import { listMyCharacters } from '../lib/data';
import { derive } from '../lib/character';
import { ERAS, CONDITION_TRACK } from '../data/rules';
import Sheet, { Panel } from '../components/Sheet';
import RollFeed from '../components/RollFeed';
import Crawl, { DEFAULT_CRAWL } from '../components/Crawl';
import { SaveStatus } from './CharacterPage';
import { sfx } from '../lib/sfx';
import { useNpcs, encounterDifficulty } from '../lib/npcs';
import { NpcCard, NpcSheet, BestiaryPicker, NpcBuilder, npcHp } from '../components/Npcs';
import { sendRoll } from '../lib/rolls';
import { d20Formula } from '../lib/dice';

function useCampaign(id) {
  const [campaign, setCampaign] = useState(null);
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [characters, setCharacters] = useState([]);
  const [status, setStatus] = useState('loading');

  const loadMembers = async (camp) => {
    const { data: mem } = await supabase.from('campaign_members').select('user_id, joined_at').eq('campaign_id', id);
    const ids = [...new Set([camp.master_id, ...(mem || []).map((m) => m.user_id)])];
    const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
    setMembers(mem || []);
    setProfiles(Object.fromEntries((profs || []).map((p) => [p.id, p])));
  };
  const loadChars = async () => {
    const { data } = await supabase.from('characters').select('*').eq('campaign_id', id).order('created_at');
    setCharacters(data || []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: camp } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
      if (!alive) return;
      if (!camp) { setStatus('missing'); return; }
      setCampaign(camp);
      await Promise.all([loadMembers(camp), loadChars()]);
      if (alive) setStatus('ready');
    })();
    const ch = supabase.channel(`camp-${id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${id}` }, ({ new: c }) => setCampaign(c))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters', filter: `campaign_id=eq.${id}` }, ({ eventType, new: r, old }) => {
        setCharacters((list) => {
          if (eventType === 'DELETE') return list.filter((x) => x.id !== old.id);
          const exists = list.some((x) => x.id === r.id);
          return exists ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_members', filter: `campaign_id=eq.${id}` }, () => {
        supabase.from('campaigns').select('*').eq('id', id).maybeSingle().then(({ data }) => data && loadMembers(data));
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [id]);

  return { campaign, setCampaign, members, profiles, characters, setCharacters, status, reloadChars: loadChars };
}

// Canal de broadcast para o mestre exibir a abertura para todos ao mesmo tempo.
function useCrawlBroadcast(id, onCrawl) {
  const chRef = useRef(null);
  const cb = useRef(onCrawl);
  cb.current = onCrawl;
  useEffect(() => {
    const ch = supabase.channel(`crawl-${id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'crawl' }, () => cb.current?.())
      .subscribe();
    chRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [id]);
  return () => chRef.current?.send({ type: 'broadcast', event: 'crawl', payload: {} });
}

const crawlOf = (campaign) => (campaign?.crawl?.text ? campaign.crawl : null);

export default function CampaignPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const camp = useCampaign(id);
  const [showCrawl, setShowCrawl] = useState(false);
  const isMaster = camp.campaign?.master_id === user.id;
  const broadcastCrawl = useCrawlBroadcast(id, () => setShowCrawl(true));

  // Mostra a abertura da campanha automaticamente na primeira visita do jogador
  useEffect(() => {
    if (!camp.campaign || isMaster) return;
    const c = crawlOf(camp.campaign);
    if (!c) return;
    const key = `holocron:crawl:${id}:${(c.title || '') + c.text.length}`;
    try {
      if (!localStorage.getItem(key)) { localStorage.setItem(key, '1'); setShowCrawl(true); }
    } catch { /* noop */ }
  }, [camp.campaign?.id, camp.campaign?.crawl]);

  if (camp.status === 'loading') return <div className="loader"><div className="saber" />SINTONIZANDO FREQUÊNCIA</div>;
  if (camp.status === 'missing') {
    return <div className="page"><div className="empty">Campanha não encontrada, ou você não faz parte dela.<div style={{ marginTop: 10 }}><Link to="/" className="btn">Voltar</Link></div></div></div>;
  }

  return (
    <>
      {showCrawl && <Crawl crawl={crawlOf(camp.campaign) || DEFAULT_CRAWL} onDone={() => setShowCrawl(false)} />}
      {isMaster
        ? <MasterView camp={camp} user={user} onCrawl={() => setShowCrawl(true)} broadcastCrawl={broadcastCrawl} />
        : <PlayerView camp={camp} user={user} onCrawl={() => setShowCrawl(true)} />}
    </>
  );
}

function CampaignHeader({ campaign, profiles, children }) {
  const era = ERAS.find((e) => e.id === campaign.era);
  return (
    <div className="section-head" style={{ marginTop: 0 }}>
      <div>
        <div className="kicker">{era?.name ?? 'Campanha'} · Mestre {profiles[campaign.master_id]?.display_name ?? '—'}</div>
        <h1 className="yellow" style={{ margin: '4px 0 0' }}>{campaign.name}</h1>
        {campaign.description && <div className="small muted">{campaign.description}</div>}
      </div>
      <div className="row">{children}</div>
    </div>
  );
}

/* ======================= Jogador ======================= */

function PlayerView({ camp, user, onCrawl }) {
  const { campaign, profiles, characters, reloadChars } = camp;
  const mine = characters.filter((c) => c.owner_id === user.id);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState('ficha');
  const navigate = useNavigate();
  const current = mine.find((c) => c.id === activeId) ?? mine[0];

  useSetRollTarget({ campaignId: campaign.id, character: current ? { id: current.id, name: current.data.name } : null, isMaster: false });

  const leave = async () => {
    if (!confirm('Sair desta campanha? Suas fichas continuam salvas.')) return;
    for (const c of mine) await supabase.from('characters').update({ campaign_id: null }).eq('id', c.id);
    await supabase.from('campaign_members').delete().eq('campaign_id', campaign.id).eq('user_id', user.id);
    navigate('/');
  };

  return (
    <div className="page">
      <CampaignHeader campaign={campaign} profiles={profiles}>
        <button className="btn sm yellow" onClick={onCrawl}>▶ Abertura</button>
        <button className="btn sm ghost red" onClick={leave}>Sair</button>
      </CampaignHeader>

      <div className="tabs">
        <button className={`tab ${tab === 'ficha' ? 'active' : ''}`} onClick={() => setTab('ficha')}>Minha ficha</button>
        <button className={`tab ${tab === 'mesa' ? 'active' : ''}`} onClick={() => setTab('mesa')}>Mesa</button>
      </div>

      {tab === 'ficha' && (
        mine.length === 0 ? <PickCharacter campaignId={campaign.id} userId={user.id} onDone={reloadChars} /> : (
          <>
            {mine.length > 1 && (
              <div className="row" style={{ marginBottom: 12 }}>
                {mine.map((c) => <button key={c.id} className={`btn sm ${current?.id === c.id ? 'yellow primary' : ''}`} onClick={() => setActiveId(c.id)}>{c.name}</button>)}
              </div>
            )}
            {current && <LiveSheet id={current.id} campaignId={campaign.id} />}
          </>
        )
      )}

      {tab === 'mesa' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
          <div className="stack" style={{ gap: 16 }}>
            <Panel title="Grupo">
              <PartyList characters={characters} profiles={profiles} />
            </Panel>
            <Panel title="Iniciativa"><InitiativeView initiative={campaign.initiative} /></Panel>
          </div>
          <Panel title="Rolagens da mesa"><RollFeed campaignId={campaign.id} userId={user.id} profiles={profiles} /></Panel>
        </div>
      )}
    </div>
  );
}

function LiveSheet({ id, campaignId, isMaster = false }) {
  const { row, status, error, setData } = useLiveCharacter(id);
  if (!row) return <div className="loader"><div className="saber" /></div>;
  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 6 }}><SaveStatus status={status} error={error} /></div>
      <Sheet data={row.data} onChange={setData} editable campaignId={campaignId} characterId={row.id} isMaster={isMaster} />
    </>
  );
}

function PickCharacter({ campaignId, userId, onDone }) {
  const [list, setList] = useState(null);
  useEffect(() => { listMyCharacters(userId).then((l) => setList(l.filter((c) => !c.campaign_id))); }, [userId]);
  const bring = async (c) => {
    await supabase.from('characters').update({ campaign_id: campaignId }).eq('id', c.id);
    sfx.saber();
    onDone();
  };
  return (
    <Panel title="Escolha seu personagem para esta campanha">
      {list === null ? <div className="loader"><div className="saber" /></div> : (
        <div className="stack">
          {list.length === 0 && <div className="small muted">Você não tem fichas livres.</div>}
          {list.map((c) => (
            <div key={c.id} className="list-row">
              <div className="name">{c.name} <span className="tiny muted">nível {c.data.level || 1}</span></div>
              <button className="btn sm" onClick={() => bring(c)}>Trazer para a mesa</button>
            </div>
          ))}
          <Link to={`/personagem/novo?campanha=${campaignId}`} className="btn yellow" style={{ alignSelf: 'flex-start' }}>+ Criar personagem novo</Link>
        </div>
      )}
    </Panel>
  );
}

function PartyList({ characters, profiles }) {
  if (!characters.length) return <div className="empty small">Ninguém trouxe ficha ainda.</div>;
  return (
    <div className="list">
      {characters.map((c) => {
        const d = derive(c.data);
        return (
          <div key={c.id} className="list-row">
            <div>
              <div className="name yellow">{c.name}</div>
              <div className="sub">{d.sp?.name} · {d.classLabel} · {profiles[c.owner_id]?.display_name}</div>
            </div>
            <span className="tag">{d.condition.step === 0 ? 'Bem' : `Condição ${d.condition.label}`}</span>
          </div>
        );
      })}
    </div>
  );
}

function InitiativeView({ initiative }) {
  const order = initiative?.order || [];
  if (!order.length) return <div className="empty small">Nenhum combate em andamento.</div>;
  return (
    <div>
      <div className="tiny muted" style={{ marginBottom: 6 }}>Rodada {initiative.round || 1}</div>
      <div className="init-list">
        {order.map((o, i) => (
          <div key={o.id} className={`init-row ${i === initiative.turn ? 'current' : ''}`} style={{ gridTemplateColumns: '26px minmax(0,1fr) 40px' }}>
            <span className="mono dim">{i + 1}</span>
            <span>{o.name}</span>
            <span className="mono">{o.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================= Mestre ======================= */

function MasterView({ camp, user, onCrawl, broadcastCrawl }) {
  const { campaign, setCampaign, members, profiles, characters } = camp;
  const [tab, setTab] = useState('mesa');
  const [openChar, setOpenChar] = useState(null);
  const [copied, setCopied] = useState(false);
  const npcApi = useNpcs(campaign.id);
  const [npcSecret, setNpcSecret] = useState(true);
  const [openNpc, setOpenNpc] = useState(null);
  const [picker, setPicker] = useState(null); // 'livro' | 'gerador'

  useSetRollTarget({ campaignId: campaign.id, character: { id: null, name: 'Mestre' }, isMaster: true });

  const saveCampaign = async (patch) => {
    setCampaign((c) => ({ ...c, ...patch }));
    const { error } = await supabase.from('campaigns').update(patch).eq('id', campaign.id);
    if (error) alert(error.message);
  };

  const copy = () => {
    navigator.clipboard?.writeText(campaign.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Rolagens de iniciativa entram sozinhas na ordem de combate
  const initRef = useRef(campaign.initiative);
  initRef.current = campaign.initiative;
  const onRoll = (r) => {
    if (r.kind !== 'initiative') return;
    const init = initRef.current || { order: [], turn: 0, round: 1 };
    const key = r.character_id || `${r.user_id}:${r.character_name}`;
    const exists = init.order.find((o) => o.id === key);
    const order = exists
      ? init.order.map((o) => (o.id === key ? { ...o, value: r.total } : o))
      : [...init.order, { id: key, name: r.character_name || profiles[r.user_id]?.display_name || 'Jogador', value: r.total, npc: r.user_id === user.id && !r.character_id }];
    order.sort((a, b) => b.value - a.value);
    initRef.current = { ...init, order };
    saveCampaign({ initiative: initRef.current });
  };

  const scene = (npcApi.npcs || []).filter((x) => x.in_scene);
  const difficulty = encounterDifficulty(scene, characters.map((c) => derive(c.data).level));
  const rollSceneInitiative = async () => {
    for (const row of scene) {
      if ((row.data.condition || 0) >= 5) continue;
      const cp = 0;
      await sendRoll({ formula: d20Formula(row.data.init + cp), label: 'Iniciativa', kind: 'initiative', campaignId: campaign.id, character: { id: null, name: row.data.name }, hidden: npcSecret });
    }
  };
  const addNpcs = async (items, inScene) => {
    const rows = await npcApi.add(items, inScene);
    setPicker(null);
    if (rows.length === 1) { setOpenNpc(rows[0].id); }
    if (!inScene) setTab('ameacas');
  };

  return (
    <div className="page">
      <CampaignHeader campaign={campaign} profiles={profiles}>
        <div className="panel yellow" style={{ padding: '8px 14px', textAlign: 'center' }}>
          <div className="kicker">Código da sala</div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <span className="code-display">{campaign.code}</span>
            <button className="btn sm" onClick={copy}>{copied ? 'Copiado!' : 'Copiar'}</button>
          </div>
        </div>
      </CampaignHeader>

      <div className="tabs">
        {[['mesa', 'Mesa'], ['ameacas', 'Ameaças / NPCs'], ['abertura', 'Abertura'], ['notas', 'Anotações'], ['config', 'Configurações']].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'mesa' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.7fr) minmax(300px, 1fr)', gap: 16, alignItems: 'start' }}>
          <div className="stack" style={{ gap: 16 }}>
            <Panel title={`Jogadores (${members.length})`} aside={<span className="tiny dim">clique na ficha para abrir</span>}>
              {characters.length === 0 ? (
                <div className="empty small">Nenhuma ficha na mesa. Passe o código <b className="yellow mono">{campaign.code}</b> para os jogadores.</div>
              ) : (
                <div className="grid grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                  {characters.map((c) => <CharCard key={c.id} row={c} owner={profiles[c.owner_id]} onOpen={() => setOpenChar(c.id)} />)}
                </div>
              )}
              {members.filter((m) => !characters.some((c) => c.owner_id === m.user_id)).length > 0 && (
                <div className="tiny muted" style={{ marginTop: 10 }}>
                  Sem ficha na mesa: {members.filter((m) => !characters.some((c) => c.owner_id === m.user_id)).map((m) => profiles[m.user_id]?.display_name ?? '?').join(', ')}
                </div>
              )}
            </Panel>
            <Panel title={`Em cena (${scene.length})`} className="red" aside={
              <label className="check tiny"><input type="checkbox" checked={npcSecret} onChange={(e) => setNpcSecret(e.target.checked)} /> rolagens dos NPCs em segredo</label>
            }>
              {npcApi.error && <div className="error-box small" style={{ marginBottom: 8 }}>{npcApi.error.includes('npcs') ? 'Rode o arquivo supabase/npcs.sql no SQL Editor do Supabase para ativar os NPCs.' : npcApi.error}</div>}
              {difficulty && (
                <div className="row between" style={{ marginBottom: 10 }}>
                  <span className={`tag ${difficulty.tone}`}>Encontro: {difficulty.label}</span>
                  <span className="tiny muted">Soma de ND {difficulty.sumNd} · nível médio do grupo {difficulty.avg.toFixed(1)} · {difficulty.xp.toLocaleString('pt-BR')} XP ({difficulty.xpEach.toLocaleString('pt-BR')} por herói)</span>
                </div>
              )}
              {scene.length === 0 ? (
                <div className="empty small">Nenhum inimigo em cena.</div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {scene.map((row) => (
                    <NpcCard key={row.id} row={row} campaignId={campaign.id} secret={npcSecret}
                      onChange={(patch) => npcApi.update(row.id, patch)} onOpen={() => setOpenNpc(row.id)}
                      onRemoveFromScene={() => npcApi.update(row.id, { in_scene: false })} />
                  ))}
                </div>
              )}
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn sm red" onClick={() => setPicker('livro')}>+ Ficha do livro</button>
                <button className="btn sm red" onClick={() => setPicker('gerador')}>+ Criar NPC</button>
                <button className="btn sm" onClick={() => setTab('ameacas')}>Biblioteca de NPCs</button>
                {scene.length > 0 && <button className="btn sm yellow" onClick={rollSceneInitiative}>Rolar iniciativa de todos</button>}
                {scene.length > 0 && <button className="btn sm ghost" onClick={() => scene.forEach((row) => npcApi.update(row.id, { in_scene: false }))}>Limpar cena</button>}
              </div>
            </Panel>
            <Panel title="Ordem de iniciativa">
              <InitiativeTracker initiative={campaign.initiative} onChange={(initiative) => saveCampaign({ initiative })} characters={characters} />
            </Panel>
          </div>
          <Panel title="Rolagens ao vivo" aside={<span className="tiny dim">use o d20 no canto para rolar</span>}>
            <RollFeed campaignId={campaign.id} userId={user.id} profiles={profiles} toastOthers onRoll={onRoll} canClear />
          </Panel>
        </div>
      )}

      {tab === 'ameacas' && (
        <NpcLibrary api={npcApi} campaignId={campaign.id} secret={npcSecret} selected={openNpc} onSelect={setOpenNpc} onPicker={setPicker} />
      )}

      {picker === 'livro' && <BestiaryPicker onAdd={addNpcs} onClose={() => setPicker(null)} />}
      {picker === 'gerador' && <NpcBuilder onAdd={addNpcs} onClose={() => setPicker(null)} />}
      {openNpc && tab === 'mesa' && npcApi.npcs?.find((x) => x.id === openNpc) && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setOpenNpc(null)}>
          <div className="modal panel red">
            <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
              <button className="btn sm" onClick={() => setOpenNpc(null)}>Fechar ✕</button>
            </div>
            <NpcSheet row={npcApi.npcs.find((x) => x.id === openNpc)} campaignId={campaign.id} secret={npcSecret} onChange={(patch) => npcApi.update(openNpc, patch)} />
          </div>
        </div>
      )}

      {tab === 'abertura' && <CrawlEditor campaign={campaign} onSave={(crawl) => saveCampaign({ crawl })} onPreview={onCrawl} onBroadcast={() => { broadcastCrawl(); onCrawl(); }} />}
      {tab === 'notas' && <MasterNotes campaignId={campaign.id} />}
      {tab === 'config' && <CampaignConfig campaign={campaign} members={members} profiles={profiles} onSave={saveCampaign} />}

      {openChar && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setOpenChar(null)}>
          <div className="modal panel">
            <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
              <button className="btn sm" onClick={() => setOpenChar(null)}>Fechar ✕</button>
            </div>
            <LiveSheet id={openChar} campaignId={campaign.id} isMaster />
          </div>
        </div>
      )}
    </div>
  );
}

function CharCard({ row, owner, onOpen }) {
  const d = derive(row.data);
  const pct = Math.max(0, Math.min(100, (d.hpCurrent / (d.hpMax || 1)) * 100));
  const cond = CONDITION_TRACK[row.data.condition || 0];
  return (
    <div className="panel char-card" onClick={onOpen} style={{ padding: 14 }}>
      <div className="row between" style={{ flexWrap: 'nowrap' }}>
        <div style={{ minWidth: 0 }}>
          <div className="cname">{row.name}</div>
          <div className="tiny muted">{d.sp?.name} · {d.classLabel} · {owner?.display_name}</div>
        </div>
        {owner?.avatar_url ? <img className="avatar" src={owner.avatar_url} alt="" /> : null}
      </div>
      <div className={`bar ${pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}`} style={{ marginTop: 10 }}>
        <i style={{ width: `${pct}%` }} /><span>{d.hpCurrent}/{d.hpMax}</span>
      </div>
      <div className="stat-grid" style={{ marginTop: 8, gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        <div className="stat" style={{ padding: 4 }}><div className="k">Ref</div><div className="v" style={{ fontSize: '1rem' }}>{d.defenses.ref}</div></div>
        <div className="stat" style={{ padding: 4 }}><div className="k">Fort</div><div className="v" style={{ fontSize: '1rem' }}>{d.defenses.fort}</div></div>
        <div className="stat" style={{ padding: 4 }}><div className="k">Von</div><div className="v" style={{ fontSize: '1rem' }}>{d.defenses.von}</div></div>
        <div className="stat" style={{ padding: 4 }}><div className="k">Limiar</div><div className="v" style={{ fontSize: '1rem' }}>{d.threshold}</div></div>
      </div>
      <div className="row" style={{ marginTop: 8, gap: 6 }}>
        <span className={`tag ${cond.step === 0 ? 'green' : cond.step >= 4 ? 'red' : 'yellow'}`}>{cond.step === 0 ? 'Normal' : cond.label}</span>
        <span className="tag blue">PF {d.fpCurrent}</span>
        {row.data.darkSide > 0 && <span className="tag red">LS {row.data.darkSide}</span>}
        <span className="tag">Perc. {(d.skills.find((s) => s.name === 'Percepção')?.mod ?? 0) >= 0 ? '+' : ''}{d.skills.find((s) => s.name === 'Percepção')?.mod}</span>
      </div>
    </div>
  );
}

function InitiativeTracker({ initiative, onChange, characters }) {
  const init = initiative || { order: [], turn: 0, round: 1 };
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const order = init.order || [];

  const save = (patch) => onChange({ ...init, ...patch });
  const add = (e) => {
    e.preventDefault();
    if (!name) return;
    const next = [...order, { id: crypto.randomUUID(), name, value: Number(value) || 0, npc: true }].sort((a, b) => b.value - a.value);
    save({ order: next });
    setName(''); setValue('');
  };
  const nextTurn = () => {
    if (!order.length) return;
    const t = (init.turn || 0) + 1;
    if (t >= order.length) save({ turn: 0, round: (init.round || 1) + 1 });
    else save({ turn: t });
    sfx.notify();
  };
  const addParty = () => {
    const ids = new Set(order.map((o) => o.id));
    const extra = characters.filter((c) => !ids.has(c.id)).map((c) => ({ id: c.id, name: c.name, value: 0 }));
    save({ order: [...order, ...extra] });
  };

  return (
    <div className="stack">
      <div className="row between">
        <span className="small">Rodada <b className="yellow">{init.round || 1}</b></span>
        <div className="row">
          <button className="btn sm" onClick={addParty}>+ Grupo</button>
          <button className="btn sm" onClick={() => save({ order: [...order].sort((a, b) => b.value - a.value) })}>Ordenar</button>
          <button className="btn sm yellow primary" onClick={nextTurn} disabled={!order.length}>Próximo turno ▸</button>
          <button className="btn sm ghost red" onClick={() => confirm('Encerrar o combate?') && save({ order: [], turn: 0, round: 1 })}>Encerrar</button>
        </div>
      </div>
      <div className="tiny muted">Quando um jogador rola Iniciativa na ficha, ele entra aqui sozinho.</div>
      {order.length === 0 && <div className="empty small">Sem combatentes.</div>}
      <div className="init-list">
        {order.map((o, i) => (
          <div key={o.id} className={`init-row ${i === init.turn ? 'current' : ''}`}>
            <span className="mono dim">{i === init.turn ? '▸' : i + 1}</span>
            <span className={o.npc ? 'red-text' : ''}>{o.name}</span>
            <input type="number" value={o.value} onChange={(e) => save({ order: order.map((x) => (x.id === o.id ? { ...x, value: Number(e.target.value) || 0 } : x)) })} />
            <button className="btn sm ghost red" onClick={() => save({ order: order.filter((x) => x.id !== o.id), turn: Math.min(init.turn, Math.max(0, order.length - 2)) })}>✕</button>
          </div>
        ))}
      </div>
      <form className="row" onSubmit={add} style={{ flexWrap: 'nowrap' }}>
        <input placeholder="Inimigo / PdM (ex.: Stormtrooper 1)" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
        <input type="number" placeholder="Init" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn sm red" disabled={!name}>Adicionar</button>
      </form>
    </div>
  );
}

function CrawlEditor({ campaign, onSave, onPreview, onBroadcast }) {
  const [form, setForm] = useState(() => ({ episode: '', title: '', text: '', ...(campaign.crawl || {}) }));
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify({ episode: '', title: '', text: '', ...(campaign.crawl || {}) });
  const save = async () => { await onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  return (
    <Panel title="Texto de abertura da campanha" className="yellow">
      <p className="small muted">Os jogadores veem esta abertura na primeira vez que entram na campanha. Você também pode exibi-la para todos ao mesmo tempo, no início de cada sessão.</p>
      <div className="grid grid-2">
        <label className="field">Episódio<input value={form.episode} placeholder="EPISÓDIO IV" onChange={(e) => setForm({ ...form, episode: e.target.value })} /></label>
        <label className="field">Título<input value={form.title} placeholder="UMA NOVA ESPERANÇA" onChange={(e) => setForm({ ...form, title: e.target.value.toUpperCase() })} /></label>
      </div>
      <label className="field" style={{ marginTop: 12 }}>Texto (parágrafos separados por linha em branco)
        <textarea value={form.text} style={{ minHeight: 220, fontFamily: 'var(--font-crawl)', fontSize: '1.05rem' }}
          placeholder={'É um período de guerra civil...\n\nDurante a batalha...'} onChange={(e) => setForm({ ...form, text: e.target.value })} />
      </label>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn yellow primary" onClick={save} disabled={!dirty}>{saved ? 'Salvo!' : 'Salvar'}</button>
        <button className="btn" onClick={() => { if (dirty) save(); onPreview(); }} disabled={!form.text}>Pré-visualizar</button>
        <button className="btn red" onClick={async () => { if (dirty) await save(); onBroadcast(); }} disabled={!form.text}>📡 Exibir para todos agora</button>
      </div>
    </Panel>
  );
}

function MasterNotes({ campaignId }) {
  const [notes, setNotes] = useState(null);
  const [status, setStatus] = useState('');
  const timer = useRef(null);
  useEffect(() => {
    supabase.from('campaign_secrets').select('notes').eq('campaign_id', campaignId).maybeSingle()
      .then(({ data }) => setNotes(data?.notes ?? ''));
  }, [campaignId]);
  const change = (v) => {
    setNotes(v); setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase.from('campaign_secrets').upsert({ campaign_id: campaignId, notes: v });
      setStatus(error ? 'error' : 'saved');
    }, 800);
  };
  if (notes === null) return <div className="loader"><div className="saber" /></div>;
  return (
    <Panel title="Anotações secretas do mestre" className="red" aside={<SaveStatus status={status} error="falha ao salvar" />}>
      <p className="small muted">Só você vê isto. PdMs, segredos da trama, estatísticas de inimigos...</p>
      <textarea value={notes} onChange={(e) => change(e.target.value)} style={{ minHeight: 420, width: '100%', fontFamily: 'var(--font-mono)' }} />
    </Panel>
  );
}

function CampaignConfig({ campaign, members, profiles, onSave }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: campaign.name, description: campaign.description || '', era: campaign.era });
  const kick = async (uid) => {
    if (!confirm(`Remover ${profiles[uid]?.display_name ?? 'jogador'} da campanha?`)) return;
    await supabase.from('characters').update({ campaign_id: null }).eq('campaign_id', campaign.id).eq('owner_id', uid);
    await supabase.from('campaign_members').delete().eq('campaign_id', campaign.id).eq('user_id', uid);
  };
  const destroy = async () => {
    if (prompt(`Para apagar, digite o nome da campanha: ${campaign.name}`) !== campaign.name) return;
    await supabase.from('campaigns').delete().eq('id', campaign.id);
    navigate('/');
  };
  return (
    <div className="grid grid-2">
      <Panel title="Dados da campanha">
        <div className="stack">
          <label className="field">Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field">Era<select value={form.era} onChange={(e) => setForm({ ...form, era: e.target.value })}>{ERAS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          <label className="field">Descrição<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <button className="btn primary" onClick={() => onSave(form)}>Salvar</button>
        </div>
      </Panel>
      <div className="stack" style={{ gap: 16 }}>
        <Panel title="Membros">
          {members.length === 0 && <div className="small muted">Ninguém entrou ainda.</div>}
          <div className="list">
            {members.map((m) => (
              <div key={m.user_id} className="list-row">
                <div className="row">
                  {profiles[m.user_id]?.avatar_url ? <img className="avatar" src={profiles[m.user_id].avatar_url} alt="" /> : <span className="avatar">{(profiles[m.user_id]?.display_name || '?')[0]}</span>}
                  <span>{profiles[m.user_id]?.display_name ?? 'Desconhecido'}</span>
                </div>
                <button className="btn sm ghost red" onClick={() => kick(m.user_id)}>Remover</button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Zona de perigo" className="red">
          <p className="small muted">Apagar a campanha remove rolagens e anotações. As fichas dos jogadores continuam existindo.</p>
          <button className="btn red" onClick={destroy}>Destruir campanha (Ordem 66)</button>
        </Panel>
      </div>
    </div>
  );
}

function NpcLibrary({ api, campaignId, secret, selected, onSelect, onPicker }) {
  const [q, setQ] = useState('');
  const list = (api.npcs || []).filter((x) => !q || x.data.name.toLowerCase().includes(q.toLowerCase()));
  const current = (api.npcs || []).find((x) => x.id === selected) || list[0];
  const duplicate = async (row) => {
    const base = row.data.name.replace(/ \d+$/, '');
    const count = (api.npcs || []).filter((x) => x.data.name.startsWith(base)).length;
    const rows = await api.add([{ ...row.data, name: `${base} ${count + 1}`, hpCurrent: null, condition: 0 }], row.in_scene);
    if (rows[0]) onSelect(rows[0].id);
  };
  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <Panel title={`NPCs da campanha (${(api.npcs || []).length})`} className="red">
        {api.error && <div className="error-box small" style={{ marginBottom: 8 }}>{api.error.includes('npcs') ? 'Rode o arquivo supabase/npcs.sql no SQL Editor do Supabase para ativar os NPCs.' : api.error}</div>}
        <div className="stack" style={{ marginBottom: 10 }}>
          <button className="btn red primary" onClick={() => onPicker('livro')}>+ Ficha pronta do livro</button>
          <button className="btn red" onClick={() => onPicker('gerador')}>+ Criar NPC (gerador / em branco)</button>
          <input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {api.npcs === null ? <div className="loader" style={{ minHeight: 80 }}><div className="saber" /></div> : list.length === 0 ? (
          <div className="empty small">Nenhum NPC ainda. Comece por um stormtrooper!</div>
        ) : (
          <div className="list" style={{ maxHeight: 560, overflowY: 'auto' }}>
            {list.map((row) => {
              const { cur, max } = npcHp(row.data);
              return (
                <div key={row.id} className="list-row" style={{ cursor: 'pointer', background: current?.id === row.id ? 'rgba(255,64,64,0.08)' : undefined }} onClick={() => onSelect(row.id)}>
                  <div>
                    <div className="name">{row.data.name} {row.in_scene && <span className="tag red">em cena</span>}</div>
                    <div className="sub">ND {row.data.nd} · PV {cur}/{max}</div>
                  </div>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: 2 }}>
                    <button className="btn sm ghost" title="Duplicar" onClick={(e) => { e.stopPropagation(); duplicate(row); }}>⧉</button>
                    <button className="btn sm ghost red" title="Apagar" onClick={(e) => { e.stopPropagation(); if (confirm(`Apagar ${row.data.name}?`)) api.remove([row.id]); }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <Panel className="red">
        {current ? <NpcSheet row={current} campaignId={campaignId} secret={secret} onChange={(patch) => api.update(current.id, patch)} />
          : <div className="empty">Selecione ou crie um NPC.</div>}
      </Panel>
    </div>
  );
}
