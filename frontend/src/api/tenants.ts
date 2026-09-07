import { supabase } from './supabaseClient'
import type { Tenant } from '@/types/database.types'

export interface TenantWithDetails extends Tenant {
  owner_name?: string | null
  owner_email?: string | null
  members_count?: number
  request_id?: string | null
}

/**
 * Get all tenants with details (Admin only)
 */
export async function getAllTenants(): Promise<TenantWithDetails[]> {
  // Fetch all tenants
  const { data: rawTenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (tenantsError) {
    console.error('Error fetching tenants:', tenantsError)
    throw tenantsError
  }

  const tenants = (rawTenants || []) as unknown as Tenant[]
  if (tenants.length === 0) {
    return []
  }

  // Fetch profiles for member counts and owner names
  const { data: rawProfiles } = await supabase
    .from('profiles')
    .select('id, tenant_id, full_name')
  const profiles = (rawProfiles || []) as Array<{ id: string; tenant_id: string | null; full_name: string | null }>

  // Fetch accepted requests for additional company contact details
  const { data: rawRequests } = await supabase
    .from('tenant_requests')
    .select('id, tenant_id, company_email')
    .eq('status', 'accepted')
  const requests = (rawRequests || []) as Array<{ id: string; tenant_id: string | null; company_email: string | null }>

  return tenants.map((tenant) => {
    const tenantProfiles = profiles.filter((p) => p.tenant_id === tenant.id)
    const tenantRequest = requests.find((r) => r.tenant_id === tenant.id)
    const firstMember = tenantProfiles[0]

    return {
      ...tenant,
      owner_name: firstMember?.full_name || null,
      owner_email: tenantRequest?.company_email || null,
      members_count: tenantProfiles.length,
      request_id: tenantRequest?.id || null,
    }
  })
}

/**
 * Lock or unlock a tenant (Admin only)
 */
export async function toggleTenantLock(
  tenantId: string,
  isLocked: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try calling the stored RPC function first
    const { error: rpcError } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ error: { message: string } | null }>)(
      'toggle_tenant_lock',
      {
        p_tenant_id: tenantId,
        p_is_locked: isLocked,
        p_reason: reason || null,
      }
    )

    if (!rpcError) {
      return { success: true }
    }

    // Fallback to direct table update if RPC is not yet created in the DB
    console.warn('RPC toggle_tenant_lock error, trying fallback update:', rpcError)
    const { error: updateError } = await (
      supabase.from('tenants') as unknown as {
        update: (values: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ error: Error | null }>
        }
      }
    )
      .update({
        is_locked: isLocked,
        locked_at: isLocked ? new Date().toISOString() : null,
        locked_reason: isLocked ? reason || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)

    if (updateError) {
      throw updateError
    }

    return { success: true }
  } catch (err) {
    console.error('Error toggling tenant lock:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update tenant status',
    }
  }
}
