import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({ session: null, user: null, profile: null, loading: true });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    const meta = session.user.user_metadata || {};
    const fallback = {
      id: session.user.id,
      display_name: meta.full_name || meta.name || meta.user_name || session.user.email,
      avatar_url: meta.avatar_url,
    };
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data || fallback));
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function signIn(provider) {
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/` },
  });
}

export function signOut() {
  sessionStorage.removeItem('holocron:intro-seen');
  try { localStorage.removeItem('holocron:draft'); } catch { /* rascunho antigo, sem dono */ }
  return supabase.auth.signOut();
}
