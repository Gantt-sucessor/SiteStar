import { useState } from 'react';

// Medalhas no estilo da cerimônia de Yavin: o mestre concede, a ficha exibe como holograma dourado.
export const MEDAL_ICONS = {
  estrela: 'M50 18 L58 40 L82 41 L63 55 L70 78 L50 64 L30 78 L37 55 L18 41 L42 40 Z',
  sol: 'M50 30 A20 20 0 1 1 49.9 30 Z M50 10 L54 24 L46 24 Z M50 90 L46 76 L54 76 Z M10 50 L24 46 L24 54 Z M90 50 L76 54 L76 46 Z',
  sabre: 'M47 14 L53 14 L53 62 L47 62 Z M42 62 L58 62 L58 70 L42 70 Z M46 70 L54 70 L54 86 L46 86 Z',
  nave: 'M50 14 L58 46 L82 60 L82 66 L58 60 L56 80 L64 86 L36 86 L44 80 L42 60 L18 66 L18 60 L42 46 Z',
  escudo: 'M50 14 L80 24 L76 56 Q70 76 50 86 Q30 76 24 56 L20 24 Z',
  caveira: 'M50 18 Q76 18 76 46 Q76 58 66 62 L66 74 L34 74 L34 62 Q24 58 24 46 Q24 18 50 18 Z M38 42 A6 6 0 1 0 38.1 42 Z M62 42 A6 6 0 1 0 62.1 42 Z',
  credito: 'M50 16 A34 34 0 1 1 49.9 16 Z M50 28 A22 22 0 1 0 50.1 28 Z M44 34 L56 34 L56 66 L44 66 Z',
};

export const MEDAL_METALS = {
  ouro: ['#ffe9a3', '#d9a521', '#8a5a00'],
  prata: ['#ffffff', '#b9c6d6', '#5d6b7d'],
  bronze: ['#ffd1a3', '#c0712f', '#6b3510'],
  sombrio: ['#ff9aa5', '#b3122a', '#3a0008'],
};

export const MEDAL_PRESETS = [
  { name: 'Medalha de Bravura', icon: 'estrela', metal: 'ouro', desc: 'Por coragem diante de forças muito superiores.' },
  { name: 'Destruidor da Estação', icon: 'sol', metal: 'ouro', desc: 'Por destruir um alvo que ninguém achava possível.' },
  { name: 'Ás da Esquadrilha', icon: 'nave', metal: 'prata', desc: 'Por pilotagem lendária em combate espacial.' },
  { name: 'Guardião', icon: 'escudo', metal: 'prata', desc: 'Por proteger um aliado com a própria vida.' },
  { name: 'Lâmina Lendária', icon: 'sabre', metal: 'ouro', desc: 'Por um duelo que será contado por gerações.' },
  { name: 'Contrato Impossível', icon: 'credito', metal: 'bronze', desc: 'Por cumprir um contrato que ninguém mais aceitou.' },
  { name: 'Marca da Infâmia', icon: 'caveira', metal: 'sombrio', desc: 'Por um feito temido em toda a Orla Exterior.' },
];

export function MedalBadge({ medal, size = 64, title }) {
  const m = MEDAL_METALS[medal.metal] || MEDAL_METALS.ouro;
  const id = `mg-${medal.metal || 'ouro'}`;
  return (
    <svg className="medal-badge" width={size} height={size * 1.35} viewBox="0 0 100 135" aria-label={medal.name}>
      <title>{title ?? `${medal.name}${medal.desc ? ` — ${medal.desc}` : ''}`}</title>
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={m[0]} />
          <stop offset="55%" stopColor={m[1]} />
          <stop offset="100%" stopColor={m[2]} />
        </radialGradient>
      </defs>
      {/* fita */}
      <path d="M30 0 L50 34 L70 0 Z" fill="#1d5fd6" opacity="0.9" />
      <path d="M38 0 L50 22 L62 0 Z" fill="#ffd34d" opacity="0.9" />
      <g transform="translate(0 35)">
        <circle cx="50" cy="50" r="46" fill={`url(#${id})`} stroke={m[2]} strokeWidth="3" />
        <circle cx="50" cy="50" r="38" fill="none" stroke={m[0]} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d={MEDAL_ICONS[medal.icon] || MEDAL_ICONS.estrela} fill={m[2]} fillRule="evenodd" opacity="0.85" />
      </g>
    </svg>
  );
}

// Lista de medalhas da ficha; o mestre (canGrant) concede e remove
export function MedalsPanel({ medals = [], canGrant, onChange, onGranted }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(MEDAL_PRESETS[0]);
  const grant = () => {
    const medal = { ...form, id: crypto.randomUUID(), date: new Date().toISOString() };
    onChange([...medals, medal]);
    onGranted?.(medal);
    setOpen(false);
  };
  if (!medals.length && !canGrant) return null;
  return (
    <div>
      {medals.length === 0 ? <div className="tiny muted">Nenhuma medalha ainda. O mestre concede medalhas por grandes feitos.</div> : (
        <div className="medal-row">
          {medals.map((md) => (
            <div key={md.id} className="medal-item">
              <MedalBadge medal={md} size={52} />
              <div className="tiny" style={{ textAlign: 'center', lineHeight: 1.2 }}>{md.name}</div>
              {canGrant && <button className="btn sm ghost red" style={{ padding: '0 6px' }} title="Retirar" onClick={() => confirm(`Retirar ${md.name}?`) && onChange(medals.filter((x) => x.id !== md.id))}>✕</button>}
            </div>
          ))}
        </div>
      )}
      {canGrant && (
        <div style={{ marginTop: 8 }}>
          {!open ? <button className="btn sm yellow" onClick={() => setOpen(true)}>🎖 Conceder medalha</button> : (
            <div className="info-box stack" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 6 }}>
                {MEDAL_PRESETS.map((p) => (
                  <button key={p.name} className={`btn sm ${form.name === p.name ? 'yellow primary' : ''}`} onClick={() => setForm(p)}>{p.name}</button>
                ))}
              </div>
              <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 12 }}>
                <MedalBadge medal={form} size={56} />
                <div className="stack" style={{ gap: 6, flex: 1 }}>
                  <input value={form.name} placeholder="Nome da medalha" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input value={form.desc} placeholder="Motivo" onChange={(e) => setForm({ ...form, desc: e.target.value })} />
                  <div className="row" style={{ gap: 6 }}>
                    <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                      {Object.keys(MEDAL_ICONS).map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <select value={form.metal} onChange={(e) => setForm({ ...form, metal: e.target.value })}>
                      {Object.keys(MEDAL_METALS).map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn sm ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <button className="btn sm yellow primary" disabled={!form.name} onClick={grant}>Conceder em cerimônia</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
