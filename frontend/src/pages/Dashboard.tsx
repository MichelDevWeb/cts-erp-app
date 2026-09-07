import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ShoppingCart, 
  FileText, 
  Truck, 
  Users, 
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle2 
} from 'lucide-react'

export function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('dashboard.welcome', { name: userName })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.overviewSubtitle')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalOrders')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.connectSupabase')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.pendingInvoices')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.connectSupabase')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.inTransit')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.connectSupabase')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalCustomers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.connectSupabase')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('dashboard.gettingStartedTitle')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.gettingStartedDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('dashboard.stepAccountCreatedTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.stepAccountCreatedDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('dashboard.stepSupabaseTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.stepSupabaseDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('dashboard.stepCustomerTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.stepCustomerDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('dashboard.stepProductTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.stepProductDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('dashboard.stepOrderTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.stepOrderDesc')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

