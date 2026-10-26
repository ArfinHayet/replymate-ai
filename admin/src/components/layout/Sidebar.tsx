import { LogOut, ShieldCheck } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { supabase } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { navigation } from '../../config/navigation';
import type { Tab } from '../../types/admin';

export function Sidebar() {
  const { admin } = useAuth();
  const { pathname, search } = useLocation();

  function destination(tab: Tab) {
    const params = new URLSearchParams(search);
    params.delete('page');
    if (pathname === '/contacts' || pathname === '/contacts/' || tab === 'contacts') {
      for (const key of ['search', 'userId', 'from', 'to']) params.delete(key);
    }
    return { pathname: `/${tab}`, search: params.toString() };
  }

  return <aside className="sidebar">
    <div className="sidebar-brand"><img src="/favicon.svg" alt="" /><div><strong>SupportMate AI</strong><span>ADMIN CONSOLE</span></div></div>
    <div className="sidebar-label">Overview</div>
    <nav aria-label="Admin navigation">
      {navigation.map(({ id, label, icon: Icon }) =>
        <NavLink key={id} to={destination(id)} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon size={18} />{label}
        </NavLink>,
      )}
    </nav>
    <div className="sidebar-bottom">
      <div className="signed-in"><ShieldCheck size={17} /><span title={admin?.email}>{admin?.email}</span></div>
      <button className="signout" onClick={() => void supabase.auth.signOut()}><LogOut size={17} /> Sign out</button>
    </div>
  </aside>;
}
