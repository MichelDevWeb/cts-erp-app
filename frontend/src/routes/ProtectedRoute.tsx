import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/common/LoadingScreen'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireTenant?: boolean // If true, redirects guests to onboarding
  requireAdmin?: boolean  // If true, only allows admins
}

export function ProtectedRoute({ 
  children, 
  requireTenant = true,
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, loading, isGuest, isAdmin, hasTenant, profile } = useAuth()
  const location = useLocation()

  // Still loading auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User exists but profile not loaded yet - keep loading
  if (!profile) {
    return <LoadingScreen />
  }

  // Guest without tenant - redirect to onboarding
  if (requireTenant && isGuest && !hasTenant) {
    return <Navigate to="/onboarding" replace />
  }

  // Requires admin but user is not admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Route that only allows guests (for onboarding page)
export function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest, hasTenant, profile } = useAuth()
  const location = useLocation()

  // Still loading auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User exists but profile not loaded yet - keep loading
  if (!profile) {
    return <LoadingScreen />
  }

  // Not a guest or already has tenant - redirect to dashboard
  if (!isGuest || hasTenant) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Route for admin-only pages
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, profile } = useAuth()
  const location = useLocation()

  // Still loading auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User exists but profile not loaded yet - keep loading
  if (!profile) {
    return <LoadingScreen />
  }

  // Not admin - redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
