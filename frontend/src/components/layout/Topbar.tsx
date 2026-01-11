import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, LogOut, User, Settings, Shield, Building2 } from 'lucide-react'
import { NotificationDropdown } from './NotificationDropdown'

export function Topbar() {
  const { user, signOut, role, tenantName, isAdmin } = useAuth()
  const { sidebarOpen, toggleSidebar } = useUIStore()

  // Get initials from email or name
  const getInitials = () => {
    if (!user) return 'U'
    const email = user.email || ''
    const name = user.user_metadata?.full_name || email
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = () => {
    if (!role) return null
    
    const roleConfig: Record<string, { label: string; className: string }> = {
      admin: { 
        label: 'Admin', 
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
      },
      staff: { 
        label: 'Staff', 
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
      },
      guest: { 
        label: 'Guest', 
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' 
      },
      customer: { 
        label: 'Customer', 
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
      },
    }

    const config = roleConfig[role] || { label: role, className: 'bg-gray-100 text-gray-800' }

    return (
      <span className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        config.className
      )}>
        {config.label}
      </span>
    )
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16 bg-background border-b flex items-center justify-between px-4 transition-all duration-300',
        sidebarOpen ? 'left-64' : 'left-16'
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Tenant Name */}
        {tenantName && (
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{tenantName}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  {getRoleBadge()}
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
