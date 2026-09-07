import { supabase } from './supabaseClient'
import type { UserRole } from '@/types/database.types'

export interface SessionConfig {
  timeout_minutes: number
  inactivity_timeout_minutes?: number
  enable_inactivity_timeout?: boolean
  last_global_reset_at?: string | null
}

export interface AdminUserSession {
  id: string
  email?: string | null
  full_name?: string | null
  role: UserRole | string
  tenant_id?: string | null
  tenant_name?: string | null
  session_valid_after?: string | null
  created_at: string
  last_sign_in_at?: string | null
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  timeout_minutes: 1440, // 24 hours
  inactivity_timeout_minutes: 120,
  enable_inactivity_timeout: false,
  last_global_reset_at: null,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any

/**
 * Check whether Migration 004 has been applied to the Supabase database
 */
export async function checkMigration004Applied(): Promise<boolean> {
  try {
    const { error } = await client.rpc('get_session_config')
    return !error
  } catch {
    return false
  }
}

/**
 * Fetch global session configuration
 */
export async function getSessionConfig(): Promise<SessionConfig> {
  try {
    // 1. Try RPC first
    const { data, error } = await client.rpc('get_session_config')
    if (!error && data) {
      return data as unknown as SessionConfig
    }
  } catch {
    // Silently proceed to fallback
  }

  try {
    // 2. Fallback to direct query on system_settings
    const { data: setting, error: tableError } = await client
      .from('system_settings')
      .select('value')
      .eq('key', 'session_config')
      .maybeSingle()

    if (!tableError && setting?.value) {
      return setting.value as unknown as SessionConfig
    }
  } catch {
    // Silently proceed to default
  }

  return DEFAULT_SESSION_CONFIG
}

/**
 * Update global session configuration (Super Admin only)
 */
export async function updateSessionConfig(
  timeoutMinutes: number,
  inactivityMinutes: number = 120,
  enableInactivity: boolean = false
): Promise<SessionConfig> {
  try {
    // 1. Try RPC
    const { data, error } = await client.rpc('update_session_config', {
      p_timeout_minutes: Math.max(5, timeoutMinutes),
      p_inactivity_minutes: Math.max(5, inactivityMinutes),
      p_enable_inactivity: enableInactivity,
    })

    if (!error && data) {
      return data as unknown as SessionConfig
    }
    if (error) throw error
  } catch {
    // 2. Direct table update fallback
    const newConfig: SessionConfig = {
      timeout_minutes: Math.max(5, timeoutMinutes),
      inactivity_timeout_minutes: Math.max(5, inactivityMinutes),
      enable_inactivity_timeout: enableInactivity,
    }

    const { error: upsertError } = await client
      .from('system_settings')
      .upsert({
        key: 'session_config',
        value: newConfig as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      console.warn('[SecurityAPI] updateSessionConfig fallback failed:', upsertError)
      throw new Error(
        'Vui lòng thực thi migration 004 trong Supabase SQL Editor trước khi lưu cấu hình.'
      )
    }
    return newConfig
  }

  return DEFAULT_SESSION_CONFIG
}

/**
 * Invalidate session for a specific user (Super Admin only)
 */
export async function resetUserSession(userId: string): Promise<{ success: boolean; session_valid_after?: string }> {
  try {
    const { data, error } = await client.rpc('reset_user_session', {
      p_user_id: userId,
    })

    if (!error && data) {
      return data as unknown as { success: boolean; session_valid_after?: string }
    }
    if (error) throw error
  } catch {
    const now = new Date().toISOString()
    const { error: updateError } = await client
      .from('profiles')
      .update({
        session_valid_after: now,
        updated_at: now,
      })
      .eq('id', userId)

    if (updateError) {
      throw new Error('Vui lòng thực thi migration 004 trong Supabase SQL Editor để đặt lại phiên.')
    }
    return { success: true, session_valid_after: now }
  }

  return { success: true }
}

/**
 * Invalidate all sessions globally or for a specific tenant (Super Admin only)
 */
export async function resetAllSessions(tenantId?: string): Promise<{ success: boolean; reset_count?: number; reset_at?: string }> {
  try {
    const { data, error } = await client.rpc('reset_all_sessions', {
      p_tenant_id: tenantId,
    })

    if (!error && data) {
      return data as unknown as { success: boolean; reset_count?: number; reset_at?: string }
    }
    if (error) throw error
  } catch {
    throw new Error(
      'Vui lòng thực thi migration 004 trong Supabase SQL Editor để sử dụng tính năng đặt lại tất cả các phiên.'
    )
  }

  return { success: false }
}

/**
 * Get all users with session and login information for Super Admin
 */
export async function getUsersAdmin(): Promise<AdminUserSession[]> {
  try {
    const { data, error } = await client.rpc('get_users_admin')
    if (!error && data) {
      return data as unknown as AdminUserSession[]
    }
  } catch {
    // Proceed to fallback
  }

  interface ProfileFallbackRow {
    id: string
    full_name: string | null
    role: UserRole | string
    tenant_id: string | null
    session_valid_after?: string | null
    created_at: string
    tenants: { name: string } | null
  }

  // Fallback 1: Try with session_valid_after (if migration 004 was applied partially)
  try {
    const { data: profilesWithSession, error: sErr } = await client
      .from('profiles')
      .select('id, full_name, role, tenant_id, session_valid_after, created_at, tenants(name)')
      .order('created_at', { ascending: false })

    if (!sErr && profilesWithSession) {
      return (profilesWithSession as ProfileFallbackRow[]).map((p) => ({
        id: p.id,
        email: null,
        full_name: p.full_name,
        role: p.role,
        tenant_id: p.tenant_id,
        tenant_name: p.tenants?.name || null,
        session_valid_after: p.session_valid_after || null,
        created_at: p.created_at,
        last_sign_in_at: null,
      }))
    }
  } catch {
    // Proceed to basic fallback
  }

  // Fallback 2: Basic profiles query without session_valid_after (guaranteed not to 400)
  try {
    const { data: basicProfiles, error: bErr } = await client
      .from('profiles')
      .select('id, full_name, role, tenant_id, created_at, tenants(name)')
      .order('created_at', { ascending: false })

    if (!bErr && basicProfiles) {
      return (basicProfiles as ProfileFallbackRow[]).map((p) => ({
        id: p.id,
        email: null,
        full_name: p.full_name,
        role: p.role,
        tenant_id: p.tenant_id,
        tenant_name: p.tenants?.name || null,
        session_valid_after: null,
        created_at: p.created_at,
        last_sign_in_at: null,
      }))
    }
  } catch (err) {
    console.warn('[SecurityAPI] Basic profiles fallback error:', err)
  }

  return []
}
