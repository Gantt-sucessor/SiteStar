import { useMemo, useState } from 'react';
import {
  ABILITIES, CONDITION_TRACK, FEATS, FORCE_POWERS, FORCE_TREES, WEAPONS, ARMORS, GEAR, WEAPON_GROUPS,
  SKILLS, LANGUAGES, FEAT_LEVELS, ABILITY_INCREASE_LEVELS, featByName, powerByName,
} from '../data/rules';
import { derive } from '../lib/character';
import { fmtMod, d20Formula } from '../lib/dice';
import { sendRoll } from '../lib/rolls';
import { sfx } from '../lib/sfx';

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
  const trees = [...(d.cls?.trees ?? [])];
  if (d.forceSensitive) trees.push(...FORCE_TREES);
  return trees;
}

export function findTalent(name, d) {
  for (const tree of talentPool(d)) {
    const t = tree.talents.find(([n]) => n === name);
    if (t) return { tree: tree.name, name: t[0], desc: t[1], prereq: t[2] ?? [] };
  }
  for (const tree of FORCE_TREES) {
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
  const d = useMemo(() => derive(data), [data]);
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

  const levelUp = async () => {
    if (!d.cls) return;
    const next = d.level + 1;
    if (next > 20) return;
    if (!confirm(`Subir ${data.name || 'o personagem'} para o nível ${next}? Os PV serão rolados (1d${d.cls.hitDie} + Con).`)) return;
    const entry = await sendRoll({
      formula: `1d${d.cls.hitDie}${d.mods.con ? fmtMod(d.mods.con) : ''}`,
      label: `Subiu para o nível ${next} — PV`, kind: 'level', campaignId, character,
    });
    const gained = Math.max(1, entry.total);
    const levelRolls = [...(data.hp?.levelRolls || [])].slice(0, d.level - 1);
    levelRolls.push(gained);
    const gains = [`+${gained} PV`];
    if (FEAT_LEVELS.includes(next)) gains.push('1 talento');
    if (next % 2 === 0) gains.push(`1 talento bônus de ${d.cls.name}`);
    else gains.push('1 aptidão');
    if (ABILITY_INCREASE_LEVELS.includes(next)) gains.push('+1 em duas habilidades');
    if (next % 2 === 0) gains.push('+1 em todas as perícias e no dano');
    sfx.saber();
    setLevelInfo({ level: next, gains });
    onChange({
      ...data, level: next, xp: Math.max(data.xp || 0, 0),
      hp: { ...data.hp, levelRolls, current: (data.hp?.current ?? d.hpMax) + gained },
      forcePoints: null,
    });
  };

  return (
    <div>
      <div className="sheet-head">
        <div>
          <h1 className="sheet-name">
            {editable ? <input value={data.name} placeholder="Nome do personagem" onChange={(e) => set({ name: e.target.value })} /> : data.name || 'Sem nome'}
          </h1>
          <div className="sheet-sub">
            {d.sp?.name ?? 'Espécie?'} · {d.cls?.name ?? 'Classe?'} nível {d.level}
            {data.player && <> · jogador(a) {data.player}</>}
          </div>
          <div className="row" style={{ marginTop: 6, gap: 6 }}>
            {d.forceSensitive && <span className="tag blue">Sensitivo à Força</span>}
            {data.darkSide > 0 && <span className="tag red">Lado Sombrio {data.darkSide}</span>}
            {d.armor && <span className="tag">{d.armor.name}{!d.armorProficient && ' (não proficiente)'}</span>}
            <span className="tag yellow">{(data.credits || 0).toLocaleString('pt-BR')} créditos</span>
          </div>
        </div>
        {editable && (
          <div className="row">
            <label className="field" style={{ width: 120 }}>XP
              <input type="number" value={data.xp || 0} onChange={(e) => set({ xp: Number(e.target.value) || 0 })} style={{ width: '100%' }} />
            </label>
            <button className="btn yellow" onClick={levelUp} disabled={d.level >= 20}>Subir de nível</button>
          </div>
        )}
      </div>

      {levelInfo && (
        <div className="info-box" style={{ marginTop: 12 }}>
          <b className="yellow">Nível {levelInfo.level}!</b> Você ganhou: {levelInfo.gains.join(', ')}. Adicione as escolhas nas abas Talentos & Aptidões e Detalhes.
          <button className="btn sm ghost" style={{ marginLeft: 8 }} onClick={() => setLevelInfo(null)}>OK</button>
        </div>
      )}

      <div className="sheet-grid">
        {/* ---------------- Coluna esquerda ---------------- */}
        <div className="stack" style={{ gap: 16 }}>
          <Panel title="Vitalidade" aside={<span className="tiny muted">Limiar {d.threshold}</span>}>
            <div className={`bar ${hpClass}`}><i style={{ width: `${hpPct}%` }} /><span>{d.hpCurrent} / {d.hpMax} PV</span></div>
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

          <Panel title="Força & Destino">
            <div className="row between"><span className="small">Pontos de Força</span><span className="mono small">{d.fpCurrent}/{d.fpMax}</span></div>
            <Pips max={d.fpMax} value={d.fpCurrent} onChange={editable ? (v) => set({ forcePoints: v }) : null} />
            {editable && (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={spendForcePoint} disabled={d.fpCurrent <= 0}>Gastar PF ({d.fpDice > 1 ? `${d.fpDice}${d.forceDie}, maior` : `1${d.forceDie}`})</button>
              </div>
            )}
            <div className="row between" style={{ marginTop: 12 }}><span className="small">Pontos de Destino</span><span className="mono small">{data.destinyPoints || 0}</span></div>
            <Pips max={Math.max(3, data.destinyPoints || 0)} value={data.destinyPoints || 0} variant="gold" onChange={editable ? (v) => set({ destinyPoints: v }) : null} />
            <div className="row between" style={{ marginTop: 12 }}><span className="small">Pontuação do Lado Sombrio</span><span className="mono small red-text">{data.darkSide || 0}/{d.scores.sab}</span></div>
            <Pips max={Math.max(d.scores.sab, data.darkSide || 0)} value={data.darkSide || 0} variant="dark" onChange={editable ? (v) => set({ darkSide: v }) : null} />
            {(data.darkSide || 0) >= d.scores.sab && d.scores.sab > 0 && <div className="tiny red-text" style={{ marginTop: 6 }}>Consumido pelo lado sombrio.</div>}
          </Panel>

          <Panel title="Habilidades">
            <div className="abilities" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {ABILITIES.map((a) => (
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
              <div className="stat"><div className="k">Velocidade</div><div className="v">{d.speed}</div></div>
              <div className="stat clickable" onClick={() => roll(d20Formula(d.initiative), 'Iniciativa', 'initiative')}>
                <div className="k">Iniciativa</div><div className="v">{fmtMod(d.initiative)}</div>
              </div>
            </div>
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
          {tab === 'forca' && <ForceTab d={d} data={data} set={set} roll={roll} editable={editable} />}
          {tab === 'talentos' && <FeatsTab d={d} data={data} set={set} editable={editable} />}
          {tab === 'equip' && <GearTab data={data} set={set} editable={editable} />}
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
                <button className="roll-chip" title="Rolar ataque" onClick={() => roll(d20Formula(w.attack), `Ataque — ${w.name}`, 'attack')}>{fmtMod(w.attack)}</button>
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

function ForceTab({ d, data, set, roll, editable }) {
  const [pick, setPick] = useState('');
  const useForce = d.skills.find((s) => s.name === 'Usar a Força');
  if (!d.forceSensitive) {
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
        <h3 className="yellow" style={{ margin: 0 }}>Poderes da Força</h3>
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
    </div>
  );
}

export function FeatPicker({ d, data, onAdd, filter }) {
  const [pick, setPick] = useState('');
  const [choice, setChoice] = useState('');
  const feat = FEATS.find((f) => f.name === pick);
  const options = filter ? FEATS.filter(filter) : FEATS;
  const skillChoices = pick === 'Foco em Perícia'
    ? d.skills.filter((s) => s.trained).map((s) => s.name)
    : SKILLS.filter((s) => d.cls?.classSkills.includes(s.name) && !d.skills.find((x) => x.name === s.name)?.trained).map((s) => s.name);
  const finalName = feat?.choice ? (choice ? `${pick} (${choice})` : '') : pick;
  return (
    <div className="stack">
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <select value={pick} onChange={(e) => { setPick(e.target.value); setChoice(''); }} style={{ flex: 1 }}>
          <option value="">Escolher talento...</option>
          {options.map((f) => <option key={f.name} value={f.name}>{f.name}{f.prereq !== '—' ? ` (requer: ${f.prereq})` : ''}</option>)}
        </select>
        {feat?.choice === 'skill' && (
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Perícia...</option>
            {skillChoices.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        {feat?.choice === 'weaponGroup' && (
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Grupo...</option>
            {Object.values(WEAPON_GROUPS).filter((g) => g !== 'armas exóticas').map((g) => <option key={g}>{g}</option>)}
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
            <optgroup key={tree.name} label={tree.name}>
              {tree.talents.map(([name]) => (
                <option key={name} value={name} disabled={(data.talents || []).includes(name) && name !== 'Defesa com Sabre de Luz'}>{name}</option>
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

function FeatsTab({ d, data, set, editable }) {
  const chosen = data.feats || [];
  const talents = data.talents || [];
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <div className="row between">
          <h3 className="yellow" style={{ margin: 0 }}>Talentos</h3>
          <span className={`counter ${chosen.length === d.featSlots ? 'ok' : chosen.length > d.featSlots ? 'over' : ''}`}>{chosen.length}/{d.featSlots} escolhidos</span>
        </div>
        <div className="tiny muted" style={{ margin: '4px 0 10px' }}>
          Talentos de nível {FEAT_LEVELS.filter((l) => l <= d.level).length}{d.sp?.bonusFeat ? ' + 1 humano' : ''}{d.cls ? ` + ${Math.floor(d.level / 2)} bônus de ${d.cls.name}` : ''}.
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
        {d.cls && <details style={{ marginTop: 10 }}><summary className="tiny muted" style={{ cursor: 'pointer' }}>Lista de talentos bônus de {d.cls.name}</summary><div className="tiny muted" style={{ marginTop: 6 }}>{d.cls.bonusFeats.join(', ')}.</div></details>}
      </div>

      <div>
        <div className="row between">
          <h3 className="yellow" style={{ margin: 0 }}>Aptidões</h3>
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
    </div>
  );
}

function GearTab({ data, set, editable }) {
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
            {ABILITIES.map((a) => (
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
