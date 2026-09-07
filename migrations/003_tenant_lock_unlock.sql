-- =============================================================================
-- Migration 003: Tenant Lock and Unlock Feature
-- =============================================================================
-- This migration adds:
-- 1. is_locked, locked_at, and locked_reason columns to public.tenants
-- 2. tenant_id foreign key to public.tenant_requests
-- 3. RLS policies allowing admins to view and update all tenants
-- 4. Function toggle_tenant_lock for admin lock/unlock actions with notifications
-- 5. Updated accept_approved_request to link tenant_id on request completion
-- =============================================================================

-- 1. ADD COLUMNS TO TENANTS TABLE
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false NOT NULL;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS locked_at timestamptz;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS locked_reason text;

-- 2. ADD TENANT_ID TO TENANT_REQUESTS TABLE
ALTER TABLE public.tenant_requests
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Backfill tenant_id on existing accepted tenant_requests from profiles
UPDATE public.tenant_requests tr
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE tr.user_id = p.id 
  AND tr.status = 'accepted' 
  AND tr.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;

-- 3. RLS POLICIES FOR TENANTS TABLE (ADMIN ACCESS)
-- Drop existing policies if needed to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update all tenants" ON public.tenants;

CREATE POLICY "Admins can view all tenants"
  ON public.tenants FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all tenants"
  ON public.tenants FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. UPDATE ACCEPT_APPROVED_REQUEST FUNCTION
-- Ensures tenant_requests.tenant_id is recorded when a company registration is accepted
CREATE OR REPLACE FUNCTION public.accept_approved_request(
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request tenant_requests%ROWTYPE;
  v_tenant_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- Get the request (must be approved and belong to current user)
  SELECT * INTO v_request
  FROM public.tenant_requests
  WHERE id = p_request_id 
    AND user_id = v_user_id 
    AND status = 'approved';

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found, not approved, or does not belong to you';
  END IF;

  -- Create the tenant
  INSERT INTO public.tenants (name, is_locked, created_at, updated_at)
  VALUES (v_request.company_name, false, now(), now())
  RETURNING id INTO v_tenant_id;

  -- Update user profile: assign tenant and change role to staff
  UPDATE public.profiles
  SET 
    tenant_id = v_tenant_id,
    role = 'staff',
    updated_at = now()
  WHERE id = v_user_id;

  -- Update request status to accepted and save tenant_id
  UPDATE public.tenant_requests
  SET 
    status = 'accepted',
    tenant_id = v_tenant_id,
    updated_at = now()
  WHERE id = p_request_id;

  -- Create notification
  PERFORM public.create_notification(
    v_user_id,
    'tenant_created',
    'Welcome to your new company!',
    'Your company "' || v_request.company_name || '" has been created. You now have full access to the ERP system.',
    jsonb_build_object('tenant_id', v_tenant_id, 'company_name', v_request.company_name)
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'company_name', v_request.company_name
  );
END;
$$;

-- 5. FUNCTION: TOGGLE TENANT LOCK (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.toggle_tenant_lock(
  p_tenant_id uuid,
  p_is_locked boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_member record;
BEGIN
  -- Validate caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can lock or unlock tenants';
  END IF;

  -- Validate tenant exists
  SELECT * INTO v_tenant
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Update tenant lock state
  UPDATE public.tenants
  SET 
    is_locked = p_is_locked,
    locked_at = CASE WHEN p_is_locked THEN now() ELSE NULL END,
    locked_reason = CASE WHEN p_is_locked THEN p_reason ELSE NULL END,
    updated_at = now()
  WHERE id = p_tenant_id;

  -- Notify all members belonging to this tenant
  FOR v_member IN (SELECT id FROM public.profiles WHERE tenant_id = p_tenant_id) LOOP
    IF p_is_locked THEN
      PERFORM public.create_notification(
        v_member.id,
        'system',
        'Tài khoản doanh nghiệp đã bị tạm khoá',
        COALESCE('Doanh nghiệp "' || v_tenant.name || '" đã bị tạm khoá. Lý do: ' || p_reason, 'Doanh nghiệp "' || v_tenant.name || '" đã bị tạm khoá bởi quản trị viên.'),
        jsonb_build_object('tenant_id', p_tenant_id, 'is_locked', true, 'reason', p_reason)
      );
    ELSE
      PERFORM public.create_notification(
        v_member.id,
        'system',
        'Tài khoản doanh nghiệp đã được mở khoá',
        'Doanh nghiệp "' || v_tenant.name || '" đã được mở khoá và có thể tiếp tục sử dụng hệ thống bình thường.',
        jsonb_build_object('tenant_id', p_tenant_id, 'is_locked', false)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'is_locked', p_is_locked,
    'locked_reason', p_reason
  );
END;
$$;
