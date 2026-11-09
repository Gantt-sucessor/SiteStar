import { useEffect, useState } from 'react';
import { RollBreakdown, RollTitle, rollTone } from './RollDisplay';
import { sfx } from '../lib/sfx';

// Mostra cada rolagem (local ou recebida em tempo real) como um holograma no canto da tela.
export default function RollToasts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const push = (e) => {
      const entry = e.detail;
      const id = entry.id ?? Math.random();
      if (entry.result?.natural === 20) sfx.crit();
      setItems((list) => [...list.slice(-4), { ...entry, _id: id }]);
      setTimeout(() => setItems((list) => list.filter((x) => x._id !== id)), entry.remote ? 8000 : 6000);
    };
    window.addEventListener('holocron:roll', push);
    window.addEventListener('holocron:remote-roll', push);
    return () => {
      window.removeEventListener('holocron:roll', push);
      window.removeEventListener('holocron:remote-roll', push);
    };
  }, []);

  return (
    <div className="toasts" aria-live="polite">
      {items.map((e) => (
        <div key={e._id} className={`toast ${rollTone(e)}`} onClick={() => setItems((l) => l.filter((x) => x._id !== e._id))}>
          <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <div style={{ minWidth: 0 }}>
              {e.remote && <div className="kicker" style={{ marginBottom: 2 }}>Transmissão</div>}
              <RollTitle entry={e} />
              <RollBreakdown result={e.result} />
            </div>
            <div className={`roll-total spin ${rollTone(e) === 'crit' ? 'green-text' : rollTone(e) === 'fumble' ? 'red-text' : ''}`}>{e.total}</div>
          </div>
          {e.result?.natural === 20 && <div className="tiny green-text mono" style={{ marginTop: 4 }}>20 NATURAL — QUE A FORÇA ESTEJA COM VOCÊ</div>}
          {e.result?.natural === 1 && <div className="tiny red-text mono" style={{ marginTop: 4 }}>1 NATURAL — EU TENHO UM MAU PRESSENTIMENTO SOBRE ISSO</div>}
          {e.result?.extra && <div className="tiny muted" style={{ marginTop: 4 }}>{e.result.extra}</div>}
        </div>
      ))}
    </div>
  );
}
