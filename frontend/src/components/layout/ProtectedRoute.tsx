import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'

/** Gate for authenticated-only routes (Trade, Wallet, Profile). */
export function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()
  const hasToken = !!localStorage.getItem('access')

  if (!user && !hasToken) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />
  }
  return <Outlet />
}
