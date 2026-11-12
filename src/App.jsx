import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import { isConfigured } from './lib/supabase';
import { AuthProvider, useAuth, signOut } from './lib/auth';
import { RollTargetProvider } from './lib/rollTarget';
import { toggleMute, isMuted } from './lib/sfx';
import Starfield from './components/Starfield';
import Crawl from './components/Crawl';
import DiceTray from './components/DiceTray';
import RollToasts from './components/RollToasts';
import TableFx from './components/TableFx';
import { useAllTableChannels } from './lib/table';
import Login, { SetupNeeded } from './pages/Login';
import Dashboard from './pages/Dashboard';
import CharacterWizard from './pages/CharacterWizard';
import CharacterPage from './pages/CharacterPage';
import CampaignPage from './pages/CampaignPage';
import { Privacy, Terms } from './pages/Legal';

const INTRO_KEY = 'holocron:intro-seen';

function TopBar({ onIntro }) {
  const { profile, user } = useAuth();
  const [muted, setMuted] = useState(isMuted());
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="holocron-icon" aria-hidden="true" />
        <span>HOLOCRON<small>SAGA RPG</small></span>
      </Link>
      <nav className="nav-links">
        <NavLink to="/" end>Ponte</NavLink>
        <NavLink to="/personagem/novo">Novo personagem</NavLink>
      </nav>
      <div className="spacer" />
      <button className="btn sm ghost" onClick={onIntro} title="Rever a abertura">▶ Abertura</button>
      <button className="btn sm ghost icon" onClick={() => setMuted(toggleMute())} title={muted ? 'Ativar sons' : 'Silenciar sons'}>{muted ? '🔇' : '🔊'}</button>
      <div className="user-chip" title={`Conectado como ${user?.email ?? ''}`}>
        {profile?.avatar_url
          ? <img className="avatar" src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
          : <span className="avatar">{(profile?.display_name || '?')[0]}</span>}
        <span>{profile?.display_name}</span>
      </div>
      <button className="btn sm ghost red" onClick={signOut}>Sair</button>
    </header>
  );
}

function Shell() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [intro, setIntro] = useState(false);
  // transmissões, alertas e saltos do mestre chegam em qualquer página do site
  useAllTableChannels(user?.id, pathname);

  useEffect(() => {
    if (!user) return;
    try {
      if (!sessionStorage.getItem(INTRO_KEY)) setIntro(true);
    } catch { /* noop */ }
  }, [user?.id]);

  const closeIntro = () => {
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* noop */ }
    setIntro(false);
  };

  // Páginas públicas (exigidas pelo Google para publicar o login)
  if (pathname === '/privacidade') return <div className="app"><Privacy /></div>;
  if (pathname === '/termos') return <div className="app"><Terms /></div>;

  if (loading) {
    return <div className="app"><div className="loader"><div className="saber" />ESTABELECENDO CONEXÃO</div></div>;
  }

  if (!user) {
    return <div className="app"><Login /></div>;
  }

  return (
    <>
      {intro && <Crawl onDone={closeIntro} />}
      <div className="app">
        <TopBar onIntro={() => setIntro(true)} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/personagem/novo" element={<CharacterWizard />} />
          <Route path="/personagem/:id" element={<CharacterPage />} />
          <Route path="/personagem/:id/editar" element={<CharacterWizard />} />
          <Route path="/campanha/:id" element={<CampaignPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <DiceTray />
        <RollToasts />
        <TableFx />
      </div>
    </>
  );
}

export default function App() {
  return (
    <>
      <div className="nebula" />
      <Starfield />
      <div className="warp-flash" />
      {isConfigured ? (
        <AuthProvider>
          <RollTargetProvider>
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
          </RollTargetProvider>
        </AuthProvider>
      ) : (
        <div className="app"><SetupNeeded /></div>
      )}
    </>
  );
}
