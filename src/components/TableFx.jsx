import { useEffect, useRef, useState } from 'react';
import Holo from './Holo';
import { hyperspace } from './Starfield';
import { MedalBadge } from './Medals';
import { fx } from '../lib/fx';
import { sfx } from '../lib/sfx';

// Desenha na tela os efeitos da mesa: transmissões holográficas, alerta vermelho,
// salto/saída do hiperespaço, novos registros do holocron e cerimônias de medalha.
export default function TableFx() {
  const [trans, setTrans] = useState([]);
  const [alert, setAlert] = useState(null);
  const [warp, setWarp] = useState(null); // { mode: 'jump' | 'exit', to }
  const [medal, setMedal] = useState(null);
  const [notes, setNotes] = useState([]);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    const on = (e) => {
      const { type, payload: p = {} } = e.detail || {};
      if (type === 'transmission') {
        fx.holo();
        const id = crypto.randomUUID();
        setTrans((l) => [...l.slice(-1), { ...p, id }]);
      } else if (type === 'alert') {
        fx.alert();
        setAlert({ text: p.text || 'ALERTA VERMELHO', id: Date.now() });
        later(() => setAlert(null), 3200);
      } else if (type === 'jump') {
        fx.jump();
        setWarp({ mode: 'jump', to: p.to, from: p.from, days: p.days });
        later(() => hyperspace(), 1300);
        later(() => setWarp((w) => (w?.mode === 'jump' ? { ...w, mode: 'tunnel' } : w)), 2200);
        later(() => setWarp((w) => (w?.mode === 'tunnel' ? null : w)), 6500);
      } else if (type === 'exit') {
        fx.exit();
        setWarp({ mode: 'exit', to: p.to });
        later(() => setWarp((w) => (w?.mode === 'exit' ? null : w)), 3200);
      } else if (type === 'codex') {
        sfx.notify();
        const id = crypto.randomUUID();
        setNotes((l) => [...l, { id, kind: 'codex', title: p.title }]);
        later(() => setNotes((l) => l.filter((x) => x.id !== id)), 6000);
      } else if (type === 'contract') {
        sfx.notify();
        const id = crypto.randomUUID();
        setNotes((l) => [...l, { id, kind: 'contract', title: p.title, text: p.text }]);
        later(() => setNotes((l) => l.filter((x) => x.id !== id)), 7000);
      } else if (type === 'medal') {
        fx.fanfare();
        setMedal({ ...p, id: Date.now() });
        later(() => setMedal(null), 7000);
      }
    };
    window.addEventListener('holocron:fx', on);
    return () => { window.removeEventListener('holocron:fx', on); timers.current.forEach(clearTimeout); };
  }, []);

  return (
    <>
      {alert && (
        <div key={alert.id} className="fx-alert" aria-live="assertive">
          <div className="fx-alert-text">{alert.text}</div>
        </div>
      )}

      {warp && (
        <div className={`fx-warp ${warp.mode}`}>
          {warp.mode === 'tunnel' && <div className="fx-tunnel" />}
          <div className="fx-warp-label">
            <div className="kicker">{warp.mode === 'exit' ? 'Saindo do hiperespaço' : 'Salto para o hiperespaço'}</div>
            {warp.to && <div className="fx-warp-dest">{warp.mode === 'exit' ? `Chegando a ${warp.to}` : `Destino: ${warp.to}`}</div>}
            {warp.mode !== 'exit' && warp.days ? <div className="tiny muted">Tempo de viagem estimado: {warp.days} dia{warp.days > 1 ? 's' : ''}</div> : null}
          </div>
        </div>
      )}

      {medal && (
        <div className="fx-medal" onClick={() => setMedal(null)}>
          <div className="fx-medal-inner">
            <div className="kicker">Cerimônia</div>
            <div className="fx-medal-badge"><MedalBadge medal={medal.medal} size={140} /></div>
            <h2 className="yellow" style={{ margin: '6px 0 2px' }}>{medal.medal?.name}</h2>
            <div>concedida a <b>{medal.character}</b></div>
            {medal.medal?.desc && <div className="small muted" style={{ marginTop: 4 }}>{medal.medal.desc}</div>}
          </div>
        </div>
      )}

      <div className="fx-notes">
        {notes.map((n) => (
          <div key={n.id} className="fx-note">
            <div className="kicker">{n.kind === 'codex' ? 'Holocron · novo registro' : 'HoloNet · Guilda'}</div>
            <div className="small"><b>{n.title}</b>{n.text ? ` — ${n.text}` : ''}</div>
          </div>
        ))}
      </div>

      {trans.map((t) => <Transmission key={t.id} t={t} onClose={() => setTrans((l) => l.filter((x) => x.id !== t.id))} />)}
    </>
  );
}

function Transmission({ t, onClose }) {
  const [shown, setShown] = useState(0);
  const text = String(t.text || '');
  useEffect(() => {
    if (shown >= text.length) return undefined;
    const ch = text[shown];
    const id = setTimeout(() => setShown((n) => n + 1), /[.,!?]/.test(ch) ? 140 : 32);
    return () => clearTimeout(id);
  }, [shown, text]);
  // some sozinha um tempo depois de terminar de "falar"
  useEffect(() => {
    if (shown < text.length) return undefined;
    const id = setTimeout(onClose, 25000);
    return () => clearTimeout(id);
  }, [shown >= text.length]);

  return (
    <div className={`fx-transmission ${t.tone === 'red' ? 'red' : ''}`} role="dialog" aria-label="Transmissão holográfica">
      <div className="fx-trans-head">
        <span className="kicker">{t.private ? 'Transmissão privada' : 'Transmissão recebida'}{t.echo ? ' · enviada' : ''}</span>
        <button className="btn sm ghost" onClick={onClose}>✕</button>
      </div>
      <div className="fx-trans-body">
        <Holo src={t.img || undefined} label={t.from || 'Desconhecido'} size={120} />
        <div className="fx-trans-text">
          <div className="fx-trans-from">{t.from || 'Sinal desconhecido'}</div>
          <p>{text.slice(0, shown)}<span className="fx-caret">▌</span></p>
          {shown < text.length && <button className="btn sm ghost" onClick={() => setShown(text.length)}>Mostrar tudo</button>}
        </div>
      </div>
    </div>
  );
}
