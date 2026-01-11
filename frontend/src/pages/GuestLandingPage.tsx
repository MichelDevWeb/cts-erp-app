import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { 
  getMyPendingRequest, 
  getMyApprovedRequest, 
  createTenantRequest,
  type CreateTenantRequestData 
} from '@/api/tenantRequests'
import { acceptApprovedRequest } from '@/api/tenantRequests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Building2, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PartyPopper,
  LogOut
} from 'lucide-react'
import type { TenantRequest } from '@/types/database.types'

type ViewState = 'loading' | 'form' | 'pending' | 'approved' | 'rejected'

export function GuestLandingPage() {
  const { user, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [existingRequest, setExistingRequest] = useState<TenantRequest | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<CreateTenantRequestData>({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    business_type: '',
    description: '',
  })

  useEffect(() => {
    checkExistingRequest()
  }, [])

  const checkExistingRequest = async () => {
    try {
      // Check for approved request first
      const approved = await getMyApprovedRequest()
      if (approved) {
        setExistingRequest(approved)
        setViewState('approved')
        return
      }

      // Check for pending request
      const pending = await getMyPendingRequest()
      if (pending) {
        setExistingRequest(pending)
        setViewState('pending')
        return
      }

      // No existing request, show form
      setViewState('form')
    } catch (err) {
      console.error('Error checking existing request:', err)
      setViewState('form')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const request = await createTenantRequest(formData)
      setExistingRequest(request)
      setViewState('pending')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptApproval = async () => {
    if (!existingRequest) return

    setIsSubmitting(true)
    setError(null)

    try {
      await acceptApprovedRequest(existingRequest.id)
      await refreshProfile()
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept approval')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Loading state
  if (viewState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">CTS ERP</span>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>

        {/* Welcome message */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground">
            {viewState === 'form' && 'Register your company to get started with CTS ERP.'}
            {viewState === 'pending' && 'Your company registration is being reviewed.'}
            {viewState === 'approved' && 'Your company registration has been approved!'}
          </p>
        </div>

        {/* Pending State */}
        {viewState === 'pending' && existingRequest && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
              </div>
              <CardTitle className="text-xl">Pending Review</CardTitle>
              <CardDescription>
                Your registration for "{existingRequest.company_name}" is being reviewed by our team.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                You'll receive a notification once your request is approved. This usually takes 1-2 business days.
              </p>
              <div className="bg-muted rounded-lg p-4 text-left">
                <h4 className="font-medium mb-2">Request Details</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Company:</dt>
                    <dd>{existingRequest.company_name}</dd>
                  </div>
                  {existingRequest.business_type && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Business Type:</dt>
                      <dd>{existingRequest.business_type}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Submitted:</dt>
                    <dd>{new Date(existingRequest.created_at).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved State */}
        {viewState === 'approved' && existingRequest && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-500" />
              </div>
              <CardTitle className="text-xl">Congratulations!</CardTitle>
              <CardDescription>
                Your registration for "{existingRequest.company_name}" has been approved!
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                Click the button below to complete your setup and access the ERP system.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full h-12" 
                onClick={handleAcceptApproval}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up your company...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete Setup & Enter Dashboard
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Registration Form */}
        {viewState === 'form' && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Register Your Company
              </CardTitle>
              <CardDescription>
                Fill out the form below to register your company for CTS ERP access.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    placeholder="Acme Corporation"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_email">Business Email</Label>
                    <Input
                      id="company_email"
                      name="company_email"
                      type="email"
                      placeholder="contact@company.com"
                      value={formData.company_email}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Phone Number</Label>
                    <Input
                      id="company_phone"
                      name="company_phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.company_phone}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address">Business Address</Label>
                  <Input
                    id="company_address"
                    name="company_address"
                    placeholder="123 Business St, City, Country"
                    value={formData.company_address}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Input
                    id="business_type"
                    name="business_type"
                    placeholder="e.g., Manufacturing, Distribution, Retail"
                    value={formData.business_type}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Tell us about your business (optional)</Label>
                  <textarea
                    id="description"
                    name="description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Brief description of your business and what you need..."
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  disabled={isSubmitting || !formData.company_name}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Registration Request'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Need help? Contact support at support@ctserp.com
        </p>
      </div>
    </div>
  )
}

