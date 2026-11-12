import { useMemo, useState } from 'react';
import { useLiveCharacter } from '../lib/useLiveCharacter';
import { derive } from '../lib/character';
import { sendRoll } from '../lib/rolls';
import { roll as rollDice, fmtMod, d20Formula } from '../lib/dice';
import { fx } from '../lib/fx';
import { Panel } from './Sheet';

// Regras de "Jogando" (Cap. 3, box do Vigarista):
// contra a casa: teste de Sabedoria na tabela; contra outros: maior teste vence e a diferença define quanto se perde;
// pura sorte: só 1d20.
export const HOUSE_TABLE = [
  [0, 4, 0, 'Perde toda a aposta'],
  [5, 9, 0.5, 'Perde metade da aposta'],
  [10, 14, 1, 'Chegou perto; mantém a aposta'],
  [15, 19, 2, 'Vence a aposta ×2'],
  [20, 24, 5, 'Vence a aposta ×5'],
  [25, 999, 10, 'Vence a aposta ×10'],
];
export const LUCK_TABLE = [
  [1, 15, 0, 'Perde toda a aposta'],
  [16, 16, 0.5, 'Perde metade da aposta'],
  [17, 17, 1, 'Chegou perto; mantém a aposta'],
  [18, 18, 2, 'Vence a aposta ×2'],
  [19, 19, 5, 'Vence a aposta ×5'],
  [20, 20, 10, 'Vence a aposta ×10'],
];
const lookup = (table, n) => table.find(([a, b]) => n >= a && n <= b) || table[0];

// Ganho líquido: "Vence a aposta ×2" paga 2× o valor apostado
export function houseNet(bet, mult) {
  if (mult === 0) return -bet;
  if (mult === 0.5) return -Math.floor(bet / 2);
  if (mult === 1) return 0;
  return bet * mult;
}

export function opposedNet(bet, myTotal, theirTotal, theirBet) {
  if (myTotal === theirTotal) return { net: 0, text: 'Empate: dividem o montante (cada um fica com a sua aposta).' };
  const diff = Math.abs(myTotal - theirTotal);
  const share = diff >= 10 ? 1 : diff >= 5 ? 0.5 : 0;
  const label = diff >= 10 ? 'perdeu tudo' : diff >= 5 ? 'entrega metade' : 'chegou perto, mantém a aposta';
  if (myTotal > theirTotal) return { net: Math.floor(theirBet * share), text: `Você venceu por ${diff}: o oponente ${label}.` };
  return { net: -Math.floor(bet * share), text: `O oponente venceu por ${diff}: você ${label}.` };
}

const OPPONENTS = [
  ['Novato da cantina', 0],
  ['Jogador experiente', 3],
  ['Profissional de sabacc', 6],
  ['Trapaceiro lendário', 9],
];
const SUITS = ['Sabres', 'Frascos', 'Moedas', 'Cajados'];
const SUIT_ICON = { Sabres: '⚔', Frascos: '⚱', Moedas: '◎', Cajados: '⚚' };
const randCard = () => ({ suit: SUITS[Math.floor(Math.random() * 4)], value: Math.floor(Math.random() * 15) + 1 });

export default function Cantina({ characterId, campaignId }) {
  const { row, setData } = useLiveCharacter(characterId);
  const [game, setGame] = useState('sabacc');
  const [bet, setBet] = useState(100);
  const [opp, setOpp] = useState(1);
  const [result, setResult] = useState(null);
  const [spin, setSpin] = useState(0);
  const [busy, setBusy] = useState(false);
  const d = useMemo(() => (row ? derive(row.data) : null), [row?.data]);
  if (!row || !d) return <div className="loader"><div className="saber" /></div>;

  const data = row.data;
  const credits = data.credits || 0;
  const gambler = (data.talents || []).filter((t) => t === 'Jogador').length * 2;
  const wisMod = d.mods.sab + d.condition.penalty + gambler;
  const character = { id: row.id, name: data.name || 'Sem nome' };
  const amount = Math.max(0, Math.floor(Number(bet) || 0));
  const canBet = amount > 0 && amount <= credits && !busy;

  const pay = (net) => setData({ ...data, credits: Math.max(0, credits + net) });

  const playHouse = async () => {
    setBusy(true);
    setResult(null);
    const e = await sendRoll({ formula: d20Formula(wisMod), label: `Roda de Jubilee · aposta ${amount} cr`, kind: 'gamble', campaignId, character });
    const [, , mult, text] = lookup(HOUSE_TABLE, e.total);
    const seg = HOUSE_TABLE.findIndex((r) => r[2] === mult);
    fx.wheel(2.6);
    // gira várias voltas e para no setor do resultado
    setSpin((s) => s - (s % 360) + 360 * 5 + (360 - (seg * 60 + 30)));
    setTimeout(() => {
      const net = houseNet(amount, mult);
      pay(net);
      setResult({ total: e.total, text, net });
      if (net > 0) fx.chips();
      setBusy(false);
    }, 2700);
  };

  const playSabacc = async () => {
    setBusy(true);
    fx.chips();
    const [oppName, oppMod] = OPPONENTS[opp];
    const mine = await sendRoll({ formula: d20Formula(wisMod), label: `Sabacc contra ${oppName} · aposta ${amount} cr`, kind: 'gamble', campaignId, character });
    const theirs = rollDice(d20Formula(oppMod));
    const r = opposedNet(amount, mine.total, theirs.total, amount);
    pay(r.net);
    setResult({
      total: mine.total, other: theirs.total, oppName, text: r.text, net: r.net,
      hands: { mine: [randCard(), randCard()], theirs: [randCard(), randCard()] },
    });
    setBusy(false);
  };

  const playLuck = async () => {
    setBusy(true);
    const e = await sendRoll({ formula: '1d20', label: `Jogo de pura sorte · aposta ${amount} cr`, kind: 'gamble', campaignId, character });
    const [, , mult, text] = lookup(LUCK_TABLE, e.total);
    const net = houseNet(amount, mult);
    pay(net);
    if (net > 0) fx.chips();
    setResult({ total: e.total, text, net });
    setBusy(false);
  };

  const play = game === 'jubilee' ? playHouse : game === 'sabacc' ? playSabacc : playLuck;

  return (
    <div className="grid cantina-layout">
      <Panel title="Cantina" className="yellow">
        <p className="small muted" style={{ marginTop: 0 }}>Aposte os créditos de <b>{character.name}</b>. As regras são as do livro (box Jogando, do Vigarista) e o mestre vê cada rolagem.</p>
        <div className="tabs" style={{ marginBottom: 10 }}>
          {[['sabacc', 'Sabacc'], ['jubilee', 'Roda de Jubilee'], ['sorte', 'Pura sorte']].map(([k, l]) => (
            <button key={k} className={`tab ${game === k ? 'active' : ''}`} onClick={() => { setGame(k); setResult(null); }}>{l}</button>
          ))}
        </div>
        <div className="row between">
          <span className="small">Créditos: <b className="yellow mono">{credits.toLocaleString('pt-BR')}</b></span>
          {game !== 'sorte' && <span className="small">Sabedoria {fmtMod(wisMod)}{gambler ? ` (inclui Jogador +${gambler})` : ''}</span>}
        </div>
        <div className="row" style={{ marginTop: 10, gap: 6 }}>
          <label className="field" style={{ width: 140 }}>Aposta
            <input type="number" min="1" max={credits} step="10" value={bet} onChange={(e) => setBet(e.target.value)} />
          </label>
          {[50, 100, 500, 1000].map((v) => <button key={v} className="btn sm ghost" disabled={v > credits} onClick={() => setBet(v)}>{v}</button>)}
        </div>
        {game === 'sabacc' && (
          <label className="field" style={{ marginTop: 8 }}>Oponente
            <select value={opp} onChange={(e) => setOpp(Number(e.target.value))}>
              {OPPONENTS.map(([n, m], i) => <option key={n} value={i}>{n} (Sabedoria {fmtMod(m)})</option>)}
            </select>
          </label>
        )}
        <button className="btn yellow primary" style={{ marginTop: 12, width: '100%' }} disabled={!canBet} onClick={play}>
          {busy ? '...' : game === 'sabacc' ? 'Dar as cartas' : game === 'jubilee' ? 'Girar a roda' : 'Rolar a sorte'}
        </button>
        {amount > credits && <div className="tiny red-text" style={{ marginTop: 4 }}>Créditos insuficientes.</div>}
        <details style={{ marginTop: 12 }}>
          <summary className="tiny muted" style={{ cursor: 'pointer' }}>Tabelas do livro</summary>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            {game === 'sabacc' && <div>Cada um faz um teste de Sabedoria. O maior vence. Diferença 1-4: o perdedor mantém a aposta; 5-9: entrega metade; 10 ou mais: entrega tudo. Contra outro jogador, rolem os dois e o mestre acerta os créditos.</div>}
            {game === 'jubilee' && HOUSE_TABLE.map(([a, b, , t]) => <div key={a}>{b >= 999 ? `${a}+` : `${a}-${b}`}: {t}</div>)}
            {game === 'sorte' && LUCK_TABLE.map(([a, b, , t]) => <div key={a}>{a === b ? a : `${a}-${b}`}: {t}</div>)}
          </div>
        </details>
      </Panel>

      <Panel title={game === 'sabacc' ? 'Mesa de sabacc' : game === 'jubilee' ? 'Roda de Jubilee' : 'Pura sorte'} className="scanlines">
        {game === 'jubilee' && (
          <div className="jubilee">
            <div className="jubilee-pointer">▼</div>
            <div className="jubilee-wheel" style={{ transform: `rotate(${spin}deg)` }}>
              {HOUSE_TABLE.map(([, , m], i) => (
                <span key={i} style={{ transform: `rotate(${i * 60 + 30}deg) translateY(-82px)` }}>{m === 0 ? '✖' : m === 0.5 ? '½' : m === 1 ? '=' : `×${m}`}</span>
              ))}
            </div>
          </div>
        )}
        {game === 'sabacc' && result?.hands && (
          <div className="sabacc-table">
            <div className="sabacc-side">
              <div className="kicker">{result.oppName}</div>
              <div className="sabacc-hand">{result.hands.theirs.map((c, i) => <SabaccCard key={i} c={c} />)}</div>
              <div className="mono">{result.other}</div>
            </div>
            <div className="sabacc-side">
              <div className="kicker">{character.name}</div>
              <div className="sabacc-hand">{result.hands.mine.map((c, i) => <SabaccCard key={i} c={c} />)}</div>
              <div className="mono">{result.total}</div>
            </div>
          </div>
        )}
        {game === 'sabacc' && !result && <div className="empty small">Sente-se, escolha a aposta e peça as cartas.</div>}
        {game === 'sorte' && !result && <div className="empty small">Dados, cartas marcadas, corridas de swoop: só o d20 decide.</div>}
        {result && (
          <div className={`gamble-result ${result.net > 0 ? 'win' : result.net < 0 ? 'lose' : ''}`}>
            <div className="kicker">Resultado {result.total}</div>
            <div>{result.text}</div>
            <div className="gamble-net">{result.net > 0 ? `+${result.net.toLocaleString('pt-BR')}` : result.net < 0 ? result.net.toLocaleString('pt-BR') : '±0'} créditos</div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function SabaccCard({ c }) {
  return (
    <div className={`sabacc-card suit-${c.suit.toLowerCase()}`}>
      <span className="v">{c.value}</span>
      <span className="s">{SUIT_ICON[c.suit]}</span>
      <span className="n">{c.suit}</span>
    </div>
  );
}
