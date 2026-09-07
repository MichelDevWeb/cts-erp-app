import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, LogOut, RefreshCw, AlertCircle, Building2 } from 'lucide-react'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

export function TenantLockedScreen() {
  const { t } = useTranslation()
  const { tenantName, tenantLockedReason, signOut, refreshProfile, loading } = useAuth()

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      {/* Top right language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="outline" />
      </div>

      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Lock className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {t('tenantLocked.title', 'Tài khoản doanh nghiệp đã bị khoá')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t(
                'tenantLocked.subtitle',
                'Doanh nghiệp của bạn hiện đang bị tạm khoá và không thể truy cập các tính năng quản trị.'
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {tenantName && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-foreground">{tenantName}</span>
              </div>
            )}

            {tenantLockedReason ? (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg text-sm text-rose-800 dark:text-rose-200 space-y-1">
                <div className="font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{t('tenantLocked.reasonTitle', 'Lý do khoá:')}</span>
                </div>
                <p className="text-xs pl-5.5 leading-relaxed">{tenantLockedReason}</p>
              </div>
            ) : (
              <div className="p-3 bg-muted/60 rounded-lg text-xs text-muted-foreground">
                {t(
                  'tenantLocked.contactAdmin',
                  'Vui lòng liên hệ quản trị viên hệ thống để biết thêm chi tiết và yêu cầu mở khoá.'
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={refreshProfile}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('tenantLocked.checkAgain', 'Kiểm tra lại trạng thái')}
            </Button>

            <Button
              variant="destructive"
              className="w-full h-11"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.signOut', 'Đăng xuất')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
