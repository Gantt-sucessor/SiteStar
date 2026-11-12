// Sons de imersão sintetizados com WebAudio (sem arquivos): alerta, hiperespaço, sabre, holograma, medalha, fichas.
import { isMuted } from './sfx';

let ctx;
const ac = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

const play = (fn) => {
  if (isMuted()) return;
  try { fn(ac()); } catch { /* áudio indisponível */ }
};

function noise(a, seconds, smooth = 0) {
  const len = Math.max(1, Math.floor(a.sampleRate * seconds));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = smooth * last + (1 - smooth) * (Math.random() * 2 - 1); d[i] = last; }
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(a, g, t, peak, attack, hold, release) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

// Cores de cristal: frequência base do zumbido (cada cor com um timbre um pouco diferente)
const SABER_PITCH = { azul: 92, verde: 98, roxo: 86, amarelo: 104, laranja: 100, branco: 110, vermelho: 70, preto: 62 };

export const fx = {
  // Sirene de alerta da nave: dois tons alternando, 3 ciclos
  alert: () => play((a) => {
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    const f = a.createBiquadFilter();
    o.type = 'sawtooth';
    f.type = 'lowpass'; f.frequency.value = 1800;
    for (let i = 0; i < 6; i++) {
      o.frequency.setValueAtTime(i % 2 ? 520 : 780, t + i * 0.42);
      o.frequency.linearRampToValueAtTime(i % 2 ? 560 : 740, t + i * 0.42 + 0.4);
    }
    env(a, g, t, 0.08, 0.03, 2.4, 0.2);
    o.connect(f).connect(g).connect(a.destination);
    o.start(t); o.stop(t + 2.7);
  }),

  // Entrada no hiperespaço: motor subindo + estrondo do salto
  jump: () => play((a) => {
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(40, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 1.6);
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(3000, t + 1.6);
    env(a, g, t, 0.07, 0.3, 1.1, 0.4);
    o.connect(lp).connect(g).connect(a.destination);
    o.start(t); o.stop(t + 2);
    const n = noise(a, 1.6, 0.6);
    const ng = a.createGain();
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(200, t + 1.4); bp.frequency.exponentialRampToValueAtTime(60, t + 2.9);
    env(a, ng, t + 1.4, 0.5, 0.04, 0.2, 1.3);
    n.connect(bp).connect(ng).connect(a.destination);
    n.start(t + 1.4); n.stop(t + 3);
  }),

  // Saída do hiperespaço: chiado descendo
  exit: () => play((a) => {
    const t = a.currentTime;
    const n = noise(a, 1.4, 0.3);
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(120, t + 1.2);
    const g = a.createGain();
    env(a, g, t, 0.25, 0.02, 0.2, 1);
    n.connect(bp).connect(g).connect(a.destination);
    n.start(t); n.stop(t + 1.4);
  }),

  // Sabre ligando: zumbido subindo com "estalo" inicial
  saberOn: (color = 'azul') => play((a) => {
    const t = a.currentTime;
    const base = SABER_PITCH[color] || 92;
    const g = a.createGain();
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
    for (const det of [0, 3.1]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * 0.4, t);
      o.frequency.exponentialRampToValueAtTime(base + det, t + 0.3);
      o.connect(lp);
      o.start(t); o.stop(t + 1.1);
    }
    env(a, g, t, 0.07, 0.06, 0.55, 0.45);
    lp.connect(g).connect(a.destination);
    const n = noise(a, 0.12);
    const ng = a.createGain();
    env(a, ng, t, 0.12, 0.005, 0.02, 0.09);
    n.connect(ng).connect(a.destination);
    n.start(t);
  }),

  // Golpe de sabre: zumbido com efeito Doppler
  saberSwing: (color = 'azul') => play((a) => {
    const t = a.currentTime;
    const base = SABER_PITCH[color] || 92;
    const g = a.createGain();
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(1600, t + 0.15); bp.frequency.exponentialRampToValueAtTime(400, t + 0.45);
    for (const det of [0, 2.4]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base + det, t);
      o.frequency.linearRampToValueAtTime((base + det) * 1.6, t + 0.15);
      o.frequency.linearRampToValueAtTime((base + det) * 0.9, t + 0.45);
      o.connect(bp);
      o.start(t); o.stop(t + 0.5);
    }
    env(a, g, t, 0.14, 0.05, 0.1, 0.3);
    bp.connect(g).connect(a.destination);
  }),

  saberOff: (color = 'azul') => play((a) => {
    const t = a.currentTime;
    const base = SABER_PITCH[color] || 92;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.35, t + 0.4);
    env(a, g, t, 0.06, 0.01, 0.15, 0.25);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.45);
  }),

  // Chiado de transmissão holográfica
  holo: () => play((a) => {
    const t = a.currentTime;
    for (let i = 0; i < 3; i++) {
      const n = noise(a, 0.09);
      const hp = a.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2500;
      const g = a.createGain();
      env(a, g, t + i * 0.13, 0.08, 0.005, 0.04, 0.04);
      n.connect(hp).connect(g).connect(a.destination);
      n.start(t + i * 0.13);
    }
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, t + 0.4); o.frequency.setValueAtTime(1320, t + 0.5);
    env(a, g, t + 0.4, 0.04, 0.01, 0.15, 0.05);
    o.connect(g).connect(a.destination);
    o.start(t + 0.4); o.stop(t + 0.7);
  }),

  // Fanfarra curta (acordes de metais sintetizados) para medalhas
  fanfare: () => play((a) => {
    const t = a.currentTime;
    const notes = [[392, 0, 0.22], [523, 0.22, 0.22], [659, 0.44, 0.22], [784, 0.66, 0.9]];
    for (const [f, at, dur] of notes) {
      for (const mul of [1, 1.5, 2]) {
        const o = a.createOscillator();
        const g = a.createGain();
        const lp = a.createBiquadFilter();
        o.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 1400;
        o.frequency.value = f * (mul === 1.5 ? 0.75 : mul === 2 ? 0.5 : 1);
        env(a, g, t + at, mul === 1 ? 0.05 : 0.025, 0.03, dur - 0.08, 0.2);
        o.connect(lp).connect(g).connect(a.destination);
        o.start(t + at); o.stop(t + at + dur + 0.25);
      }
    }
  }),

  // Fichas e cartas na mesa de sabacc
  chips: () => play((a) => {
    const t = a.currentTime;
    for (let i = 0; i < 4; i++) {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'triangle';
      o.frequency.value = 2400 + Math.random() * 1600;
      env(a, g, t + i * 0.06, 0.04, 0.002, 0.01, 0.05);
      o.connect(g).connect(a.destination);
      o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.08);
    }
  }),

  // Roda girando: cliques desacelerando
  wheel: (seconds = 2.4) => play((a) => {
    const t = a.currentTime;
    let at = 0;
    let step = 0.04;
    while (at < seconds) {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'square'; o.frequency.value = 1900;
      env(a, g, t + at, 0.02, 0.001, 0.005, 0.02);
      o.connect(g).connect(a.destination);
      o.start(t + at); o.stop(t + at + 0.03);
      at += step;
      step *= 1.09;
    }
  }),
};

export const SABER_COLORS = [
  ['azul', 'Azul', '#3ac8ff'],
  ['verde', 'Verde', '#4dff7a'],
  ['roxo', 'Roxo', '#b46bff'],
  ['amarelo', 'Amarelo', '#ffe14d'],
  ['laranja', 'Laranja', '#ff9a3a'],
  ['branco', 'Branco', '#f2f6ff'],
  ['vermelho', 'Vermelho (sintético)', '#ff3348'],
  ['preto', 'Sabre negro', '#1a1a22'],
];
export const saberHex = (c) => (SABER_COLORS.find(([k]) => k === c) || SABER_COLORS[0])[2];
