import { useEffect, useRef, useState } from 'react';
import Starfield from './Starfield';

export const DEFAULT_CRAWL = {
  episode: 'EPISÓDIO I',
  title: 'O DESPERTAR DO HOLOCRON',
  text: [
    'É um período de guerra civil. Mesas de jogo espalhadas por toda a galáxia se reúnem em segredo para desafiar o tédio de mais uma noite comum.',
    'Durante a batalha, jogadores rebeldes conseguiram roubar os planos secretos do HOLOCRON, um terminal ancestral capaz de guardar fichas, rolar dados e transmitir cada resultado diretamente ao Mestre do Jogo.',
    'Perseguidos pelos sinistros agentes da Lei de Murphy, os heróis correm para criar seus personagens, decididos a salvar sua campanha e restaurar a liberdade na galáxia....',
  ].join('\n\n'),
};

const MUSIC_SRC = '/audio/tema.mp3';

// Abertura no estilo dos filmes: prompt → "Há muito tempo..." → logo encolhendo → texto em perspectiva.
export default function Crawl({ crawl = DEFAULT_CRAWL, onDone, autoStart = false }) {
  const [phase, setPhase] = useState(autoStart ? 'intro' : 'prompt');
  const [fading, setFading] = useState(false);
  const audioRef = useRef(null);
  const timers = useRef([]);
  const done = useRef(false);

  const paragraphs = String(crawl.text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const words = paragraphs.join(' ').split(/\s+/).length;
  const duration = Math.min(95, Math.max(40, 22 + words * 0.42));

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setFading(true);
    const a = audioRef.current;
    if (a) {
      const step = () => {
        if (a.volume > 0.06) { a.volume = Math.max(0, a.volume - 0.06); setTimeout(step, 80); } else a.pause();
      };
      step();
    }
    later(() => onDone?.(), 1500);
  };

  const start = () => {
    setPhase('intro');
  };

  useEffect(() => {
    if (phase !== 'intro') return;
    // o tema começa junto com o logo, como nos filmes
    later(() => {
      setPhase('main');
      const a = new Audio(MUSIC_SRC);
      a.volume = 0.75;
      audioRef.current = a;
      a.play().catch(() => { /* sem arquivo de música ou autoplay bloqueado */ });
    }, 6200);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'main') return;
    later(finish, (duration + 4) * 1000);
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      timers.current.forEach(clearTimeout);
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="crawl-root" role="dialog" aria-label="Abertura">
      <Starfield speed={0.04} density={1.3} />

      {phase === 'prompt' && (
        <div className="crawl-prompt">
          <div>
            <div className="kicker">Transmissão recebida</div>
            <p className="muted" style={{ marginTop: 10 }}>Aumente o volume.</p>
            <button className="btn lg yellow primary" onClick={start} autoFocus>Iniciar abertura</button>
            <div style={{ marginTop: 14 }}>
              <button className="btn ghost sm" onClick={() => { done.current = true; onDone?.(); }}>Pular</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'intro' && (
        <div className="crawl-intro">
          <p>Há muito tempo, numa galáxia muito,<br />muito distante....</p>
        </div>
      )}

      {phase === 'main' && (
        <>
          <div className="crawl-logo">
            <div className="logo"><span>STAR</span><span>WARS</span></div>
          </div>
          <div className="crawl-perspective">
            <div className="crawl-plane">
              <div className="crawl-text" style={{ '--crawl-dur': `${duration}s`, animationDelay: '2s' }}>
                {crawl.episode && <div className="ep">{crawl.episode}</div>}
                {crawl.title && <h1>{crawl.title}</h1>}
                {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>
        </>
      )}

      {phase !== 'prompt' && (
        <div className="crawl-controls">
          <button className="btn sm ghost" onClick={finish}>Pular ⏭</button>
        </div>
      )}
      <div className={`crawl-fade ${fading ? 'on' : ''}`} />
    </div>
  );
}
