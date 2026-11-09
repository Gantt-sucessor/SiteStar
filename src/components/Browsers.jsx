import { useMemo, useState } from 'react';
import { FEATS, SKILLS, WEAPON_GROUPS } from '../data/rules';
import { REPEATABLE_TALENTS } from '../data/prestige';
import { meetsPrereq } from './Sheet';

const SCORE = { Vig: 'vig', Vigor: 'vig', Des: 'des', Con: 'con', Int: 'int', Sab: 'sab', Car: 'car' };
const REPEATABLE_FEATS = ['Treinamento da Força', 'Bênção da Força', 'Limiar de Dano Aprimorado', 'Fúria Extra'];
const ABBR = { 'DAD I': 'Domínio de Armas Duplas I', 'DAD II': 'Domínio de Armas Duplas II', 'Armadura (leve)': 'Proficiência em Armadura (leve)', 'Armadura (média)': 'Proficiência em Armadura (média)', 'Defesa Física': 'Defesa de Ataque Físico' };

// Confere o texto de pré-requisito de um talento contra a ficha e devolve o que falta
export function featMissing(feat, d) {
  if (!feat.prereq || feat.prereq === '—') return [];
  const miss = [];
  for (let raw of feat.prereq.split(',').map((x) => x.trim()).filter(Boolean)) {
    raw = ABBR[raw] || raw;
    let m;
    if ((m = /^(Vig|Vigor|Des|Con|Int|Sab|Car) (\d+)$/.exec(raw))) { if (d.scores[SCORE[m[1]]] < Number(m[2])) miss.push(raw); continue; }
    if ((m = /^BBA \+?(\d+)$/.exec(raw))) { if (d.bab < Number(m[1])) miss.push(raw); continue; }
    if ((m = /^[Tt]reinado em (.+)$/.exec(raw))) { if (!d.skills.find((s) => s.name === m[1] || s.name.startsWith(m[1]))?.trained) miss.push(raw); continue; }
    if (/proficien|Perícia treinada|Não dróide|Médio\+/i.test(raw)) continue;
    if (/^Traço/.test(raw)) { if (d.sp?.id !== 'wookiee') miss.push(raw); continue; }
    if (/^Prof\. armas pesadas$/.test(raw)) { if (!d.has('Proficiência em Arma (armas pesadas)')) miss.push(raw); continue; }
    if (!d.has(raw)) miss.push(raw);
  }
  return miss;
}

function Status({ owned, miss }) {
  if (owned) return <span className="tag green">você tem</span>;
  if (miss.length) return <span className="tag red" title={miss.join(', ')}>falta: {miss.join(', ')}</span>;
  return <span className="tag blue">disponível</span>;
}

function Modal({ title, onClose, children, tone = 'yellow' }) {
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal panel ${tone}`} style={{ width: 'min(1100px, 100%)' }}>
        <div className="panel-title"><span>{title}</span><button className="btn sm ghost" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

// ---------- Aptidões (talents de classe) ----------
export function TalentBrowser({ d, data, onAdd, onClose, editable = true }) {
  const talents = data.talents || [];
  const [tree, setTree] = useState('todas');
  const [onlyAvail, setOnlyAvail] = useState(false);
  const left = d.talentSlots - talents.length;
  const trees = d.talentTrees;

  return (
    <Modal title="Árvores de aptidões" onClose={onClose}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="small muted">
          Aptidões vêm em <b>árvores</b>. Algumas exigem outra aptidão da mesma árvore antes. Você ganha uma nos níveis ímpares de cada classe.
        </div>
        <span className={`counter ${left === 0 ? 'ok' : left < 0 ? 'over' : ''}`}>{left > 0 ? `${left} para escolher` : left === 0 ? 'tudo escolhido' : `${-left} a mais`}</span>
      </div>
      <div className="row" style={{ marginBottom: 12, gap: 6 }}>
        <button className={`btn sm ${tree === 'todas' ? 'yellow primary' : ''}`} onClick={() => setTree('todas')}>Todas</button>
        {trees.map((t) => <button key={t.name} className={`btn sm ${tree === t.name ? 'yellow primary' : ''}`} onClick={() => setTree(t.name)}>{t.name}</button>)}
        <label className="check small" style={{ marginLeft: 'auto' }}><input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} /> Só o que posso pegar agora</label>
      </div>
      <div style={{ maxHeight: '62vh', overflowY: 'auto', paddingRight: 4 }}>
        {trees.filter((t) => tree === 'todas' || t.name === tree).map((t) => {
          const items = t.talents.map(([name, desc, prereq = []]) => {
            const owned = talents.includes(name);
            const repeat = REPEATABLE_TALENTS.includes(name);
            const miss = prereq.filter((r) => !meetsPrereq(r, d, data));
            return { name, desc, prereq, owned, repeat, miss, count: talents.filter((x) => x === name).length };
          }).filter((x) => !onlyAvail || (!x.miss.length && (!x.owned || x.repeat)));
          if (!items.length) return null;
          return (
            <div key={t.name} style={{ marginBottom: 18 }}>
              <div className="row between">
                <h3 className="yellow" style={{ margin: 0 }}>{t.name}</h3>
                <span className="tiny dim">{t.from}{t.darkSide ? ' · exige Lado Sombrio ≥ 1' : ''}</span>
              </div>
              <div className="pick-grid" style={{ marginTop: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {items.map((x) => (
                  <div key={x.name} className={`pick ${x.owned ? 'selected' : ''}`} style={{ cursor: 'default', '--pc': 'var(--saber-green)', opacity: x.miss.length && !x.owned ? 0.65 : 1 }}>
                    <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                      <h3 style={{ margin: 0 }}>{x.name}{x.count > 1 ? ` ×${x.count}` : ''}</h3>
                    </div>
                    <div className="desc" style={{ marginTop: 4 }}>{x.desc}</div>
                    {x.prereq.length > 0 && <div className="tiny dim" style={{ marginTop: 6 }}>Requer: {x.prereq.join(', ')}</div>}
                    <div className="row between" style={{ marginTop: 8 }}>
                      <Status owned={x.owned} miss={x.miss} />
                      {editable && (!x.owned || x.repeat) && (
                        <button className="btn sm" onClick={() => onAdd(x.name)} title={x.miss.length ? 'Pré-requisito pendente: o mestre pode liberar' : ''}>{x.owned ? 'Pegar de novo' : 'Pegar'}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ---------- Talentos (feats) ----------
export function FeatBrowser({ d, data, onAdd, onClose, editable = true }) {
  const chosen = data.feats || [];
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [choiceFor, setChoiceFor] = useState(null);
  const [choice, setChoice] = useState('');
  const left = d.featSlots - chosen.length;

  const bonusOf = useMemo(() => {
    const map = {};
    for (const x of d.heroic) for (const f of x.cls.bonusFeats) {
      const base = f.replace(/ \(.*\)$/, '');
      (map[base] = map[base] || []).push(x.cls.name);
    }
    return map;
  }, [d.heroic]);

  const items = FEATS.map((f) => {
    const owned = !f.choice && d.feats.includes(f.name);
    const ownedCount = d.feats.filter((x) => x === f.name || x.startsWith(f.name + ' (')).length;
    const miss = featMissing(f, d);
    return { ...f, owned, ownedCount, miss, bonus: bonusOf[f.name] || [] };
  })
    .filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()) || f.desc.toLowerCase().includes(q.toLowerCase()))
    .filter((f) => filter === 'todos'
      || (filter === 'disponiveis' && !f.miss.length && (!f.owned || REPEATABLE_FEATS.includes(f.name)))
      || (filter === 'bonus' && f.bonus.length)
      || (filter === 'meus' && f.ownedCount));

  const choices = (f) => (f.choice === 'skill'
    ? (f.name === 'Foco em Perícia' ? d.skills.filter((s) => s.trained).map((s) => s.name) : SKILLS.filter((s) => d.classSkills.has(s.name) && !d.skills.find((x) => x.name === s.name)?.trained).map((s) => s.name))
    : Object.values(WEAPON_GROUPS).filter((g) => g !== 'armas exóticas')).filter((c) => !d.feats.includes(`${f.name} (${c})`));

  return (
    <Modal title="Talentos" onClose={onClose}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="small muted">Qualquer classe pode pegar talentos, desde que cumpra os pré-requisitos. Os <b className="yellow">talentos bônus</b> dos níveis pares têm que sair da lista da sua classe.</div>
        <span className={`counter ${left === 0 ? 'ok' : left < 0 ? 'over' : ''}`}>{left > 0 ? `${left} para escolher` : left === 0 ? 'tudo escolhido' : `${-left} a mais`}</span>
      </div>
      <div className="row" style={{ marginBottom: 12, gap: 6 }}>
        <input placeholder="Buscar talento ou efeito (ex.: dano, Reflexo, sabre)..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} autoFocus />
        {[['todos', 'Todos'], ['disponiveis', 'Posso pegar'], ['bonus', 'Bônus da minha classe'], ['meus', 'Que eu tenho']].map(([k, l]) => (
          <button key={k} className={`btn sm ${filter === k ? 'yellow primary' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      <div className="pick-grid" style={{ maxHeight: '62vh', overflowY: 'auto', paddingRight: 4, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {items.map((f) => (
          <div key={f.name} className={`pick ${f.ownedCount ? 'selected' : ''}`} style={{ cursor: 'default', '--pc': 'var(--saber-green)', opacity: f.miss.length && !f.ownedCount ? 0.65 : 1 }}>
            <h3 style={{ margin: 0 }}>{f.name}{f.ownedCount > 1 ? ` ×${f.ownedCount}` : ''}</h3>
            <div className="desc" style={{ marginTop: 4 }}>{f.desc}</div>
            {f.prereq !== '—' && <div className="tiny dim" style={{ marginTop: 6 }}>Requer: {f.prereq}</div>}
            {f.bonus.length > 0 && <div className="tiny yellow" style={{ marginTop: 4 }}>Talento bônus de {f.bonus.join(', ')}</div>}
            {f.choice && f.ownedCount > 0 && <div className="tiny muted" style={{ marginTop: 4 }}>Você tem: {d.feats.filter((x) => x.startsWith(f.name + ' (')).map((x) => x.slice(f.name.length + 2, -1)).join(', ')}</div>}
            <div className="row between" style={{ marginTop: 8 }}>
              <Status owned={f.owned} miss={f.miss} />
              {editable && (!f.owned || REPEATABLE_FEATS.includes(f.name)) && (
                choiceFor === f.name ? (
                  <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    <select value={choice} onChange={(e) => setChoice(e.target.value)} style={{ padding: '4px 6px', maxWidth: 150 }}>
                      <option value="">Escolha...</option>
                      {choices(f).map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn sm" disabled={!choice} onClick={() => { onAdd(`${f.name} (${choice})`); setChoiceFor(null); setChoice(''); }}>OK</button>
                  </div>
                ) : (
                  <button className="btn sm" onClick={() => (f.choice ? (setChoiceFor(f.name), setChoice('')) : onAdd(f.name))}>{f.ownedCount && !f.choice ? 'Pegar de novo' : 'Pegar'}</button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
