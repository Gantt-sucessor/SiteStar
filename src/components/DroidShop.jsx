import { useState } from 'react';
import {
  DROID_SYSTEMS, DROID_ARMORS, DROID_COST_FACTOR, DROID_STARTING_BUDGET,
  systemCost, canInstall, droidSystemById, droidArmorByName, primaryLocomotion, locomotionSpeed,
} from '../data/droidSystems';

const fmt = (n) => n.toLocaleString('pt-BR');
const GROUPS = [...new Set(DROID_SYSTEMS.map((s) => s.group))];

// mode 'wizard': gasta primeiro o orçamento de 1.000 créditos do herói dróide (sobras se perdem), depois os créditos.
// mode 'sheet': paga com os créditos (opcional).
export default function DroidShop({ data, set, d, mode = 'sheet', editable = true }) {
  const [group, setGroup] = useState(GROUPS[0]);
  const [pay, setPay] = useState(true);
  const size = data.droidSize || 'medio';
  const cf = DROID_COST_FACTOR[size];
  const installed = data.droidSystems || [];
  const budget = mode === 'wizard' ? (data.droidBudget ?? DROID_STARTING_BUDGET) : 0;
  const credits = data.credits || 0;

  const charge = (cost) => {
    if (mode === 'wizard') {
      const fromBudget = Math.min(budget, cost);
      return { budget: fromBudget, credits: cost - fromBudget };
    }
    return { budget: 0, credits: pay ? cost : 0 };
  };
  const affordable = (cost) => (mode === 'wizard' ? budget + credits >= cost : !pay || credits >= cost);

  const install = (item) => {
    const cost = systemCost(item, data);
    const paid = charge(cost);
    set({
      droidSystems: [...installed, { id: item.id, uid: crypto.randomUUID(), cost, paid }],
      droidBudget: mode === 'wizard' ? budget - paid.budget : data.droidBudget,
      credits: credits - paid.credits,
    });
  };
  const uninstall = (row) => {
    const paid = row.paid || { budget: 0, credits: 0 };
    set({
      droidSystems: installed.filter((x) => x.uid !== row.uid),
      droidBudget: mode === 'wizard' ? Math.min(DROID_STARTING_BUDGET, budget + paid.budget) : data.droidBudget,
      credits: credits + (mode === 'wizard' ? paid.credits : (paid.credits || 0)),
    });
  };

  const currentArmor = data.droidArmor ? droidArmorByName(data.droidArmor) : null;
  const setArmor = (name) => {
    const prev = data.droidArmorPaid || { budget: 0, credits: 0 };
    let b = budget + (mode === 'wizard' ? prev.budget : 0);
    let c = credits + prev.credits;
    let paid = { budget: 0, credits: 0 };
    const a = name ? droidArmorByName(name) : null;
    if (a) {
      const cost = a.base * cf;
      if (mode === 'wizard') { const fb = Math.min(b, cost); paid = { budget: fb, credits: cost - fb }; }
      else paid = { budget: 0, credits: pay ? cost : 0 };
      b -= paid.budget; c -= paid.credits;
    }
    set({ droidArmor: name || null, droidArmorPaid: paid, credits: c, droidBudget: mode === 'wizard' ? Math.min(DROID_STARTING_BUDGET, b) : data.droidBudget });
  };

  const primary = primaryLocomotion(size);
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row between">
        <div>
          <div className="kicker">Sistemas de dróide · fator de custo ×{cf} ({size === 'pequeno' ? 'Pequeno' : 'Médio'})</div>
          <div className="tiny muted">Instalar ou trocar sistemas exige Mecânica (CD 15 acessório, 20 apêndice, 25 locomoção). Preços do livro, Tabelas 11-3 a 11-6.</div>
        </div>
        {mode === 'wizard' ? (
          <span className={`counter ${budget === 0 ? 'ok' : ''}`}>Orçamento de dróide: {fmt(budget)} cr</span>
        ) : editable && (
          <label className="check small"><input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} /> Descontar dos créditos</label>
        )}
      </div>
      {mode === 'wizard' && <div className="info-box small">Heróis dróides têm <b>1.000 créditos</b> só para sistemas. O que sobrar se perde. Depois disso, as compras saem dos créditos da classe ({fmt(credits)} cr).</div>}

      <div>
        <h3 className="yellow" style={{ marginBottom: 6 }}>Instalado</h3>
        <div className="list">
          <div className="list-row"><div><div className="name">Processador heurístico</div><div className="sub">Incluído · personalidade e livre-arbítrio</div></div><span className="tag green">grátis</span></div>
          <div className="list-row"><div><div className="name">2 braços com mãos</div><div className="sub">Incluído</div></div><span className="tag green">grátis</span></div>
          <div className="list-row"><div><div className="name">Locomoção: {primary}</div><div className="sub">Incluída · velocidade {locomotionSpeed(primary, size)}</div></div><span className="tag green">grátis</span></div>
          <div className="list-row"><div><div className="name">Vocabulador</div><div className="sub">Incluído · fala Básico</div></div><span className="tag green">grátis</span></div>
          {installed.map((row) => {
            const item = droidSystemById(row.id);
            return (
              <div key={row.uid} className="list-row">
                <div><div className="name">{item?.name ?? row.id}</div><div className="sub">{item?.desc}</div></div>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <span className="mono small yellow">{fmt(row.cost)} cr</span>
                  {editable && <button className="btn sm ghost red" onClick={() => uninstall(row)}>Remover</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="yellow" style={{ marginBottom: 6 }}>Armadura embutida</h3>
        {editable ? (
          <select value={data.droidArmor || ''} onChange={(e) => setArmor(e.target.value)} style={{ width: '100%' }}>
            <option value="">Sem armadura embutida</option>
            {['leve', 'média', 'pesada'].map((cat) => (
              <optgroup key={cat} label={`Armadura ${cat}`}>
                {DROID_ARMORS.filter((a) => a.category === cat).map((a) => (
                  <option key={a.name} value={a.name}>{a.name}: Ref +{a.ref}, Des máx +{a.maxDex}, {fmt(a.base * cf)} cr{a.avail ? ` (${a.avail})` : ''}</option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : <div className="small">{currentArmor ? currentArmor.name : 'Nenhuma'}</div>}
        <div className="tiny muted" style={{ marginTop: 4 }}>
          A armadura embutida não reduz a velocidade e não acumula com armadura vestida (vale a maior). Sem o talento de Proficiência em Armadura correspondente, aplica a penalidade em ataques e perícias físicas.
        </div>
      </div>

      {editable && (
        <div>
          <h3 className="yellow" style={{ marginBottom: 6 }}>Catálogo</h3>
          <div className="tabs">
            {GROUPS.map((g) => <button key={g} className={`tab ${group === g ? 'active' : ''}`} onClick={() => setGroup(g)}>{g}</button>)}
          </div>
          <div className="pick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {DROID_SYSTEMS.filter((s) => s.group === group).map((item) => {
              const cost = systemCost(item, data);
              const block = canInstall(item, data);
              const count = installed.filter((x) => x.id === item.id).length;
              const tooExpensive = !affordable(cost);
              return (
                <div key={item.id} className={`pick ${count ? 'selected' : ''}`} style={{ cursor: 'default', '--pc': 'var(--holo)', opacity: block ? 0.6 : 1 }}>
                  <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0 }}>{item.name}{count > 1 ? ` ×${count}` : ''}</h3>
                    <span className="mono small yellow" style={{ whiteSpace: 'nowrap' }}>{fmt(cost)} cr</span>
                  </div>
                  <div className="desc" style={{ marginTop: 4 }}>{item.desc}</div>
                  <div className="row between" style={{ marginTop: 8 }}>
                    <span>{item.avail && <span className="tag red">{item.avail}</span>}{block && <span className="tag">{block}</span>}</span>
                    <button className="btn sm" disabled={Boolean(block) || tooExpensive} title={tooExpensive ? 'Créditos insuficientes' : ''} onClick={() => install(item)}>Instalar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
