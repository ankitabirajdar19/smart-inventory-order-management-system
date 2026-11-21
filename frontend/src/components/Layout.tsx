import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Spinner } from './ui'
export { DashboardLayout as Layout } from './layout/DashboardLayout'

/**
 * UI guard only: the backend enforces every permission independently.
 * `permission` = must have it; `anyOf` = must have at least one; `role` = must hold the role.
 */
export function RequireAuth({ permission, anyOf, role }: { permission?: string; anyOf?: string[]; role?: string }) {
  const { user, loading, can } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if ((permission && !can(permission)) || (anyOf && !anyOf.some(can)) || (role && !user.roles.includes(role))) return <Navigate to="/" replace />
  return <Outlet />
}
