import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import {
  getSessionConfig,
  updateSessionConfig,
  resetUserSession,
  resetAllSessions,
  getUsersAdmin,
  checkMigration004Applied,
  type SessionConfig,
  type AdminUserSession,
} from '@/api/security'
import { formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ShieldAlert,
  Clock,
  RotateCcw,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  UserCheck,
  Building2,
  KeyRound,
  Sparkles,
} from 'lucide-react'

const TIMEOUT_PRESETS = [
  { label: '15 phút', minutes: 15 },
  { label: '30 phút', minutes: 30 },
  { label: '1 giờ', minutes: 60 },
  { label: '4 giờ', minutes: 240 },
  { label: '8 giờ', minutes: 480 },
  { label: '24 giờ (1 ngày)', minutes: 1440 },
  { label: '7 ngày', minutes: 10080 },
]

export function AdminSecurityPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()

  // Session Config State
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const [selectedMinutes, setSelectedMinutes] = useState<number>(1440)
  const [customMinutes, setCustomMinutes] = useState<string>('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSuccess, setConfigSuccess] = useState(false)

  // Users State
  const [users, setUsers] = useState<AdminUserSession[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Global reset modal
  const [globalResetModalOpen, setGlobalResetModalOpen] = useState(false)
  const [globalResetting, setGlobalResetting] = useState(false)
  const [globalResetSuccess, setGlobalResetSuccess] = useState<string | null>(null)

  // Single user reset modal
  const [userResetModal, setUserResetModal] = useState<{
    open: boolean
    user: AdminUserSession | null
    submitting: boolean
  }>({
    open: false,
    user: null,
    submitting: false,
  })

  // General error/success alerts
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [migrationApplied, setMigrationApplied] = useState<boolean>(true)

  const loadData = useCallback(async () => {
    setError(null)
    setLoadingUsers(true)
    try {
      const [configData, usersData, isApplied] = await Promise.all([
        getSessionConfig(),
        getUsersAdmin(),
        checkMigration004Applied(),
      ])

      setConfig(configData)
      setSelectedMinutes(configData.timeout_minutes)
      setUsers(usersData)
      setMigrationApplied(isApplied)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin bảo mật')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save session timeout configuration
  const handleSaveTimeout = async () => {
    let minutesToSave = selectedMinutes
    if (customMinutes.trim()) {
      const parsed = parseInt(customMinutes, 10)
      if (isNaN(parsed) || parsed < 5) {
        setError('Thời gian hết hạn phải là số nguyên tối thiểu 5 phút')
        return
      }
      minutesToSave = parsed
    }

    setSavingConfig(true)
    setError(null)
    setConfigSuccess(false)

    try {
      const updated = await updateSessionConfig(minutesToSave)
      setConfig(updated)
      setSelectedMinutes(updated.timeout_minutes)
      setCustomMinutes('')
      setConfigSuccess(true)
      setTimeout(() => setConfigSuccess(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi cập nhật cấu hình thời gian hết hạn')
    } finally {
      setSavingConfig(false)
    }
  }

  // Handle Global Session Reset
  const handleConfirmGlobalReset = async () => {
    setGlobalResetting(true)
    setError(null)
    try {
      const res = await resetAllSessions()
      setGlobalResetModalOpen(false)
      setGlobalResetSuccess(
        `Đã đặt lại phiên thành công cho ${res.reset_count ?? 0} tài khoản người dùng trong hệ thống.`
      )
      setTimeout(() => setGlobalResetSuccess(null), 6000)
      // Refresh list to update session_valid_after timestamps
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi đặt lại tất cả các phiên')
    } finally {
      setGlobalResetting(false)
    }
  }

  // Handle Single User Session Reset
  const handleConfirmUserReset = async () => {
    if (!userResetModal.user) return

    setUserResetModal(prev => ({ ...prev, submitting: true }))
    setError(null)
    try {
      await resetUserSession(userResetModal.user.id)
      const targetName = userResetModal.user.full_name || userResetModal.user.email || 'Người dùng'
      setActionSuccess(`Đã đặt lại phiên làm việc cho "${targetName}".`)
      setTimeout(() => setActionSuccess(null), 5000)
      setUserResetModal({ open: false, user: null, submitting: false })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi đặt lại phiên người dùng')
      setUserResetModal(prev => ({ ...prev, submitting: false }))
    }
  }

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const query = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !query ||
      (u.full_name && u.full_name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.tenant_name && u.tenant_name.toLowerCase().includes(query)) ||
      u.role.toLowerCase().includes(query)

    return matchesRole && matchesQuery
  })

  const formatMinutesDisplay = (mins: number) => {
    if (mins < 60) return `${mins} phút`
    if (mins < 1440) return `${(mins / 60).toFixed(mins % 60 === 0 ? 0 : 1)} giờ (${mins} phút)`
    return `${(mins / 1440).toFixed(mins % 1440 === 0 ? 0 : 1)} ngày (${mins} phút)`
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      case 'staff':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'customer':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      case 'guest':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('admin.securityTitle', 'Bảo mật & Quản lý Phiên làm việc')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('admin.securitySubtitle', 'Cấu hình thời hạn phiên đăng nhập và quản lý phiên của toàn bộ người dùng trong hệ thống.')}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loadingUsers}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
          {t('common.refresh', 'Làm mới')}
        </Button>
      </div>

      {/* Migration 004 Notice */}
      {!migrationApplied && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
              Cần thực thi SQL Migration 004 trên Supabase
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Các tính năng lưu cấu hình hạn phiên và đặt lại phiên yêu cầu bảng và stored function từ migration 004.
              Vui lòng mở file <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 font-mono rounded font-semibold">migrations/004_session_timeout_and_reset.sql</code>, sao chép toàn bộ nội dung và thực thi trong <strong>Supabase Dashboard &gt; SQL Editor</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Global Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {globalResetSuccess && (
        <div className="flex items-center gap-2 p-4 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl animate-in fade-in">
          <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{globalResetSuccess}</span>
        </div>
      )}

      {/* Top Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Session Expiration Duration Config (7 Cols) */}
        <Card className="lg:col-span-7 border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">
                  {t('admin.sessionTimeoutTitle', 'Thời gian hết hạn phiên làm việc')}
                </CardTitle>
              </div>
              {config && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Hiện tại: {formatMinutesDisplay(config.timeout_minutes)}
                </span>
              )}
            </div>
            <CardDescription className="text-xs">
              {t(
                'admin.sessionTimeoutDesc',
                'Khi người dùng đăng nhập vượt quá thời gian này, hệ thống sẽ tự động đăng xuất để bảo đảm an toàn.'
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Chọn khoảng thời gian định sẵn
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIMEOUT_PRESETS.map((preset) => {
                  const isSelected = selectedMinutes === preset.minutes && !customMinutes
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => {
                        setSelectedMinutes(preset.minutes)
                        setCustomMinutes('')
                      }}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left flex flex-col justify-center ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-card text-foreground hover:bg-muted/70'
                      }`}
                    >
                      <span className="font-bold">{preset.label}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {preset.minutes} phút
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Input */}
            <div className="pt-2 border-t">
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Hoặc nhập thời gian tùy chỉnh (tối thiểu 5 phút)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    placeholder="Nhập số phút (ví dụ: 120)"
                    value={customMinutes}
                    onChange={(e) => {
                      setCustomMinutes(e.target.value)
                      if (e.target.value) {
                        const parsed = parseInt(e.target.value, 10)
                        if (!isNaN(parsed)) setSelectedMinutes(parsed)
                      }
                    }}
                    className="h-10 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    phút
                  </span>
                </div>

                <Button
                  onClick={handleSaveTimeout}
                  disabled={savingConfig}
                  className="h-10 px-5"
                >
                  {savingConfig ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Lưu cấu hình
                    </>
                  )}
                </Button>
              </div>

              {configSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Cập nhật thời gian hết hạn phiên thành công!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Global Reset Action Card (5 Cols) */}
        <Card className="lg:col-span-5 border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/40 via-card to-card dark:from-amber-950/20 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg text-amber-950 dark:text-amber-200">
                {t('admin.resetAllSessionsTitle', 'Đặt lại phiên toàn hệ thống')}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {t(
                'admin.resetAllSessionsDesc',
                'Buộc tất cả người dùng hệ thống đăng xuất ngay lập tức. Phiên làm việc của bạn vẫn được giữ nguyên.'
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <div className="p-3 bg-amber-100/60 dark:bg-amber-950/40 rounded-lg text-xs text-amber-900 dark:text-amber-300 space-y-1 border border-amber-200 dark:border-amber-800/60">
              <p className="font-semibold">Khi nào nên sử dụng?</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-300/90 text-[11px]">
                <li>Nghi ngờ có nguy cơ rò rỉ thông tin hoặc sự cố bảo mật</li>
                <li>Thay đổi quyền hạn vai trò hệ thống quy mô lớn</li>
                <li>Yêu cầu toàn bộ nhân sự đăng nhập lại sau bảo trì</li>
              </ul>
            </div>

            {config?.last_global_reset_at && (
              <p className="text-[11px] text-muted-foreground">
                Lần đặt lại toàn hệ thống gần nhất: <span className="font-medium text-foreground">{formatDate(config.last_global_reset_at)}</span>
              </p>
            )}

            <Button
              variant="destructive"
              className="w-full h-10 font-medium"
              onClick={() => setGlobalResetModalOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('admin.resetAllSessionsBtn', 'Đặt lại tất cả các phiên')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Users Session Management Table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">
                  {t('admin.usersSessionsTitle', 'Danh sách Tài khoản & Trạng thái Phiên')}
                </CardTitle>
                <CardDescription className="text-xs">
                  Theo dõi phiên đăng nhập và chủ động đặt lại phiên cho từng người dùng cụ thể.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                Tổng: {users.length} tài khoản
              </span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên, email, tên công ty hoặc vai trò..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              {['all', 'admin', 'staff', 'customer', 'guest'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                    roleFilter === r
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === 'all' ? 'Tất cả' : r}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Đang tải danh sách người dùng...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 px-4">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">Không tìm thấy tài khoản nào</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Không có người dùng nào khớp với từ khóa tìm kiếm hoặc bộ lọc vai trò hiện tại.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b">
                  <tr>
                    <th className="py-3 px-4">Người dùng</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4">Doanh nghiệp / Tenant</th>
                    <th className="py-3 px-4">Đăng nhập gần nhất</th>
                    <th className="py-3 px-4">Phiên hợp lệ sau</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id
                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground flex items-center gap-1.5">
                            {u.full_name || 'Chưa cập nhật tên'}
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.email || u.id}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${getRoleBadgeClass(
                              u.role
                            )}`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {u.tenant_name ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span>{u.tenant_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Chưa liên kết</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : 'Chưa có thông tin'}
                        </td>

                        <td className="py-3 px-4 text-xs">
                          {u.session_valid_after ? (
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {formatDate(u.session_valid_after)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Mặc định</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 dark:hover:border-rose-800 transition-colors"
                            onClick={() =>
                              setUserResetModal({
                                open: true,
                                user: u,
                                submitting: false,
                              })
                            }
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            {t('admin.resetUserSessionBtn', 'Đặt lại phiên')}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Global Session Reset Confirmation */}
      {globalResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
            <CardHeader className="bg-rose-50 dark:bg-rose-950/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-rose-950 dark:text-rose-200">
                    Xác nhận đặt lại phiên toàn bộ
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Hành động này áp dụng cho tất cả tài khoản trong hệ thống
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                Bạn có chắc chắn muốn buộc tất cả người dùng trong hệ thống phải đăng xuất ngay lập tức?
              </p>
              <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
                <p>• Tất cả phiên hoạt động trên trình duyệt của người dùng sẽ bị chấm dứt.</p>
                <p>• Người dùng sẽ nhìn thấy thông báo đặt lại phiên khi quay trở lại trang đăng nhập.</p>
                <p>• Phiên làm việc của bạn sẽ được giữ nguyên để tiếp tục quản lý.</p>
              </div>
            </CardContent>

            <div className="p-4 bg-muted/40 border-t flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setGlobalResetModalOpen(false)}
                disabled={globalResetting}
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmGlobalReset}
                disabled={globalResetting}
              >
                {globalResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đặt lại...
                  </>
                ) : (
                  'Xác nhận đặt lại tất cả'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 2: Single User Session Reset Confirmation */}
      {userResetModal.open && userResetModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
            <CardHeader className="bg-amber-50 dark:bg-amber-950/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-amber-950 dark:text-amber-200">
                    Đặt lại phiên người dùng
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {userResetModal.user.full_name || userResetModal.user.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                Bạn có chắc chắn muốn đặt lại phiên làm việc cho người dùng{' '}
                <span className="font-semibold">{userResetModal.user.full_name || userResetModal.user.email}</span>?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tài khoản này sẽ ngay lập tức bị đăng xuất khỏi tất cả các thiết bị hiện tại và cần đăng nhập lại với thông báo bảo mật rõ ràng.
              </p>
            </CardContent>

            <div className="p-4 bg-muted/40 border-t flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setUserResetModal({ open: false, user: null, submitting: false })}
                disabled={userResetModal.submitting}
              >
                {t('common.cancel', 'Hủy')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmUserReset}
                disabled={userResetModal.submitting}
              >
                {userResetModal.submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  'Đặt lại phiên'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
