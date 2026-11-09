import { useEffect, useRef } from 'react';

// Campo de estrelas em canvas. Dispare window.dispatchEvent(new Event('holocron:warp')) para saltar ao hiperespaço.
export default function Starfield({ density = 1, speed = 0.25, className = 'starfield' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, cx, cy, stars, raf;
    let warp = 0; // 0..1
    let warpTarget = 0;
    let warpUntil = 0;

    const make = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      cx = w / 2; cy = h / 2;
      const count = Math.floor(((w * h) / 9000) * density);
      stars = Array.from({ length: count }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: (Math.random() - 0.5) * w * 2,
      y: (Math.random() - 0.5) * h * 2,
      z: anywhere ? Math.random() * w : w,
      pz: 0,
      hue: Math.random() < 0.12 ? (Math.random() < 0.5 ? 200 : 40) : 0,
      size: Math.random() * 1.2 + 0.3,
    });

    const onWarp = () => { warpTarget = 1; warpUntil = performance.now() + 1100; };
    window.addEventListener('holocron:warp', onWarp);
    window.addEventListener('resize', make);
    make();

    const frame = (t) => {
      if (warpUntil && t > warpUntil) { warpTarget = 0; warpUntil = 0; }
      warp += (warpTarget - warp) * 0.08;
      const v = (reduce ? 0 : speed) + warp * 45;
      ctx.fillStyle = warp > 0.05 ? `rgba(2,3,10,${0.35 - warp * 0.2})` : '#02030a';
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        s.pz = s.z;
        s.z -= v * (w / 1400);
        if (s.z < 1) { Object.assign(s, spawn(false)); s.pz = s.z; continue; }
        const k = 128 / s.z;
        const sx = s.x * k * (w / 1000) + cx;
        const sy = s.y * k * (w / 1000) + cy;
        if (sx < 0 || sx > w || sy < 0 || sy > h) { if (warp < 0.05 && !reduce) { Object.assign(s, spawn(false)); } continue; }
        const r = Math.max(0.25, (1 - s.z / w) * 2.2 * s.size);
        const alpha = Math.min(1, (1 - s.z / w) * 1.4);
        const color = s.hue ? `hsla(${s.hue},90%,80%,${alpha})` : `rgba(235,242,255,${alpha})`;
        if (warp > 0.05) {
          const pk = 128 / s.pz;
          const px = s.x * pk * (w / 1000) + cx;
          const py = s.y * pk * (w / 1000) + cy;
          ctx.strokeStyle = `rgba(200,235,255,${alpha})`;
          ctx.lineWidth = r;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('holocron:warp', onWarp);
      window.removeEventListener('resize', make);
    };
  }, [density, speed]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export function hyperspace() {
  window.dispatchEvent(new Event('holocron:warp'));
  const flash = document.querySelector('.warp-flash');
  if (flash) { flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on'); }
}
