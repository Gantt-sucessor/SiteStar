import { useEffect, useRef } from 'react';
import { isMuted } from './sfx';

// ---------- Tema: o site escurece e avermelha conforme o Lado Sombrio cresce ----------
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const mix = (c1, c2, t) => c1.map((v, i) => lerp(v, c2[i], t));
const rgb = (c, a) => (a == null ? `rgb(${c.join(', ')})` : `rgba(${c.join(', ')}, ${a})`);

const VARS = ['--saber-blue', '--holo', '--line', '--line-strong', '--panel', '--panel-2', '--bg', '--muted', '--dim', '--darkside'];

export function darkSideVars(t) {
  // t de 0 a 1 (curva para a mudança ficar perceptível já nos primeiros pontos)
  const k = Math.min(1, Math.max(0, t)) ** 0.85;
  return {
    '--saber-blue': rgb(mix([58, 200, 255], [255, 52, 72], k)),
    '--holo': rgb(mix([127, 227, 255], [255, 120, 130], k)),
    '--line': rgb(mix([110, 190, 255], [255, 60, 80], k), (0.22 + 0.14 * k).toFixed(2)),
    '--line-strong': rgb(mix([110, 190, 255], [255, 70, 90], k), (0.5 + 0.1 * k).toFixed(2)),
    '--panel': rgb(mix([9, 15, 30], [26, 6, 10], k), 0.92),
    '--panel-2': rgb(mix([16, 26, 48], [40, 10, 16], k), 0.88),
    '--bg': rgb(mix([2, 3, 10], [10, 2, 4], k)),
    '--muted': rgb(mix([129, 147, 173], [190, 150, 155], k)), // continua legível
    '--dim': rgb(mix([85, 101, 126], [150, 105, 110], k)),
    '--darkside': k.toFixed(3),
  };
}

export function useDarkSideTheme(ratio, active) {
  useEffect(() => {
    const root = document.documentElement;
    if (!active || ratio <= 0) return undefined;
    const vars = darkSideVars(ratio);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.classList.add('darkside-active');
    root.classList.toggle('darkside-deep', ratio >= 0.75);
    root.classList.toggle('darkside-fallen', ratio >= 1);
    return () => {
      for (const k of VARS) root.style.removeProperty(k);
      root.classList.remove('darkside-active', 'darkside-deep', 'darkside-fallen');
    };
  }, [ratio, active]);
}

// ---------- Som: respiração mecânica sintetizada (ruído filtrado com envelope) ----------
let ctx;
const audio = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

function noiseBuffer(a, seconds) {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = 0.82 * last + 0.18 * (Math.random() * 2 - 1); data[i] = last * 3; }
  return buf;
}

// Uma respiração: inspiração mais aguda e curta, expiração mais grave e longa, com o "clique" da válvula
function breath(a, out, when, inhale, strength) {
  const dur = inhale ? 1.35 : 1.75;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, dur + 0.1);
  const band = a.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(inhale ? 1150 : 720, when);
  band.frequency.linearRampToValueAtTime(inhale ? 1500 : 560, when + dur);
  band.Q.value = inhale ? 1.6 : 1.1;
  const low = a.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = inhale ? 2600 : 1800;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(strength, when + 0.28);
  g.gain.setValueAtTime(strength * (inhale ? 0.95 : 0.85), when + dur - 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(band).connect(low).connect(g).connect(out);
  src.start(when);
  src.stop(when + dur + 0.05);
  // ressonância grave da máscara
  const hum = a.createOscillator();
  const hg = a.createGain();
  hum.type = 'sine';
  hum.frequency.value = inhale ? 95 : 78;
  hg.gain.setValueAtTime(0.0001, when);
  hg.gain.exponentialRampToValueAtTime(strength * 0.18, when + 0.3);
  hg.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  hum.connect(hg).connect(out);
  hum.start(when);
  hum.stop(when + dur + 0.05);
  // clique da válvula no fim
  const click = a.createOscillator();
  const cg = a.createGain();
  click.type = 'square';
  click.frequency.value = 160;
  cg.gain.setValueAtTime(0.0001, when + dur - 0.02);
  cg.gain.exponentialRampToValueAtTime(strength * 0.25, when + dur);
  cg.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.05);
  click.connect(cg).connect(out);
  click.start(when + dur - 0.03);
  click.stop(when + dur + 0.08);
  return dur;
}

// Toca a respiração em loop, com volume pelo nível do Lado Sombrio (0 a 1)
export function useDarkSideBreathing(ratio, active) {
  const level = useRef(ratio);
  const prev = useRef(ratio);
  level.current = ratio;

  useEffect(() => {
    if (!active || ratio <= 0) return undefined;
    let stopped = false;
    let timer;
    const cycle = () => {
      if (stopped) return;
      const r = level.current;
      if (r > 0 && !isMuted()) {
        try {
          const a = audio();
          const out = a.createGain();
          out.gain.value = 0.02 + 0.28 * Math.min(1, r) ** 1.3;
          out.connect(a.destination);
          const t0 = a.currentTime + 0.05;
          const d1 = breath(a, out, t0, true, 0.6);
          breath(a, out, t0 + d1 + 0.22, false, 0.7);
        } catch { /* áudio indisponível */ }
      }
      // fica mais lento e pesado conforme o lado sombrio cresce
      timer = setTimeout(cycle, 4200 + (1 - Math.min(1, level.current)) * 2500);
    };
    // navegadores só liberam áudio depois de uma interação
    const kick = () => { try { audio(); } catch { /* noop */ } };
    window.addEventListener('pointerdown', kick, { once: true });
    timer = setTimeout(cycle, 600);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('pointerdown', kick); };
  }, [active, ratio > 0]);

  // Ao ganhar um ponto de Lado Sombrio, uma respiração forte na hora
  useEffect(() => {
    if (active && ratio > prev.current && !isMuted()) {
      try {
        const a = audio();
        const out = a.createGain();
        out.gain.value = 0.08 + 0.3 * Math.min(1, ratio);
        out.connect(a.destination);
        const t0 = a.currentTime + 0.02;
        const d1 = breath(a, out, t0, true, 0.9);
        breath(a, out, t0 + d1 + 0.2, false, 1);
      } catch { /* noop */ }
    }
    prev.current = ratio;
  }, [ratio, active]);
}
