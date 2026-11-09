import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ABILITIES, SPECIES, CLASSES, ERAS, POINT_BUY_COST, POINT_BUY_TOTAL, STANDARD_ARRAY,
  WEAPONS, ARMORS, GEAR, WEAPON_GROUPS, FORCE_POWERS, LANGUAGES,
} from '../data/rules';
import { derive, newCharacter } from '../lib/character';
import { fmtMod, roll as rollDice } from '../lib/dice';
import { saveCharacter, listMyCampaigns } from '../lib/data';
import { useAuth } from '../lib/auth';
import { Panel, FeatPicker, TalentPicker, meetsPrereq } from '../components/Sheet';
import { sfx } from '../lib/sfx';
import { hyperspace } from '../components/Starfield';

const STEPS = ['Conceito', 'Espécie', 'Classe', 'Habilidades', 'Perícias', 'Talentos', 'Aptidão', 'A Força', 'Equipamento', 'Revisão'];

const modTags = (mods) => Object.entries(mods || {}).map(([k, v]) => (
  <span key={k} className={`tag ${v > 0 ? 'green' : 'red'}`}>{v > 0 ? '+' : ''}{v} {k.toUpperCase()}</span>
));

export default function CharacterWizard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem('holocron:draft') || 'null');
      if (draft) return draft;
    } catch { /* sem rascunho */ }
    return { ...newCharacter(), player: profile?.display_name || '' };
  });
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(params.get('campanha') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const d = useMemo(() => derive(data), [data]);
  const set = (patch) => setData((cur) => ({ ...cur, ...patch }));

  useEffect(() => {
    try { localStorage.setItem('holocron:draft', JSON.stringify(data)); } catch { /* cheio */ }
  }, [data]);

  useEffect(() => {
    if (!user) return;
    listMyCampaigns(user.id).then(({ joined }) => setCampaigns(joined)).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!data.player && profile?.display_name) set({ player: profile.display_name });
  }, [profile?.display_name]);

  const go = (n) => { setStep(Math.max(0, Math.min(STEPS.length - 1, n))); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const skipForce = !d.forceSensitive;
  const next = () => go(step + 1 + (step + 1 === 7 && skipForce ? 1 : 0));
  const prev = () => go(step - 1 - (step - 1 === 7 && skipForce ? 1 : 0));

  const finish = async () => {
    setSaving(true); setError('');
    try {
      let final = { ...data };
      if (d.cls?.startingGear) {
        for (const g of d.cls.startingGear) {
          if (!final.weapons.some((w) => w.name === g)) {
            const w = WEAPONS.find((x) => x.name === g);
            if (w) final.weapons = [...final.weapons, { ...w, uid: crypto.randomUUID() }];
          }
        }
      }
      if (!final.languages?.length) final.languages = d.sp?.languages ?? ['Básico'];
      delete final.assign;
      delete final.methodSaves;
      const row = await saveCharacter({ data: final, campaign_id: campaignId || null });
      localStorage.removeItem('holocron:draft');
      sfx.saber();
      hyperspace();
      navigate(`/personagem/${row.id}`);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!confirm('Descartar este rascunho e começar do zero?')) return;
    localStorage.removeItem('holocron:draft');
    setData({ ...newCharacter(), player: profile?.display_name || '' });
    go(0);
  };

  return (
    <div className="page">
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <div className="kicker">Registro de personagem</div>
          <h1 className="yellow" style={{ margin: 0 }}>Novo Herói</h1>
        </div>
        <button className="btn sm ghost" onClick={reset}>Recomeçar</button>
      </div>

      <div className="stepper">
        {STEPS.map((s, i) => (
          (i === 7 && skipForce) ? null : (
            <button key={s} className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`} onClick={() => go(i)}>
              <b>{String(i + 1).padStart(2, '0')}</b>{s}
            </button>
          )
        ))}
      </div>

      <div className="wizard-layout">
        <div>
          {step === 0 && <StepConcept data={data} set={set} />}
          {step === 1 && <StepSpecies data={data} set={set} />}
          {step === 2 && <StepClass data={data} set={set} />}
          {step === 3 && <StepAbilities data={data} set={set} d={d} />}
          {step === 4 && <StepSkills data={data} set={set} d={d} />}
          {step === 5 && <StepFeats data={data} set={set} d={d} />}
          {step === 6 && <StepTalent data={data} set={set} d={d} />}
          {step === 7 && <StepForce data={data} set={set} d={d} />}
          {step === 8 && <StepGear data={data} set={set} d={d} />}
          {step === 9 && <StepReview data={data} set={set} d={d} campaigns={campaigns} campaignId={campaignId} setCampaignId={setCampaignId} />}

          {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}
          <div className="wizard-nav">
            <button className="btn" onClick={prev} disabled={step === 0}>← Voltar</button>
            {step < STEPS.length - 1
              ? <button className="btn primary" onClick={next} disabled={(step === 1 && !data.species) || (step === 2 && !data.classId)}>Avançar →</button>
              : <button className="btn yellow primary lg" onClick={finish} disabled={saving || !data.species || !data.classId || !data.name}>{saving ? 'Salvando...' : 'Concluir personagem'}</button>}
          </div>
        </div>
        <aside className="wizard-aside"><Preview data={data} d={d} /></aside>
      </div>
    </div>
  );
}

function Preview({ data, d }) {
  return (
    <Panel title="Prévia" className="yellow" aside={<span className="tiny dim mono">HOLO-ID</span>}>
      <div style={{ fontFamily: 'var(--font-head)', color: 'var(--sw-yellow)', fontSize: '1.1rem' }}>{data.name || 'Sem nome'}</div>
      <div className="small muted">{d.sp?.name ?? '—'} · {d.cls?.name ?? '—'} 1</div>
      <div className="hr" />
      <div className="abilities" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {ABILITIES.map((a) => (
          <div key={a.id} className="ability" style={{ padding: '6px 2px' }}>
            <div className="abbr">{a.short}</div>
            <div className="score" style={{ fontSize: '1.15rem' }}>{d.scores[a.id]}</div>
            <div className="mod" style={{ fontSize: '0.8rem' }}>{fmtMod(d.mods[a.id])}</div>
          </div>
        ))}
      </div>
      <div className="stat-grid" style={{ marginTop: 10 }}>
        <div className="stat"><div className="k">PV</div><div className="v">{d.hpMax}</div></div>
        <div className="stat"><div className="k">BBA</div><div className="v">{fmtMod(d.bab)}</div></div>
        <div className="stat"><div className="k">Limiar</div><div className="v">{d.threshold}</div></div>
        <div className="stat"><div className="k">Ref</div><div className="v">{d.defenses.ref}</div></div>
        <div className="stat"><div className="k">Fort</div><div className="v">{d.defenses.fort}</div></div>
        <div className="stat"><div className="k">Von</div><div className="v">{d.defenses.von}</div></div>
      </div>
      <div className="stack small" style={{ marginTop: 12, gap: 4 }}>
        <div className="row between"><span className="muted">Perícias treinadas</span><span className="mono">{(data.trainedSkills || []).length}/{d.trainedSlots}</span></div>
        <div className="row between"><span className="muted">Talentos</span><span className="mono">{(data.feats || []).length}/{d.featSlots}</span></div>
        <div className="row between"><span className="muted">Aptidões</span><span className="mono">{(data.talents || []).length}/{d.talentSlots}</span></div>
        {d.forceSensitive && <div className="row between"><span className="muted">Poderes da Força</span><span className="mono">{(data.forcePowers || []).length}/{d.powerSlots}</span></div>}
        <div className="row between"><span className="muted">Créditos</span><span className="mono yellow">{(data.credits || 0).toLocaleString('pt-BR')}</span></div>
      </div>
    </Panel>
  );
}

function StepConcept({ data, set }) {
  return (
    <Panel title="Quem é você nesta galáxia?">
      <div className="grid grid-2">
        <label className="field">Nome do personagem<input value={data.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Kira Voss" autoFocus /></label>
        <label className="field">Jogador(a)<input value={data.player} onChange={(e) => set({ player: e.target.value })} /></label>
      </div>
      <label className="field" style={{ marginTop: 12 }}>Conceito em uma frase
        <input value={data.concept} onChange={(e) => set({ concept: e.target.value })} placeholder="Ex.: Contrabandista corelliana com dívida com os Hutts" />
      </label>
      <h3 style={{ marginTop: 18 }}>Era da campanha</h3>
      <div className="pick-grid">
        {ERAS.map((e) => (
          <button key={e.id} className={`pick ${data.era === e.id ? 'selected' : ''}`} onClick={() => set({ era: e.id })}>
            <h3>{e.name}</h3>
            <div className="desc">{e.desc}</div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function StepSpecies({ data, set }) {
  const sel = SPECIES.find((s) => s.id === data.species);
  return (
    <Panel title="Escolha sua espécie">
      <div className="pick-grid">
        {SPECIES.map((s) => (
          <button key={s.id} className={`pick ${data.species === s.id ? 'selected' : ''}`} onClick={() => set({ species: s.id, trainedSkills: [], languages: [] })}>
            <h3>{s.name}</h3>
            <div className="desc">{s.desc}</div>
            <div className="mods">{Object.keys(s.mods).length ? modTags(s.mods) : <span className="tag">sem ajustes</span>}{s.size !== 'Médio' && <span className="tag yellow">{s.size}</span>}</div>
          </button>
        ))}
      </div>
      {sel && (
        <div className="info-box" style={{ marginTop: 16 }}>
          <b className="yellow">{sel.name}</b> · Velocidade {sel.speed} quadrados · Linguagens: {sel.languages.join(', ')}
          <div style={{ marginTop: 6 }}>{sel.traits.map(([n, t]) => <div key={n} className="small"><b>{n}:</b> <span className="muted">{t}</span></div>)}</div>
        </div>
      )}
    </Panel>
  );
}

function StepClass({ data, set }) {
  const sel = CLASSES.find((c) => c.id === data.classId);
  return (
    <Panel title="Escolha sua classe heróica">
      <div className="pick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {CLASSES.map((c) => (
          <button key={c.id} style={{ '--pc': c.color }} className={`pick ${data.classId === c.id ? 'selected' : ''}`}
            onClick={() => { set({ classId: c.id, trainedSkills: [], talents: [], forcePowers: [] }); sfx.saber(); }}>
            <div style={{ height: 3, width: '60%', background: c.color, boxShadow: `0 0 10px ${c.color}`, borderRadius: 3, marginBottom: 10 }} />
            <h3>{c.name}</h3>
            <div className="desc">{c.desc}</div>
            <div className="mods">
              <span className="tag">PV {c.hp}+Con</span>
              <span className="tag">BBA {c.bab === 'full' ? '+1' : '+0'}</span>
              <span className="tag">{c.trainedSkills}+Int perícias</span>
            </div>
          </button>
        ))}
      </div>
      {sel && (
        <div className="info-box" style={{ marginTop: 16 }}>
          <b className="yellow">{sel.name}</b> — habilidades-chave: {sel.keyAbilities}.
          <div className="small" style={{ marginTop: 6 }}><b>Talentos iniciais:</b> <span className="muted">{sel.startingFeats.join(', ')}</span></div>
          <div className="small"><b>Defesas:</b> <span className="muted">{Object.entries(sel.defense).map(([k, v]) => `+${v} ${k === 'ref' ? 'Reflexo' : k === 'fort' ? 'Fortitude' : 'Vontade'}`).join(', ')}</span></div>
          <div className="small"><b>Créditos iniciais:</b> <span className="muted">{sel.credits.dice} × {sel.credits.mult}</span></div>
          <div className="small"><b>Árvores de aptidão:</b> <span className="muted">{sel.trees.map((t) => t.name).join(', ')}</span></div>
        </div>
      )}
    </Panel>
  );
}

function StepAbilities({ data, set, d }) {
  const method = data.abilityMethod;
  const spent = ABILITIES.reduce((s, a) => s + (POINT_BUY_COST[data.base[a.id]] ?? 0), 0);
  const assign = data.assign || {};
  const pool = method === 'array' ? STANDARD_ARRAY : data.rolledPool || [];

  // Cada método guarda os próprios valores, para não perder nada ao alternar entre as abas
  const setMethod = (m) => {
    if (m === method) return;
    const saves = { ...(data.methodSaves || {}), [method]: { base: data.base, assign } };
    const restored = saves[m];
    const fill = m === 'manual' ? 10 : 8;
    const base = restored?.base ?? { vig: fill, des: fill, con: fill, int: fill, sab: fill, car: fill };
    set({ abilityMethod: m, base, assign: restored?.assign ?? {}, methodSaves: saves });
  };

  const assignFromPool = (ability, idx) => {
    const next = { ...assign };
    for (const k of Object.keys(next)) if (next[k] === Number(idx)) delete next[k];
    if (idx === '') delete next[ability]; else next[ability] = Number(idx);
    const base = { ...data.base };
    for (const a of ABILITIES) base[a.id] = next[a.id] !== undefined ? pool[next[a.id]] : 8;
    set({ assign: next, base });
  };

  const rollPool = () => {
    const values = Array.from({ length: 6 }, () => rollDice('4d6kh3').total).sort((a, b) => b - a);
    sfx.roll();
    set({ rolledPool: values, assign: {}, base: { vig: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 } });
  };
  const poolLow = pool.length === 6 && (pool.reduce((s, v) => s + Math.floor((v - 10) / 2), 0) <= 0 || Math.max(...pool) <= 13);

  return (
    <Panel title="Valores de habilidade">
      <div className="tabs">
        {[['pointbuy', 'Compra de pontos'], ['array', 'Pacote padrão'], ['roll', 'Rolar 4d6'], ['manual', 'Manual']].map(([id, l]) => (
          <button key={id} className={`tab ${method === id ? 'active' : ''}`} onClick={() => setMethod(id)}>{l}</button>
        ))}
      </div>

      {method === 'pointbuy' && (
        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="small muted">Todos começam em 8. Gaste {POINT_BUY_TOTAL} pontos (máximo 18 antes da espécie).</span>
          <span className={`counter ${spent === POINT_BUY_TOTAL ? 'ok' : spent > POINT_BUY_TOTAL ? 'over' : ''}`}>{POINT_BUY_TOTAL - spent} pontos restantes</span>
        </div>
      )}
      {method === 'array' && <p className="small muted">Distribua 15, 14, 13, 12, 10 e 8 entre as habilidades.</p>}
      {method === 'roll' && (
        <div className="stack" style={{ marginBottom: 12 }}>
          <div className="row">
            <button className="btn yellow" onClick={rollPool}>{pool.length ? 'Rolar de novo' : 'Rolar 6 valores'}</button>
            <div className="pool">
              {pool.map((v, i) => <span key={i} className={`pool-chip ${Object.values(assign).includes(i) ? 'used' : ''}`}>{v}</span>)}
            </div>
          </div>
          {poolLow && <div className="tiny yellow">Valores muito baixos pelas regras: você pode rolar de novo.</div>}
        </div>
      )}
      {method === 'manual' && <p className="small muted">Digite os valores combinados com o mestre.</p>}

      <div className="abilities">
        {ABILITIES.map((a) => {
          const v = data.base[a.id];
          const spMod = d.sp?.mods?.[a.id] ?? 0;
          return (
            <div key={a.id} className="ability">
              <div className="abbr">{a.name}</div>
              {method === 'pointbuy' && (
                <>
                  <div className="score">{v}</div>
                  <div className="adj">
                    <button className="btn sm icon" disabled={v <= 8} onClick={() => set({ base: { ...data.base, [a.id]: v - 1 } })}>−</button>
                    <button className="btn sm icon" disabled={v >= 18 || POINT_BUY_COST[v + 1] - POINT_BUY_COST[v] > POINT_BUY_TOTAL - spent} onClick={() => set({ base: { ...data.base, [a.id]: v + 1 } })}>+</button>
                  </div>
                </>
              )}
              {(method === 'array' || method === 'roll') && (
                <select value={assign[a.id] ?? ''} onChange={(e) => assignFromPool(a.id, e.target.value)} style={{ width: '100%', margin: '6px 0' }} disabled={!pool.length}>
                  <option value="">—</option>
                  {pool.map((pv, i) => <option key={i} value={i}>{pv}{Object.entries(assign).some(([k, idx]) => idx === i && k !== a.id) ? ' (usado)' : ''}</option>)}
                </select>
              )}
              {method === 'manual' && (
                <input type="number" value={v} style={{ width: '100%', textAlign: 'center', margin: '6px 0' }} onChange={(e) => set({ base: { ...data.base, [a.id]: Number(e.target.value) || 0 } })} />
              )}
              {spMod !== 0 && <div className={`species-mod ${spMod > 0 ? 'green-text' : 'red-text'}`}>{spMod > 0 ? '+' : ''}{spMod} espécie</div>}
              <div className="tiny muted" style={{ marginTop: 4 }}>Final <b style={{ color: 'var(--text)' }}>{d.scores[a.id]}</b> <span className="mod">{fmtMod(d.mods[a.id])}</span></div>
            </div>
          );
        })}
      </div>
      {d.cls && <div className="tiny muted" style={{ marginTop: 12 }}>Dica: {d.cls.name} usa mais {d.cls.keyAbilities}.</div>}
    </Panel>
  );
}

function StepSkills({ data, set, d }) {
  const chosen = data.trainedSkills || [];
  if (!d.cls) return <Panel title="Perícias"><div className="empty">Escolha uma classe primeiro.</div></Panel>;
  const toggle = (name) => set({ trainedSkills: chosen.includes(name) ? chosen.filter((s) => s !== name) : chosen.length >= d.trainedSlots ? chosen : [...chosen, name] });
  const cond = d.sp?.conditionalFeat;
  return (
    <Panel title="Perícias treinadas" aside={<span className={`counter ${chosen.length === d.trainedSlots ? 'ok' : ''}`}>{chosen.length}/{d.trainedSlots}</span>}>
      <p className="small muted">{d.cls.name}: {d.cls.trainedSkills} + mod. Int ({fmtMod(d.mods.int)}){d.sp?.bonusSkill ? ' + 1 (humano)' : ''}. Treinado = +5 no teste.</p>
      {cond && <div className="info-box small" style={{ marginBottom: 12 }}>Treinando <b>{cond.skill}</b>, seu {d.sp.name} ganha <b>{cond.feat}</b> de graça.</div>}
      <div className="pick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {d.skills.filter((s) => s.classSkill).map((s) => {
          const on = chosen.includes(s.name);
          return (
            <button key={s.name} className={`pick ${on ? 'selected' : ''} ${!on && chosen.length >= d.trainedSlots ? 'disabled' : ''}`} onClick={() => toggle(s.name)}>
              <div className="row between" style={{ flexWrap: 'nowrap' }}>
                <h3 style={{ margin: 0 }}>{s.name}</h3>
                <span className="mono" style={{ color: on ? 'var(--saber-green)' : 'var(--muted)' }}>{fmtMod(s.mod + (on ? 0 : 5))}</span>
              </div>
              <div className="desc">{s.ability.toUpperCase()}{s.trainedOnly ? ' · só treinado' : ''}</div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function StepFeats({ data, set, d }) {
  const chosen = data.feats || [];
  return (
    <Panel title="Talentos" aside={<span className={`counter ${chosen.length === d.featSlots ? 'ok' : chosen.length > d.featSlots ? 'over' : ''}`}>{chosen.length}/{d.featSlots}</span>}>
      <p className="small muted">No 1º nível você escolhe 1 talento{d.sp?.bonusFeat ? ' + 1 bônus por ser humano' : ''}. Os talentos abaixo já vêm de graça:</p>
      <div className="row" style={{ gap: 6, marginBottom: 14 }}>
        {d.autoFeats.map((f, i) => <span key={i} className="tag blue">{f}</span>)}
      </div>
      {d.cls?.id === 'jedi' && !chosen.includes('Treinamento da Força') && (
        <div className="info-box small" style={{ marginBottom: 12 }}>Jedi só aprendem poderes da Força com o talento <b>Treinamento da Força</b>. Quase todo Jedi pega no 1º nível.
          <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => set({ feats: [...chosen, 'Treinamento da Força'] })}>Pegar agora</button>
        </div>
      )}
      <div className="list">
        {chosen.map((f, i) => (
          <div key={i} className="list-row">
            <div className="name">{f}</div>
            <button className="btn sm ghost red" onClick={() => set({ feats: chosen.filter((_, j) => j !== i) })}>Remover</button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}><FeatPicker d={d} data={data} onAdd={(f) => set({ feats: [...chosen, f] })} /></div>
    </Panel>
  );
}

function StepTalent({ data, set, d }) {
  const talents = data.talents || [];
  if (!d.cls) return <Panel title="Aptidão"><div className="empty">Escolha uma classe primeiro.</div></Panel>;
  const trees = d.cls.trees;
  return (
    <Panel title="Aptidão de 1º nível" aside={<span className={`counter ${talents.length === d.talentSlots ? 'ok' : ''}`}>{talents.length}/{d.talentSlots}</span>}>
      <p className="small muted">Escolha uma aptidão das árvores de {d.cls.name}{d.forceSensitive ? ' ou das árvores da Força' : ''}.</p>
      {trees.map((tree) => (
        <div key={tree.name} style={{ marginBottom: 16 }}>
          <h3 className="yellow">{tree.name}</h3>
          <div className="pick-grid">
            {tree.talents.map(([name, desc, prereq = []]) => {
              const on = talents.includes(name);
              const ok = prereq.every((r) => meetsPrereq(r, d, data));
              return (
                <button key={name} style={{ '--pc': d.cls.color }} className={`pick ${on ? 'selected' : ''} ${!ok ? 'disabled' : ''}`}
                  onClick={() => ok && set({ talents: on ? talents.filter((t) => t !== name) : talents.length >= d.talentSlots ? [name] : [...talents, name] })}>
                  <h3>{name}</h3>
                  <div className="desc">{desc}</div>
                  {prereq.length > 0 && <div className="tiny dim" style={{ marginTop: 6 }}>Requer: {prereq.join(', ')}</div>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {d.forceSensitive && (
        <details>
          <summary className="small muted" style={{ cursor: 'pointer' }}>Aptidões da Força</summary>
          <div style={{ marginTop: 10 }}><TalentPicker d={d} data={data} onAdd={(t) => set({ talents: talents.length >= d.talentSlots ? [t] : [...talents, t] })} /></div>
        </details>
      )}
    </Panel>
  );
}

function StepForce({ data, set, d }) {
  const powers = data.forcePowers || [];
  return (
    <Panel title="Poderes da Força" aside={<span className={`counter ${powers.length === d.powerSlots ? 'ok' : powers.length > d.powerSlots ? 'over' : ''}`}>{powers.length}/{d.powerSlots}</span>}>
      {d.powerSlots === 0 ? (
        <div className="empty">Sem o talento <b>Treinamento da Força</b> você ainda não conhece poderes. Volte ao passo Talentos se quiser.</div>
      ) : (
        <p className="small muted">Treinamento da Força: 1 + mod. Sab ({fmtMod(d.mods.sab)}) poderes. Pode escolher o mesmo poder mais de uma vez para ter usos extras.</p>
      )}
      <div className="pick-grid">
        {FORCE_POWERS.map((p) => {
          const count = powers.filter((x) => x === p.name).length;
          const dark = p.tags.includes('Lado Sombrio');
          return (
            <div key={p.name} className={`pick ${count ? 'selected' : ''}`} style={{ '--pc': dark ? 'var(--sith-red)' : 'var(--saber-blue)', cursor: 'default' }}>
              <div className="row between" style={{ flexWrap: 'nowrap' }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                {count > 0 && <span className="tag blue">×{count}</span>}
              </div>
              <div className="desc">{p.desc}</div>
              <div className="mods">{p.tags.map((t) => <span key={t} className={`tag ${t === 'Lado Sombrio' ? 'red' : 'blue'}`}>{t}</span>)}<span className="tag">{p.time}</span></div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm pm" disabled={d.powerSlots === 0} onClick={() => set({ forcePowers: [...powers, p.name] })}>+</button>
                <button className="btn sm pm" disabled={!count} onClick={() => { const i = powers.lastIndexOf(p.name); set({ forcePowers: powers.filter((_, j) => j !== i) }); }}>−</button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function StepGear({ data, set, d }) {
  const [tab, setTab] = useState('armas');
  if (!d.cls) return <Panel title="Equipamento"><div className="empty">Escolha uma classe primeiro.</div></Panel>;
  const rollCredits = () => {
    const r = rollDice(d.cls.credits.dice);
    sfx.roll();
    set({ credits: r.total * d.cls.credits.mult, creditsRolled: true, creditsRoll: r.total });
  };
  const buy = (patch, cost) => set({ ...patch, credits: (data.credits || 0) - cost });
  const weapons = data.weapons || [];
  const gear = data.gear || [];
  return (
    <Panel title="Créditos & equipamento">
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <div className="kicker">Créditos ({d.cls.credits.dice} × {d.cls.credits.mult})</div>
          <div className="yellow" style={{ fontFamily: 'var(--font-head)', fontSize: '1.8rem' }}>{(data.credits || 0).toLocaleString('pt-BR')}</div>
          {data.creditsRolled && <div className="tiny muted">Rolou {data.creditsRoll} no {d.cls.credits.dice}</div>}
        </div>
        <button className="btn yellow" onClick={rollCredits} disabled={data.creditsRolled}>{data.creditsRolled ? 'Créditos rolados' : 'Rolar créditos'}</button>
      </div>
      {d.cls.startingGear && <div className="info-box small" style={{ marginBottom: 12 }}>Como {d.cls.name}, você recebe de graça: <b>{d.cls.startingGear.join(', ')}</b>.</div>}
      {d.sp?.id === 'keldor' && <div className="info-box small" style={{ marginBottom: 12 }}>Kel Dor começam com máscara antioxidante e óculos sem custo.</div>}

      <div className="tabs">
        {[['armas', 'Armas'], ['armadura', 'Armadura'], ['itens', 'Itens']].map(([id, l]) => <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{l}</button>)}
      </div>

      {tab === 'armas' && (
        <div className="list">
          {Object.entries(WEAPON_GROUPS).map(([g, label]) => (
            <div key={g}>
              <div className="kicker" style={{ margin: '10px 0 4px' }}>{label}</div>
              {WEAPONS.filter((w) => w.group === g && w.name !== 'Desarmado').map((w) => {
                const owned = weapons.filter((x) => x.name === w.name).length;
                return (
                  <div key={w.name} className="list-row">
                    <div>
                      <div className="name">{w.name} {owned > 0 && <span className="tag green">×{owned}</span>}</div>
                      <div className="sub">{w.damage} · {w.cost.toLocaleString('pt-BR')} cr{w.notes ? ` · ${w.notes}` : ''}</div>
                    </div>
                    <div className="row">
                      {owned > 0 && <button className="btn sm ghost" onClick={() => { const i = weapons.findIndex((x) => x.name === w.name); buy({ weapons: weapons.filter((_, j) => j !== i) }, -w.cost); }}>Vender</button>}
                      <button className="btn sm" disabled={(data.credits || 0) < w.cost} onClick={() => buy({ weapons: [...weapons, { ...w, uid: crypto.randomUUID() }] }, w.cost)}>Comprar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'armadura' && (
        <div className="list">
          {ARMORS.map((a) => {
            const on = data.armor === a.name;
            const current = ARMORS.find((x) => x.name === data.armor);
            const delta = a.cost - (current?.cost ?? 0);
            return (
              <div key={a.name} className="list-row">
                <div>
                  <div className="name">{a.name} <span className="tag">{a.category}</span> {on && <span className="tag green">vestindo</span>}</div>
                  <div className="sub">Ref +{a.ref}{a.fort ? ` · Fort +${a.fort}` : ''} · Des máx +{a.maxDex} · {a.cost.toLocaleString('pt-BR')} cr{!d.has(`Proficiência em Armadura (${a.category})`) ? ' · sem proficiência' : ''}</div>
                </div>
                {on
                  ? <button className="btn sm ghost" onClick={() => buy({ armor: null }, -a.cost)}>Vender</button>
                  : <button className="btn sm" disabled={(data.credits || 0) < delta} onClick={() => buy({ armor: a.name }, delta)}>Comprar</button>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'itens' && (
        <div className="list">
          {GEAR.map((g) => {
            const owned = gear.find((x) => x.name === g.name)?.qty ?? 0;
            return (
              <div key={g.name} className="list-row">
                <div>
                  <div className="name">{g.name} {owned > 0 && <span className="tag green">×{owned}</span>}</div>
                  <div className="sub">{g.cost.toLocaleString('pt-BR')} cr</div>
                </div>
                <div className="row">
                  {owned > 0 && <button className="btn sm ghost pm" onClick={() => buy({ gear: gear.map((x) => (x.name === g.name ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0) }, -g.cost)}>−</button>}
                  <button className="btn sm" disabled={(data.credits || 0) < g.cost} onClick={() => buy({ gear: owned ? gear.map((x) => (x.name === g.name ? { ...x, qty: x.qty + 1 } : x)) : [...gear, { name: g.name, qty: 1 }] }, g.cost)}>Comprar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function StepReview({ data, set, d, campaigns, campaignId, setCampaignId }) {
  const langs = data.languages?.length ? data.languages : d.sp?.languages ?? [];
  const extraLangs = d.languageSlots - langs.length;
  const warnings = [];
  if (!data.name) warnings.push('Dê um nome ao personagem.');
  if ((data.trainedSkills || []).length < d.trainedSlots) warnings.push(`Faltam ${d.trainedSlots - data.trainedSkills.length} perícia(s) treinada(s).`);
  if ((data.feats || []).length < d.featSlots) warnings.push(`Falta(m) ${d.featSlots - data.feats.length} talento(s).`);
  if ((data.talents || []).length < d.talentSlots) warnings.push('Falta escolher a aptidão.');
  if (d.powerSlots && (data.forcePowers || []).length < d.powerSlots) warnings.push(`Faltam ${d.powerSlots - data.forcePowers.length} poder(es) da Força.`);
  if (!data.creditsRolled) warnings.push('Você ainda não rolou os créditos iniciais.');

  return (
    <Panel title="Revisão final">
      {warnings.length > 0 ? (
        <div className="info-box small" style={{ marginBottom: 14 }}>
          <b className="yellow">Pendências</b> (dá para concluir e ajustar depois na ficha):
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      ) : <div className="info-box small green-text" style={{ marginBottom: 14 }}>Tudo pronto. Que a Força esteja com você!</div>}

      <div className="grid grid-2">
        <label className="field">Nome<input value={data.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <label className="field">Planeta natal<input value={data.details?.homeworld ?? ''} onChange={(e) => set({ details: { ...data.details, homeworld: e.target.value } })} /></label>
        <label className="field">Idade<input value={data.details?.age ?? ''} onChange={(e) => set({ details: { ...data.details, age: e.target.value } })} /></label>
        <label className="field">Aparência<input value={data.details?.appearance ?? ''} onChange={(e) => set({ details: { ...data.details, appearance: e.target.value } })} /></label>
      </div>
      <label className="field" style={{ marginTop: 12 }}>História<textarea value={data.details?.background ?? ''} onChange={(e) => set({ details: { ...data.details, background: e.target.value } })} /></label>

      <h3 style={{ marginTop: 16 }}>Linguagens</h3>
      <div className="row" style={{ gap: 6 }}>
        {langs.map((l) => <span key={l} className="tag">{l}{!d.sp?.languages.includes(l) && <button onClick={() => set({ languages: langs.filter((x) => x !== l) })}>×</button>}</span>)}
        {extraLangs > 0 && (
          <select value="" onChange={(e) => e.target.value && set({ languages: [...langs, e.target.value] })}>
            <option value="">+ {extraLangs} linguagem(ns) extra(s)</option>
            {LANGUAGES.filter((l) => !langs.includes(l)).map((l) => <option key={l}>{l}</option>)}
          </select>
        )}
      </div>

      <h3 style={{ marginTop: 16 }}>Campanha</h3>
      {campaigns.length ? (
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={{ width: '100%' }}>
          <option value="">Nenhuma por enquanto</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      ) : <div className="small muted">Você ainda não entrou em nenhuma campanha. Dá para vincular a ficha depois, pela página da campanha.</div>}
    </Panel>
  );
}
