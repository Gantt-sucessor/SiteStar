import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import Holo, { resizeImage } from './Holo';
import { Panel } from './Sheet';

export const CODEX_CATEGORIES = ['História', 'Pessoas', 'Lugares', 'Facções', 'Relíquias', 'Criaturas', 'A Força'];

// Cubo do holocron girando (CSS 3D)
export function HolocronCube({ size = 90, sith = false }) {
  return (
    <div className={`holocron-cube ${sith ? 'sith' : ''}`} style={{ '--cube': `${size}px` }} aria-hidden="true">
      <div className="cube">
        {['f', 'b', 'l', 'r', 't', 'd'].map((s) => <div key={s} className={`face ${s}`} />)}
      </div>
    </div>
  );
}

// Visão do jogador: lê os registros desbloqueados pelo mestre
export function CodexReader({ entries = [] }) {
  const [open, setOpen] = useState(null);
  const [cat, setCat] = useState('');
  const sorted = [...entries].sort((a, b) => String(b.unlockedAt || '').localeCompare(String(a.unlockedAt || '')));
  const list = cat ? sorted.filter((e) => e.category === cat) : sorted;
  const current = entries.find((e) => e.id === open);
  const cats = CODEX_CATEGORIES.filter((c) => entries.some((e) => e.category === c));
  return (
    <div className="grid codex-layout">
      <Panel title="Holocron" className="scanlines">
        <div style={{ display: 'grid', placeItems: 'center', margin: '6px 0 14px' }}><HolocronCube /></div>
        {entries.length === 0 ? <div className="empty small">O holocron está selado. O mestre libera registros conforme vocês descobrem a galáxia.</div> : (
          <>
            {cats.length > 1 && (
              <div className="row" style={{ gap: 4, marginBottom: 8 }}>
                <button className={`btn sm ${!cat ? 'primary' : 'ghost'}`} onClick={() => setCat('')}>Tudo</button>
                {cats.map((c) => <button key={c} className={`btn sm ${cat === c ? 'primary' : 'ghost'}`} onClick={() => setCat(c)}>{c}</button>)}
              </div>
            )}
            <div className="list">
              {list.map((e) => (
                <button key={e.id} className={`list-row list-button ${open === e.id ? 'active' : ''}`} onClick={() => setOpen(e.id)}>
                  <div><div className="name small">{e.title}</div><div className="sub">{e.category}</div></div>
                </button>
              ))}
            </div>
          </>
        )}
      </Panel>
      <Panel title={current ? current.title : 'Registro'}>
        {current ? <CodexEntryView key={current.id} e={current} /> : <div className="empty small">Escolha um registro para projetar.</div>}
      </Panel>
    </div>
  );
}

function CodexEntryView({ e }) {
  const [shown, setShown] = useState(0);
  const text = String(e.text || '');
  useEffect(() => {
    if (shown >= text.length) return undefined;
    const id = setTimeout(() => setShown((n) => Math.min(text.length, n + 3)), 14);
    return () => clearTimeout(id);
  }, [shown, text]);
  return (
    <div className="codex-entry">
      <div className="kicker">{e.category}</div>
      {e.image && <div style={{ textAlign: 'center', margin: '8px 0' }}><Holo src={e.image} size={170} /></div>}
      <div className="codex-text" onClick={() => setShown(text.length)}>{text.slice(0, shown)}{shown < text.length && <span className="fx-caret">▌</span>}</div>
    </div>
  );
}

// Visão do mestre: escreve registros em segredo e desbloqueia para os jogadores
export function CodexEditor({ campaign, onSaveUnlocked, send }) {
  const [drafts, setDrafts] = useState(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null);
  const input = useRef(null);
  const unlocked = campaign.codex || [];

  useEffect(() => {
    supabase.from('campaign_secrets').select('codex').eq('campaign_id', campaign.id).maybeSingle()
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); setDrafts([]); return; }
        setDrafts(data?.codex || []);
      });
  }, [campaign.id]);

  const persist = async (next) => {
    setDrafts(next);
    const { error: e } = await supabase.from('campaign_secrets').upsert({ campaign_id: campaign.id, codex: next });
    setError(e ? e.message : '');
  };

  const saveEntry = async () => {
    const entry = { ...edit, id: edit.id || crypto.randomUUID() };
    const exists = drafts.some((x) => x.id === entry.id);
    await persist(exists ? drafts.map((x) => (x.id === entry.id ? entry : x)) : [...drafts, entry]);
    // se já estava liberado, atualiza o que os jogadores veem
    if (unlocked.some((x) => x.id === entry.id)) onSaveUnlocked(unlocked.map((x) => (x.id === entry.id ? { ...entry, unlockedAt: x.unlockedAt } : x)));
    setEdit(null);
  };
  const unlock = (e) => {
    onSaveUnlocked([...unlocked.filter((x) => x.id !== e.id), { ...e, unlockedAt: new Date().toISOString() }]);
    send?.('codex', { title: e.title });
  };
  const lock = (e) => onSaveUnlocked(unlocked.filter((x) => x.id !== e.id));
  const remove = async (e) => {
    if (!confirm(`Apagar "${e.title}"?`)) return;
    await persist(drafts.filter((x) => x.id !== e.id));
    lock(e);
  };
  const pick = async (ev) => {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    try { setEdit({ ...edit, image: await resizeImage(f, 320, 0.8) }); } catch { /* imagem inválida */ }
  };

  const missing = error && /codex|column|schema cache/i.test(error);
  if (drafts === null) return <div className="loader"><div className="saber" /></div>;

  return (
    <div className="grid codex-layout">
      <Panel title="Registros do holocron" className="yellow" aside={!edit && <button className="btn sm yellow primary" onClick={() => setEdit({ title: '', category: 'História', text: '', image: null })}>+ Novo registro</button>}>
        {missing && <div className="error-box small" style={{ marginBottom: 8 }}>Rode o arquivo supabase/extras.sql no SQL Editor do Supabase para ativar o holocron.</div>}
        {error && !missing && <div className="error-box small" style={{ marginBottom: 8 }}>{error}</div>}
        <p className="small muted" style={{ marginTop: 0 }}>Escreva a lore em segredo (planetas, facções, relíquias, NPCs) e libere cada registro quando os heróis descobrirem. Os jogadores leem na aba Holocron e recebem um aviso na hora.</p>
        {drafts.length === 0 ? <div className="empty small">Nenhum registro ainda.</div> : (
          <div className="list">
            {drafts.map((e) => {
              const isOpen = unlocked.some((x) => x.id === e.id);
              return (
                <div key={e.id} className="list-row">
                  <div style={{ minWidth: 0 }}><div className="name small">{e.title}</div><div className="sub">{e.category} · {isOpen ? 'liberado' : 'selado'}</div></div>
                  <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    {isOpen
                      ? <button className="btn sm ghost" onClick={() => lock(e)}>🔒 Selar</button>
                      : <button className="btn sm yellow" onClick={() => unlock(e)}>🔓 Liberar</button>}
                    <button className="btn sm ghost" onClick={() => setEdit(e)}>Editar</button>
                    <button className="btn sm ghost red" onClick={() => remove(e)}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <Panel title={edit ? (edit.id ? 'Editar registro' : 'Novo registro') : 'Como os jogadores veem'}>
        {edit ? (
          <div className="stack" style={{ gap: 8 }}>
            <label className="field">Título<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} autoFocus /></label>
            <label className="field">Categoria
              <select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CODEX_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="field">Texto<textarea value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} style={{ minHeight: 200 }} /></label>
            <div className="row between">
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm ghost" onClick={() => input.current?.click()}>{edit.image ? 'Trocar imagem' : 'Imagem (opcional)'}</button>
                {edit.image && <button className="btn sm ghost red" onClick={() => setEdit({ ...edit, image: null })}>Remover</button>}
                <input ref={input} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm ghost" onClick={() => setEdit(null)}>Cancelar</button>
                <button className="btn sm yellow primary" disabled={!edit.title} onClick={saveEntry}>Salvar</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', gap: 10, padding: 10 }}>
            <HolocronCube />
            <div className="small muted" style={{ textAlign: 'center' }}>{unlocked.length} de {drafts.length} registros liberados.</div>
          </div>
        )}
      </Panel>
    </div>
  );
}
