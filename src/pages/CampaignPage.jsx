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
import Holo from '../components/Holo';
import { VehicleCard, VehiclePicker } from '../components/Vehicles';
import { deriveVehicle } from '../lib/vehicles';
import { ADVENTURES } from '../data/adventures';
import { d20Formula } from '../lib/dice';
import { useTableChannel, useTableStatus } from '../lib/table';
import Galaxy from '../components/Galaxy';
import ContractBoard from '../components/Contracts';
import { CodexEditor, CodexReader } from '../components/Codex';
import Cantina from '../components/Cantina';
import { resizeImage } from '../components/Holo';

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

const crawlOf = (campaign) => (campaign?.crawl?.text ? campaign.crawl : null);

export default function CampaignPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const camp = useCampaign(id);
  const [showCrawl, setShowCrawl] = useState(false); // false | true (abertura da campanha) | objeto (ex.: recapitulação)
  const isMaster = camp.campaign?.master_id === user.id;
  const send = useTableChannel(id, user.id, (crawl) => setShowCrawl(crawl || true));

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
      {showCrawl && <Crawl crawl={typeof showCrawl === 'object' ? showCrawl : crawlOf(camp.campaign) || DEFAULT_CRAWL} onDone={() => setShowCrawl(false)} />}
      {isMaster
        ? <MasterView camp={camp} user={user} onCrawl={(c) => setShowCrawl(c || true)} send={send} />
        : <PlayerView camp={camp} user={user} onCrawl={() => setShowCrawl(true)} send={send} />}
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

function PlayerView({ camp, user, onCrawl, send }) {
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
        <TableStatus campaignId={campaign.id} />
        <button className="btn sm yellow" onClick={onCrawl}>▶ Abertura</button>
        <button className="btn sm ghost red" onClick={leave}>Sair</button>
      </CampaignHeader>

      <div className="tabs">
        <button className={`tab ${tab === 'ficha' ? 'active' : ''}`} onClick={() => setTab('ficha')}>Minha ficha</button>
        <button className={`tab ${tab === 'mesa' ? 'active' : ''}`} onClick={() => setTab('mesa')}>Mesa</button>
        <button className={`tab ${tab === 'galaxia' ? 'active' : ''}`} onClick={() => setTab('galaxia')}>Galáxia</button>
        <button className={`tab ${tab === 'contratos' ? 'active' : ''}`} onClick={() => setTab('contratos')}>Contratos</button>
        <button className={`tab ${tab === 'holocron' ? 'active' : ''}`} onClick={() => setTab('holocron')}>Holocron{(campaign.codex || []).length ? ` (${campaign.codex.length})` : ''}</button>
        <button className={`tab ${tab === 'cantina' ? 'active' : ''}`} onClick={() => setTab('cantina')}>Cantina</button>
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
            {(campaign.vehicles || []).map((v) => (
              <VehicleCard key={v.uid} v={v} characters={characters} campaignId={campaign.id} />
            ))}
          </div>
          <Panel title="Rolagens da mesa"><RollFeed campaignId={campaign.id} userId={user.id} profiles={profiles} /></Panel>
        </div>
      )}

      {tab === 'galaxia' && <Galaxy galaxy={campaign.galaxy || {}} isMaster={false} ships={campaign.vehicles || []} campaignId={campaign.id} />}
      {tab === 'contratos' && <ContractBoard campaignId={campaign.id} myChars={mine} send={send} />}
      {tab === 'holocron' && <CodexReader entries={campaign.codex || []} />}
      {tab === 'cantina' && (current
        ? <Cantina key={current.id} characterId={current.id} campaignId={campaign.id} />
        : <div className="empty">Traga uma ficha para a mesa antes de apostar.</div>)}
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
              <div className="sub">{d.spLabel} · {d.classLabel} · {profiles[c.owner_id]?.display_name}</div>
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

function MasterView({ camp, user, onCrawl, send }) {
  const { campaign, setCampaign, members, profiles, characters } = camp;
  const [tab, setTab] = useState('mesa');
  const [openChar, setOpenChar] = useState(null);
  const [copied, setCopied] = useState(false);
  const npcApi = useNpcs(campaign.id);
  const [npcSecret, setNpcSecret] = useState(true);
  const [openNpc, setOpenNpc] = useState(null);
  const [picker, setPicker] = useState(null); // 'livro' | 'gerador'

  useSetRollTarget({ campaignId: campaign.id, character: { id: null, name: 'Mestre' }, isMaster: true });

  const [extrasMissing, setExtrasMissing] = useState(false);
  const [transOpen, setTransOpen] = useState(false);
  const saveCampaign = async (patch) => {
    setCampaign((c) => ({ ...c, ...patch }));
    const { error } = await supabase.from('campaigns').update(patch).eq('id', campaign.id);
    if (error && /galaxy|codex/.test(error.message)) setExtrasMissing(true);
    else if (error) alert(error.message);
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

  const vehTimer = useRef(null);
  const partyShips = campaign.vehicles || [];
  const saveShips = (vehicles) => {
    setCampaign((c) => ({ ...c, vehicles }));
    clearTimeout(vehTimer.current);
    vehTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('campaigns').update({ vehicles }).eq('id', campaign.id);
      if (error) setShipError(error.message.includes('vehicles') ? 'Rode o arquivo supabase/naves.sql no SQL Editor do Supabase para ativar as naves do grupo.' : error.message);
      else setShipError('');
    }, 600);
  };
  const [shipError, setShipError] = useState('');
  const [shipPicker, setShipPicker] = useState(null); // 'grupo' | 'inimiga'
  const scene = (npcApi.npcs || []).filter((x) => x.in_scene);
  const sceneNpcs = scene.filter((x) => x.data.kind !== 'vehicle');
  const sceneShips = scene.filter((x) => x.data.kind === 'vehicle');
  const difficulty = encounterDifficulty(scene, characters.map((c) => derive(c.data).level));
  const rollSceneInitiative = async () => {
    for (const row of scene) {
      if ((row.data.condition || 0) >= 5) continue;
      const ini = row.data.kind === 'vehicle' ? deriveVehicle(row.data).init : row.data.init;
      await sendRoll({ formula: d20Formula(ini), label: 'Iniciativa', kind: 'initiative', campaignId: campaign.id, character: { id: null, name: row.data.name }, hidden: npcSecret });
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

      <div className="comms-bar">
        <span className="kicker">Comunicações</span>
        <TableStatus campaignId={campaign.id} />
        <button className="btn sm" onClick={() => setTransOpen(true)}>📡 Transmissão holográfica</button>
        <button className="btn sm red" onClick={() => send('alert', { text: 'ALERTA VERMELHO' })}>🚨 Alerta!</button>
        <button className="btn sm yellow" onClick={() => send('jump', {})}>⟫ Salto para o hiperespaço</button>
        <button className="btn sm" onClick={() => send('exit', {})}>⟪ Saindo do hiperespaço</button>
      </div>
      {transOpen && <TransmissionConsole onClose={() => setTransOpen(false)} send={send} members={members} profiles={profiles} characters={characters} npcs={npcApi.npcs || []} />}

      <div className="tabs">
        {[['mesa', 'Mesa'], ['ameacas', 'Ameaças / NPCs'], ['naves', 'Naves'], ['galaxia', 'Galáxia'], ['contratos', 'Contratos'], ['holocron', 'Holocron'], ['abertura', 'Abertura'], ['notas', 'Anotações'], ['config', 'Configurações']].map(([k, l]) => (
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
                  {sceneShips.map((row) => (
                    <VehicleCard key={row.id} v={row.data} enemy compact canEdit campaignId={campaign.id} secret={npcSecret}
                      onChange={(patch) => npcApi.update(row.id, { data: patch })} onRemove={() => npcApi.update(row.id, { in_scene: false })} />
                  ))}
                  {sceneNpcs.map((row) => (
                    <NpcCard key={row.id} row={row} campaignId={campaign.id} secret={npcSecret}
                      onChange={(patch) => npcApi.update(row.id, patch)} onOpen={() => setOpenNpc(row.id)}
                      onRemoveFromScene={() => npcApi.update(row.id, { in_scene: false })} />
                  ))}
                </div>
              )}
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn sm red" onClick={() => setPicker('livro')}>+ Ficha do livro</button>
                <button className="btn sm red" onClick={() => setPicker('gerador')}>+ Criar NPC</button>
                <button className="btn sm red" onClick={() => setShipPicker('inimiga')}>+ Nave inimiga</button>
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

      {tab === 'naves' && (
        <div className="stack" style={{ gap: 16 }}>
          {shipError && <div className="error-box">{shipError}</div>}
          <Panel title={`Naves do grupo (${partyShips.length})`} className="yellow" aside={<button className="btn sm yellow" onClick={() => setShipPicker('grupo')}>+ Nave do grupo</button>}>
            <p className="small muted">A nave (ou o speeder) dos heróis. Os jogadores veem a ficha na aba Mesa e podem rolar os ataques; só você aplica dano e troca a tripulação. Coloque um jogador como piloto para a Reflexo usar o nível heróico dele.</p>
            {partyShips.length === 0 ? <div className="empty small">O grupo ainda não tem nave.</div> : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
                {partyShips.map((v) => (
                  <VehicleCard key={v.uid} v={v} characters={characters} canEdit campaignId={campaign.id}
                    onChange={(patch) => saveShips(partyShips.map((x) => (x.uid === v.uid ? { ...x, ...patch } : x)))}
                    onRemove={() => confirm(`Remover ${v.name} do grupo?`) && saveShips(partyShips.filter((x) => x.uid !== v.uid))} />
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Naves inimigas" className="red" aside={<button className="btn sm red" onClick={() => setShipPicker('inimiga')}>+ Nave inimiga</button>}>
            <p className="small muted">Caças TIE, walkers, corvetas... Elas ficam na lista de ameaças (só você vê) e aparecem na área Em cena da Mesa.</p>
            {(npcApi.npcs || []).filter((x) => x.data.kind === 'vehicle').length === 0 ? <div className="empty small">Nenhuma nave inimiga.</div> : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {(npcApi.npcs || []).filter((x) => x.data.kind === 'vehicle').map((row) => (
                  <div key={row.id}>
                    <VehicleCard v={row.data} enemy canEdit compact campaignId={campaign.id} secret={npcSecret}
                      onChange={(patch) => npcApi.update(row.id, { data: patch })} onRemove={() => confirm(`Apagar ${row.data.name}?`) && npcApi.remove([row.id])} />
                    <label className="check tiny" style={{ marginTop: 4 }}><input type="checkbox" checked={row.in_scene} onChange={(e) => npcApi.update(row.id, { in_scene: e.target.checked })} /> Em cena</label>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
      {shipPicker && (
        <VehiclePicker enemy={shipPicker === 'inimiga'} onClose={() => setShipPicker(null)}
          onAdd={async (items) => {
            if (shipPicker === 'grupo') saveShips([...partyShips, ...items]);
            else await npcApi.add(items, true);
            setShipPicker(null);
          }} />
      )}

      {tab === 'ameacas' && (
        <NpcLibrary api={npcApi} campaignId={campaign.id} secret={npcSecret} selected={openNpc} onSelect={setOpenNpc} onPicker={setPicker}
          onImportCrawl={(crawl) => saveCampaign({ crawl })} />
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

      {tab === 'galaxia' && (
        <Galaxy galaxy={campaign.galaxy || {}} isMaster ships={partyShips} campaignId={campaign.id} send={send} missingColumn={extrasMissing}
          onSave={(galaxy) => saveCampaign({ galaxy })} />
      )}
      {tab === 'contratos' && <ContractBoard campaignId={campaign.id} isMaster characters={characters} send={send} />}
      {tab === 'holocron' && (
        <>
          {extrasMissing && <div className="error-box" style={{ marginBottom: 12 }}>Rode o arquivo supabase/extras.sql no SQL Editor do Supabase para liberar o holocron aos jogadores.</div>}
          <CodexEditor campaign={campaign} send={send} onSaveUnlocked={(codex) => saveCampaign({ codex })} />
        </>
      )}
      {tab === 'abertura' && (
        <div className="stack" style={{ gap: 16 }}>
          <CrawlEditor campaign={campaign} onSave={(crawl) => saveCampaign({ crawl })} onPreview={() => onCrawl()} onBroadcast={() => send('crawl', {})} />
          <RecapEditor campaign={campaign} onPreview={(crawl) => onCrawl(crawl)} onBroadcast={(crawl) => send('crawl', { crawl })} />
        </div>
      )}
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
          <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 8 }}>
            {row.data.portrait && <Holo src={row.data.portrait} size={50} />}
            <div className="cname">{row.name}</div>
          </div>
          <div className="tiny muted">{d.spLabel} · {d.classLabel} · {owner?.display_name}</div>
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

function AdventureImport({ api, onImportCrawl, onClose }) {
  const [useCrawl, setUseCrawl] = useState(true);
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState('');
  const run = async (adv) => {
    setBusy(adv.id);
    const rows = await api.add(adv.build(), false);
    if (useCrawl && adv.crawl) await onImportCrawl(adv.crawl);
    setBusy('');
    setDone(`${rows.length} NPCs de "${adv.title}" adicionados à biblioteca${useCrawl ? ' e a abertura foi atualizada' : ''}.`);
  };
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel yellow" style={{ width: 'min(820px, 100%)' }}>
        <div className="panel-title"><span>Aventuras prontas</span><button className="btn sm ghost" onClick={onClose}>✕</button></div>
        {ADVENTURES.map((adv) => (
          <div key={adv.id} className="info-box" style={{ marginBottom: 12 }}>
            <div className="row between"><b className="yellow">{adv.title}</b><span className="tag">{adv.level}</span></div>
            <p className="small" style={{ margin: '6px 0' }}>{adv.summary}</p>
            <ul className="small muted" style={{ margin: '0 0 8px 18px', padding: 0 }}>{adv.scenes.map((sc) => <li key={sc}>{sc}</li>)}</ul>
            <div className="tiny muted" style={{ marginBottom: 8 }}>NPCs: {adv.build().map((n) => n.name).join(', ')}.</div>
            <div className="row between">
              <label className="check small"><input type="checkbox" checked={useCrawl} onChange={(e) => setUseCrawl(e.target.checked)} /> Usar também o texto de abertura desta aventura</label>
              <button className="btn yellow primary" disabled={Boolean(busy)} onClick={() => run(adv)}>{busy === adv.id ? 'Importando...' : 'Importar'}</button>
            </div>
          </div>
        ))}
        {done && <div className="info-box small green-text">{done} Os NPCs ficam fora de cena; marque "Em cena" quando entrarem na história.</div>}
      </div>
    </div>
  );
}

function NpcLibrary({ api, campaignId, secret, selected, onSelect, onPicker, onImportCrawl }) {
  const [importOpen, setImportOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = (api.npcs || []).filter((x) => x.data.kind !== 'vehicle' && (!q || x.data.name.toLowerCase().includes(q.toLowerCase())));
  const current = (api.npcs || []).find((x) => x.id === selected && x.data.kind !== 'vehicle') || list[0];
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
          <button className="btn yellow" onClick={() => setImportOpen(true)}>Importar aventura pronta</button>
          {importOpen && <AdventureImport api={api} onImportCrawl={onImportCrawl} onClose={() => setImportOpen(false)} />}
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

// "Anteriormente em...": abertura curta montada com três frases, para o começo de cada sessão
export function buildRecap(name, lines) {
  const parts = lines.map((l) => l.trim()).filter(Boolean).map((l) => (/[.!?…]$/.test(l) ? l : `${l}.`));
  if (parts.length) parts[parts.length - 1] = parts[parts.length - 1].replace(/[.!?…]$/, '....');
  return { episode: 'ANTERIORMENTE EM...', title: String(name || '').toUpperCase(), text: parts.join('\n\n') };
}

function RecapEditor({ campaign, onPreview, onBroadcast }) {
  const key = `holocron:recap:${campaign.id}`;
  const [lines, setLines] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || ['', '', '']; } catch { return ['', '', '']; }
  });
  const set = (i, v) => {
    const next = lines.map((x, j) => (j === i ? v : x));
    setLines(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* noop */ }
  };
  const crawl = buildRecap(campaign.name, lines);
  const ok = lines.some((l) => l.trim());
  const hints = ['O que aconteceu na última sessão?', 'Qual o perigo agora?', 'Onde os heróis estão (e o que vão fazer)?'];
  return (
    <Panel title="Anteriormente em..." className="red">
      <p className="small muted" style={{ marginTop: 0 }}>Três frases sobre a última sessão viram um letreiro curto de recapitulação, no estilo dos filmes. Bom para abrir a sessão.</p>
      {lines.map((l, i) => (
        <label key={i} className="field" style={{ marginTop: i ? 8 : 0 }}>{i + 1}.
          <input value={l} placeholder={hints[i]} onChange={(e) => set(i, e.target.value)} />
        </label>
      ))}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={!ok} onClick={() => onPreview(crawl)}>Pré-visualizar</button>
        <button className="btn red" disabled={!ok} onClick={() => onBroadcast(crawl)}>📡 Exibir recapitulação para todos</button>
      </div>
    </Panel>
  );
}

// Console do mestre: transmissão holográfica para todos ou para um jogador
function TransmissionConsole({ onClose, send, members, profiles, characters, npcs }) {
  const [form, setForm] = useState({ to: 'all', from: '', text: '', img: null, tone: 'blue' });
  const [err, setErr] = useState('');
  const input = useRef(null);
  const people = npcs.filter((n) => n.data.kind !== 'vehicle');
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setForm({ ...form, img: await resizeImage(f, 220, 0.72) }); } catch (x) { setErr(x.message); }
  };
  const fromNpc = (id) => {
    const n = people.find((x) => x.id === id);
    if (n) setForm({ ...form, from: n.data.name, img: n.data.portrait || form.img });
  };
  const go = () => {
    send('transmission', { ...form, private: form.to !== 'all' });
    onClose();
  };
  const ids = [...new Set(members.map((m) => m.user_id))];
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel" style={{ width: 'min(620px, 100%)' }}>
        <div className="panel-title"><span>Transmissão holográfica</span><button className="btn sm ghost" onClick={onClose}>✕</button></div>
        <div className="grid grid-2">
          <label className="field">Para
            <select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
              <option value="all">Todos os jogadores</option>
              {ids.map((uid) => {
                const chars = characters.filter((c) => c.owner_id === uid).map((c) => c.name).join(', ');
                return <option key={uid} value={uid}>Só {profiles[uid]?.display_name ?? 'jogador'}{chars ? ` (${chars})` : ''}</option>;
              })}
            </select>
          </label>
          <label className="field">Quem fala
            <input value={form.from} placeholder="Ssarra, mestra da Guilda" onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </label>
        </div>
        {people.length > 0 && (
          <label className="field" style={{ marginTop: 8 }}>Usar um NPC da biblioteca
            <select value="" onChange={(e) => fromNpc(e.target.value)}>
              <option value="">Escolher NPC...</option>
              {people.map((n) => <option key={n.id} value={n.id}>{n.data.name}{n.data.portrait ? ' (com foto)' : ''}</option>)}
            </select>
          </label>
        )}
        <label className="field" style={{ marginTop: 8 }}>Mensagem
          <textarea value={form.text} style={{ minHeight: 120 }} placeholder="Caçador... tenho um trabalho para você. Venha sozinho." onChange={(e) => setForm({ ...form, text: e.target.value })} autoFocus />
        </label>
        <div className="row between" style={{ marginTop: 10 }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm ghost" onClick={() => input.current?.click()}>{form.img ? 'Trocar foto' : 'Foto (opcional)'}</button>
            {form.img && <button className="btn sm ghost red" onClick={() => setForm({ ...form, img: null })}>Sem foto</button>}
            <label className="check tiny"><input type="checkbox" checked={form.tone === 'red'} onChange={(e) => setForm({ ...form, tone: e.target.checked ? 'red' : 'blue' })} /> Sinal vermelho (Império/Sith)</label>
            <input ref={input} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
          </div>
          <button className="btn yellow primary" disabled={!form.text.trim()} onClick={go}>📡 Transmitir</button>
        </div>
        {err && <div className="tiny red-text">{err}</div>}
      </div>
    </div>
  );
}

function TableStatus({ campaignId }) {
  const { status, error } = useTableStatus(campaignId);
  const ok = status === 'SUBSCRIBED';
  if (status === 'POLLING') {
    return <span className="tag yellow" title={`Tempo real indisponível (${error || 'sem detalhe'}). Os efeitos chegam consultando o banco a cada 3 segundos.`}>● modo reserva (3 s)</span>;
  }
  const bad = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED';
  return (
    <span className={`tag ${ok ? 'green' : bad ? 'red' : 'yellow'}`} title={`Canal da mesa: ${status}${error ? ` · ${error}` : ''}`}>
      {ok ? '● canal conectado' : bad ? `● canal com erro (${status}${error ? `: ${error}` : ''})` : '● conectando...'}
    </span>
  );
}
