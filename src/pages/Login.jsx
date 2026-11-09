import { useMemo, useState } from 'react';
import { signIn } from '../lib/auth';
import { QUOTES } from '../data/rules';

export default function Login() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  const go = async (provider) => {
    setBusy(provider); setError('');
    const { error: e } = await signIn(provider);
    if (e) { setError(e.message); setBusy(''); }
  };

  return (
    <div className="login-wrap">
      <div style={{ width: '100%' }}>
        <div className="logo"><span>STAR</span><span>WARS</span></div>
        <div className="logo-sub">HOLOCRON · RPG EDIÇÃO SAGA</div>

        <div className="panel login-card">
          <div className="panel-title"><span>Identifique-se, viajante</span><span className="aurebesh">ACESSO</span></div>
          <div className="stack">
            <button className="btn oauth" style={{ '--c': '#ffffff' }} onClick={() => go('google')} disabled={!!busy}>
              <span className="glyph">
                <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                </svg>
              </span>
              {busy === 'google' ? 'Abrindo canal...' : 'Entrar com Google'}
            </button>
            <button className="btn oauth" style={{ '--c': '#5865F2' }} onClick={() => go('discord')} disabled={!!busy}>
              <span className="glyph">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path fill="#5865F2" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.7.2 18.2a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.1 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.8-3.6-13.8zM8.5 15.5c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z" />
                </svg>
              </span>
              {busy === 'discord' ? 'Abrindo canal...' : 'Entrar com Discord'}
            </button>
            {error && <div className="error-box">{error}</div>}
          </div>
        </div>

        <p className="quote">“{quote[0]}”<b>— {quote[1]}</b></p>
      </div>
    </div>
  );
}

export function SetupNeeded() {
  return (
    <div className="login-wrap">
      <div className="panel" style={{ maxWidth: 640, textAlign: 'left' }}>
        <div className="panel-title"><span>Configuração necessária</span></div>
        <p>O Holocron ainda não está conectado ao Supabase.</p>
        <ol className="small muted" style={{ paddingLeft: 18 }}>
          <li>Crie um projeto em supabase.com e rode <code>supabase/schema.sql</code> no SQL Editor.</li>
          <li>Copie <code>.env.example</code> para <code>.env</code> e preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.</li>
          <li>Ative os provedores Google e Discord em Authentication → Providers.</li>
          <li>Reinicie o <code>npm run dev</code>.</li>
        </ol>
        <p className="small">O passo a passo completo está no <code>README.md</code>.</p>
      </div>
    </div>
  );
}
