import { Navigate, Outlet } from 'react-router-dom'
import { isLoggedIn } from '@/lib/auth'

export function PrivateRoute() {
  return isLoggedIn() ? <Outlet /> : <Navigate to="/login" replace />
}
