import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Package2, Loader2, AlertCircle, ArrowLeft, Mail, RefreshCw } from 'lucide-react'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

export function ForgotPassword() {
  const { t } = useTranslation()
  const { resetPassword } = useAuth()
  
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || isLoading) return

    setIsLoading(true)
    setErrorMessage(null)

    const { error } = await resetPassword(email.trim())

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
    } else {
      setIsLoading(false)
      setIsSubmitted(true)
      setCooldown(60)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || isLoading || !email.trim()) return

    setIsLoading(true)
    setErrorMessage(null)

    const { error } = await resetPassword(email.trim())

    if (error) {
      setErrorMessage(error.message)
    } else {
      setCooldown(60)
    }
    setIsLoading(false)
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
          {!isSubmitted ? (
            /* Request Reset Form */
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-semibold">
                  {t('auth.forgotPasswordTitle')}
                </CardTitle>
                <CardDescription>
                  {t('auth.forgotPasswordSubtitle')}
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
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading || !email.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.sendingResetLink')}
                      </>
                    ) : (
                      t('auth.sendResetLink')
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
          ) : (
            /* Reset Link Sent Confirmation */
            <>
              <CardHeader className="text-center space-y-3 pb-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Mail className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-semibold">
                  {t('auth.resetLinkSent')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('auth.checkEmailInstructions')}
                </CardDescription>
                <div className="inline-block px-3 py-1.5 rounded-md bg-muted text-foreground font-medium text-sm break-all">
                  {email}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="p-3 text-xs text-muted-foreground bg-muted/50 rounded-lg border border-border/50">
                  {t('auth.checkSpamNotice')}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.sendingResetLink')}
                    </>
                  ) : cooldown > 0 ? (
                    t('auth.resendInSeconds', { seconds: cooldown })
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t('auth.resendEmail')}
                    </>
                  )}
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
