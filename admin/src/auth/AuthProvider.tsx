import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ApiError, apiRequest, supabase } from '../api';
import { LoadingScreen } from '../components/LoadingScreen';
import type { AdminIdentity } from '../types/admin';

type AuthContextValue = {
  admin: AdminIdentity | null;
  error: string;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [verification, setVerification] = useState<{ token: string; admin: AdminIdentity | null } | null>(null);
  const [authError, setAuthError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setSessionReady(true);
      })
      .catch((error: unknown) => {
        if (!active || authEventReceived) return;
        setAuthError(error instanceof Error ? error.message : 'Could not restore your session.');
        setSessionReady(true);
      });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      authEventReceived = true;
      setSession(nextSession);
      setSessionReady(true);
      // A later login must always pass a new admin check, even with the same token.
      if (!nextSession) setVerification(null);
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  const token = session?.access_token;

  useEffect(() => {
    if (!token) return;
    let active = true;
    void apiRequest<AdminIdentity>('/admin/me')
      .then((identity) => {
        if (!active) return;
        setVerification({ token, admin: identity });
        setAuthError('');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setVerification({ token, admin: null });
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setAuthError('This account does not have admin access.');
          void supabase.auth.signOut();
        } else {
          setAuthError(error instanceof Error ? error.message : 'Could not check admin access.');
        }
      });
    return () => { active = false; };
  }, [token, retry]);

  if (!sessionReady || (token && verification?.token !== token)) return <LoadingScreen />;

  const admin = token ? verification?.admin ?? null : null;
  if (session && !admin) {
    return <div className="boot-screen"><div className="auth-message">
      <p role="alert">{authError}</p>
      <button className="button" onClick={() => { setVerification(null); setRetry((value) => value + 1); }}>Retry</button>
      <button className="text-button" onClick={() => void supabase.auth.signOut()}>Sign out</button>
    </div></div>;
  }

  return <AuthContext.Provider value={{ admin, error: authError, clearError: () => setAuthError('') }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
