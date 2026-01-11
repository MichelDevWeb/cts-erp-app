import { supabase } from './supabaseClient'
import type { TenantRequest, Json } from '@/types/database.types'

export interface CreateTenantRequestData {
  company_name: string
  company_address?: string
  company_phone?: string
  company_email?: string
  business_type?: string
  description?: string
}

export interface TenantRequestWithUser extends TenantRequest {
  user_full_name?: string | null
  user_email?: string | null
}

// Get current user's tenant requests
export async function getMyTenantRequests() {
  const { data, error } = await supabase
    .from('tenant_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as unknown as TenantRequest[]
}

// Get pending tenant request for current user
export async function getMyPendingRequest() {
  const { data, error } = await supabase
    .from('tenant_requests')
    .select('*')
    .eq('status', 'pending')
    .maybeSingle()

  if (error) throw error
  return data as unknown as TenantRequest | null
}

// Get approved tenant request for current user (waiting for acceptance)
export async function getMyApprovedRequest() {
  const { data, error } = await supabase
    .from('tenant_requests')
    .select('*')
    .eq('status', 'approved')
    .maybeSingle()

  if (error) throw error
  return data as unknown as TenantRequest | null
}

// Create a new tenant request
export async function createTenantRequest(requestData: CreateTenantRequestData) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data: request, error } = await supabase
    .from('tenant_requests')
    .insert({
      user_id: user.id,
      ...requestData,
    } as never)
    .select()
    .single()

  if (error) throw error
  return request as unknown as TenantRequest
}

// Update pending request
export async function updateTenantRequest(id: string, requestData: Partial<CreateTenantRequestData>) {
  const { data: request, error } = await supabase
    .from('tenant_requests')
    .update(requestData as never)
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) throw error
  return request as unknown as TenantRequest
}

// Cancel pending request
export async function cancelTenantRequest(id: string) {
  const { error } = await supabase
    .from('tenant_requests')
    .delete()
    .eq('id', id)
    .eq('status', 'pending')

  if (error) throw error
}

// ============================================================================
// Admin Functions
// ============================================================================

// Get all tenant requests (admin only) - using the view
export async function getAllTenantRequests(status?: string) {
  // Use the view that includes user info
  let query = supabase
    .from('tenant_requests_with_user')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    // Fallback to direct query without user info if view doesn't exist
    console.warn('View not available, falling back to direct query:', error.message)
    let fallbackQuery = supabase
      .from('tenant_requests')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      fallbackQuery = fallbackQuery.eq('status', status)
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery
    if (fallbackError) throw fallbackError
    return fallbackData as unknown as TenantRequestWithUser[]
  }

  return data as unknown as TenantRequestWithUser[]
}

// Get pending requests count (admin only)
export async function getPendingRequestsCount() {
  const { count, error } = await supabase
    .from('tenant_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) throw error
  return count || 0
}

// Approve a tenant request (admin only)
export async function approveTenantRequest(requestId: string, notes?: string) {
  const { data, error } = await supabase.rpc('approve_tenant_request', {
    p_request_id: requestId,
    p_notes: notes,
  } as never)

  if (error) throw error
  return data as Json
}

// Reject a tenant request (admin only)
export async function rejectTenantRequest(requestId: string, notes?: string) {
  const { data, error } = await supabase.rpc('reject_tenant_request', {
    p_request_id: requestId,
    p_notes: notes,
  } as never)

  if (error) throw error
  return data as Json
}

// ============================================================================
// User Functions (Accept approved request)
// ============================================================================

// Accept an approved request (creates tenant and updates role)
export async function acceptApprovedRequest(requestId: string) {
  const { data, error } = await supabase.rpc('accept_approved_request', {
    p_request_id: requestId,
  } as never)

  if (error) throw error
  return data as Json
}
