import { useEffect, useRef, useState } from 'react';

// Projeção holográfica de uma imagem: o efeito é todo em CSS, a foto original não é alterada.
// srcs: lista de URLs tentadas em ordem (ex.: .jpg, .png, .webp). Sem imagem, mostra o "sinal".
export default function Holo({ src, srcs, size = 160, label, caption, onClick, title }) {
  const list = srcs || (src ? [src] : []);
  const [idx, setIdx] = useState(0);
  const key = list.join('|');
  useEffect(() => setIdx(0), [key]);
  const current = list[idx];
  const failed = !current;

  return (
    <figure className={`holo ${onClick ? 'holo-click' : ''}`} style={{ '--holo-size': `${size}px` }} onClick={onClick} title={title}>
      <div className="holo-stage">
        <div className="holo-cone" />
        <div className={`holo-frame ${failed ? '' : 'has-img'}`}>
          {!failed ? (
            <img className="holo-img" src={current} alt={label || ''} loading="lazy" onError={() => setIdx((i) => i + 1)} draggable="false" />
          ) : (
            <div className="holo-empty">
              <div className="holo-empty-ring" />
              <span>{label ? label.split(' ').map((w) => w[0]).slice(0, 2).join('') : '?'}</span>
            </div>
          )}
          <div className="holo-scan" />
          <div className="holo-glitch" />
        </div>
        <div className="holo-base" />
      </div>
      {(caption || label) && (
        <figcaption className="holo-caption">
          {caption && <div className="kicker">{caption}</div>}
          {label && <div className="holo-label">{label}{failed && list.length > 0 ? ' · sinal fraco' : ''}</div>}
        </figcaption>
      )}
    </figure>
  );
}

// Reduz a foto enviada e devolve um data URL JPEG leve para guardar na ficha.
export function resizeImage(file, max = 360, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) { reject(new Error('Escolha um arquivo de imagem.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Holograma do retrato do personagem, com envio de foto quando editável
export function PortraitHolo({ data, set, editable, size = 150 }) {
  const input = useRef(null);
  const [error, setError] = useState('');
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setError(''); set({ portrait: await resizeImage(file) }); } catch (err) { setError(err.message); }
  };
  return (
    <div style={{ textAlign: 'center' }}>
      <Holo src={data.portrait} size={size} label={data.portrait ? undefined : (data.name || 'Sem foto')}
        onClick={editable ? () => input.current?.click() : undefined}
        title={editable ? 'Clique para enviar a foto do personagem' : undefined} />
      {editable && (
        <div className="row" style={{ justifyContent: 'center', gap: 4, marginTop: 4 }}>
          <button className="btn sm ghost" onClick={() => input.current?.click()}>{data.portrait ? 'Trocar foto' : 'Enviar foto'}</button>
          {data.portrait && <button className="btn sm ghost red" onClick={() => set({ portrait: null })}>Remover</button>}
        </div>
      )}
      {error && <div className="tiny red-text">{error}</div>}
      <input ref={input} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
    </div>
  );
}
