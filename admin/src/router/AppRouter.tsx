import { Navigate, Route, Routes } from 'react-router';
import { RequireAdmin } from '../auth/RequireAdmin';
import { navigation } from '../config/navigation';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RecordsPage } from '../pages/RecordsPage';

export function AppRouter() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireAdmin />}>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="/users" replace />} />
        {navigation.map(({ id }) => <Route key={id} path={id} element={<RecordsPage key={id} tab={id} />} />)}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>;
}
