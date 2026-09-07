import React, { createContext, useEffect, useState, useCallback, useRef } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/api/supabaseClient'
import { getSessionConfig } from '@/api/security'
import type { Profile, UserRole, Tenant } from '@/types/database.types'

export interface ProfileWithTenant extends Profile {
  tenant: Tenant | null
}

export interface AuthState {
  user: User | null
  session: Session | null
  profile: ProfileWithTenant | null
  loading: boolean
  profileLoading: boolean
  initialized: boolean
  error: AuthError | null
}

export interface UseAuthReturn extends AuthState {
  role: UserRole | null
  tenantId: string | null
  tenantName: string | null
  isTenantLocked: boolean
  tenantLockedReason: string | null
  isGuest: boolean
  isAdmin: boolean
  isStaff: boolean
  hasTenant: boolean
  sessionTimeoutMinutes: number
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
  signOut: (reason?: string) => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<UseAuthReturn | null>(null)

const SESSION_START_KEY = 'cts_session_start_time'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    profileLoading: false,
    initialized: false,
    error: null,
  })

  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(1440)
  const initializedRef = useRef(false)
  const isCheckingSessionRef = useRef(false)

  // Fetch session config from system_settings
  const fetchSessionTimeout = useCallback(async () => {
    try {
      const config = await getSessionConfig()
      if (config.timeout_minutes && typeof config.timeout_minutes === 'number') {
        setSessionTimeoutMinutes(config.timeout_minutes)
        return config.timeout_minutes
      }
    } catch {
      // Ignore if system_settings not yet created
    }
    return 1440
  }, [])

  // Sign out helper with reason redirect
  const signOut = useCallback(async (reason?: string) => {
    setState((prev) => ({ ...prev, loading: true }))
    try {
      sessionStorage.removeItem(SESSION_START_KEY)
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      setState({
        user: null,
        session: null,
        profile: null,
        loading: false,
        profileLoading: false,
        initialized: true,
        error: null,
      })
      const validReason = typeof reason === 'string' ? reason : undefined
      const redirectUrl = validReason ? `/login?reason=${encodeURIComponent(validReason)}` : '/login'
      window.location.href = redirectUrl
    }
  }, [])

  // Validate session against session_valid_after and timeout duration
  const validateSession = useCallback((
    profile: ProfileWithTenant | null,
    timeoutMins: number = sessionTimeoutMinutes
  ): boolean => {
    if (!profile) return true

    // 1. Get or set session start time
    const sessionStartStr = sessionStorage.getItem(SESSION_START_KEY)
    let sessionStartTime: number
    if (!sessionStartStr) {
      sessionStartTime = Date.now()
      sessionStorage.setItem(SESSION_START_KEY, sessionStartTime.toString())
    } else {
      sessionStartTime = parseInt(sessionStartStr, 10)
    }

    // 2. Check session duration against timeout_minutes
    const now = Date.now()
    const elapsedMinutes = (now - sessionStartTime) / (60 * 1000)
    if (timeoutMins > 0 && elapsedMinutes > timeoutMins) {
      console.warn(`[AuthContext] Session expired: ${elapsedMinutes.toFixed(1)}m > ${timeoutMins}m`)
      signOut('session_expired')
      return false
    }

    // 3. Check profile.session_valid_after against sessionStartTime
    if (profile.session_valid_after) {
      const validAfterTime = new Date(profile.session_valid_after).getTime()
      // Allow 10-second margin of error for clock skew on initial login / reset
      if (validAfterTime > sessionStartTime + 10000) {
        console.warn('[AuthContext] Session reset by administrator. Forcing sign out.')
        signOut('session_reset')
        return false
      }
    }

    return true
  }, [sessionTimeoutMinutes, signOut])

  // Fetch profile data with graceful fallbacks
  const fetchProfile = useCallback(async (userId: string): Promise<ProfileWithTenant | null> => {
    try {
      // 1. Attempt with full tenant lock columns
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          tenant:tenants(id, name, is_locked, locked_at, locked_reason, created_at, updated_at)
        `)
        .eq('id', userId)
        .single()

      if (!error && data) {
        return data as unknown as ProfileWithTenant
      }

      // 2. Fallback attempt with basic tenant fields (in case migration 003 hasn't been executed yet)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select(`
          *,
          tenant:tenants(id, name)
        `)
        .eq('id', userId)
        .single()

      if (!fallbackError && fallbackData) {
        const p = fallbackData as unknown as ProfileWithTenant
        if (p.tenant) {
          p.tenant.is_locked = false
          p.tenant.locked_at = null
          p.tenant.locked_reason = null
        }
        return p
      }

      // 3. Fallback attempt: profile without tenant relation
      const { data: profileOnly, error: profileOnlyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profileOnlyError && profileOnly) {
        return {
          ...(profileOnly as Record<string, unknown>),
          tenant: null,
        } as unknown as ProfileWithTenant
      }

      console.error('All profile fetch attempts failed:', { error, fallbackError, profileOnlyError })
      return null
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }, [])

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!state.user) return

    setState((prev) => ({ ...prev, profileLoading: true }))
    const profile = await fetchProfile(state.user.id)
    if (profile) {
      validateSession(profile)
    }
    setState((prev) => ({ ...prev, profile, profileLoading: false }))
  }, [state.user, fetchProfile, validateSession])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const getInitialSession = async () => {
      try {
        const [sessionRes, timeoutMins] = await Promise.all([
          supabase.auth.getSession(),
          fetchSessionTimeout(),
        ])

        const session = sessionRes.data.session
        const error = sessionRes.error

        if (error) {
          setState((prev) => ({
            ...prev,
            error,
            loading: false,
            initialized: true,
          }))
          return
        }

        let profile: ProfileWithTenant | null = null
        if (session?.user) {
          // Initialize session start time if not existing (always default to Date.now())
          if (!sessionStorage.getItem(SESSION_START_KEY)) {
            sessionStorage.setItem(SESSION_START_KEY, Date.now().toString())
          }

          profile = await fetchProfile(session.user.id)

          // Validate session validity
          if (profile) {
            const isValid = validateSession(profile, timeoutMins)
            if (!isValid) {
              setState((prev) => ({
                ...prev,
                loading: false,
                initialized: true,
              }))
              return
            }
          }
        }

        setState({
          user: session?.user ?? null,
          session,
          profile,
          loading: false,
          profileLoading: false,
          initialized: true,
          error: null,
        })
      } catch (err) {
        console.error('Error getting initial session:', err)
        setState((prev) => ({
          ...prev,
          loading: false,
          initialized: true,
        }))
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip handling SIGNED_OUT here as signOut() handles state cleanup
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem(SESSION_START_KEY)
          setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            profileLoading: false,
            initialized: true,
            error: null,
          })
          return
        }

        let profile: ProfileWithTenant | null = null
        try {
          if (session?.user) {
            if (!sessionStorage.getItem(SESSION_START_KEY)) {
              sessionStorage.setItem(SESSION_START_KEY, Date.now().toString())
            }

            profile = await fetchProfile(session.user.id)
            if (profile) {
              const isValid = validateSession(profile)
              if (!isValid) {
                setState((prev) => ({
                  ...prev,
                  loading: false,
                  initialized: true,
                }))
                return
              }
            }
          }
        } catch (authChangeErr) {
          console.error('[AuthContext] Error in onAuthStateChange handler:', authChangeErr)
        } finally {
          setState({
            user: session?.user ?? null,
            session,
            profile,
            loading: false,
            profileLoading: false,
            initialized: true,
            error: null,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile, fetchSessionTimeout, validateSession])

  // Periodic and on-focus session check (every 30s)
  useEffect(() => {
    if (!state.user || !state.profile) return

    const checkCurrentSession = async () => {
      if (isCheckingSessionRef.current || !state.user) return
      isCheckingSessionRef.current = true

      try {
        // 1. Check local duration timeout first
        const isValidLocal = validateSession(state.profile, sessionTimeoutMinutes)
        if (!isValidLocal) return

        // 2. Fetch fresh profile to detect any administrative reset
        const freshProfile = await fetchProfile(state.user.id)
        if (freshProfile) {
          validateSession(freshProfile, sessionTimeoutMinutes)
        }
      } catch (e) {
        console.warn('[AuthContext] Session periodic check failed:', e)
      } finally {
        isCheckingSessionRef.current = false
      }
    }

    const interval = setInterval(checkCurrentSession, 30000) // every 30 seconds

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkCurrentSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.user, state.profile, sessionTimeoutMinutes, validateSession, fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    // Set new session start time upon fresh login
    sessionStorage.setItem(SESSION_START_KEY, Date.now().toString())

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        sessionStorage.removeItem(SESSION_START_KEY)
        setState((prev) => ({ ...prev, error, loading: false }))
        return { error }
      }

      if (data?.user) {
        const profile = await fetchProfile(data.user.id)
        setState({
          user: data.user,
          session: data.session,
          profile,
          loading: false,
          profileLoading: false,
          initialized: true,
          error: null,
        })
      } else {
        setState((prev) => ({ ...prev, loading: false }))
      }

      return { error: null }
    } catch (err) {
      console.error('[AuthContext] signIn error:', err)
      setState((prev) => ({ ...prev, loading: false }))
      return { error: err as AuthError }
    }
  }, [fetchProfile])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    sessionStorage.setItem(SESSION_START_KEY, Date.now().toString())

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      sessionStorage.removeItem(SESSION_START_KEY)
      setState((prev) => ({ ...prev, error, loading: false }))
    }

    return { error }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }, [])

  // Derived values
  const role = state.profile?.role ?? null
  const tenantId = state.profile?.tenant_id ?? null
  const tenantName = state.profile?.tenant?.name ?? null
  const isTenantLocked = Boolean(state.profile?.tenant?.is_locked)
  const tenantLockedReason = state.profile?.tenant?.locked_reason ?? null

  const isGuest = state.profile !== null && role === 'guest'
  const isAdmin = state.profile !== null && role === 'admin'
  const isStaff = state.profile !== null && role === 'staff'
  const hasTenant = tenantId !== null

  const isLoading = !state.initialized || state.loading || state.profileLoading

  const value: UseAuthReturn = {
    ...state,
    loading: isLoading,
    role,
    tenantId,
    tenantName,
    isTenantLocked,
    tenantLockedReason,
    isGuest,
    isAdmin,
    isStaff,
    hasTenant,
    sessionTimeoutMinutes,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
