import { Outlet, useLocation } from 'react-router';
import { PageHeader } from '../components/layout/PageHeader';
import { Sidebar } from '../components/layout/Sidebar';
import { navigation } from '../config/navigation';

export function AdminLayout() {
  const { pathname } = useLocation();
  const title = navigation.find(({ id }) => pathname === `/${id}` || pathname === `/${id}/`)?.label ?? 'Page not found';

  return <div className="app-shell">
    <Sidebar />
    <main className="main-panel">
      <PageHeader title={title} />
      <Outlet />
    </main>
  </div>;
}
