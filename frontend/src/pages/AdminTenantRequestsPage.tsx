import { useState, useEffect } from 'react'
import { 
  getAllTenantRequests, 
  approveTenantRequest, 
  rejectTenantRequest,
  type TenantRequestWithUser
} from '@/api/tenantRequests'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Building2, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Search,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Briefcase
} from 'lucide-react'
import type { RequestStatus } from '@/types/database.types'

type FilterStatus = 'all' | RequestStatus

export function AdminTenantRequestsPage() {
  const [requests, setRequests] = useState<TenantRequestWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    loadRequests()
  }, [filterStatus])

  const loadRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const status = filterStatus === 'all' ? undefined : filterStatus
      const data = await getAllTenantRequests(status)
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    setError(null)
    try {
      await approveTenantRequest(requestId, actionNotes[requestId])
      await loadRequests()
      setActionNotes(prev => ({ ...prev, [requestId]: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId)
    setError(null)
    try {
      await rejectTenantRequest(requestId, actionNotes[requestId])
      await loadRequests()
      setActionNotes(prev => ({ ...prev, [requestId]: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredRequests = requests.filter(request => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      request.company_name.toLowerCase().includes(query) ||
      request.company_email?.toLowerCase().includes(query) ||
      request.user_full_name?.toLowerCase().includes(query) ||
      request.user_email?.toLowerCase().includes(query)
    )
  })

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        )
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Requests</h1>
          <p className="text-muted-foreground">
            Review and approve company registration requests
          </p>
        </div>
        <Button variant="outline" onClick={loadRequests} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company, email, or user name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected', 'accepted'] as FilterStatus[]).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white">
                      {pendingCount}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRequests.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No requests found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : `No ${filterStatus === 'all' ? '' : filterStatus} requests at the moment.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Request List */}
      {!loading && filteredRequests.length > 0 && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {request.company_name}
                    </CardTitle>
                    <CardDescription>
                      Requested by {request.user_full_name || request.user_email || 'Unknown User'} • {new Date(request.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Company Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {request.user_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">User:</span> {request.user_email}
                    </div>
                  )}
                  {request.company_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">Company:</span> {request.company_email}
                    </div>
                  )}
                  {request.company_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {request.company_phone}
                    </div>
                  )}
                  {request.company_address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {request.company_address}
                    </div>
                  )}
                  {request.business_type && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      {request.business_type}
                    </div>
                  )}
                </div>

                {request.description && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                  </div>
                )}

                {/* Review Notes (for processed requests) */}
                {request.review_notes && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Review Notes:</p>
                    <p className="text-sm">{request.review_notes}</p>
                  </div>
                )}

                {/* Action Section (for pending requests) */}
                {request.status === 'pending' && (
                  <div className="pt-4 border-t space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes (optional)</label>
                      <Input
                        placeholder="Add a note for the user..."
                        value={actionNotes[request.id] || ''}
                        onChange={(e) => setActionNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                        disabled={processingId === request.id}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1"
                      >
                        {processingId === request.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1"
                      >
                        {processingId === request.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
