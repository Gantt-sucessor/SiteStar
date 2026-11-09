import { useMemo, useState } from 'react';
import { ABILITIES, CONDITION_TRACK, SKILLS, WEAPONS, ARMORS, WEAPON_GROUPS } from '../data/rules';
import { BESTIARY } from '../data/bestiary';
import { abilityMod } from '../lib/character';
import { fmtMod, d20Formula } from '../lib/dice';
import { sendRoll } from '../lib/rolls';
import { toNpc, blankNpc, buildNonheroic, XP_BY_ND } from '../lib/npcs';
import { Panel } from './Sheet';

const CATEGORIES = [
  ['todos', 'Todos'], ['arquetipo', 'Arquétipos'], ['personagem', 'Personagens dos filmes'], ['droide', 'Dróides'], ['besta', 'Bestas'],
];

const condPenalty = (n) => CONDITION_TRACK[n.condition || 0]?.penalty ?? 0;
export const npcHp = (n) => ({ max: Number(n.hp) || 1, cur: n.hpCurrent ?? (Number(n.hp) || 1) });

function npcRoll(npc, campaignId, secret, formula, label, kind = 'check', extra) {
  return sendRoll({ formula, label, kind, campaignId, character: { id: null, name: npc.name }, hidden: secret, extra });
}

function HpControl({ npc, onChange, compact }) {
  const [delta, setDelta] = useState('');
  const { max, cur } = npcHp(npc);
  const pct = Math.max(0, Math.min(100, (cur / max) * 100));
  const apply = (sign) => {
    const n = Math.abs(parseInt(delta, 10));
    if (!n) return;
    const next = Math.max(0, Math.min(max, cur + sign * n));
    const patch = { hpCurrent: next };
    if (sign < 0 && n >= (Number(npc.threshold) || 999)) patch.condition = Math.min(5, (npc.condition || 0) + 1);
    if (next === 0) patch.condition = 5;
    onChange(patch);
    setDelta('');
  };
  return (
    <div>
      <div className={`bar ${pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}`} style={compact ? { height: 16 } : undefined}>
        <i style={{ width: `${pct}%` }} /><span style={compact ? { lineHeight: '14px', fontSize: '0.72rem' } : undefined}>{cur}/{max}</span>
      </div>
      <div className="row" style={{ marginTop: 6, flexWrap: 'nowrap', gap: 6 }}>
        <input type="number" min="0" placeholder="Qtd" value={delta} onChange={(e) => setDelta(e.target.value)} style={{ flex: 1, width: 'auto', padding: '4px 8px' }}
          onKeyDown={(e) => { if (e.key === 'Enter') apply(-1); }} />
        <button className="btn sm red" onClick={() => apply(-1)}>Dano</button>
        <button className="btn sm green" onClick={() => apply(1)}>Curar</button>
      </div>
    </div>
  );
}

function ConditionTrack({ value = 0, onChange }) {
  return (
    <div className="condition">
      {CONDITION_TRACK.map((c) => (
        <button key={c.step} className={`s${c.step} ${value === c.step ? 'on' : ''}`} onClick={() => onChange(c.step)} title={c.label}>
          {c.step === 0 ? 'OK' : c.step === 5 ? '✖' : c.penalty}
        </button>
      ))}
    </div>
  );
}

// Card compacto para a área "Em cena" da mesa
export function NpcCard({ row, onChange, onOpen, onRemoveFromScene, campaignId, secret }) {
  const n = row.data;
  const cp = condPenalty(n);
  const down = (n.condition || 0) >= 5;
  const r = (f, l, k) => npcRoll(n, campaignId, secret, f, l, k);
  return (
    <div className={`panel red ${down ? '' : ''}`} style={{ padding: 12, opacity: down ? 0.55 : 1 }}>
      <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
          <div className="cname" style={{ color: 'var(--blaster-red)' }}>{n.name}</div>
          <div className="tiny muted">ND {n.nd} · Ref {n.defenses.ref + cp} · Fort {n.defenses.fort + cp} · Von {n.defenses.von + cp} · Limiar {n.threshold}{n.dr ? ` · RD ${n.dr}` : ''}</div>
        </div>
        <button className="btn sm ghost icon" title="Tirar de cena" onClick={onRemoveFromScene}>✕</button>
      </div>
      <div style={{ marginTop: 8 }}><HpControl npc={n} compact onChange={(p) => onChange({ data: p })} /></div>
      <div className="row" style={{ marginTop: 8, gap: 4 }}>
        <button className="roll-chip" title="Iniciativa" onClick={() => r(d20Formula(n.init + cp), 'Iniciativa', 'initiative')}>Ini {fmtMod(n.init + cp)}</button>
        {n.perception != null && <button className="roll-chip" title="Percepção" onClick={() => r(d20Formula(n.perception + cp), 'Percepção', 'skill')}>Per {fmtMod(n.perception + cp)}</button>}
        {dedupeAttacks(n.attacks).slice(0, 3).map((a, i) => (
          <span key={i} className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
            <button className="roll-chip" title={`Ataque — ${a.name}`} onClick={() => r(d20Formula(a.bonus + cp), `Ataque — ${a.name}`, 'attack')}>{shortName(a.name)} {fmtMod(a.bonus + cp)}</button>
            {a.damage && <button className="roll-chip red" title={`Dano — ${a.name}`} onClick={() => r(a.damage, `Dano — ${a.name}`, 'damage')}>{a.damage}</button>}
          </span>
        ))}
      </div>
      {(n.condition || 0) > 0 && <div className="tiny red-text" style={{ marginTop: 6 }}>Condição: {CONDITION_TRACK[n.condition].label}</div>}
    </div>
  );
}

const shortName = (s) => (s.length > 14 ? `${s.slice(0, 12)}…` : s);
function dedupeAttacks(list = []) {
  const seen = new Set();
  return list.filter((a) => {
    const k = `${a.name}|${a.bonus}|${a.damage}`;
    if (seen.has(k) || (a.notes && /^com /.test(a.notes))) return false;
    seen.add(k);
    return true;
  });
}

// Ficha completa (bloco de estatísticas) com edição e rolagens
export function NpcSheet({ row, onChange, campaignId, secret }) {
  const n = row.data;
  const [edit, setEdit] = useState(false);
  const cp = condPenalty(n);
  const set = (patch) => onChange({ data: patch });
  const r = (f, l, k, extra) => npcRoll(n, campaignId, secret, f, l, k, extra);
  const num = (v) => (v === '' ? '' : Number(v));

  const field = (k, label, area) => (
    <label className="field" style={{ marginTop: 8 }}>{label}
      {area
        ? <textarea value={n[k] || ''} onChange={(e) => set({ [k]: e.target.value })} style={{ minHeight: 60 }} />
        : <input value={n[k] ?? ''} onChange={(e) => set({ [k]: e.target.value })} />}
    </label>
  );
  const line = (label, value, key) => (value ? <div key={key ?? label} className="small" style={{ marginTop: 4 }}><b className="yellow">{label}</b> <span className="muted">{value}</span></div> : null);

  return (
    <div>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {edit
            ? <input className="sheet-name" value={n.name} onChange={(e) => set({ name: e.target.value })} style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', color: 'var(--blaster-red)', width: '100%' }} />
            : <h2 style={{ color: 'var(--blaster-red)', margin: 0 }}>{n.name}</h2>}
          <div className="small muted">{n.type} · <b className="yellow">ND {n.nd}</b> ({XP_BY_ND(n.nd).toLocaleString('pt-BR')} XP){n.source === 'livro' ? ' · ficha do livro' : ''}</div>
        </div>
        <div className="row">
          <label className="check small"><input type="checkbox" checked={row.in_scene} onChange={(e) => onChange({ in_scene: e.target.checked })} /> Em cena</label>
          <button className={`btn sm ${edit ? 'yellow primary' : ''}`} onClick={() => setEdit((x) => !x)}>{edit ? 'Concluir edição' : 'Editar'}</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 16, marginTop: 14 }}>
        <div className="stack" style={{ gap: 12 }}>
          <HpControl npc={n} onChange={set} />
          <div>
            <div className="kicker" style={{ marginBottom: 4 }}>Curso da condição</div>
            <ConditionTrack value={n.condition || 0} onChange={(v) => set({ condition: v })} />
          </div>
          <div className="stat-grid">
            {[['ref', 'Reflexo'], ['fort', 'Fortitude'], ['von', 'Vontade']].map(([k, l]) => (
              <div key={k} className="stat"><div className="k">{l}</div>
                {edit ? <input type="number" value={n.defenses[k]} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => set({ defenses: { ...n.defenses, [k]: num(e.target.value) } })} />
                  : <div className="v">{n.defenses[k] + cp}</div>}
              </div>
            ))}
            <div className="stat"><div className="k">Limiar</div>{edit ? <input type="number" value={n.threshold} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => set({ threshold: num(e.target.value) })} /> : <div className="v">{n.threshold}</div>}</div>
            <div className="stat"><div className="k">PV máx</div>{edit ? <input type="number" value={n.hp} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => set({ hp: num(e.target.value) })} /> : <div className="v">{n.hp}</div>}</div>
            <div className="stat"><div className="k">ND</div>{edit ? <input type="number" value={n.nd} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => set({ nd: num(e.target.value) })} /> : <div className="v">{n.nd}</div>}</div>
          </div>
          {n.defenseNotes && <div className="tiny muted">Defesas: {n.defenseNotes}</div>}
          <div className="stat-grid">
            <div className="stat clickable" onClick={() => r(d20Formula(n.init + cp), 'Iniciativa', 'initiative')}><div className="k">Iniciativa</div>
              {edit ? <input type="number" value={n.init} onClick={(e) => e.stopPropagation()} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => set({ init: num(e.target.value) })} /> : <div className="v">{fmtMod(n.init + cp)}</div>}
            </div>
            <div className="stat clickable" onClick={() => n.perception != null && r(d20Formula(n.perception + cp), 'Percepção', 'skill')}><div className="k">Percepção</div>
              {edit ? <input type="number" value={n.perception ?? ''} onClick={(e) => e.stopPropagation()} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => set({ perception: e.target.value === '' ? null : Number(e.target.value) })} /> : <div className="v">{n.perception != null ? fmtMod(n.perception + cp) : '—'}</div>}
            </div>
            <div className="stat"><div className="k">BBA</div>{edit ? <input type="number" value={n.bab} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => set({ bab: num(e.target.value) })} /> : <div className="v">{fmtMod(n.bab)}</div>}</div>
          </div>
          <div className="abilities" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {ABILITIES.map((a) => {
              const v = n.abilities?.[a.id];
              const m = v == null ? null : abilityMod(v);
              return (
                <div key={a.id} className={`ability ${m != null && !edit ? 'clickable' : ''}`} style={{ padding: '6px 2px' }}
                  onClick={() => !edit && m != null && r(d20Formula(m + cp), `Teste de ${a.name}`)}>
                  <div className="abbr">{a.short}</div>
                  {edit ? <input type="number" value={v ?? ''} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => set({ abilities: { ...n.abilities, [a.id]: e.target.value === '' ? null : Number(e.target.value) } })} />
                    : <><div className="score" style={{ fontSize: '1.1rem' }}>{v ?? '—'}</div><div className="mod" style={{ fontSize: '0.8rem' }}>{m != null ? fmtMod(m) : ''}</div></>}
                </div>
              );
            })}
          </div>
          <div className="small muted">Velocidade: {edit ? <input value={n.speed} onChange={(e) => set({ speed: e.target.value })} /> : n.speed}{n.space ? ` · ${n.space}` : ''}</div>
          {(n.forcePoints > 0 || n.darkSide > 0 || n.destiny > 0) && (
            <div className="row" style={{ gap: 6 }}>
              {n.forcePoints > 0 && <span className="tag blue">Pontos de Força {n.forcePoints}</span>}
              {n.destiny > 0 && <span className="tag yellow">Destino {n.destiny}</span>}
              {n.darkSide > 0 && <span className="tag red">Lado Sombrio {n.darkSide}</span>}
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 12 }}>
          <div>
            <h3 className="yellow" style={{ marginBottom: 6 }}>Ataques</h3>
            <div className="list">
              {(n.attacks || []).map((a, i) => (
                <div key={i} className="list-row">
                  {edit ? (
                    <div className="row" style={{ gap: 6 }}>
                      <input value={a.name} style={{ width: 150 }} onChange={(e) => set({ attacks: n.attacks.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                      <input type="number" value={a.bonus} style={{ width: 64 }} onChange={(e) => set({ attacks: n.attacks.map((x, j) => (j === i ? { ...x, bonus: Number(e.target.value) || 0 } : x)) })} />
                      <input value={a.damage} style={{ width: 90 }} onChange={(e) => set({ attacks: n.attacks.map((x, j) => (j === i ? { ...x, damage: e.target.value } : x)) })} />
                      <input value={a.notes} placeholder="notas" style={{ width: 140 }} onChange={(e) => set({ attacks: n.attacks.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)) })} />
                    </div>
                  ) : (
                    <div>
                      <div className="name">{a.name} <span className="tiny dim">{a.melee ? 'corpo a corpo' : 'à distância'}</span></div>
                      {a.notes && <div className="sub">{a.notes}</div>}
                    </div>
                  )}
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <button className="roll-chip" onClick={() => r(d20Formula(a.bonus + cp), `Ataque — ${a.name}`, 'attack')}>{fmtMod(a.bonus + cp)}</button>
                    {a.damage && <button className="roll-chip red" onClick={() => r(a.damage, `Dano — ${a.name}`, 'damage')}>{a.damage}</button>}
                    {edit && <button className="btn sm ghost red" onClick={() => set({ attacks: n.attacks.filter((_, j) => j !== i) })}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
            {edit && <button className="btn sm" style={{ marginTop: 6 }} onClick={() => set({ attacks: [...(n.attacks || []), { name: 'ataque', bonus: 0, damage: '1d6', melee: true, notes: '' }] })}>+ Ataque</button>}
          </div>

          <div>
            <h3 className="yellow" style={{ marginBottom: 6 }}>Perícias</h3>
            <div className="row" style={{ gap: 6 }}>
              {n.useTheForce != null && <button className="roll-chip" onClick={() => r(d20Formula(n.useTheForce + cp), 'Usar a Força', 'force')}>Usar a Força {fmtMod(n.useTheForce + cp)}</button>}
              {(n.skills || []).filter((s) => s.name !== 'Usar a Força').map((s, i) => (
                <span key={i} className="row" style={{ gap: 2 }}>
                  <button className="roll-chip" title={s.notes} onClick={() => r(d20Formula(s.mod + cp), s.name, s.name === 'Iniciativa' ? 'initiative' : 'skill')}>{s.name} {fmtMod(s.mod + cp)}</button>
                  {edit && <button className="btn sm ghost red" onClick={() => set({ skills: n.skills.filter((_, j) => j !== i) })}>✕</button>}
                </span>
              ))}
            </div>
            {edit && <SkillAdder onAdd={(s) => set({ skills: [...(n.skills || []), s] })} />}
          </div>

          {edit ? (
            <div>
              {field('powers', 'Poderes da Força', true)}
              <label className="field" style={{ marginTop: 8 }}>Modificador de Usar a Força (vazio = não usa)
                <input type="number" value={n.useTheForce ?? ''} onChange={(e) => set({ useTheForce: e.target.value === '' ? null : Number(e.target.value) })} />
              </label>
              {field('options', 'Opções de ataque / ações especiais', true)}
              {field('talents', 'Aptidões', true)}
              {field('feats', 'Talentos', true)}
              {field('gear', 'Posses', true)}
              {field('languages', 'Linguagens')}
              {field('immune', 'Imunidades')}
              {field('weakness', 'Fraquezas')}
            </div>
          ) : (
            <div>
              {line('Poderes da Força:', n.powers)}
              {line('Segredos:', n.secrets)}
              {line('Técnicas:', n.techniques)}
              {line('Opções:', n.options)}
              {line('Aptidões:', n.talents)}
              {line('Talentos:', n.feats)}
              {line('Posses:', n.gear)}
              {line('Linguagens:', n.languages)}
              {line('Sentidos:', n.senses)}
              {line('Imune:', n.immune)}
              {line('Fraqueza:', n.weakness)}
              {(n.specials || []).map((s) => line(`${s.name}:`, s.text, s.name))}
            </div>
          )}
          <label className="field">Anotações do mestre
            <textarea value={n.notes || ''} onChange={(e) => set({ notes: e.target.value })} style={{ minHeight: 70 }} placeholder="Personalidade, objetivos, táticas..." />
          </label>
        </div>
      </div>
    </div>
  );
}

function SkillAdder({ onAdd }) {
  const [name, setName] = useState('');
  const [mod, setMod] = useState('');
  return (
    <div className="row" style={{ marginTop: 6, flexWrap: 'nowrap' }}>
      <select value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }}>
        <option value="">Perícia...</option>
        {SKILLS.map((s) => <option key={s.name}>{s.name}</option>)}
      </select>
      <input type="number" placeholder="+mod" value={mod} onChange={(e) => setMod(e.target.value)} style={{ width: 80 }} />
      <button className="btn sm" disabled={!name} onClick={() => { onAdd({ name, mod: Number(mod) || 0, notes: '' }); setName(''); setMod(''); }}>Adicionar</button>
    </div>
  );
}

// Escolher fichas prontas do livro
export function BestiaryPicker({ onAdd, onClose }) {
  const [cat, setCat] = useState('todos');
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(null);
  const [qty, setQty] = useState(1);
  const [scene, setScene] = useState(true);
  const list = useMemo(() => BESTIARY
    .filter((b) => cat === 'todos' || b.category === cat)
    .filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.type.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nd - b.nd || a.name.localeCompare(b.name)), [cat, q]);

  const add = () => {
    const base = pick.name.replace(/ \(Episódio [IVX]+\)$/, '');
    const items = Array.from({ length: qty }, (_, i) => toNpc(pick, qty > 1 ? `${base} ${i + 1}` : base));
    onAdd(items, scene);
  };

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel red" style={{ width: 'min(1100px, 100%)' }}>
        <div className="panel-title"><span>Fichas prontas do livro</span><button className="btn sm ghost" onClick={onClose}>✕</button></div>
        <div className="row" style={{ marginBottom: 10 }}>
          <input placeholder="Buscar (stormtrooper, wampa, Vader...)" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} autoFocus />
          {CATEGORIES.map(([id, l]) => <button key={id} className={`btn sm ${cat === id ? 'red primary' : ''}`} onClick={() => setCat(id)}>{l}</button>)}
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14 }}>
          <div className="list" style={{ maxHeight: 460, overflowY: 'auto' }}>
            {list.map((b) => (
              <div key={b.name} className="list-row" style={{ cursor: 'pointer', background: pick?.name === b.name ? 'rgba(255,64,64,0.08)' : undefined }} onClick={() => setPick(b)}>
                <div>
                  <div className="name">{b.name}</div>
                  <div className="sub">{b.type}</div>
                </div>
                <span className="tag red">ND {b.nd}</span>
              </div>
            ))}
          </div>
          <div>
            {!pick ? <div className="empty small">Escolha uma ficha para ver os detalhes.</div> : (
              <div className="stack">
                <div>
                  <h3 style={{ color: 'var(--blaster-red)', margin: 0 }}>{pick.name}</h3>
                  <div className="tiny muted">{pick.type} · ND {pick.nd}</div>
                </div>
                <div className="small">
                  PV <b>{pick.hp}</b> · Limiar <b>{pick.threshold}</b> · Ref <b>{pick.defenses.ref}</b> · Fort <b>{pick.defenses.fort}</b> · Von <b>{pick.defenses.von}</b> · Ini <b>{fmtMod(pick.init)}</b>
                </div>
                <div className="small muted">{dedupeAttacks(pick.attacks).map((a) => `${a.name} ${fmtMod(a.bonus)} (${a.damage || '—'})`).join(' · ')}</div>
                {pick.powers && <div className="tiny muted"><b>Poderes:</b> {pick.powers}</div>}
                {pick.specials?.map((s) => <div key={s.name} className="tiny muted"><b>{s.name}:</b> {s.text}</div>)}
                <div className="row" style={{ marginTop: 6 }}>
                  <label className="field" style={{ width: 90 }}>Quantidade<input type="number" min="1" max="20" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label>
                  <label className="check small" style={{ marginTop: 16 }}><input type="checkbox" checked={scene} onChange={(e) => setScene(e.target.checked)} /> Já colocar em cena</label>
                </div>
                <button className="btn red primary" onClick={add}>Adicionar {qty > 1 ? `${qty}× ` : ''}{pick.name.replace(/ \(Episódio [IVX]+\)$/, '')}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Gerador de personagem não heróico pelas regras do livro
export function NpcBuilder({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: 'Capanga', species: 'Humano', level: 2,
    abilities: { vig: 12, des: 12, con: 10, int: 10, sab: 10, car: 8 },
    armor: '', weapons: ['Pistola blaster'], trained: ['Percepção'],
  });
  const [qty, setQty] = useState(1);
  const preview = buildNonheroic(form);
  const toggle = (key, v) => setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const blank = () => onAdd([toNpc(blankNpc())], false);

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel red" style={{ width: 'min(1000px, 100%)' }}>
        <div className="panel-title"><span>Criar NPC não heróico (regras do livro, p. 277)</span><button className="btn sm ghost" onClick={onClose}>✕</button></div>
        <p className="small muted">Não heróicos ganham 1d4 PV por nível, não somam o nível nas defesas, têm BBA de ¾ e não têm aptidões nem Pontos de Força. É o tipo da maioria dos capangas, guardas e civis. Para um vilão importante, use uma ficha do livro ou crie um personagem completo.</p>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 16 }}>
          <div className="stack">
            <div className="row">
              <label className="field" style={{ flex: 1 }}>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="field" style={{ flex: 1 }}>Espécie<input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} /></label>
              <label className="field" style={{ width: 80 }}>Nível<input type="number" min="1" max="20" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} /></label>
            </div>
            <div className="abilities">
              {ABILITIES.map((a) => (
                <label key={a.id} className="ability">
                  <div className="abbr">{a.short}</div>
                  <input type="number" value={form.abilities[a.id]} style={{ width: '100%', textAlign: 'center' }} onChange={(e) => setForm({ ...form, abilities: { ...form.abilities, [a.id]: e.target.value } })} />
                </label>
              ))}
            </div>
            <label className="field">Armadura
              <select value={form.armor} onChange={(e) => setForm({ ...form, armor: e.target.value })}>
                <option value="">Sem armadura</option>
                {ARMORS.map((a) => <option key={a.name}>{a.name}</option>)}
              </select>
            </label>
            <div>
              <div className="kicker" style={{ marginBottom: 4 }}>Armas</div>
              <select value="" onChange={(e) => e.target.value && setForm({ ...form, weapons: [...form.weapons, e.target.value] })} style={{ width: '100%' }}>
                <option value="">Adicionar arma...</option>
                {Object.entries(WEAPON_GROUPS).map(([g, l]) => (
                  <optgroup key={g} label={l}>{WEAPONS.filter((w) => w.group === g && w.name !== 'Desarmado').map((w) => <option key={w.name}>{w.name}</option>)}</optgroup>
                ))}
              </select>
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                {form.weapons.map((w, i) => <span key={i} className="tag">{w}<button onClick={() => setForm({ ...form, weapons: form.weapons.filter((_, j) => j !== i) })}>×</button></span>)}
              </div>
            </div>
            <div>
              <div className="kicker" style={{ marginBottom: 4 }}>Perícias treinadas (1 + mod. Int)</div>
              <div className="row" style={{ gap: 4 }}>
                {SKILLS.filter((s) => !s.force && !s.knowledge).map((s) => (
                  <button key={s.name} className={`btn sm ${form.trained.includes(s.name) ? 'red primary' : 'ghost'}`} onClick={() => toggle('trained', s.name)}>{s.name}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="kicker">Prévia</div>
            <h3 style={{ color: 'var(--blaster-red)', margin: '4px 0' }}>{preview.name}</h3>
            <div className="tiny muted">{preview.type} · ND {preview.nd} (estimado)</div>
            <div className="small" style={{ marginTop: 8 }}>
              PV <b>{preview.hp}</b> · Limiar <b>{preview.threshold}</b><br />
              Ref <b>{preview.defenses.ref}</b> · Fort <b>{preview.defenses.fort}</b> · Von <b>{preview.defenses.von}</b><br />
              Ini <b>{fmtMod(preview.init)}</b> · Percepção <b>{fmtMod(preview.perception)}</b> · BBA <b>{fmtMod(preview.bab)}</b>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>{preview.attacks.map((a) => `${a.name} ${fmtMod(a.bonus)} (${a.damage})`).join(' · ')}</div>
            {preview.skills.length > 0 && <div className="small muted">{preview.skills.map((s) => `${s.name} ${fmtMod(s.mod)}`).join(', ')}</div>}
            <div className="row" style={{ marginTop: 12 }}>
              <label className="field" style={{ width: 90 }}>Quantidade<input type="number" min="1" max="20" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn red primary" onClick={() => onAdd(Array.from({ length: qty }, (_, i) => toNpc(preview, qty > 1 ? `${preview.name} ${i + 1}` : preview.name)), true)}>Criar e colocar em cena</button>
              <button className="btn ghost" onClick={blank}>Ficha em branco</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Panel };
