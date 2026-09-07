import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/api/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Package2, Loader2, AlertCircle, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

export function ResetPassword() {
  const { t } = useTranslation()
  const { updatePassword, signOut } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSessionValid, setIsSessionValid] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [redirectCountdown, setRedirectCountdown] = useState(4)

  useEffect(() => {
    // Check if the URL contains an explicit error (e.g. expired link)
    const hash = window.location.hash
    const searchParams = new URLSearchParams(window.location.search)
    const hasHashError = hash.includes('error=') || hash.includes('error_code=')
    const hasQueryError = searchParams.has('error')

    if (hasHashError || hasQueryError) {
      setIsSessionValid(false)
      setIsVerifying(false)
      return
    }

    // Check for recovery token or existing session
    const checkRecoverySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        // If session exists or hash contains access_token / type=recovery
        if (session || hash.includes('access_token') || hash.includes('type=recovery') || searchParams.has('code')) {
          setIsSessionValid(true)
        } else {
          setIsSessionValid(false)
        }
      } catch (err) {
        console.error('Error verifying recovery session:', err)
        setIsSessionValid(false)
      } finally {
        setIsVerifying(false)
      }
    }

    // Also listen to auth state change for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsSessionValid(true)
        setIsVerifying(false)
      }
    })

    checkRecoverySession()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Auto redirect countdown on success
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (isSuccess && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1)
      }, 1000)
    } else if (isSuccess && redirectCountdown === 0) {
      navigate('/login', { replace: true })
    }
    return () => clearTimeout(timer)
  }, [isSuccess, redirectCountdown, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password.length < 6) {
      setErrorMessage(t('auth.passwordMinLength'))
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordsDoNotMatch'))
      return
    }

    setIsLoading(true)

    const { error } = await updatePassword(password)

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
    } else {
      setIsLoading(false)
      setIsSuccess(true)
      // Security-first: sign out active recovery session
      await signOut()
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      {/* Top right language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="outline" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary rounded-lg">
              <Package2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">CTS ERP</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('auth.appTagline')}
          </p>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-xl">
          {isVerifying ? (
            /* Loading / Verifying State */
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          ) : !isSessionValid ? (
            /* Invalid or Expired Link State */
            <>
              <CardHeader className="text-center space-y-3 pb-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-semibold">
                  {t('auth.invalidOrExpiredLink')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('auth.invalidOrExpiredLinkDesc')}
                </CardDescription>
              </CardHeader>

              <CardFooter className="flex flex-col gap-3 pt-4">
                <Button asChild className="w-full h-11">
                  <Link to="/forgot-password">
                    {t('auth.requestNewLink')}
                  </Link>
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('auth.backToSignIn')}
                  </Link>
                </div>
              </CardFooter>
            </>
          ) : isSuccess ? (
            /* Password Reset Success State */
            <>
              <CardHeader className="text-center space-y-3 pb-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-semibold">
                  {t('auth.passwordResetSuccess')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('auth.passwordResetSuccessDesc')}
                </CardDescription>
              </CardHeader>

              <CardFooter className="flex flex-col gap-3 pt-4">
                <Button
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full h-11"
                >
                  {t('auth.goToSignIn')} ({redirectCountdown}s)
                </Button>
              </CardFooter>
            </>
          ) : (
            /* New Password Form */
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-semibold">
                  {t('auth.resetPasswordTitle')}
                </CardTitle>
                <CardDescription>
                  {t('auth.resetPasswordSubtitle')}
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.newPassword')}</Label>
                    <PasswordInput
                      id="password"
                      placeholder={t('auth.newPasswordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('auth.confirmNewPassword')}</Label>
                    <PasswordInput
                      id="confirmPassword"
                      placeholder={t('auth.newPasswordPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      className="h-11"
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading || !password || !confirmPassword}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.updatingPassword')}
                      </>
                    ) : (
                      t('auth.updatePassword')
                    )}
                  </Button>

                  <div className="text-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t('auth.backToSignIn')}
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('common.bySigningInAgree')}
        </p>
      </div>
    </div>
  )
}
