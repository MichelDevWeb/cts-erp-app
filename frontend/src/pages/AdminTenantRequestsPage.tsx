import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  getAllTenantRequests, 
  approveTenantRequest, 
  rejectTenantRequest,
  type TenantRequestWithUser
} from '@/api/tenantRequests'
import {
  getAllTenants,
  toggleTenantLock,
  type TenantWithDetails
} from '@/api/tenants'
import { formatDate } from '@/lib/formatters'
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
  Briefcase,
  Lock,
  Unlock,
  Users,
  ShieldAlert,
  Calendar
} from 'lucide-react'
import type { RequestStatus } from '@/types/database.types'

type FilterStatus = 'all' | RequestStatus
type MainTab = 'requests' | 'tenants'
type TenantFilter = 'all' | 'active' | 'locked'

export function AdminTenantRequestsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<MainTab>('requests')
  
  // Requests state
  const [requests, setRequests] = useState<TenantRequestWithUser[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({})

  // Tenants state
  const [tenants, setTenants] = useState<TenantWithDetails[]>([])
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [tenantFilter, setTenantFilter] = useState<TenantFilter>('all')
  const [tenantSearch, setTenantSearch] = useState('')

  // Lock/Unlock Modal state
  const [modalState, setModalState] = useState<{
    open: boolean
    tenant: TenantWithDetails | null
    isLockAction: boolean
    reason: string
    submitting: boolean
  }>({
    open: false,
    tenant: null,
    isLockAction: true,
    reason: '',
    submitting: false,
  })

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true)
    setError(null)
    try {
      const status = filterStatus === 'all' ? undefined : filterStatus
      const data = await getAllTenantRequests(status)
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setLoadingRequests(false)
    }
  }, [filterStatus])

  const loadTenants = useCallback(async () => {
    setLoadingTenants(true)
    setError(null)
    try {
      const data = await getAllTenants()
      setTenants(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants')
    } finally {
      setLoadingTenants(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    setError(null)
    try {
      await approveTenantRequest(requestId, actionNotes[requestId])
      await loadRequests()
      await loadTenants()
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

  const openLockModal = (tenant: TenantWithDetails, isLock: boolean) => {
    setModalState({
      open: true,
      tenant,
      isLockAction: isLock,
      reason: '',
      submitting: false,
    })
  }

  const handleConfirmLockToggle = async () => {
    if (!modalState.tenant) return

    setModalState(prev => ({ ...prev, submitting: true }))
    setError(null)

    const res = await toggleTenantLock(
      modalState.tenant.id,
      modalState.isLockAction,
      modalState.reason
    )

    if (res.success) {
      setModalState({
        open: false,
        tenant: null,
        isLockAction: true,
        reason: '',
        submitting: false,
      })
      await loadTenants()
      await loadRequests()
    } else {
      setError(res.error || 'Failed to update tenant lock status')
      setModalState(prev => ({ ...prev, submitting: false }))
    }
  }

  // Filter requests
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

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    // Status filter
    if (tenantFilter === 'active' && tenant.is_locked) return false
    if (tenantFilter === 'locked' && !tenant.is_locked) return false

    // Search query
    if (!tenantSearch) return true
    const query = tenantSearch.toLowerCase()
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.owner_name?.toLowerCase().includes(query) ||
      tenant.owner_email?.toLowerCase().includes(query)
    )
  })

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            {t('admin.statusPending')}
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {t('admin.statusApproved')}
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
            <XCircle className="h-3 w-3" />
            {t('admin.statusRejected')}
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            {t('admin.statusCompleted')}
          </span>
        )
    }
  }

  const getFilterLabel = (status: FilterStatus) => {
    switch (status) {
      case 'all': return t('admin.filterAll', 'Tất cả')
      case 'pending': return t('admin.filterPending', 'Chờ duyệt')
      case 'approved': return t('admin.filterApproved', 'Đã duyệt')
      case 'rejected': return t('admin.filterRejected', 'Đã từ chối')
      case 'accepted': return t('admin.filterCompleted', 'Hoàn tất')
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const lockedTenantsCount = tenants.filter(t => t.is_locked).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activeTab === 'requests' 
              ? t('admin.tenantRequestsTitle', 'Yêu cầu đăng ký công ty')
              : t('admin.registeredTenantsTitle', 'Quản lý Doanh nghiệp')}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeTab === 'requests'
              ? t('admin.tenantRequestsSubtitle', 'Xét duyệt các yêu cầu đăng ký công ty mới từ khách hàng')
              : t('admin.registeredTenantsSubtitle', 'Danh sách tất cả doanh nghiệp đã hoàn tất đăng ký trong hệ thống')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Tabs Navigation */}
          <div className="flex p-1 bg-muted rounded-lg border border-border">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'requests'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>{t('admin.tabRequests', 'Yêu cầu đăng ký')}</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tenants')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'tenants'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>{t('admin.tabTenants', 'Doanh nghiệp đã hoàn thành')}</span>
              {lockedTenantsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {lockedTenantsCount}
                </span>
              )}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadRequests()
              loadTenants()
            }}
            disabled={loadingRequests || loadingTenants}
          >
            <RefreshCw className={`h-4 w-4 ${loadingRequests || loadingTenants ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: REGISTRATION REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.searchPlaceholder', 'Tìm kiếm theo tên công ty, email...')}
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
                      {getFilterLabel(status)}
                      {status === 'pending' && pendingCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white">
                          {pendingCount}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          {loadingRequests ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium">{t('admin.noRequestsTitle', 'Không có yêu cầu nào')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery 
                    ? t('admin.noSearchResults', 'Không tìm thấy kết quả phù hợp với từ khoá.')
                    : t('admin.noRequestsDesc', 'Hiện không có yêu cầu nào trong trạng thái này.')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request) => {
                // Check if matching tenant exists and its lock status
                const matchedTenant = tenants.find(t => t.id === request.tenant_id || t.name === request.company_name)

                return (
                  <Card key={request.id} className="overflow-hidden border border-border shadow-sm">
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold">{request.company_name}</CardTitle>
                            {getStatusBadge(request.status)}
                            {matchedTenant && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                matchedTenant.is_locked
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              }`}>
                                {matchedTenant.is_locked ? <Lock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {matchedTenant.is_locked ? t('admin.statusLocked') : t('admin.statusActive')}
                              </span>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            {t('admin.submittedAt', 'Đăng ký ngày')}: {formatDate(request.created_at)}
                          </CardDescription>
                        </div>

                        {/* Completed request quick lock/unlock action */}
                        {request.status === 'accepted' && matchedTenant && (
                          <div>
                            {matchedTenant.is_locked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 hover:text-emerald-700 border-emerald-300"
                                onClick={() => openLockModal(matchedTenant, false)}
                              >
                                <Unlock className="h-3.5 w-3.5 mr-1.5" />
                                {t('admin.unlockTenant', 'Mở khoá')}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 hover:text-rose-700 border-rose-300"
                                onClick={() => openLockModal(matchedTenant, true)}
                              >
                                <Lock className="h-3.5 w-3.5 mr-1.5" />
                                {t('admin.lockTenant', 'Khoá')}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                      {/* Info Grid */}
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        {request.user_email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">{t('common.user')}:</span> {request.user_email}
                          </div>
                        )}
                        {request.company_email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">{t('common.company')}:</span> {request.company_email}
                          </div>
                        )}
                        {request.company_phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            {request.company_phone}
                          </div>
                        )}
                        {request.company_address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            {request.company_address}
                          </div>
                        )}
                        {request.business_type && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-4 w-4 flex-shrink-0" />
                            {request.business_type}
                          </div>
                        )}
                      </div>

                      {request.description && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                          {request.description}
                        </div>
                      )}

                      {/* Review Notes */}
                      {request.review_notes && (
                        <div className="bg-muted/60 rounded-lg p-3 text-sm">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            {t('common.reviewNotes')}:
                          </p>
                          <p>{request.review_notes}</p>
                        </div>
                      )}

                      {/* Pending Action Form */}
                      {request.status === 'pending' && (
                        <div className="pt-4 border-t space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                              {t('admin.noteLabel', 'Ghi chú xét duyệt')}
                            </label>
                            <Input
                              placeholder={t('admin.notePlaceholder', 'Nhập ghi chú cho người dùng (tuỳ chọn)...')}
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
                              {t('admin.approveBtn')}
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
                              {t('admin.rejectBtn')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTERED / COMPLETED TENANTS */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Filters Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.searchPlaceholder', 'Tìm kiếm theo tên công ty, email...')}
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={tenantFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTenantFilter('all')}
                  >
                    {t('common.all', 'Tất cả')} ({tenants.length})
                  </Button>
                  <Button
                    variant={tenantFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTenantFilter('active')}
                    className="text-emerald-600 dark:text-emerald-400"
                  >
                    {t('admin.statusActive', 'Đang hoạt động')} ({tenants.filter(t => !t.is_locked).length})
                  </Button>
                  <Button
                    variant={tenantFilter === 'locked' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTenantFilter('locked')}
                    className="text-rose-600 dark:text-rose-400"
                  >
                    {t('admin.statusLocked', 'Đã bị khoá')} ({tenants.filter(t => t.is_locked).length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenants List */}
          {loadingTenants ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTenants.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium">{t('admin.noTenantsTitle', 'Chưa có doanh nghiệp nào')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('admin.noTenantsDesc', 'Các công ty hoàn tất đăng ký sẽ hiển thị tại đây.')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTenants.map((tenant) => (
                <Card 
                  key={tenant.id}
                  className={`overflow-hidden border transition-all ${
                    tenant.is_locked
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'border-border hover:shadow-md'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="truncate">{tenant.name}</span>
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(tenant.created_at)}</span>
                        </div>
                      </div>

                      {tenant.is_locked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <Lock className="h-3 w-3" />
                          {t('admin.statusLocked', 'Đã khoá')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('admin.statusActive', 'Hoạt động')}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t">
                      {tenant.owner_name && (
                        <div className="flex items-center justify-between">
                          <span>{t('common.user')}:</span>
                          <span className="font-medium text-foreground">{tenant.owner_name}</span>
                        </div>
                      )}
                      {tenant.owner_email && (
                        <div className="flex items-center justify-between">
                          <span>Email:</span>
                          <span className="font-medium text-foreground truncate max-w-[180px]">
                            {tenant.owner_email}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>{t('admin.membersCount', 'Thành viên')}:</span>
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {tenant.members_count || 1}
                        </span>
                      </div>
                    </div>

                    {/* Locked notice & reason */}
                    {tenant.is_locked && (
                      <div className="p-2.5 bg-rose-100/70 dark:bg-rose-950/40 rounded-lg text-xs text-rose-800 dark:text-rose-200 space-y-1">
                        <div className="font-semibold flex items-center gap-1">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>{t('admin.reason', 'Lý do')}:</span>
                        </div>
                        <p className="italic">
                          {tenant.locked_reason || t('admin.noReasonProvided', 'Không có lý do được ghi.')}
                        </p>
                        {tenant.locked_at && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 pt-1 border-t border-rose-200 dark:border-rose-900/60">
                            {t('admin.lockedAt', { date: formatDate(tenant.locked_at) })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action button */}
                    <div className="pt-2">
                      {tenant.is_locked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                          onClick={() => openLockModal(tenant, false)}
                        >
                          <Unlock className="h-3.5 w-3.5 mr-2" />
                          {t('admin.unlockTenant', 'Mở khoá doanh nghiệp')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-300 dark:border-rose-800"
                          onClick={() => openLockModal(tenant, true)}
                        >
                          <Lock className="h-3.5 w-3.5 mr-2" />
                          {t('admin.lockTenant', 'Khoá doanh nghiệp')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOCK / UNLOCK CONFIRMATION MODAL */}
      {modalState.open && modalState.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
            <CardHeader className={modalState.isLockAction ? 'bg-rose-50 dark:bg-rose-950/40 pb-4' : 'bg-emerald-50 dark:bg-emerald-950/40 pb-4'}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-full ${
                  modalState.isLockAction 
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300'
                }`}>
                  {modalState.isLockAction ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">
                    {modalState.isLockAction
                      ? t('admin.lockModalTitle', 'Khoá tài khoản doanh nghiệp')
                      : t('admin.unlockModalTitle', 'Mở khoá doanh nghiệp')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {modalState.tenant.name}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {modalState.isLockAction
                  ? t(
                      'admin.lockModalDesc',
                      'Khi bị khoá, các tài khoản thành viên thuộc doanh nghiệp này sẽ không thể truy cập các chức năng của hệ thống.'
                    )
                  : t(
                      'admin.unlockModalDesc',
                      'Bạn có chắc chắn muốn mở khoá cho doanh nghiệp này? Các thành viên sẽ có thể đăng nhập và sử dụng hệ thống bình thường.'
                    )}
              </p>

              {modalState.isLockAction && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t('admin.lockReasonLabel', 'Lý do khoá (tuỳ chọn)')}
                  </label>
                  <Input
                    placeholder={t('admin.lockReasonPlaceholder', 'Ví dụ: Vi phạm điều khoản, tạm ngưng dịch vụ...')}
                    value={modalState.reason}
                    onChange={(e) => setModalState(prev => ({ ...prev, reason: e.target.value }))}
                    disabled={modalState.submitting}
                    className="h-10 text-sm"
                  />
                </div>
              )}
            </CardContent>

            <div className="p-4 bg-muted/40 border-t flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setModalState(prev => ({ ...prev, open: false }))}
                disabled={modalState.submitting}
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                variant={modalState.isLockAction ? 'destructive' : 'default'}
                onClick={handleConfirmLockToggle}
                disabled={modalState.submitting}
              >
                {modalState.submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {modalState.isLockAction ? t('admin.locking', 'Đang khoá...') : t('admin.unlocking', 'Đang mở khoá...')}
                  </>
                ) : (
                  modalState.isLockAction ? t('admin.confirmLock', 'Xác nhận khoá') : t('admin.confirmUnlock', 'Xác nhận mở khoá')
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
