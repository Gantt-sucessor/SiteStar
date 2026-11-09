import { useState } from 'react';
import { sendRoll } from '../lib/rolls';
import { useRollTarget } from '../lib/rollTarget';
import { parseFormula } from '../lib/dice';

const DICE = [4, 6, 8, 10, 12, 20, 100];

export default function DiceTray() {
  const { target } = useRollTarget();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [formula, setFormula] = useState('');
  const [label, setLabel] = useState('');
  const [hidden, setHidden] = useState(false);

  const fire = (f, l) => sendRoll({
    formula: f,
    label: l || label || f,
    campaignId: target?.campaignId,
    character: target?.character,
    hidden: target?.isMaster ? hidden : false,
  });

  const quick = (sides) => {
    const m = Number(mod) || 0;
    fire(`${count}d${sides}${m ? (m > 0 ? `+${m}` : m) : ''}`);
  };

  const valid = !formula || parseFormula(formula);
  const destination = !target?.campaignId ? 'Só local' : target.isMaster ? 'Mestre' : 'Envia ao mestre';

  return (
    <>
      <button className="dice-fab" onClick={() => setOpen((o) => !o)} title="Rolar dados" aria-expanded={open}>
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6">
          <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" />
          <polygon points="20,9 30,26 10,26" />
          <line x1="20" y1="2" x2="20" y2="9" /><line x1="36" y1="11" x2="30" y2="26" /><line x1="4" y1="11" x2="10" y2="26" />
          <line x1="20" y1="38" x2="30" y2="26" /><line x1="20" y1="38" x2="10" y2="26" />
          <text x="20" y="23" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none" fontFamily="Orbitron">20</text>
        </svg>
      </button>
      {open && (
        <div className="dice-tray panel">
          <div className="panel-title">
            <span>Rolador</span>
            <span className="tiny muted">{destination}</span>
          </div>
          <div className="row" style={{ marginBottom: 10, flexWrap: 'nowrap' }}>
            <label className="field" style={{ flex: 1 }}>Qtd
              <input type="number" min="1" max="50" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} style={{ width: '100%' }} />
            </label>
            <label className="field" style={{ flex: 1 }}>Mod
              <input type="number" value={mod} onChange={(e) => setMod(e.target.value)} style={{ width: '100%' }} />
            </label>
          </div>
          <div className="dice-buttons">
            {DICE.map((d) => (
              <button key={d} className={`btn sm ${d === 20 ? 'yellow primary' : ''}`} onClick={() => quick(d)}>d{d}</button>
            ))}
            <button className="btn sm red" onClick={() => fire('1d6', 'Ponto de Força')} title="Rolar 1d6 de Ponto de Força">PF</button>
          </div>
          <div className="hr" />
          <form className="stack" onSubmit={(e) => { e.preventDefault(); if (formula && valid) fire(formula); }}>
            <input placeholder="Rótulo (ex.: Ataque no stormtrooper)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input placeholder="1d20+5, 3d8+2..." value={formula} onChange={(e) => setFormula(e.target.value)} style={{ flex: 1, borderColor: valid ? undefined : 'var(--danger)' }} />
              <button className="btn primary" disabled={!formula || !valid}>Rolar</button>
            </div>
            {target?.isMaster && (
              <label className="check small"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Rolagem secreta (só o mestre vê)</label>
            )}
          </form>
        </div>
      )}
    </>
  );
}
