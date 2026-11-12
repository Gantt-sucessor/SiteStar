import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ABILITIES, CONDITION_TRACK, FEATS, FORCE_POWERS, FORCE_TREES, WEAPONS, ARMORS, GEAR, WEAPON_GROUPS,
  SKILLS, LANGUAGES, FEAT_LEVELS, ABILITY_INCREASE_LEVELS, featByName, powerByName,
} from '../data/rules';
import { derive, getClassLevels } from '../lib/character';
import { ALL_TREES, REPEATABLE_TALENTS, FORCE_TECHNIQUES, FORCE_SECRETS, ALL_CLASSES, anyClassById } from '../data/prestige';
import LevelUp, { AbilityPairPicker } from './LevelUp';
import DroidShop from './DroidShop';
import { PortraitHolo } from './Holo';
import { useDarkSideTheme, useDarkSideBreathing } from '../lib/darkside';
import { FeatBrowser, TalentBrowser, PowerBrowser, ForceExtrasBrowser } from './Browsers';
import { fmtMod, d20Formula } from '../lib/dice';
import { sendRoll } from '../lib/rolls';
import { sfx } from '../lib/sfx';
import { fx, SABER_COLORS, saberHex } from '../lib/fx';
import { requestFx } from '../lib/table';
import DarkWhispers from './DarkWhispers';
import { MedalsPanel, MedalBadge } from './Medals';

const TABS = [
  ['pericias', 'Perícias'],
  ['combate', 'Combate'],
  ['forca', 'A Força'],
  ['talentos', 'Talentos & Aptidões'],
  ['equip', 'Equipamento'],
  ['detalhes', 'Detalhes'],
];

export function Panel({ title, aside, children, className = '', style }) {
  return (
    <section className={`panel ${className}`} style={style}>
      {title && (
        <div className="panel-title">
          <span>{title}</span>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

function Pips({ max, value, onChange, variant = '' }) {
  return (
    <div className="pips">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`pip ${variant} ${i < value ? 'on' : ''}`}
          onClick={onChange ? () => onChange(i < value ? i : i + 1) : undefined}
          title={`${i + 1}`}
          disabled={!onChange}
        />
      ))}
    </div>
  );
}

export function talentPool(d) {
  return d.talentTrees;
}

export function findTalent(name, d) {
  for (const tree of [...talentPool(d), ...Object.values(ALL_TREES)]) {
    const t = tree.talents.find(([n]) => n === name);
    if (t) return { tree: tree.name, name: t[0], desc: t[1], prereq: t[2] ?? [] };
  }
  return null;
}

export function meetsPrereq(req, d, data) {
  const m = /^BBA \+(\d+)/.exec(req);
  if (m) return d.bab >= Number(m[1]);
  return (data.talents || []).includes(req) || d.has(req);
}

export default function Sheet({ data, onChange, editable = true, campaignId, characterId, isMaster = false }) {
  const [tab, setTab] = useState('pericias');
  const [hpDelta, setHpDelta] = useState('');
  const [levelInfo, setLevelInfo] = useState(null);
  const [levelOpen, setLevelOpen] = useState(false);
  const [browser, setBrowser] = useState(null); // 'feats' | 'talents' | 'abilities'
  const [incPick, setIncPick] = useState([]);
  const d = useMemo(() => derive(data), [data]);
  // Corrupção: o site escurece e a respiração aumenta conforme o Lado Sombrio se aproxima da Sabedoria
  const corruption = !d.droid && d.scores.sab > 0 ? Math.min(1, (data.darkSide || 0) / d.scores.sab) : 0;
  useDarkSideTheme(corruption, !d.droid);
  useDarkSideBreathing(corruption, !d.droid);
  const incLevels = ABILITY_INCREASE_LEVELS.filter((l) => l <= d.level);
  const incHave = Object.values(data.increases || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const incMissing = Math.max(0, incLevels.length * 2 - incHave);
  const nextIncLevel = incLevels[Math.floor(incHave / 2)] ?? incLevels[incLevels.length - 1];
  const applyInc = () => {
    const increases = { ...(data.increases || {}) };
    for (const a of incPick) increases[a] = (increases[a] || 0) + 1;
    set({ increases });
    setIncPick([]);
    if (incMissing - incPick.length <= 0) setBrowser(null);
  };
  const character = { id: characterId, name: data.name || 'Sem nome' };

  const set = (patch) => onChange({ ...data, ...patch });
  const setDeep = (key, patch) => onChange({ ...data, [key]: { ...(data[key] || {}), ...patch } });

  const roll = (formula, label, kind = 'check', extra) =>
    sendRoll({ formula, label, kind, campaignId, character, extra });

  const hpPct = d.hpMax ? Math.max(0, Math.min(100, (d.hpCurrent / d.hpMax) * 100)) : 0;
  const hpClass = hpPct <= 25 ? 'low' : hpPct <= 50 ? 'mid' : '';

  const applyHp = (sign) => {
    const n = Math.abs(parseInt(hpDelta, 10));
    if (!n) return;
    const current = Math.max(0, Math.min(d.hpMax, d.hpCurrent + sign * n));
    const patch = { hp: { ...data.hp, current } };
    if (sign < 0 && n >= d.threshold && (data.condition || 0) < 5) {
      patch.condition = Math.min(5, (data.condition || 0) + 1);
    }
    if (current === 0) patch.condition = 5;
    onChange({ ...data, ...patch });
    setHpDelta('');
  };

  const spendForcePoint = () => {
    if (d.fpCurrent <= 0) return;
    set({ forcePoints: d.fpCurrent - 1 });
    const die = d.forceDie;
    const formula = d.fpDice > 1 ? `${d.fpDice}${die}kh1` : `1${die}`;
    roll(formula, 'Ponto de Força', 'force-point', 'Some ao teste que você quer melhorar.');
  };

  const levelUp = async (cls, gainsPreview, incChoice = []) => {
    setLevelOpen(false);
    const next = d.level + 1;
    if (next > 20) return;
    const entry = await sendRoll({
      formula: `1d${cls.hitDie}${d.mods.con ? fmtMod(d.mods.con) : ''}`,
      label: `Subiu para o nível ${next} (${cls.name}) — PV`, kind: 'level', campaignId, character,
    });
    const gained = Math.max(1, entry.total);
    const levelRolls = [...(data.hp?.levelRolls || [])].slice(0, d.level - 1);
    levelRolls.push(gained);
    const classLevels = getClassLevels(data);
    classLevels[cls.id] = (classLevels[cls.id] || 0) + 1;
    const destiny = (data.destinyPoints || 0) + (cls.id === 'discipulo-forca' ? 2 : 1);
    const increases = { ...(data.increases || {}) };
    for (const a of incChoice) increases[a] = (increases[a] || 0) + 1;
    sfx.saber();
    setLevelInfo({ level: next, gains: [`+${gained} PV`, ...gainsPreview.slice(1)] });
    onChange({
      ...data, level: next, classLevels, destinyPoints: destiny, increases,
      hp: { ...data.hp, levelRolls, current: (data.hp?.current ?? d.hpMax) + gained },
      forcePoints: null,
    });
  };

  return (
    <div>
      {corruption > 0 && <div className="darkside-vignette" aria-hidden="true" />}
      {!isMaster && !d.droid && <DarkWhispers level={corruption} />}
      <div className="sheet-head">
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 18 }}>
        <PortraitHolo data={data} set={set} editable={editable} size={120} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="sheet-name">
            {editable ? <input value={data.name} placeholder="Nome do personagem" onChange={(e) => set({ name: e.target.value })} /> : data.name || 'Sem nome'}
          </h1>
          <div className="sheet-sub">
            {d.spLabel ?? 'Espécie?'} · {d.classLabel}{d.classes.length > 1 ? ` (nível ${d.level})` : ''}
            {data.player && <> · jogador(a) {data.player}</>}
          </div>
          <div className="row" style={{ marginTop: 6, gap: 6 }}>
            {d.forceSensitive && <span className="tag blue">Sensitivo à Força</span>}
            {!d.droid && data.darkSide > 0 && <span className="tag red">Lado Sombrio {data.darkSide}</span>}
            {d.armor && <span className="tag">{d.armor.name}{!d.armorProficient && ' (não proficiente)'}</span>}
            <span className="tag yellow">{(data.credits || 0).toLocaleString('pt-BR')} créditos</span>
          </div>
          {(data.medals || []).length > 0 && (
            <div className="medal-strip">{data.medals.map((m) => <MedalBadge key={m.id} medal={m} size={26} />)}</div>
          )}
        </div>
        </div>
        {editable && (
          <div className="row">
            <label className="field" style={{ width: 120 }}>XP
              <input type="number" value={data.xp || 0} onChange={(e) => set({ xp: Number(e.target.value) || 0 })} style={{ width: '100%' }} />
            </label>
            {characterId && <Link className="btn" to={`/personagem/${characterId}/editar`} title="Reabre o assistente com esta ficha: espécie, classe, atributos, perícias, talentos e compras">✎ Editar ficha</Link>}
            <button className="btn yellow" onClick={() => setLevelOpen(true)} disabled={d.level >= 20 || !d.cls}>Subir de nível</button>
          </div>
        )}
      </div>

      {levelOpen && <LevelUp d={d} data={data} onConfirm={levelUp} onClose={() => setLevelOpen(false)} />}
      {browser === 'feats' && <FeatBrowser d={d} data={data} editable={editable} onClose={() => setBrowser(null)} onAdd={(f) => set({ feats: [...(data.feats || []), f] })} />}
      {browser === 'abilities' && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setBrowser(null)}>
          <div className="modal panel yellow" style={{ width: 'min(640px, 100%)' }}>
            <div className="panel-title"><span>Aumento de habilidades</span><button className="btn sm ghost" onClick={() => setBrowser(null)}>✕</button></div>
            <p className="small muted">Nos níveis 4, 8, 12, 16 e 20 você ganha +1 em <b>duas habilidades diferentes</b>. Faltam <b className="yellow">{incMissing}</b> ponto{incMissing > 1 ? 's' : ''}.</p>
            <div className="kicker" style={{ marginBottom: 6 }}>Aumento do nível {nextIncLevel}</div>
            <AbilityPairPicker d={d} value={incPick} onChange={setIncPick} />
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn ghost" onClick={() => setBrowser(null)}>Depois</button>
              <button className="btn yellow primary" disabled={incPick.length < Math.min(2, incMissing)} onClick={applyInc}>Aplicar +1</button>
            </div>
          </div>
        </div>
      )}
      {browser === 'powers' && <PowerBrowser d={d} data={data} editable={editable} onChange={set} onClose={() => setBrowser(null)} />}
      {browser === 'techniques' && (
        <ForceExtrasBrowser title="Técnicas da Força" field="forceTechniques" list={FORCE_TECHNIQUES} slots={d.techniqueSlots} data={data} editable={editable}
          onChange={set} onClose={() => setBrowser(null)} repeatable={['Recuperação de Ponto de Força', 'Domínio de Poder da Força']}
          intro="Técnicas representam anos de prática com a Força. Vêm das classes de prestígio Aprendiz Sith, Cavaleiro Jedi e Adepto da Força, uma a cada nível par. Lorde Sith, Mestre Jedi e Discípulo da Força exigem pelo menos uma." />
      )}
      {browser === 'secrets' && (
        <ForceExtrasBrowser title="Segredos da Força" field="forceSecrets" list={FORCE_SECRETS} slots={d.secretSlots} data={data} editable={editable}
          onChange={set} onClose={() => setBrowser(null)}
          intro="Segredos são o domínio mais profundo da Força: alteram como seus poderes funcionam, gastando Pontos de Força ou de Destino. Vêm de Lorde Sith, Mestre Jedi e Discípulo da Força, um a cada nível a partir do 2º." />
      )}
      {browser === 'talents' && <TalentBrowser d={d} data={data} editable={editable} onClose={() => setBrowser(null)} onAdd={(t) => set({ talents: [...(data.talents || []), t] })} />}

      {editable && d.cls && (() => {
        const pend = [];
        const f = d.featSlots - (data.feats || []).length;
        const t = d.talentSlots - (data.talents || []).length;
        const pw = d.powerSlots - (data.forcePowers || []).length;
        const tq = d.techniqueSlots - (data.forceTechniques || []).length;
        const sc = d.secretSlots - (data.forceSecrets || []).length;
        const sk = d.trainedSlots - (data.trainedSkills || []).length;
        if (incMissing > 0) pend.push(<button key="i" className="btn sm yellow" onClick={() => { setIncPick([]); setBrowser('abilities'); }}>{incMissing} aumento{incMissing > 1 ? 's' : ''} de atributo</button>);
        if (f > 0) pend.push(<button key="f" className="btn sm yellow" onClick={() => setBrowser('feats')}>{f} talento{f > 1 ? 's' : ''}</button>);
        if (t > 0) pend.push(<button key="t" className="btn sm yellow" onClick={() => setBrowser('talents')}>{t} aptidão{t > 1 ? 'ões' : ''}</button>);
        if (pw > 0) pend.push(<button key="p" className="btn sm yellow" onClick={() => setBrowser('powers')}>{pw} poder{pw > 1 ? 'es' : ''} da Força</button>);
        if (tq > 0) pend.push(<button key="q" className="btn sm yellow" onClick={() => setBrowser('techniques')}>{tq} Técnica{tq > 1 ? 's' : ''} da Força</button>);
        if (sc > 0) pend.push(<button key="s" className="btn sm yellow" onClick={() => setBrowser('secrets')}>{sc} Segredo{sc > 1 ? 's' : ''} da Força</button>);
        if (sk > 0) pend.push(<button key="k" className="btn sm yellow" onClick={() => setTab('pericias')}>{sk} perícia{sk > 1 ? 's' : ''} treinada{sk > 1 ? 's' : ''}</button>);
        if (!pend.length) return null;
        return (
          <div className="info-box row" style={{ marginTop: 12, gap: 8 }}>
            <span className="small"><b className="yellow">Escolhas pendentes:</b> clique para ver as opções</span>
            {pend}
          </div>
        );
      })()}

      {levelInfo && (
        <div className="info-box" style={{ marginTop: 12 }}>
          <b className="yellow">Nível {levelInfo.level}!</b> Você ganhou: {levelInfo.gains.join('; ')}. Adicione as escolhas nas abas Talentos & Aptidões, A Força e Detalhes.
          <button className="btn sm ghost" style={{ marginLeft: 8 }} onClick={() => setLevelInfo(null)}>OK</button>
        </div>
      )}

      <div className="sheet-grid">
        {/* ---------------- Coluna esquerda ---------------- */}
        <div className="stack" style={{ gap: 16 }}>
          <Panel title="Vitalidade" aside={<span className="tiny muted">Limiar {d.threshold}</span>}>
            <div className={`bar ${hpClass}`}><i style={{ width: `${hpPct}%` }} /><span>{d.droid && d.hpCurrent <= 0 ? 'DESATIVADO' : `${d.hpCurrent} / ${d.hpMax} PV`}</span></div>
            {d.droid && <div className="tiny muted" style={{ marginTop: 4 }}>Dróide: recupera PV só com conserto (Mecânica). Se o golpe que zerou os PV passou do limiar, está destruído.</div>}
            {editable && (
              <div className="row" style={{ marginTop: 10, flexWrap: 'nowrap' }}>
                <input type="number" min="0" placeholder="Qtd" value={hpDelta} onChange={(e) => setHpDelta(e.target.value)} style={{ flex: 1, width: 'auto' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyHp(-1); }} />
                <button className="btn sm red" onClick={() => applyHp(-1)}>Dano</button>
                <button className="btn sm green" onClick={() => applyHp(1)}>Curar</button>
              </div>
            )}
            {editable && hpDelta && Number(hpDelta) >= d.threshold && <div className="tiny red-text" style={{ marginTop: 4 }}>Dano ≥ limiar: desce 1 passo na condição.</div>}
            <div className="row between" style={{ marginTop: 14 }}>
              <span className="kicker">Curso da condição</span>
              <span className="tiny muted">{d.condition.label}</span>
            </div>
            <div className="condition" style={{ marginTop: 6 }}>
              {CONDITION_TRACK.map((c) => (
                <button key={c.step} className={`s${c.step} ${data.condition === c.step || (!data.condition && c.step === 0) ? 'on' : ''}`}
                  disabled={!editable} onClick={() => set({ condition: c.step })} title={c.label}>
                  {c.step === 0 ? 'OK' : c.step === 5 ? '✖' : c.penalty}
                </button>
              ))}
            </div>
            {editable && (
              <label className="check tiny" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={!!data.persistent} onChange={(e) => set({ persistent: e.target.checked })} /> Condição persistente
              </label>
            )}
            {editable && (
              <details style={{ marginTop: 8 }}>
                <summary className="tiny muted" style={{ cursor: 'pointer' }}>Ajustar PV máximo</summary>
                <div className="row" style={{ marginTop: 6 }}>
                  <span className="tiny muted">Calculado: {d.hpComputed}</span>
                  <input type="number" placeholder="Manual" value={data.hp?.override ?? ''} style={{ width: 90 }}
                    onChange={(e) => setDeep('hp', { override: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
              </details>
            )}
          </Panel>

          <Panel title={d.droid ? 'Destino & Memória' : 'Força & Destino'}>
            <div className="row between"><span className="small">Pontos de Força</span><span className="mono small">{d.fpCurrent}/{d.fpMax}</span></div>
            <Pips max={d.fpMax} value={d.fpCurrent} onChange={editable ? (v) => set({ forcePoints: v }) : null} />
            {editable && (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={spendForcePoint} disabled={d.fpCurrent <= 0}>Gastar PF ({d.fpDice > 1 ? `${d.fpDice}${d.forceDie}, maior` : `1${d.forceDie}`})</button>
              </div>
            )}
            <DestinyBlock data={data} set={set} editable={editable} d={d} roll={roll} />
            <div className="row between" style={{ marginTop: 12 }}><span className="small">Pontos de Destino</span><span className="mono small">{data.destinyPoints || 0}</span></div>
            <Pips max={Math.max(3, data.destinyPoints || 0)} value={data.destinyPoints || 0} variant="gold" onChange={editable ? (v) => set({ destinyPoints: v }) : null} />
            {d.droid ? (() => {
              const mem = data.memoryIntegrity ?? 10;
              const rep = data.guildRep ?? 0;
              const repLabel = rep <= -4 ? 'Infame' : rep <= -2 ? 'Duvidosa' : rep <= 1 ? 'Neutra' : rep <= 3 ? 'Confiável' : 'Lendária';
              return (
                <>
                  <div className="row between" style={{ marginTop: 12 }}><span className="small">Integridade da memória</span><span className="mono small" style={{ color: 'var(--holo)' }}>{mem}/10</span></div>
                  <Pips max={10} value={mem} onChange={editable ? (v) => set({ memoryIntegrity: v }) : null} />
                  <div className="tiny muted" style={{ marginTop: 4 }}>{mem >= 10 ? 'Memória intacta.' : mem <= 0 ? 'Memória apagada: modelo de fábrica.' : 'Lembranças corrompidas ou apagadas. Cada lavagem leva um nível de classe por minuto.'}</div>
                  <div className="row between" style={{ marginTop: 12 }}>
                    <span className="small">Reputação na Guilda</span>
                    <span className={`mono small ${rep < 0 ? 'red-text' : rep > 1 ? 'green-text' : 'yellow'}`}>{rep > 0 ? '+' : ''}{rep} · {repLabel}</span>
                  </div>
                  {editable && (
                    <div className="row" style={{ marginTop: 4, gap: 4 }}>
                      <button className="btn sm pm" onClick={() => set({ guildRep: Math.max(-5, rep - 1) })}>−</button>
                      <input type="range" min="-5" max="5" value={rep} onChange={(e) => set({ guildRep: Number(e.target.value) })} style={{ flex: 1, padding: 0 }} />
                      <button className="btn sm pm" onClick={() => set({ guildRep: Math.min(5, rep + 1) })}>+</button>
                    </div>
                  )}
                </>
              );
            })() : (
              <>
                <div className="row between" style={{ marginTop: 12 }}><span className="small">Pontuação do Lado Sombrio</span><span className="mono small red-text">{data.darkSide || 0}/{d.scores.sab}</span></div>
                <Pips max={Math.max(d.scores.sab, data.darkSide || 0)} value={data.darkSide || 0} variant="dark" onChange={editable ? (v) => set({ darkSide: v }) : null} />
                <div className="darkside-meter"><i style={{ width: `${Math.round(corruption * 100)}%` }} /></div>
                <div className="tiny" style={{ marginTop: 4, color: corruption >= 1 ? 'var(--sith-red)' : 'var(--muted)' }}>
                  {corruption >= 1 ? 'Consumido pelo lado sombrio.' : corruption >= 0.75 ? 'A escuridão está quase completa...' : corruption >= 0.4 ? 'Você sente o ódio crescer.' : corruption > 0 ? 'Uma sombra tocou você.' : 'Em equilíbrio com a Força.'}
                </div>
                {data.guildRep != null && (
                  <div className="row between" style={{ marginTop: 12 }}>
                    <span className="small">Reputação na Guilda</span>
                    <span className={`mono small ${data.guildRep < 0 ? 'red-text' : data.guildRep > 1 ? 'green-text' : 'yellow'}`}>{data.guildRep > 0 ? '+' : ''}{data.guildRep}</span>
                  </div>
                )}
              </>
            )}
          </Panel>

          {((data.medals || []).length > 0 || isMaster) && (
            <Panel title="Medalhas" className="yellow">
              <MedalsPanel medals={data.medals || []} canGrant={isMaster}
                onChange={(medals) => set({ medals })}
                onGranted={(medal) => requestFx('medal', { character: data.name || 'Sem nome', medal })} />
            </Panel>
          )}

          <Panel title="Habilidades">
            <div className="abilities" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {d.abilities.map((a) => (
                <div key={a.id} className="ability clickable" onClick={() => roll(d20Formula(d.mods[a.id] + d.condition.penalty), `Teste de ${a.name}`)}>
                  <div className="abbr">{a.short}</div>
                  <div className="score">{d.scores[a.id]}</div>
                  <div className="mod">{fmtMod(d.mods[a.id])}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Defesas">
            <div className="stat-grid">
              <div className="stat"><div className="k">Reflexo</div><div className="v">{d.defenses.ref}</div></div>
              <div className="stat"><div className="k">Fortitude</div><div className="v">{d.defenses.fort}</div></div>
              <div className="stat"><div className="k">Vontade</div><div className="v">{d.defenses.von}</div></div>
            </div>
            <div className="stat-grid" style={{ marginTop: 8 }}>
              <div className="stat"><div className="k">Limiar</div><div className="v">{d.threshold}</div></div>
              <div className="stat"><div className="k">{d.damageReduction ? 'Veloc. / RD' : 'Velocidade'}</div><div className="v">{d.speed}{d.damageReduction ? <span className="small muted"> / {d.damageReduction}</span> : null}</div></div>
              <div className="stat clickable" onClick={() => roll(d20Formula(d.initiative), 'Iniciativa', 'initiative')}>
                <div className="k">Iniciativa</div><div className="v">{fmtMod(d.initiative)}</div>
              </div>
            </div>
            {d.droid && (d.droidSpeeds.length > 1 || d.droidShield > 0 || d.armor?.builtIn) && (
              <div className="tiny muted" style={{ marginTop: 8 }}>
                {d.droidSpeeds.length > 1 && <div>Locomoção: {d.droidSpeeds.map((x) => `${x.type} ${x.speed}`).join(' · ')}</div>}
                {d.droidShield > 0 && <div className="yellow">Escudo: VE {d.droidShield} (reduz o dano; cai 5 quando o dano ≥ VE)</div>}
                {d.armor?.builtIn && <div>Armadura embutida: {d.armor.name} (Ref +{d.armor.ref})</div>}
              </div>
            )}
            {editable && (
              <details style={{ marginTop: 10 }}>
                <summary className="tiny muted" style={{ cursor: 'pointer' }}>Bônus diversos</summary>
                <div className="row" style={{ marginTop: 6 }}>
                  {[['ref', 'Ref'], ['fort', 'Fort'], ['von', 'Von'], ['threshold', 'Limiar']].map(([k, l]) => (
                    <label key={k} className="field" style={{ width: 64 }}>{l}
                      <input type="number" value={data.misc?.[k] ?? 0} style={{ width: '100%' }} onChange={(e) => setDeep('misc', { [k]: Number(e.target.value) || 0 })} />
                    </label>
                  ))}
                </div>
              </details>
            )}
          </Panel>

          <Panel title="Ataque">
            <div className="stat-grid">
              <div className="stat"><div className="k">BBA</div><div className="v">{fmtMod(d.bab)}</div></div>
              <div className="stat clickable" onClick={() => roll(d20Formula(d.melee), 'Ataque corpo a corpo', 'attack')}><div className="k">Corpo</div><div className="v">{fmtMod(d.melee)}</div></div>
              <div className="stat clickable" onClick={() => roll(d20Formula(d.ranged), 'Ataque à distância', 'attack')}><div className="k">Distância</div><div className="v">{fmtMod(d.ranged)}</div></div>
            </div>
          </Panel>
        </div>

        {/* ---------------- Coluna direita ---------------- */}
        <Panel className="scanlines">
          <div className="tabs" role="tablist">
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          {tab === 'pericias' && <SkillsTab d={d} data={data} set={set} roll={roll} editable={editable} />}
          {tab === 'combate' && <CombatTab d={d} data={data} set={set} roll={roll} editable={editable} />}
          {tab === 'forca' && <ForceTab d={d} data={data} set={set} roll={roll} editable={editable} openBrowser={setBrowser} />}
          {tab === 'talentos' && <FeatsTab d={d} data={data} set={set} editable={editable} openBrowser={setBrowser} />}
          {tab === 'equip' && <GearTab d={d} data={data} set={set} editable={editable} />}
          {tab === 'detalhes' && <DetailsTab d={d} data={data} set={set} setDeep={setDeep} editable={editable} isMaster={isMaster} />}
        </Panel>
      </div>
    </div>
  );
}

/* ================= Abas ================= */

function SkillsTab({ d, data, set, roll, editable }) {
  const chosen = data.trainedSkills || [];
  const toggle = (name) => {
    const has = chosen.includes(name);
    set({ trainedSkills: has ? chosen.filter((s) => s !== name) : [...chosen, name] });
  };
  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="small muted">Teste = 1d20 + ½ nível + habilidade (+5 treinado, +5 foco)</span>
        <span className={`counter ${chosen.length === d.trainedSlots ? 'ok' : chosen.length > d.trainedSlots ? 'over' : ''}`}>{chosen.length}/{d.trainedSlots} treinadas</span>
      </div>
      <div className="list">
        {d.skills.map((s) => (
          <div key={s.name} className="list-row">
            <div>
              <span className={`skill-trained ${s.trained ? 'on' : ''}`}
                onClick={editable && !s.viaFeat ? () => toggle(s.name) : undefined}
                style={{ cursor: editable && !s.viaFeat ? 'pointer' : 'default' }} title={editable ? 'Marcar como treinada' : ''} />
              <span className="name">{s.name}</span>{' '}
              <span className="tiny dim">({s.ability.toUpperCase()}){s.classSkill ? ' · classe' : ''}{s.trainedOnly ? ' · só treinado' : ''}{s.focus ? ' · foco' : ''}</span>
            </div>
            <button className="roll-chip" disabled={!s.usable} onClick={() => roll(d20Formula(s.mod), s.name, s.name === 'Iniciativa' ? 'initiative' : 'skill')}>{fmtMod(s.mod)}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CombatTab({ d, data, set, roll, editable }) {
  const [pick, setPick] = useState('');
  const [custom, setCustom] = useState({ name: '', damage: '', melee: true, group: 'simples', notes: '' });

  const addWeapon = (w) => set({ weapons: [...(data.weapons || []), { ...w, uid: crypto.randomUUID() }] });
  const removeWeapon = (uid) => set({ weapons: (data.weapons || []).filter((w) => w.uid !== uid) });
  const updateWeapon = (uid, patch) => set({ weapons: (data.weapons || []).map((w) => (w.uid === uid ? { ...w, ...patch } : w)) });

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <h3 className="yellow">Armas</h3>
        {d.weapons.length === 0 && <div className="empty small">Nenhuma arma. Um sabre de luz, talvez? Ou uma boa blaster ao seu lado?</div>}
        <div className="list">
          {d.weapons.map((w) => (
            <div key={w.uid} className="list-row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
              <div>
                <div className="name">{w.name} {!w.proficient && <span className="tag red">não proficiente −5</span>}</div>
                <div className="sub">{WEAPON_GROUPS[w.group] ?? w.group} · {w.melee ? 'corpo a corpo' : 'à distância'}{w.notes ? ` · ${w.notes}` : ''}</div>
                {w.group === 'sabres' && <SaberBlade w={w} editable={editable} onCrystal={(crystal) => updateWeapon(w.uid, { crystal })} />}
                {editable && (
                  <div className="row tiny" style={{ marginTop: 4 }}>
                    <span className="muted">Bônus extra: ataque</span>
                    <input type="number" value={w.attackBonus || 0} style={{ width: 56, padding: '2px 6px' }} onChange={(e) => updateWeapon(w.uid, { attackBonus: Number(e.target.value) || 0 })} />
                    <span className="muted">dano</span>
                    <input type="number" value={w.damageBonus || 0} style={{ width: 56, padding: '2px 6px' }} onChange={(e) => updateWeapon(w.uid, { damageBonus: Number(e.target.value) || 0 })} />
                    <button className="btn sm ghost red" onClick={() => removeWeapon(w.uid)}>Remover</button>
                  </div>
                )}
              </div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <button className="roll-chip" title="Rolar ataque" onClick={() => { if (w.group === 'sabres') fx.saberSwing(w.crystal); roll(d20Formula(w.attack), `Ataque — ${w.name}`, 'attack'); }}>{fmtMod(w.attack)}</button>
                <button className="roll-chip red" title="Rolar dano" onClick={() => roll(w.damage, `Dano — ${w.name}`, 'damage')}>{w.damage}</button>
              </div>
            </div>
          ))}
        </div>
        {editable && (
          <div className="stack" style={{ marginTop: 10 }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
                <option value="">Adicionar arma do livro...</option>
                {Object.entries(WEAPON_GROUPS).map(([g, label]) => (
                  <optgroup key={g} label={label}>
                    {WEAPONS.filter((w) => w.group === g).map((w) => <option key={w.name} value={w.name}>{w.name} — {w.damage} ({w.cost.toLocaleString('pt-BR')} cr)</option>)}
                  </optgroup>
                ))}
              </select>
              <button className="btn" disabled={!pick} onClick={() => { addWeapon(WEAPONS.find((w) => w.name === pick)); setPick(''); }}>Adicionar</button>
            </div>
            <details>
              <summary className="tiny muted" style={{ cursor: 'pointer' }}>Arma personalizada</summary>
              <div className="row" style={{ marginTop: 8 }}>
                <input placeholder="Nome" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
                <input placeholder="Dano (ex.: 3d6)" value={custom.damage} onChange={(e) => setCustom({ ...custom, damage: e.target.value })} style={{ width: 120 }} />
                <select value={custom.group} onChange={(e) => setCustom({ ...custom, group: e.target.value })}>
                  {Object.entries(WEAPON_GROUPS).map(([g, l]) => <option key={g} value={g}>{l}</option>)}
                </select>
                <label className="check small"><input type="checkbox" checked={custom.melee} onChange={(e) => setCustom({ ...custom, melee: e.target.checked })} /> Corpo a corpo</label>
                <button className="btn sm" disabled={!custom.name || !/^\d*d\d+/.test(custom.damage)} onClick={() => { addWeapon({ ...custom, light: false }); setCustom({ name: '', damage: '', melee: true, group: 'simples', notes: '' }); }}>Criar</button>
              </div>
            </details>
          </div>
        )}
      </div>

      <div>
        <h3 className="yellow">Armadura</h3>
        {editable ? (
          <select value={data.armor || ''} onChange={(e) => set({ armor: e.target.value || null })} style={{ width: '100%' }}>
            <option value="">Sem armadura</option>
            {['leve', 'média', 'pesada'].map((cat) => (
              <optgroup key={cat} label={`Armadura ${cat}`}>
                {ARMORS.filter((a) => a.category === cat).map((a) => (
                  <option key={a.name} value={a.name}>{a.name} — Ref +{a.ref}{a.fort ? `, Fort +${a.fort}` : ''}, Des máx +{a.maxDex}</option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <div className="small">{d.armor ? d.armor.name : 'Sem armadura'}</div>
        )}
        {d.armor && (
          <div className="tiny muted" style={{ marginTop: 6 }}>
            Armadura {d.armor.category}: Reflexo usa +{d.armor.ref} no lugar do nível; Des máx +{d.armor.maxDex}.
            {!d.armorProficient && <span className="red-text"> Sem proficiência: penalidade nos ataques e perícias físicas.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ForceTab({ d, data, set, roll, editable, openBrowser }) {
  const [pick, setPick] = useState('');
  const useForce = d.skills.find((s) => s.name === 'Usar a Força');
  if (!d.forceSensitive) {
    if (d.droid) return <div className="empty">Dróides não têm ligação com a Força.<br />Mas um bom processador heurístico às vezes parece mágica.</div>;
    return <div className="empty">Este personagem não possui o talento <b>Sensitividade da Força</b>.<br />Nem todo mundo ouve o chamado... ainda.</div>;
  }
  const powers = data.forcePowers || [];
  const spent = data.powersSpent || {};
  const grouped = powers.reduce((acc, p) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {});

  const usePower = (name) => {
    const p = powerByName(name);
    const tiers = p?.dcs?.map(([dc, eff]) => (typeof dc === 'number' ? `CD ${dc}: ${eff}` : `vs ${dc}: ${eff}`)).join(' · ');
    roll(d20Formula(useForce.mod), `${name} (Usar a Força)`, 'force', tiers);
    if (p?.tags.includes('Lado Sombrio')) set({ darkSide: (data.darkSide || 0) + 1, powersSpent: { ...spent, [name]: Math.min(grouped[name], (spent[name] || 0) + 1) } });
    else set({ powersSpent: { ...spent, [name]: Math.min(grouped[name], (spent[name] || 0) + 1) } });
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row between">
        <div>
          <div className="name">Usar a Força</div>
          <div className="tiny muted">Sentir a Força, telepatia, mover objeto leve, buscar sentimentos...</div>
        </div>
        <button className="roll-chip" disabled={!useForce?.usable} onClick={() => roll(d20Formula(useForce.mod), 'Usar a Força', 'force')}>{fmtMod(useForce?.mod ?? 0)}</button>
      </div>
      <div className="row between">
        <div className="row"><h3 className="yellow" style={{ margin: 0 }}>Poderes da Força</h3><button className="btn sm" onClick={() => openBrowser('powers')}>Explorar poderes</button></div>
        <div className="row">
          <span className={`counter ${powers.length === d.powerSlots ? 'ok' : powers.length > d.powerSlots ? 'over' : ''}`}>{powers.length}/{d.powerSlots}</span>
          {editable && <button className="btn sm" onClick={() => set({ powersSpent: {} })}>Recuperar poderes</button>}
        </div>
      </div>
      {d.powerSlots === 0 && <div className="tiny muted">Pegue o talento Treinamento da Força para aprender poderes (1 + mod. Sab por talento).</div>}
      {Object.entries(grouped).map(([name, count]) => {
        const p = powerByName(name);
        const used = spent[name] || 0;
        return (
          <div key={name} className="list-row" style={{ alignItems: 'start' }}>
            <div>
              <div className="name">
                {name} {count > 1 && <span className="tag">×{count}</span>}{' '}
                {p?.tags.map((t) => <span key={t} className={`tag ${t === 'Lado Sombrio' ? 'red' : t === 'Lado Claro' ? 'blue' : ''}`}>{t}</span>)}
              </div>
              <div className="sub">{p?.time} · {p?.desc}</div>
              <div className="power-dc">{p?.dcs.map(([dc, eff], i) => <div key={i}><b>{typeof dc === 'number' ? `CD ${dc}` : `vs ${dc}`}</b> {eff}</div>)}</div>
              <div className="row" style={{ marginTop: 4 }}>
                <span className="tiny muted">Usos:</span>
                <Pips max={count} value={count - used} onChange={editable ? (v) => set({ powersSpent: { ...spent, [name]: count - v } }) : null} />
                {editable && <button className="btn sm ghost red pm" onClick={() => {
                  const idx = powers.lastIndexOf(name);
                  set({ forcePowers: powers.filter((_, i) => i !== idx) });
                }}>−</button>}
              </div>
            </div>
            <button className="roll-chip" disabled={used >= count} onClick={() => usePower(name)}>Usar</button>
          </div>
        );
      })}
      {editable && (
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
            <option value="">Aprender poder...</option>
            {FORCE_POWERS.map((p) => <option key={p.name} value={p.name}>{p.name}{p.tags.length ? ` [${p.tags.join(', ')}]` : ''}</option>)}
          </select>
          <button className="btn" disabled={!pick} onClick={() => { set({ forcePowers: [...powers, pick] }); setPick(''); }}>Aprender</button>
        </div>
      )}
      {(d.techniqueSlots > 0 || (data.forceTechniques || []).length > 0) && (
        <ForceExtras onExplore={() => openBrowser('techniques')} title="Técnicas da Força" field="forceTechniques" list={FORCE_TECHNIQUES} slots={d.techniqueSlots} data={data} set={set} editable={editable} repeatable={['Recuperação de Ponto de Força', 'Domínio de Poder da Força']} />
      )}
      {(d.secretSlots > 0 || (data.forceSecrets || []).length > 0) && (
        <ForceExtras onExplore={() => openBrowser('secrets')} title="Segredos da Força" field="forceSecrets" list={FORCE_SECRETS} slots={d.secretSlots} data={data} set={set} editable={editable} />
      )}
    </div>
  );
}

function ForceExtras({ title, field, list, slots, data, set, editable, repeatable = [], onExplore }) {
  const [pick, setPick] = useState('');
  const chosen = data[field] || [];
  return (
    <div>
      <div className="row between">
        <div className="row"><h3 className="yellow" style={{ margin: 0 }}>{title}</h3><button className="btn sm" onClick={onExplore}>Explorar</button></div>
        <span className={`counter ${chosen.length === slots ? 'ok' : chosen.length > slots ? 'over' : ''}`}>{chosen.length}/{slots}</span>
      </div>
      <div className="list" style={{ marginTop: 6 }}>
        {chosen.map((n, i) => (
          <div key={`${n}-${i}`} className="list-row">
            <div><div className="name">{n}</div><div className="sub">{list.find((x) => x.name === n)?.desc}</div></div>
            {editable && <button className="btn sm ghost red" onClick={() => set({ [field]: chosen.filter((_, j) => j !== i) })}>Remover</button>}
          </div>
        ))}
      </div>
      {editable && (
        <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
          <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
            <option value="">Escolher...</option>
            {list.map((x) => <option key={x.name} value={x.name} disabled={chosen.includes(x.name) && !repeatable.includes(x.name)}>{x.name}</option>)}
          </select>
          <button className="btn" disabled={!pick} onClick={() => { set({ [field]: [...chosen, pick] }); setPick(''); }}>Adicionar</button>
        </div>
      )}
    </div>
  );
}

// Talentos que podem ser escolhidos mais de uma vez
const REPEATABLE_FEATS = ['Treinamento da Força', 'Bênção da Força', 'Limiar de Dano Aprimorado', 'Fúria Extra'];

export function FeatPicker({ d, data, onAdd, filter }) {
  const [pick, setPick] = useState('');
  const [choice, setChoice] = useState('');
  const feat = FEATS.find((f) => f.name === pick);
  const options = filter ? FEATS.filter(filter) : FEATS;
  const skillChoices = pick === 'Foco em Perícia'
    ? d.skills.filter((s) => s.trained).map((s) => s.name)
    : SKILLS.filter((s) => d.classSkills.has(s.name) && !d.skills.find((x) => x.name === s.name)?.trained).map((s) => s.name);
  const finalName = feat?.choice ? (choice ? `${pick} (${choice})` : '') : pick;
  return (
    <div className="stack">
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <select value={pick} onChange={(e) => { setPick(e.target.value); setChoice(''); }} style={{ flex: 1 }}>
          <option value="">Escolher talento...</option>
          {options.map((f) => {
            const owned = !f.choice && !REPEATABLE_FEATS.includes(f.name) && d.feats.includes(f.name);
            return <option key={f.name} value={f.name} disabled={owned}>{f.name}{owned ? ' (você já tem)' : f.prereq !== '—' ? ` (requer: ${f.prereq})` : ''}</option>;
          })}
        </select>
        {feat?.choice === 'skill' && (
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Perícia...</option>
            {skillChoices.filter((s) => !d.feats.includes(`${pick} (${s})`)).map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        {feat?.choice === 'weaponGroup' && (
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Grupo...</option>
            {Object.values(WEAPON_GROUPS).filter((g) => g !== 'armas exóticas' && !d.feats.includes(`${pick} (${g})`)).map((g) => <option key={g}>{g}</option>)}
          </select>
        )}
        <button className="btn" disabled={!finalName} onClick={() => { onAdd(finalName); setPick(''); setChoice(''); }}>Adicionar</button>
      </div>
      {feat && <div className="tiny muted">{feat.desc}</div>}
    </div>
  );
}

export function TalentPicker({ d, data, onAdd }) {
  const [pick, setPick] = useState('');
  const t = pick ? findTalent(pick, d) : null;
  const unmet = t ? t.prereq.filter((r) => !meetsPrereq(r, d, data)) : [];
  return (
    <div className="stack">
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
          <option value="">Escolher aptidão...</option>
          {talentPool(d).map((tree) => (
            <optgroup key={tree.name} label={`${tree.name} (${tree.from})`}>
              {tree.talents.map(([name]) => (
                <option key={name} value={name} disabled={(data.talents || []).includes(name) && !REPEATABLE_TALENTS.includes(name)}>{name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button className="btn" disabled={!pick} onClick={() => { onAdd(pick); setPick(''); }}>Adicionar</button>
      </div>
      {t && <div className="tiny muted">{t.desc}{unmet.length > 0 && <span className="red-text"> Pré-requisito pendente: {unmet.join(', ')}.</span>}</div>}
    </div>
  );
}

function FeatsTab({ d, data, set, editable, openBrowser }) {
  const chosen = data.feats || [];
  const talents = data.talents || [];
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <div className="row between">
          <div className="row"><h3 className="yellow" style={{ margin: 0 }}>Talentos</h3><button className="btn sm" onClick={() => openBrowser('feats')}>Explorar talentos</button></div>
          <span className={`counter ${chosen.length === d.featSlots ? 'ok' : chosen.length > d.featSlots ? 'over' : ''}`}>{chosen.length}/{d.featSlots} escolhidos</span>
        </div>
        <div className="tiny muted" style={{ margin: '4px 0 10px' }}>
          Talentos de nível {FEAT_LEVELS.filter((l) => l <= d.level).length}{d.sp?.bonusFeat ? ' + 1 humano' : ''}
          {d.heroic.map((x) => ` + ${Math.floor(x.levels / 2)} bônus de ${x.cls.name}`).join('')}
          {d.extraClassFeats ? ` + ${d.extraClassFeats} talento(s) inicial(is) de multiclasse` : ''}.
        </div>
        <div className="row" style={{ gap: 6, marginBottom: 10 }}>
          {d.autoFeats.map((f, i) => <span key={`a${i}`} className="tag blue" title="Automático (classe/espécie)">{f}</span>)}
        </div>
        <div className="list">
          {chosen.map((f, i) => {
            const info = featByName(f);
            return (
              <div key={`${f}-${i}`} className="list-row">
                <div>
                  <div className="name">{f}</div>
                  {info && <div className="sub">{info.desc}{info.prereq !== '—' ? ` · requer ${info.prereq}` : ''}</div>}
                </div>
                {editable && <button className="btn sm ghost red" onClick={() => set({ feats: chosen.filter((_, j) => j !== i) })}>Remover</button>}
              </div>
            );
          })}
        </div>
        {editable && <div style={{ marginTop: 10 }}><FeatPicker d={d} data={data} onAdd={(f) => set({ feats: [...chosen, f] })} /></div>}
        {d.heroic.map((x) => (
          <details key={x.cls.id} style={{ marginTop: 10 }}>
            <summary className="tiny muted" style={{ cursor: 'pointer' }}>Talentos bônus de {x.cls.name}{x.cls.id !== data.classId ? ' e talentos iniciais (multiclasse)' : ''}</summary>
            <div className="tiny muted" style={{ marginTop: 6 }}>
              {x.cls.id !== data.classId && <div><b>Iniciais (escolha 1):</b> {x.cls.startingFeats.join(', ')}.</div>}
              <b>Bônus:</b> {x.cls.bonusFeats.join(', ')}.
            </div>
          </details>
        ))}
      </div>

      <div>
        <div className="row between">
          <div className="row"><h3 className="yellow" style={{ margin: 0 }}>Aptidões</h3><button className="btn sm" onClick={() => openBrowser('talents')}>Explorar árvores</button></div>
          <span className={`counter ${talents.length === d.talentSlots ? 'ok' : talents.length > d.talentSlots ? 'over' : ''}`}>{talents.length}/{d.talentSlots}</span>
        </div>
        <div className="list" style={{ marginTop: 8 }}>
          {talents.map((name, i) => {
            const t = findTalent(name, d);
            const unmet = t ? t.prereq.filter((r) => !meetsPrereq(r, d, data)) : [];
            return (
              <div key={`${name}-${i}`} className="list-row">
                <div>
                  <div className="name">{name} {t && <span className="tag">{t.tree}</span>}</div>
                  {t && <div className="sub">{t.desc}{unmet.length > 0 && <span className="red-text"> (falta: {unmet.join(', ')})</span>}</div>}
                </div>
                {editable && <button className="btn sm ghost red" onClick={() => set({ talents: talents.filter((_, j) => j !== i) })}>Remover</button>}
              </div>
            );
          })}
        </div>
        {editable && <div style={{ marginTop: 10 }}><TalentPicker d={d} data={data} onAdd={(t) => set({ talents: [...talents, t] })} /></div>}
      </div>

      {d.features.length > 0 && (
        <div>
          <h3 className="yellow">Características de classe</h3>
          {d.features.map((x) => (
            <div key={x.cls.id} style={{ marginBottom: 8 }}>
              <div className="kicker">{x.cls.name}</div>
              <ul className="small muted" style={{ margin: '4px 0 0 18px', padding: 0 }}>{x.list.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GearTab({ d, data, set, editable }) {
  const [pick, setPick] = useState('');
  const [customName, setCustomName] = useState('');
  const [pay, setPay] = useState(false);
  const [creditDelta, setCreditDelta] = useState('');
  const gear = data.gear || [];

  const add = (name, cost = 0) => {
    const existing = gear.find((g) => g.name === name);
    const next = existing ? gear.map((g) => (g.name === name ? { ...g, qty: g.qty + 1 } : g)) : [...gear, { name, qty: 1 }];
    set({ gear: next, credits: pay ? (data.credits || 0) - cost : data.credits });
  };
  const changeCredits = (sign) => {
    const n = Math.abs(parseInt(creditDelta, 10));
    if (!n) return;
    set({ credits: (data.credits || 0) + sign * n });
    setCreditDelta('');
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row between">
        <div>
          <div className="kicker">Créditos galácticos</div>
          <div className="yellow" style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem' }}>{(data.credits || 0).toLocaleString('pt-BR')}</div>
        </div>
        {editable && (
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input type="number" placeholder="Valor" value={creditDelta} onChange={(e) => setCreditDelta(e.target.value)} style={{ width: 110 }} />
            <button className="btn sm green" onClick={() => changeCredits(1)}>+ Ganhar</button>
            <button className="btn sm red" onClick={() => changeCredits(-1)}>− Gastar</button>
          </div>
        )}
      </div>
      <div className="list">
        {gear.length === 0 && <div className="empty small">Mochila vazia. Nem um medpac?</div>}
        {gear.map((g) => (
          <div key={g.name} className="list-row">
            <div className="name">{g.name}</div>
            <div className="row">
              {editable ? (
                <>
                  <button className="btn sm ghost pm" onClick={() => set({ gear: gear.map((x) => (x.name === g.name ? { ...x, qty: Math.max(0, x.qty - 1) } : x)).filter((x) => x.qty > 0) })}>−</button>
                  <span className="mono">{g.qty}</span>
                  <button className="btn sm ghost pm" onClick={() => set({ gear: gear.map((x) => (x.name === g.name ? { ...x, qty: x.qty + 1 } : x)) })}>+</button>
                </>
              ) : <span className="mono">×{g.qty}</span>}
            </div>
          </div>
        ))}
      </div>
      {editable && (
        <div className="stack">
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
              <option value="">Adicionar equipamento do livro...</option>
              {GEAR.map((g) => <option key={g.name} value={g.name}>{g.name} — {g.cost.toLocaleString('pt-BR')} cr</option>)}
            </select>
            <button className="btn" disabled={!pick} onClick={() => { add(pick, GEAR.find((g) => g.name === pick)?.cost); setPick(''); }}>Adicionar</button>
          </div>
          <label className="check small"><input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} /> Descontar o preço dos créditos</label>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input placeholder="Item personalizado" value={customName} onChange={(e) => setCustomName(e.target.value)} style={{ flex: 1 }} />
            <button className="btn" disabled={!customName.trim()} onClick={() => { add(customName.trim(), 0); setCustomName(''); }}>Adicionar</button>
          </div>
        </div>
      )}
      {d.droid && (
        <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 14 }}>
          <DroidShop data={data} set={set} d={d} mode="sheet" editable={editable} />
        </div>
      )}
    </div>
  );
}

const DETAIL_FIELDS = [
  ['age', 'Idade'], ['gender', 'Gênero'], ['height', 'Altura'], ['weight', 'Peso'],
  ['eyes', 'Olhos'], ['hair', 'Cabelo'], ['skin', 'Pele'], ['homeworld', 'Planeta natal'],
];

function DetailsTab({ d, data, set, setDeep, editable }) {
  const [lang, setLang] = useState('');
  const langs = data.languages?.length ? data.languages : d.sp?.languages ?? [];
  return (
    <div className="stack" style={{ gap: 18 }}>
      {d.sp && (
        <div>
          <h3 className="yellow">Traços de {d.sp.name}</h3>
          {d.sp.traits.map(([n, t]) => <div key={n} className="small" style={{ marginBottom: 4 }}><b>{n}:</b> <span className="muted">{t}</span></div>)}
        </div>
      )}
      {editable && <ClassEditor d={d} data={data} set={set} />}

      <div>
        <h3 className="yellow">Linguagens <span className="tiny muted">({langs.length}/{d.languageSlots})</span></h3>
        <div className="row" style={{ gap: 6 }}>
          {langs.map((l) => (
            <span key={l} className="tag">{l}{editable && <button onClick={() => set({ languages: langs.filter((x) => x !== l) })}>×</button>}</span>
          ))}
        </div>
        {editable && (
          <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
            <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ flex: 1 }}>
              <option value="">Adicionar linguagem...</option>
              {LANGUAGES.filter((l) => !langs.includes(l)).map((l) => <option key={l}>{l}</option>)}
            </select>
            <button className="btn sm" disabled={!lang} onClick={() => { set({ languages: [...langs, lang] }); setLang(''); }}>Adicionar</button>
          </div>
        )}
      </div>

      {editable && (
        <div>
          <h3 className="yellow">Valores de habilidade</h3>
          <div className="tiny muted" style={{ marginBottom: 8 }}>Base (antes da espécie) e aumentos de nível (4º, 8º, 12º, 16º e 20º).</div>
          <div className="abilities">
            {d.abilities.map((a) => (
              <div key={a.id} className="ability">
                <div className="abbr">{a.short}</div>
                <input type="number" value={data.base?.[a.id] ?? 10} style={{ width: '100%', textAlign: 'center' }}
                  onChange={(e) => setDeep('base', { [a.id]: Number(e.target.value) || 0 })} />
                <div className="tiny muted" style={{ marginTop: 4 }}>aumentos</div>
                <input type="number" min="0" value={data.increases?.[a.id] ?? 0} style={{ width: '100%', textAlign: 'center' }}
                  onChange={(e) => setDeep('increases', { [a.id]: Number(e.target.value) || 0 })} />
                <div className="tiny dim" style={{ marginTop: 4 }}>= {d.scores[a.id]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="yellow">Aparência & história</h3>
        <div className="grid grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {DETAIL_FIELDS.map(([k, l]) => (
            <label key={k} className="field">{l}
              {editable ? <input value={data.details?.[k] ?? ''} onChange={(e) => setDeep('details', { [k]: e.target.value })} /> : <span className="small" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{data.details?.[k] || '—'}</span>}
            </label>
          ))}
        </div>
        {[['appearance', 'Aparência'], ['personality', 'Personalidade'], ['background', 'História']].map(([k, l]) => (
          <label key={k} className="field" style={{ marginTop: 10 }}>{l}
            {editable ? <textarea value={data.details?.[k] ?? ''} onChange={(e) => setDeep('details', { [k]: e.target.value })} />
              : <p className="small" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap' }}>{data.details?.[k] || '—'}</p>}
          </label>
        ))}
      </div>
      <label className="field">Anotações
        {editable ? <textarea value={data.notes || ''} onChange={(e) => set({ notes: e.target.value })} style={{ minHeight: 140 }} />
          : <p className="small" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap' }}>{data.notes || '—'}</p>}
      </label>
    </div>
  );
}

// Ajuste manual dos níveis por classe (para corrigir fichas ou importar personagens já evoluídos)
function ClassEditor({ d, data, set }) {
  const [add, setAdd] = useState('');
  const levels = getClassLevels(data);
  const update = (next) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v > 0));
    const total = Object.values(clean).reduce((a, b) => a + b, 0) || 1;
    set({ classLevels: clean, level: total });
  };
  return (
    <div>
      <h3 className="yellow">Classes e níveis</h3>
      <div className="tiny muted" style={{ marginBottom: 8 }}>Para subir de nível normalmente, use o botão "Subir de nível". Aqui é para corrigir. Nível total: {d.level}.</div>
      <div className="list">
        {Object.entries(levels).map(([id, lv]) => {
          const c = anyClassById(id);
          return (
            <div key={id} className="list-row">
              <div className="name">{c?.name ?? id} {id === data.classId && <span className="tag yellow">classe inicial</span>} {c?.prestige && <span className="tag">prestígio</span>}</div>
              <div className="row">
                <input type="number" min="0" max={c?.maxLevel ?? 20} value={lv} style={{ width: 70 }} onChange={(e) => update({ ...levels, [id]: Math.max(0, Number(e.target.value) || 0) })} />
                {id !== data.classId && <button className="btn sm ghost red" onClick={() => update({ ...levels, [id]: 0 })}>Remover</button>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
        <select value={add} onChange={(e) => setAdd(e.target.value)} style={{ flex: 1 }}>
          <option value="">Adicionar classe...</option>
          {ALL_CLASSES.filter((c) => !levels[c.id]).map((c) => <option key={c.id} value={c.id}>{c.name}{c.prestige ? ' (prestígio)' : ''}</option>)}
        </select>
        <button className="btn sm" disabled={!add} onClick={() => { update({ ...levels, [add]: 1 }); setAdd(''); }}>Adicionar</button>
      </div>
    </div>
  );
}

// Destino do personagem (Cap. 7, regra opcional) e uso dos Pontos de Destino
const DESTINIES = {
  '': ['Sem destino definido', '', ''],
  corrupcao: ['Corrupção', '24h: você e aliados a 10 quadrados +1 em perícias e testes de habilidade (afastar-se: -2 por 24h)', '+1 em duas habilidades; o Lado Sombrio sobe até a Sabedoria'],
  descoberta: ['Descoberta', '24h: você e aliados a 10 quadrados +1 em todas as defesas (afastar-se: -1 nas defesas por 24h)', '+1 permanente em todas as defesas'],
  destruicao: ['Destruição', '24h: você e aliados a 10 quadrados +2 em todas as rolagens de dano (afastar-se: -2 no dano por 24h)', '+2 em uma habilidade'],
  educacao: ['Educação', '24h: você e aliados a 10 quadrados +1 em perícias e testes de habilidade (afastar-se: -2 por 24h)', '+5 permanente numa perícia de classe'],
  redencao: ['Redenção', 'Você recebe 1 Ponto de Força (afastar-se: perde 1 PF)', 'O redimido fica com Lado Sombrio 1; você ganha 3 + os PF que ele perdeu'],
  resgate: ['Resgate', '24h: você e aliados a 10 quadrados +1 em todos os ataques (afastar-se: -2 nos ataques por 24h)', '+1 em duas habilidades'],
  secreto: ['Secreto (o mestre sabe)', 'o mestre avisa quando acontecer', 'o mestre revela'],
};

const DESTINY_USES = [
  ['crit', 'Acerto crítico automático', 'Um ataque seu acerta como crítico, sem rolar.'],
  ['miss', 'Fazer um ataque contra você falhar', 'Mesmo depois do ataque já resolvido.'],
  ['turn', 'Agir fora do seu turno', 'Muda sua posição na iniciativa.'],
  ['shield', 'Receber o dano no lugar de um aliado', 'Aliado ao alcance do seu ataque.'],
  ['force', 'Ganhar 3 Pontos de Força na hora', 'Somados automaticamente.'],
  ['power', 'Potencializar um poder ou Segredo da Força', 'Conforme a descrição do poder ou segredo.'],
];

function DestinyBlock({ data, set, editable, d }) {
  const [open, setOpen] = useState(false);
  const dest = data.destiny || { type: '', text: '' };
  const info = DESTINIES[dest.type] || DESTINIES[''];
  const pts = data.destinyPoints || 0;
  const spend = (id, label) => {
    if (pts <= 0) return;
    const patch = { destinyPoints: pts - 1 };
    if (id === 'force') patch.forcePoints = d.fpCurrent + 3;
    set(patch);
    setOpen(false);
    window.dispatchEvent(new CustomEvent('holocron:roll', { detail: { id: `dest-${Date.now()}`, label: `Ponto de Destino: ${label}`, total: '★', formula: '', result: { parts: [] }, character_name: data.name } }));
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div className="row between"><span className="small">Destino</span><span className="tiny yellow">{info[0]}</span></div>
      {editable ? (
        <div className="stack" style={{ gap: 4, marginTop: 4 }}>
          <select value={dest.type} onChange={(e) => set({ destiny: { ...dest, type: e.target.value } })} style={{ padding: '4px 6px', fontSize: '0.82rem' }}>
            {Object.entries(DESTINIES).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
          </select>
          {dest.type && <input value={dest.text || ''} placeholder="Ex.: descobrir quem acordou o lado sombrio" onChange={(e) => set({ destiny: { ...dest, text: e.target.value } })} style={{ padding: '4px 8px', fontSize: '0.82rem' }} />}
        </div>
      ) : dest.text ? <div className="tiny muted">{dest.text}</div> : null}
      {dest.type && dest.type !== 'secreto' && (
        <div className="tiny muted" style={{ marginTop: 4 }}><b>Ao avançar:</b> {info[1]}.<br /><b>Ao cumprir:</b> {info[2]}.</div>
      )}
      {editable && (
        <div style={{ marginTop: 6 }}>
          <button className="btn sm yellow" disabled={pts <= 0 || !dest.type} title={!dest.type ? 'Só personagens com um destino gastam Pontos de Destino' : ''} onClick={() => setOpen((o) => !o)}>Gastar Ponto de Destino</button>
          {!dest.type && <div className="tiny dim" style={{ marginTop: 4 }}>Pelo livro, só quem tem um destino pode gastar Pontos de Destino.</div>}
          {open && (
            <div className="list" style={{ marginTop: 6 }}>
              {DESTINY_USES.map(([id, label, hint]) => (
                <button key={id} className="list-row" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', font: 'inherit' }} onClick={() => spend(id, label)}>
                  <div><div className="name small">{label}</div><div className="sub">{hint}</div></div>
                  <span className="tag yellow">−1</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Lâmina do sabre de luz com a cor do cristal; clique para ligar/desligar (com som sintetizado)
function SaberBlade({ w, editable, onCrystal }) {
  const [on, setOn] = useState(false);
  const color = w.crystal || 'azul';
  const toggle = () => {
    if (on) fx.saberOff(color); else fx.saberOn(color);
    setOn((x) => !x);
  };
  return (
    <div className="row" style={{ marginTop: 6, gap: 8, flexWrap: 'nowrap' }}>
      <button className={`saber-hilt ${on ? 'on' : ''} ${color === 'preto' ? 'darksaber' : ''}`} style={{ '--blade': saberHex(color) }} onClick={toggle} title={on ? 'Desligar' : 'Ligar o sabre'}>
        <span className="hilt" /><span className="blade" />
      </button>
      {editable ? (
        <select value={color} onChange={(e) => { onCrystal(e.target.value); fx.saberOn(e.target.value); setOn(true); }} style={{ padding: '2px 6px', fontSize: '0.78rem', width: 'auto' }} title="Cor do cristal">
          {SABER_COLORS.map(([k, l]) => <option key={k} value={k}>Cristal {l.toLowerCase()}</option>)}
        </select>
      ) : <span className="tiny muted">Cristal {SABER_COLORS.find(([k]) => k === color)?.[1].toLowerCase()}</span>}
    </div>
  );
}
