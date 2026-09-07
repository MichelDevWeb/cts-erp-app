import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Truck,
  Users,
  Package,
  ChevronLeft,
  Package2,
  Building2,
  Shield,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { isAdmin } = useAuth()

  const navigation = [
    { key: 'dashboard', name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { key: 'orders', name: t('nav.orders'), href: '/orders', icon: ShoppingCart },
    { key: 'invoices', name: t('nav.invoices'), href: '/invoices', icon: FileText },
    { key: 'shipments', name: t('nav.shipments'), href: '/shipments', icon: Truck },
  ]

  const managementNav = [
    { key: 'customers', name: t('nav.customers'), href: '/customers', icon: Users },
    { key: 'products', name: t('nav.products'), href: '/products', icon: Package },
  ]

  const adminNav = [
    { key: 'tenantRequests', name: t('nav.tenantRequests'), href: '/admin/tenant-requests', icon: Building2 },
    { key: 'security', name: t('nav.security'), href: '/admin/security', icon: KeyRound },
  ]

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Package2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sidebar-foreground tracking-tight">
              CTS ERP
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={toggleSidebar}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              !sidebarOpen && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="py-2">
          {sidebarOpen && (
            <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
              {t('nav.main')}
            </p>
          )}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.key}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  !sidebarOpen && 'justify-center'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>

        <Separator className="my-2 bg-sidebar-border" />

        <div className="py-2">
          {sidebarOpen && (
            <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
              {t('nav.management')}
            </p>
          )}
          {managementNav.map((item) => {
            const isActive = location.pathname === item.href ||
              location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.key}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  !sidebarOpen && 'justify-center'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <Separator className="my-2 bg-sidebar-border" />

            <div className="py-2">
              {sidebarOpen && (
                <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {t('nav.admin')}
                </p>
              )}
              {adminNav.map((item) => {
                const isActive = location.pathname === item.href ||
                  location.pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      !sidebarOpen && 'justify-center'
                    )}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {sidebarOpen && <span>{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </nav>
    </aside>
  )
}
