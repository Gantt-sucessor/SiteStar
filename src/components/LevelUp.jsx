import { useState } from 'react';
import { CLASSES, FEAT_LEVELS, ABILITY_INCREASE_LEVELS } from '../data/rules';
import { PRESTIGE_CLASSES, classFeatures } from '../data/prestige';
import { prestigeMissing } from '../lib/character';

// Escolha da classe ao subir de nível: continuar uma classe, multiclassear ou entrar numa classe de prestígio.
export default function LevelUp({ d, data, onConfirm, onClose }) {
  const [pick, setPick] = useState(d.classes[0]?.cls.id ?? '');
  const next = d.level + 1;

  const options = [
    ...d.classes.map((x) => ({ cls: x.cls, current: x.levels, kind: 'atual' })),
    ...CLASSES.filter((c) => !d.levelOf(c.id)).map((cls) => ({ cls, current: 0, kind: 'nova' })),
    ...PRESTIGE_CLASSES.filter((c) => !d.levelOf(c.id)).map((cls) => ({ cls, current: 0, kind: 'prestigio' })),
  ];
  const chosen = options.find((o) => o.cls.id === pick);
  const missing = chosen?.cls.prestige && !chosen.current ? prestigeMissing(chosen.cls, d, data) : [];
  const maxed = chosen && chosen.cls.maxLevel && chosen.current >= chosen.cls.maxLevel;

  const gains = [];
  if (chosen) {
    const cl = chosen.current + 1;
    const c = chosen.cls;
    gains.push(`PV: 1d${c.hitDie} + Constituição`);
    if (c.talentEveryLevel || cl % 2 === 1) gains.push('1 aptidão');
    if (!c.prestige && cl % 2 === 0) gains.push(`1 talento bônus de ${c.name}`);
    if (!c.prestige && cl === 1) gains.push(`1 talento inicial de ${c.name} à escolha (${c.startingFeats.join(', ')})`);
    if (c.techniques === 'even' && cl % 2 === 0) gains.push('1 Técnica da Força');
    if (c.secrets && cl >= 2) gains.push('1 Segredo da Força');
    if (FEAT_LEVELS.includes(next)) gains.push('1 talento (nível de personagem)');
    if (ABILITY_INCREASE_LEVELS.includes(next)) gains.push('+1 em duas habilidades');
    if (next % 2 === 0) gains.push('+1 em perícias, defesas e dano (metade do nível)');
    else gains.push('+1 nas defesas');
    const before = classFeatures(c, chosen.current);
    const after = classFeatures(c, cl).filter((f) => !before.includes(f));
    gains.push(...after);
  }

  const group = (kind, title) => {
    const list = options.filter((o) => o.kind === kind);
    if (!list.length) return null;
    return (
      <div style={{ marginBottom: 14 }}>
        <div className="kicker" style={{ marginBottom: 6 }}>{title}</div>
        <div className="pick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
          {list.map((o) => {
            const miss = o.cls.prestige && !o.current ? prestigeMissing(o.cls, d, data) : [];
            const full = o.cls.maxLevel && o.current >= o.cls.maxLevel;
            return (
              <button key={o.cls.id} style={{ '--pc': o.cls.color }} className={`pick ${pick === o.cls.id ? 'selected' : ''} ${full ? 'disabled' : ''}`}
                onClick={() => !full && setPick(o.cls.id)}>
                <h3>{o.cls.name} {o.current ? <span className="tag">{o.current} → {o.current + 1}</span> : null}</h3>
                <div className="desc">{o.cls.desc}</div>
                <div className="mods">
                  <span className="tag">d{o.cls.hitDie}</span>
                  {o.cls.prestige && !o.current && <span className={`tag ${miss.length ? 'red' : 'green'}`}>{miss.length ? `faltam ${miss.length}` : 'requisitos ok'}</span>}
                  {full && <span className="tag">nível máximo</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel yellow" style={{ width: 'min(980px, 100%)' }}>
        <div className="panel-title"><span>Subir para o nível {next}</span><button className="btn sm ghost" onClick={onClose}>✕</button></div>
        {group('atual', 'Continuar na classe')}
        {group('nova', 'Multiclasse: nova classe heróica')}
        {group('prestigio', 'Classes de prestígio')}

        {chosen && (
          <div className="info-box" style={{ marginTop: 6 }}>
            <b className="yellow">{chosen.cls.name} {chosen.current + 1}</b>
            {chosen.cls.examples && <span className="tiny muted"> · como {chosen.cls.examples}</span>}
            <ul style={{ margin: '8px 0 0 18px', padding: 0 }} className="small">
              {gains.map((g) => <li key={g}>{g}</li>)}
            </ul>
            {missing.length > 0 && (
              <div className="small red-text" style={{ marginTop: 8 }}>
                Requisitos pendentes: {missing.join('; ')}.<br />
                <span className="muted">Você pode continuar mesmo assim se o mestre permitir.</span>
              </div>
            )}
            {chosen.cls.req?.special && <div className="tiny muted" style={{ marginTop: 6 }}>Requisito narrativo: {chosen.cls.req.special}</div>}
            {chosen.cls.note && <div className="tiny muted">{chosen.cls.note}</div>}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn yellow primary" disabled={!chosen || maxed} onClick={() => onConfirm(chosen.cls, gains)}>Rolar PV e subir</button>
        </div>
      </div>
    </div>
  );
}
