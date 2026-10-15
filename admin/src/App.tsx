import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Ban, FileSpreadsheet, FileText, Images, LayoutDashboard, LogOut, Mail, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { ApiError, apiRequest, supabase } from './api';

type Tab = 'users' | 'pdfs' | 'csvs' | 'images' | 'contacts';
type Filters = { search: string; userId: string; from: string; to: string };
type AdminIdentity = { id: string; email: string };
type AdminRow = {
  id: string;
  email?: string;
  name?: string;
  subject?: string | null;
  message?: string;
  userId?: string | null;
  userEmail?: string | null;
  fileName?: string;
  title?: string;
  description?: string;
  storageUrl?: string;
  rowCount?: number;
  createdAt: string;
  lastSignInAt?: string | null;
  blocked?: boolean;
};
type PageResult = { items: AdminRow[]; total: number; page: number; pageSize: number };
type PendingAction = { kind: 'delete' | 'block'; row: AdminRow; blocked?: boolean };

const emptyFilters: Filters = { search: '', userId: '', from: '', to: '' };
const navigation: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'pdfs', label: 'PDFs', icon: FileText },
  { id: 'csvs', label: 'CSVs', icon: FileSpreadsheet },
  { id: 'images', label: 'Images', icon: Images },
  { id: 'contacts', label: 'Contact messages', icon: Mail },
];

function readableDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function queryFor(tab: Tab, filters: Filters, page: number, pageSize: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if ((tab === 'users' || tab === 'contacts') && filters.search) params.set('search', filters.search);
  if (tab !== 'users' && tab !== 'contacts' && filters.userId) params.set('userId', filters.userId);
  if (filters.from) params.set('from', new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) params.set('to', new Date(`${filters.to}T23:59:59.999`).toISOString());
  return params.toString();
}

function renderContactMessage(row: AdminRow) {
  return <tr key={row.id}>
    <td className="contact-cell"><div className="main-cell">{row.name}</div><div className="sub-cell">{row.email}</div></td>
    <td className="contact-cell">{row.subject || 'No subject'}</td>
    <td className="contact-message"><details><summary>View message</summary><p>{row.message}</p></details></td>
    <td>{readableDate(row.createdAt)}</td>
  </tr>;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setSessionReady(true);
      }
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) {
      setAdmin(null);
      setCheckingAdmin(false);
      return;
    }
    let active = true;
    setCheckingAdmin(true);
    void apiRequest<AdminIdentity>('/admin/me')
      .then((identity) => {
        if (!active) return;
        setAdmin(identity);
        setAuthError('');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAdmin(null);
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setAuthError('This account does not have admin access.');
          void supabase.auth.signOut();
        } else {
          setAuthError(error instanceof Error ? error.message : 'Could not check admin access.');
        }
      })
      .finally(() => { if (active) setCheckingAdmin(false); });
    return () => { active = false; };
  }, [session?.access_token, retry]);

  if (!sessionReady || checkingAdmin) {
    return <div className="boot-screen"><div className="spinner" /><span>Checking access…</span></div>;
  }
  if (session && !admin) {
    return <div className="boot-screen"><div className="auth-message">{authError}<button className="button" onClick={() => setRetry((value) => value + 1)}>Retry</button><button className="text-button" onClick={() => void supabase.auth.signOut()}>Sign out</button></div></div>;
  }
  if (!admin) return <Login error={authError} clearError={() => setAuthError('')} />;
  return <Dashboard admin={admin} />;
}

function Login({ error, clearError }: { error: string; clearError: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setFormError('');
    setSubmitting(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) setFormError(loginError.message);
    setSubmitting(false);
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

function Dashboard({ admin }: { admin: AdminIdentity }) {
  const [tab, setTab] = useState<Tab>('users');
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [result, setResult] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setResult(null);
    const route = tab === 'users' ? '/admin/users' : tab === 'contacts' ? '/admin/contact-messages' : `/admin/content/${tab}`;
    void apiRequest<PageResult>(`${route}?${queryFor(tab, filters, page, pageSize)}`)
      .then((data) => {
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
        if (page > lastPage) setPage(lastPage);
        else setResult(data);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, filters, page, pageSize, reload]);

  function changeTab(next: Tab) {
    if (tab === 'contacts' || next === 'contacts') {
      setDraft(emptyFilters);
      setFilters(emptyFilters);
    }
    setTab(next);
    setPage(1);
    setNotice('');
    setPending(null);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      search: draft.search.trim(),
      userId: draft.userId.trim(),
      from: draft.from,
      to: draft.to,
    });
    setPage(1);
  }

  function clearFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  }

  function filterForUser(row: AdminRow) {
    setDraft((current) => ({ ...current, userId: row.id }));
    setFilters((current) => ({ ...current, userId: row.id }));
    setTab('pdfs');
    setPage(1);
  }

  async function confirmAction() {
    if (!pending) return;
    setActionBusy(true);
    setError('');
    try {
      if (pending.kind === 'block') {
        await apiRequest(`/admin/users/${pending.row.id}/block`, {
          method: 'PATCH', body: JSON.stringify({ blocked: pending.blocked }),
        });
        setNotice(pending.blocked ? 'User blocked.' : 'User unblocked.');
      } else {
        await apiRequest(`/admin/content/${tab}/${pending.row.id}`, { method: 'DELETE' });
        setNotice('Content deleted.');
      }
      setPending(null);
      if (pending.kind === 'delete' && result?.items.length === 1 && page > 1) setPage((value) => value - 1);
      else setReload((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Action failed.');
    } finally {
      setActionBusy(false);
    }
  }

  const title = navigation.find((item) => item.id === tab)?.label ?? 'Users';
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const columns = tab === 'contacts'
    ? ['Sender', 'Subject', 'Message', 'Received']
    : tab === 'users'
      ? ['User', 'Joined', 'Last sign in', 'Status', 'Actions']
      : tab === 'csvs'
        ? ['File', 'User', 'Uploaded', 'Rows', 'Actions']
        : [tab === 'images' ? 'Image' : 'File', 'User', 'Uploaded', 'Actions'];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><img src="/favicon.svg" alt="" /><div><strong>SupportMate AI</strong><span>ADMIN CONSOLE</span></div></div>
      <div className="sidebar-label">Overview</div>
      <nav aria-label="Admin navigation">
        {navigation.map(({ id, label, icon: Icon }) =>
          <button key={id} type="button" className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => changeTab(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={18} />{label}
          </button>,
        )}
      </nav>
      <div className="sidebar-bottom"><div className="signed-in"><ShieldCheck size={17} /><span title={admin.email}>{admin.email}</span></div><button className="signout" onClick={() => void supabase.auth.signOut()}><LogOut size={17} /> Sign out</button></div>
    </aside>
    <main className="main-panel">
      <header className="page-header"><div className="breadcrumb"><LayoutDashboard size={15} /> ADMIN / {title.toUpperCase()}</div><div className="header-badge"><ShieldCheck size={16} /> Secure admin area</div></header>
      <section className="dashboard-content">
        <div className="section-heading"><div><span className="eyebrow">MANAGE PLATFORM</span><h1>{title}</h1><p>{tab === 'contacts' ? 'Review messages sent through the landing page contact form.' : `Review ${tab === 'users' ? 'accounts and access' : `${title.toLowerCase()} uploaded by users`} across SupportMate.`}</p></div><div className="count-card"><span>Total matching</span><strong>{loading && !result ? '—' : total.toLocaleString()}</strong></div></div>

        <form className="filter-card" onSubmit={applyFilters}>
          <div className="filter-heading"><Search size={16} /><strong>Filters</strong></div>
          <div className="filter-grid">
            {tab === 'users' || tab === 'contacts' ? <label>{tab === 'contacts' ? 'Find message' : 'Find user'}<input type="search" placeholder={tab === 'contacts' ? 'Name, email, subject, or message' : 'Email or user ID'} value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} /></label>
              : <label>User<input type="search" placeholder="Email or user ID" value={draft.userId} onChange={(event) => setDraft({ ...draft, userId: event.target.value })} /></label>}
            <label>From<input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label>
            <label>To<input type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label>
            <div className="filter-buttons"><button className="button primary" type="submit">Apply</button><button className="button ghost" type="button" onClick={clearFilters}>Clear</button></div>
          </div>
        </form>

        <section className="table-card" aria-label={`${title} table`}>
          <div className="table-top"><div><h2>All {title}</h2><p>Showing {start}–{end} of {total.toLocaleString()}</p></div><label className="page-size">Rows per page<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label></div>
          {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={14} /></button></div>}
          {error && <div className="error-message table-error" role="alert">{error}<button className="text-button" onClick={() => setReload((value) => value + 1)}>Retry</button></div>}
          <div className="table-scroll"><table><thead><tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr></thead><tbody>
            {loading ? Array.from({ length: 5 }, (_, index) => <tr key={index} className="skeleton-row"><td colSpan={columns.length}><div /></td></tr>)
              : result?.items.length ? result.items.map((row) => tab === 'contacts' ? renderContactMessage(row) : <tr key={row.id}>
                {tab === 'users' ? <>
                  <td><div className="main-cell">{row.email || 'No email'}</div><div className="sub-cell">{row.id}</div></td>
                  <td>{readableDate(row.createdAt)}</td><td>{readableDate(row.lastSignInAt)}</td>
                  <td><span className={`status ${row.blocked ? 'blocked' : 'active'}`}>{row.blocked ? 'Blocked' : 'Active'}</span></td>
                  <td className="actions"><button className="table-action" onClick={() => filterForUser(row)}>View content</button><button className={`table-action ${row.blocked ? '' : 'danger'}`} disabled={row.id === admin.id && !row.blocked} onClick={() => setPending({ kind: 'block', row, blocked: !row.blocked })}><Ban size={14} />{row.blocked ? 'Unblock' : 'Block'}</button></td>
                </> : <>
                  <td><div className="main-cell">{row.title || row.fileName || 'Untitled'}</div><div className="sub-cell">{row.id}</div>{tab === 'images' && row.storageUrl && <a className="image-link" href={row.storageUrl} target="_blank" rel="noreferrer">View image</a>}</td>
                  <td><div className="main-cell">{row.userEmail || row.userId || 'Unknown user'}</div><div className="sub-cell">{row.userEmail ? row.userId : row.userId ? 'No matching Auth account' : 'Legacy record'}</div></td>
                  <td>{readableDate(row.createdAt)}</td>
                  {tab === 'csvs' && <td>{row.rowCount?.toLocaleString() ?? '—'}</td>}
                  <td className="actions"><button className="table-action danger" onClick={() => setPending({ kind: 'delete', row })}><Trash2 size={14} />Delete</button></td>
                </>}
              </tr>) : <tr><td className="empty-table" colSpan={columns.length}>No records match these filters.</td></tr>}
          </tbody></table></div>
          <div className="table-footer"><span>Page {page} of {pages}</span><div className="pagination"><button className="button ghost" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="button ghost" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
        </section>
      </section>
    </main>
    {pending && <div className="dialog-backdrop" role="presentation"><div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description"><div className="dialog-icon">{pending.kind === 'delete' ? <Trash2 size={22} /> : <Ban size={22} />}</div><h2 id="dialog-title">{pending.kind === 'delete' ? `Delete ${tab.slice(0, -1).toUpperCase()}?` : `${pending.blocked ? 'Block' : 'Unblock'} user?`}</h2><p id="dialog-description">{pending.kind === 'delete' ? `This will permanently remove ${pending.row.title || pending.row.fileName || 'this record'} and its indexed content.` : `${pending.row.email || pending.row.id} will ${pending.blocked ? 'lose access to the app and widget' : 'regain access'}.`}</p><div className="dialog-actions"><button className="button ghost" disabled={actionBusy} onClick={() => setPending(null)}>Cancel</button><button className="button destructive" disabled={actionBusy} onClick={() => void confirmAction()}>{actionBusy ? 'Working…' : pending.kind === 'delete' ? 'Delete content' : pending.blocked ? 'Block user' : 'Unblock user'}</button></div></div></div>}
  </div>;
}
