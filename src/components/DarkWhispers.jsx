import { useEffect, useRef, useState } from 'react';

const WHISPERS = [
  'Deixe o ódio fluir...',
  'Eles nunca entenderam você.',
  'Por que se conter?',
  'O poder está ao seu alcance.',
  'Seus amigos vão te trair.',
  'Só os fortes sobrevivem.',
  'A paz é uma mentira.',
  'Você merece mais.',
  'Ninguém pode te parar.',
  'Ceda à raiva.',
  'Eles temem o que você está se tornando.',
  'A misericórdia é fraqueza.',
  'Mais um passo...',
  'Você já sabe o que fazer.',
  'O medo deles alimenta você.',
];

// Frases que surgem e somem pela tela quando a corrupção passa da metade.
// Ficam mais frequentes conforme o Lado Sombrio cresce.
export default function DarkWhispers({ level }) {
  const [items, setItems] = useState([]);
  const lv = useRef(level);
  lv.current = level;
  const active = level > 0.5;

  useEffect(() => {
    if (!active) { setItems([]); return undefined; }
    let timer;
    let stopped = false;
    const next = () => {
      if (stopped) return;
      const id = Math.random().toString(36).slice(2);
      const text = WHISPERS[Math.floor(Math.random() * WHISPERS.length)];
      const item = { id, text, x: 6 + Math.random() * 70, y: 10 + Math.random() * 75, rot: (Math.random() - 0.5) * 8, size: 0.95 + Math.random() * 0.6 };
      setItems((l) => [...l.slice(-2), item]);
      setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 6000);
      const k = Math.min(1, (lv.current - 0.5) * 2); // 0 em 50%, 1 em 100%
      timer = setTimeout(next, 16000 - k * 10000 + Math.random() * 5000);
    };
    timer = setTimeout(next, 2500);
    return () => { stopped = true; clearTimeout(timer); };
  }, [active]);

  if (!active) return null;
  return (
    <div className="dark-whispers" aria-hidden="true">
      {items.map((w) => (
        <span key={w.id} className="dark-whisper" style={{ left: `${w.x}%`, top: `${w.y}%`, transform: `rotate(${w.rot}deg)`, fontSize: `${w.size}rem` }}>{w.text}</span>
      ))}
    </div>
  );
}
