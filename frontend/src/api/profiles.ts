import { supabase } from './supabaseClient'
import type { Profile, UserRole } from '@/types/database.types'

// Get current user's profile
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      tenant:tenants(id, name)
    `)
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

// Update current user's profile
export async function updateMyProfile(updates: { full_name?: string }) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates as never)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Profile
}

// Get current user's role
export async function getMyRole(): Promise<UserRole | null> {
  const { data, error } = await supabase.rpc('get_user_role')
  
  if (error) {
    console.error('Error getting user role:', error)
    return null
  }
  
  return data as UserRole
}

// Check if current user is admin
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  
  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }
  
  return data as boolean
}

// Get profiles in tenant (for admin/managers)
export async function getTeamProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true })

  if (error) throw error
  return data as unknown as Profile[]
}
