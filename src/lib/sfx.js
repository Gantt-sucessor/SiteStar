// Efeitos sonoros sintetizados com WebAudio (sem arquivos): bipes de dróide e zumbido de sabre.
let ctx;
const ac = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

const muted = () => {
  try { return localStorage.getItem('holocron:mute') === '1'; } catch { return false; }
};

function tone(freqs, { type = 'sine', dur = 0.08, gap = 0.02, vol = 0.06 } = {}) {
  if (muted()) return;
  try {
    const a = ac();
    let t = a.currentTime;
    for (const f of freqs) {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (1 + (Math.random() - 0.3) * 0.6), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + dur);
      t += dur + gap;
    }
  } catch { /* áudio indisponível */ }
}

export const sfx = {
  // bipes estilo astromecânico
  roll: () => tone([1800, 2400, 1500, 2900].sort(() => Math.random() - 0.5).slice(0, 3), { type: 'square', vol: 0.025 }),
  notify: () => tone([1200, 2600, 1900], { type: 'sine', dur: 0.07, vol: 0.05 }),
  crit: () => tone([660, 880, 1320, 1760], { type: 'triangle', dur: 0.1, vol: 0.06 }),
  saber: () => {
    if (muted()) return;
    try {
      const a = ac();
      const t = a.currentTime;
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const g = a.createGain();
      o.type = 'sawtooth'; o2.type = 'sawtooth';
      o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + 0.35);
      o2.frequency.setValueAtTime(73, t); o2.frequency.linearRampToValueAtTime(113, t + 0.35);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); o2.connect(g); g.connect(a.destination);
      o.start(t); o2.start(t); o.stop(t + 0.6); o2.stop(t + 0.6);
    } catch { /* noop */ }
  },
};

export function toggleMute() {
  const next = !muted();
  try { localStorage.setItem('holocron:mute', next ? '1' : '0'); } catch { /* noop */ }
  return next;
}
export const isMuted = muted;
