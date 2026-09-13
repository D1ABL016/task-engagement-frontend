import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { UserRole } from '../api/types'

/**
 * Navigation convenience only. The backend enforces the same rules with
 * require_admin / require_manager regardless of what this renders.
 */
export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return <div className="p-8 text-slate-500">Loading…</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold">Not available for your role</h1>
        <p className="mt-1 text-slate-600">
          This page is restricted to: {roles.join(', ')}.
        </p>
      </div>
    )
  }

  return <Outlet />
}
