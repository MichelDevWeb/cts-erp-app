import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { TenantLockedScreen } from '@/components/common/TenantLockedScreen'
import { Button } from '@/components/ui/button'
import { AlertCircle, LogOut, RefreshCw } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireTenant?: boolean // If true, redirects guests to onboarding
  requireAdmin?: boolean  // If true, only allows admins
}

function ProfileErrorFallback({ onRetry, onSignOut }: { onRetry: () => void; onSignOut: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-md w-full p-6 text-center space-y-4 bg-card rounded-xl shadow-xl border border-border">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Không thể tải thông tin hồ sơ</h2>
        <p className="text-sm text-muted-foreground">
          Hệ thống không thể tải hồ sơ người dùng từ máy chủ. Vui lòng kiểm tra kết nối mạng hoặc đăng nhập lại.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button variant="outline" className="flex-1" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProtectedRoute({ 
  children, 
  requireTenant = true,
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, loading, isGuest, isAdmin, hasTenant, profile, refreshProfile, signOut } = useAuth()
  const location = useLocation()

  // Still loading auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User exists but profile could not be loaded after auth check
  if (!profile) {
    return (
      <ProfileErrorFallback
        onRetry={refreshProfile}
        onSignOut={signOut}
      />
    )
  }

  // Guest without tenant - redirect to onboarding
  if (requireTenant && isGuest && !hasTenant) {
    return <Navigate to="/onboarding" replace />
  }

  // Tenant is locked and user is not admin - block access
  if (requireTenant && hasTenant && !isAdmin && profile.tenant?.is_locked) {
    return <TenantLockedScreen />
  }

  // Requires admin but user is not admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Route that only allows guests (for onboarding page)
export function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest, hasTenant, profile, refreshProfile, signOut } = useAuth()
  const location = useLocation()

  // Still loading auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User exists but profile could not be loaded after auth check
  if (!profile) {
    return (
      <ProfileErrorFallback
        onRetry={refreshProfile}
        onSignOut={signOut}
      />
    )
  }

  // Not a guest or already has tenant - redirect to dashboard
  if (!isGuest || hasTenant) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Route for admin-only pages
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, profile, refreshProfile, signOut } = useAuth()
  const location = useLocation()

  // Still loading auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User exists but profile could not be loaded after auth check
  if (!profile) {
    return (
      <ProfileErrorFallback
        onRetry={refreshProfile}
        onSignOut={signOut}
      />
    )
  }

  // Not admin - redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
