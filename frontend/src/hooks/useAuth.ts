import { useEffect, useState, useCallback, useRef } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/api/supabaseClient'
import type { Profile, UserRole, Tenant } from '@/types/database.types'

interface ProfileWithTenant extends Profile {
  tenant: Tenant | null
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: ProfileWithTenant | null
  loading: boolean
  profileLoading: boolean
  initialized: boolean
  error: AuthError | null
}

interface UseAuthReturn extends AuthState {
  role: UserRole | null
  tenantId: string | null
  tenantName: string | null
  isGuest: boolean
  isAdmin: boolean
  isStaff: boolean
  hasTenant: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    profileLoading: false,
    initialized: false,
    error: null,
  })
  
  const initializedRef = useRef(false)

  // Fetch profile data
  const fetchProfile = useCallback(async (userId: string): Promise<ProfileWithTenant | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          tenant:tenants(id, name)
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data as ProfileWithTenant
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }, [])

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!state.user) return

    setState(prev => ({ ...prev, profileLoading: true }))
    const profile = await fetchProfile(state.user.id)
    setState(prev => ({ ...prev, profile, profileLoading: false }))
  }, [state.user, fetchProfile])

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initializedRef.current) return
    initializedRef.current = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setState(prev => ({ 
            ...prev, 
            error, 
            loading: false, 
            initialized: true 
          }))
          return
        }

        let profile: ProfileWithTenant | null = null
        if (session?.user) {
          profile = await fetchProfile(session.user.id)
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
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          initialized: true 
        }))
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Skip if not initialized yet (let getInitialSession handle it)
        if (!initializedRef.current) return

        let profile: ProfileWithTenant | null = null
        if (session?.user) {
          profile = await fetchProfile(session.user.id)
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
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setState(prev => ({ ...prev, error, loading: false }))
    }
    // If successful, onAuthStateChange will update the state

    return { error }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
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
      setState(prev => ({ ...prev, error, loading: false }))
    } else {
      setState(prev => ({ ...prev, loading: false }))
    }

    return { error }
  }, [])

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    await supabase.auth.signOut()
    setState({
      user: null,
      session: null,
      profile: null,
      loading: false,
      profileLoading: false,
      initialized: true,
      error: null,
    })
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }, [])

  // Derived values - only compute when profile is actually loaded
  const role = state.profile?.role ?? null
  const tenantId = state.profile?.tenant_id ?? null
  const tenantName = state.profile?.tenant?.name ?? null
  
  // These should only be true when we're certain about the role
  const isGuest = state.profile !== null && role === 'guest'
  const isAdmin = state.profile !== null && role === 'admin'
  const isStaff = state.profile !== null && role === 'staff'
  const hasTenant = tenantId !== null

  // Loading is true until we've checked auth AND loaded profile (if user exists)
  const isLoading = state.loading || !state.initialized || 
    (state.user !== null && state.profile === null && !state.profileLoading)

  return {
    ...state,
    loading: isLoading,
    role,
    tenantId,
    tenantName,
    isGuest,
    isAdmin,
    isStaff,
    hasTenant,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
  }
}
