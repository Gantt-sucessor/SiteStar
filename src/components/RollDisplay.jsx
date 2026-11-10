import { fmtMod } from '../lib/dice';

export function rollTone(entry) {
  const nat = entry.result?.natural;
  if (nat === 20) return 'crit';
  if (nat === 1) return 'fumble';
  return '';
}

export function RollBreakdown({ result }) {
  if (!result?.parts) return null;
  return (
    <span className="roll-detail">
      {result.parts.map((p, i) => {
        if (p.type === 'mod') return <span key={i}> {fmtMod(p.value)}</span>;
        return (
          <span key={i}>
            {i > 0 ? (p.sign < 0 ? ' − ' : ' + ') : p.sign < 0 ? '−' : ''}
            {p.count}d{p.sides}[
            {p.rolls.map((r, j) => (
              <span key={j} className={`die ${!p.kept.includes(j) ? 'drop' : r === p.sides ? 'max' : r === 1 ? 'min' : ''}`}>{r}</span>
            ))}]
          </span>
        );
      })}
      {result.mult > 1 && <span> = {result.subtotal} <b>×{result.mult}</b></span>}
    </span>
  );
}

export function RollTitle({ entry, showChar = true }) {
  return (
    <div className="small">
      {showChar && entry.character_name && <b className="yellow">{entry.character_name} · </b>}
      {!entry.character_name && entry.player_name && showChar && <b className="yellow">{entry.player_name} · </b>}
      <span>{entry.label || 'Rolagem'}</span>
      {entry.hidden && <span className="tag red" style={{ marginLeft: 6 }}>secreta</span>}
    </div>
  );
}
