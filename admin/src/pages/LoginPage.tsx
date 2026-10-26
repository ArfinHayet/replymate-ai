import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { supabase } from '../api';
import { useAuth } from '../auth/AuthProvider';

export function LoginPage() {
  const { admin, error, clearError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const from = (location.state as { from?: unknown } | null)?.from;
  const destination = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from.split(/[?#]/)[0] !== '/login'
    ? from : '/users';

  if (admin) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setFormError('');
    setSubmitting(true);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (loginError) setFormError(loginError.message);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="login-screen">
    <div className="login-card">
      <div className="brand-mark"><img src="/favicon.svg" alt="" /><span>SupportMate AI</span></div>
      <div className="eyebrow">ADMIN CONSOLE</div>
      <h1>Welcome back.</h1>
      <p className="muted">Sign in with your authorized Supabase account.</p>
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {(formError || error) && <p role="alert" className="error-message">{formError || error}</p>}
        <button className="button primary login-submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  </main>;
}
