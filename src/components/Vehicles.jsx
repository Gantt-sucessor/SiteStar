import { useMemo, useState } from 'react';
import { CONDITION_TRACK } from '../data/rules';
import { VEHICLES } from '../data/vehicles';
import { VEHICLE_CATEGORIES, vehicleCategory, newVehicle, deriveVehicle, applyVehicleDamage } from '../lib/vehicles';
import { fmtMod, d20Formula } from '../lib/dice';
import { sendRoll } from '../lib/rolls';

const fmtNum = (n) => Number(n).toLocaleString('pt-BR');
const shortName = (s) => s.replace(/ \(Episódio [IVX]+\)$/, '').replace(/^Caça Estelar /, '');

// Card de um veículo: estatísticas, tripulação, rolagens e controle de dano
export function VehicleCard({ v, characters = [], canEdit, onChange, onRemove, campaignId, secret, enemy, compact }) {
  const crewChars = useMemo(() => Object.fromEntries(characters.map((c) => [c.id, c])), [characters]);
  const dv = deriveVehicle(v, crewChars);
  const [dmg, setDmg] = useState('');
  const [lastLog, setLastLog] = useState('');
  const [open, setOpen] = useState(!compact);

  const who = (operator) => (operator ? `${operator} · ${v.name}` : v.name);
  const r = (formula, label, kind, operator, extra) =>
    sendRoll({ formula, label, kind, campaignId, character: { id: null, name: who(operator) }, hidden: Boolean(secret), extra });

  const hpPct = Math.max(0, Math.min(100, (dv.hpCurrent / dv.hpMax) * 100));
  const shPct = dv.shieldsMax ? Math.max(0, Math.min(100, (dv.shieldsCurrent / dv.shieldsMax) * 100)) : 0;
  const applyDamage = () => {
    const n = Math.abs(parseInt(dmg, 10));
    if (!n) return;
    const { patch, log } = applyVehicleDamage(v, n);
    onChange?.(patch);
    setLastLog(`${n} de dano: ${log.join('; ')}.`);
    setDmg('');
  };
  const repair = () => {
    const n = Math.abs(parseInt(dmg, 10));
    if (!n) return;
    onChange?.({ hpCurrent: Math.min(dv.hpMax, dv.hpCurrent + n), destroyed: false });
    setLastLog(`Reparou ${n} PV (Mecânica).`);
    setDmg('');
  };
  const crewSelect = (value, onSel) => (
    <select value={value || ''} onChange={(e) => onSel(e.target.value)} style={{ padding: '4px 6px', fontSize: '0.8rem', maxWidth: 170 }}>
      <option value="">Tripulação do livro</option>
      {characters.map((c) => <option key={c.id} value={c.id}>{c.data.name || c.name}</option>)}
    </select>
  );
  const setCrew = (patch) => onChange?.({ crew: { pilot: '', copilot: '', gunners: {}, ...(v.crew || {}), ...patch } });

  return (
    <div className={`panel ${enemy ? 'red' : ''}`} style={{ padding: 14, opacity: dv.destroyed ? 0.55 : 1 }}>
      <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, cursor: compact ? 'pointer' : 'default' }} onClick={() => compact && setOpen((o) => !o)}>
          {canEdit && !compact
            ? <input value={v.name} onChange={(e) => onChange?.({ name: e.target.value })} style={{ fontFamily: 'var(--font-head)', color: enemy ? 'var(--blaster-red)' : 'var(--sw-yellow)', background: 'transparent', border: '1px solid transparent', padding: '2px 4px', width: '100%' }} />
            : <div className="cname" style={{ color: enemy ? 'var(--blaster-red)' : 'var(--sw-yellow)' }}>{v.name}{dv.destroyed ? ' · DESTRUÍDO' : ''}</div>}
          <div className="tiny muted">{v.template !== v.name ? `${v.template} · ` : ''}{v.type} · ND {v.nd}</div>
        </div>
        <div className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
          {compact && <button className="btn sm ghost" onClick={() => setOpen((o) => !o)}>{open ? '▴' : '▾'}</button>}
          {canEdit && onRemove && <button className="btn sm ghost red" title="Remover" onClick={onRemove}>✕</button>}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div className={`bar ${hpPct <= 25 ? 'low' : hpPct <= 50 ? 'mid' : ''}`} style={{ height: 18 }}>
          <i style={{ width: `${hpPct}%` }} /><span style={{ lineHeight: '16px', fontSize: '0.75rem' }}>Casco {fmtNum(dv.hpCurrent)}/{fmtNum(dv.hpMax)}</span>
        </div>
        {dv.shieldsMax > 0 && (
          <div className="bar" style={{ height: 14, marginTop: 4 }}>
            <i style={{ width: `${shPct}%`, background: 'linear-gradient(90deg, #1a6dff, var(--saber-blue))', boxShadow: '0 0 10px var(--saber-blue)' }} />
            <span style={{ lineHeight: '12px', fontSize: '0.68rem' }}>Escudo VE {dv.shieldsCurrent}/{dv.shieldsMax}</span>
          </div>
        )}
      </div>
      <div className="stat-grid" style={{ marginTop: 8, gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {[['Ref', dv.ref], ['Fort', dv.fort], ['Limiar', v.threshold], ['RD', v.dr]].map(([k, val]) => (
          <div key={k} className="stat" style={{ padding: 4 }}><div className="k">{k}</div><div className="v" style={{ fontSize: '1rem' }}>{val}</div></div>
        ))}
      </div>
      {dv.cond.step > 0 && <div className="tiny red-text" style={{ marginTop: 4 }}>Condição: {dv.cond.label}</div>}

      {open && (
        <>
          <div className="row" style={{ marginTop: 8, gap: 4 }}>
            <button className="roll-chip" onClick={() => r(d20Formula(dv.init), 'Iniciativa', 'initiative', dv.pilotName)}>Iniciativa {fmtMod(dv.init)}</button>
            <button className="roll-chip" onClick={() => r(d20Formula(dv.pilotCheck), 'Pilotar', 'skill', dv.pilotName)}>Pilotar {fmtMod(dv.pilotCheck)}</button>
          </div>

          {dv.weapons.length > 0 && (
            <div className="list" style={{ marginTop: 8 }}>
              {dv.weapons.map((w) => (
                <div key={w.idx} className="list-row" style={{ padding: '6px 4px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="name small">{w.name} <span className="tiny dim">({w.role})</span></div>
                    <div className="sub">{w.operator ? `${w.operator}: BBA + Int da nave` : 'tripulação do livro'}{w.notes ? ` · ${w.notes}` : ''}</div>
                  </div>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
                    <button className="roll-chip" onClick={() => r(d20Formula(w.atk), `Ataque — ${w.name}`, 'attack', w.operator)}>{fmtMod(w.atk)}</button>
                    {w.damage && <button className="roll-chip red" onClick={() => r(w.damage, `Dano — ${w.name}`, 'damage', w.operator)}>{w.damage}</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canEdit && !enemy && (
            <div className="stack" style={{ marginTop: 8, gap: 4 }}>
              <div className="kicker">Tripulação</div>
              <div className="row" style={{ gap: 6 }}>
                <span className="tiny muted">Piloto</span>{crewSelect(v.crew?.pilot, (id) => setCrew({ pilot: id }))}
                <span className="tiny muted">Co-piloto</span>{crewSelect(v.crew?.copilot, (id) => setCrew({ copilot: id }))}
              </div>
              {dv.weapons.filter((w) => !/piloto/.test(w.role)).map((w) => (
                <div key={w.idx} className="row" style={{ gap: 6 }}>
                  <span className="tiny muted">Artilheiro: {w.name}</span>
                  {crewSelect(v.crew?.gunners?.[w.idx], (id) => setCrew({ gunners: { ...(v.crew?.gunners || {}), [w.idx]: id } }))}
                </div>
              ))}
              <div className="tiny dim">Com um jogador no comando, a Reflexo usa o nível heróico do piloto (se for maior que a armadura) e os ataques usam o BBA de quem opera a arma.</div>
            </div>
          )}

          {canEdit && (
            <div style={{ marginTop: 8 }}>
              <div className="row" style={{ gap: 6 }}>
                <input type="number" min="0" placeholder="Dano / reparo" value={dmg} onChange={(e) => setDmg(e.target.value)} style={{ flex: '1 1 110px', width: 'auto', minWidth: 110, padding: '4px 8px' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyDamage(); }} />
                <button className="btn sm red" onClick={applyDamage}>Dano</button>
                <button className="btn sm green" onClick={repair}>Reparar</button>
                {dv.shieldsMax > 0 && <button className="btn sm" title="Operador de sistemas recarrega o escudo" onClick={() => onChange?.({ shieldsCurrent: Math.min(dv.shieldsMax, dv.shieldsCurrent + 5) })}>+5 escudo</button>}
              </div>
              {lastLog && <div className="tiny yellow" style={{ marginTop: 4 }}>{lastLog}</div>}
              <div className="condition" style={{ marginTop: 6 }}>
                {CONDITION_TRACK.map((c) => (
                  <button key={c.step} className={`s${c.step} ${(v.condition || 0) === c.step ? 'on' : ''}`} onClick={() => onChange?.({ condition: c.step, ...(c.step === 0 ? { destroyed: false } : {}) })}>
                    {c.step === 0 ? 'OK' : c.step === 5 ? '✖' : c.penalty}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!compact && (
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
              <div><b>Velocidade:</b> {v.speed}{v.speedShip ? ` · ${v.speedShip} na escala de nave` : ''}</div>
              <div><b>Tripulação:</b> {v.crewInfo || '—'}{v.passengers ? ` · Passageiros: ${v.passengers}` : ''}</div>
              {v.cargo && <div><b>Carga:</b> {v.cargo}</div>}
              {v.hyperdrive && <div><b>Hiperdrive:</b> {v.hyperdrive}</div>}
              {v.cover && <div><b>Cobertura:</b> {v.cover}</div>}
              {v.armament && <div><b>Armamento:</b> {v.armament}</div>}
              {v.cost && <div><b>Preço:</b> {/^\d/.test(v.cost) ? `${v.cost} créditos` : v.cost}{v.availability ? ` · ${v.availability}` : ''}</div>}
            </div>
          )}
          {!compact && canEdit && (
            <textarea value={v.notes || ''} placeholder="Anotações da nave (modificações, dívidas, nome da tripulação...)" onChange={(e) => onChange?.({ notes: e.target.value })} style={{ width: '100%', marginTop: 8, minHeight: 50 }} />
          )}
          {!compact && !canEdit && v.notes && <div className="small muted" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{v.notes}</div>}
        </>
      )}
    </div>
  );
}

// Seletor de veículos do livro
export function VehiclePicker({ onAdd, onClose, enemy }) {
  const [cat, setCat] = useState('todos');
  const [pick, setPick] = useState(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const list = VEHICLES.filter((v) => cat === 'todos' || vehicleCategory(v) === cat).sort((a, b) => a.nd - b.nd);
  const add = () => {
    const base = name.trim() || shortName(pick.name);
    const items = Array.from({ length: enemy ? qty : 1 }, (_, i) => {
      const nv = newVehicle(pick, enemy && qty > 1 ? `${base} ${i + 1}` : base);
      nv.crewInfo = pick.crew;
      return nv;
    });
    onAdd(items);
  };
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal panel ${enemy ? 'red' : 'yellow'}`} style={{ width: 'min(1080px, 100%)' }}>
        <div className="panel-title"><span>{enemy ? 'Naves e veículos inimigos' : 'Nave do grupo'}</span><button className="btn sm ghost" onClick={onClose}>✕</button></div>
        <div className="row" style={{ marginBottom: 10, gap: 6 }}>
          {VEHICLE_CATEGORIES.map(([id, l]) => <button key={id} className={`btn sm ${cat === id ? 'yellow primary' : ''}`} onClick={() => setCat(id)}>{l}</button>)}
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14 }}>
          <div className="list" style={{ maxHeight: 460, overflowY: 'auto' }}>
            {list.map((v) => (
              <div key={v.name} className="list-row" style={{ cursor: 'pointer', background: pick?.name === v.name ? 'rgba(255,232,31,0.07)' : undefined }} onClick={() => { setPick(v); setName(''); }}>
                <div><div className="name">{v.name}</div><div className="sub">{v.type} · {/^\d/.test(v.cost) ? `${v.cost} cr` : v.cost}</div></div>
                <span className="tag yellow">ND {v.nd}</span>
              </div>
            ))}
          </div>
          <div>
            {!pick ? <div className="empty small">Escolha um veículo para ver os detalhes.</div> : (
              <div className="stack">
                <div>
                  <h3 className="yellow" style={{ margin: 0 }}>{pick.name}</h3>
                  <div className="tiny muted">{pick.type} · ND {pick.nd}</div>
                </div>
                <div className="small">
                  Casco <b>{fmtNum(pick.hp)}</b> · RD <b>{pick.dr}</b>{pick.shields ? <> · Escudo VE <b>{pick.shields}</b></> : null} · Limiar <b>{pick.threshold}</b><br />
                  Ref <b>{pick.ref}</b> · Fort <b>{pick.fort}</b> · Armadura <b>+{pick.armor}</b> · Velocidade {pick.speed}{pick.speedShip ? ` (${pick.speedShip} na escala de nave)` : ''}
                </div>
                <div className="small muted">{pick.weapons.map((w) => `${w.name} ${fmtMod(w.atk)} (${w.dice ? `${w.dice}${w.mult > 1 ? `×${w.mult}` : ''}` : '—'})`).join(' · ') || 'Sem armas'}</div>
                <div className="tiny muted">Tripulação: {pick.crew} · Passageiros: {pick.passengers}{pick.hyperdrive ? ` · Hiperdrive ${pick.hyperdrive}` : ''}</div>
                <div className="tiny muted">Preço: {/^\d/.test(pick.cost) ? `${pick.cost} créditos` : pick.cost || '—'} · {pick.availability}</div>
                <div className="row">
                  <label className="field" style={{ flex: 1 }}>Nome {enemy ? '' : '(ex.: Falcão Enferrujado)'}<input value={name} placeholder={shortName(pick.name)} onChange={(e) => setName(e.target.value)} /></label>
                  {enemy && <label className="field" style={{ width: 90 }}>Quantidade<input type="number" min="1" max="12" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} /></label>}
                </div>
                <button className={`btn ${enemy ? 'red' : 'yellow'} primary`} onClick={add}>{enemy ? `Adicionar ${qty > 1 ? `${qty}× ` : ''}em cena` : 'Adicionar ao grupo'}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
