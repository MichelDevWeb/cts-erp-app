-- =============================================================================
-- Migration: Tenant Onboarding Flow
-- =============================================================================
-- This migration adds:
-- 1. Updated user_role enum (admin, guest, staff, customer)
-- 2. tenant_requests table for pending company applications
-- 3. notifications table for in-app notifications
-- 4. Updated RLS policies for new roles
-- 5. Functions and triggers for the onboarding flow
-- =============================================================================

-- =============================================================================
-- 1. UPDATE USER ROLE ENUM
-- =============================================================================
-- Note: PostgreSQL doesn't allow direct enum modification, so we need to:
-- 1. Create a new enum
-- 2. Update the column to use it
-- 3. Drop the old enum

-- First, check if we need to add new values to the enum
DO $$
BEGIN
  -- Add 'guest' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'guest' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'guest';
  END IF;
  
  -- Add 'customer' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'customer' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'customer';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Ignore if already exists
END $$;

-- =============================================================================
-- 2. ADD REQUEST STATUS ENUM
-- =============================================================================
DO $$
BEGIN
  CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'accepted');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- =============================================================================
-- 3. ADD NOTIFICATION TYPE ENUM
-- =============================================================================
DO $$
BEGIN
  CREATE TYPE notification_type AS ENUM (
    'tenant_request_submitted',
    'tenant_request_approved',
    'tenant_request_rejected',
    'tenant_created',
    'role_updated',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- =============================================================================
-- 4. CREATE TENANT REQUESTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_address text,
  company_phone text,
  company_email text,
  business_type text,
  description text,
  status request_status DEFAULT 'pending' NOT NULL,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, status) -- One pending request per user
);

-- =============================================================================
-- 5. CREATE NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 6. ADD INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_tenant_requests_user_id ON public.tenant_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_status ON public.tenant_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- =============================================================================
-- 7. ENABLE RLS ON NEW TABLES
-- =============================================================================
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 8. RLS POLICIES FOR TENANT REQUESTS
-- =============================================================================

-- Guests can view and create their own requests
CREATE POLICY "Users can view their own tenant requests"
  ON public.tenant_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Guests can create tenant requests"
  ON public.tenant_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pending requests"
  ON public.tenant_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Admins can view all tenant requests (need a function to check admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE POLICY "Admins can view all tenant requests"
  ON public.tenant_requests FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update any tenant request"
  ON public.tenant_requests FOR UPDATE
  USING (public.is_admin());

-- =============================================================================
-- 9. RLS POLICIES FOR NOTIFICATIONS
-- =============================================================================

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can insert notifications (via SECURITY DEFINER functions)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true); -- Controlled by functions

-- =============================================================================
-- 10. TRIGGERS FOR UPDATED_AT
-- =============================================================================

CREATE TRIGGER update_tenant_requests_updated_at
  BEFORE UPDATE ON public.tenant_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 11. FUNCTION: CREATE NOTIFICATION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- =============================================================================
-- 12. FUNCTION: APPROVE TENANT REQUEST
-- =============================================================================
CREATE OR REPLACE FUNCTION public.approve_tenant_request(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request tenant_requests%ROWTYPE;
  v_admin_id uuid := auth.uid();
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can approve tenant requests';
  END IF;

  -- Get the request
  SELECT * INTO v_request
  FROM public.tenant_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Update request status
  UPDATE public.tenant_requests
  SET 
    status = 'approved',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    review_notes = p_notes,
    updated_at = now()
  WHERE id = p_request_id;

  -- Create notification for the user
  PERFORM public.create_notification(
    v_request.user_id,
    'tenant_request_approved',
    'Your company registration has been approved!',
    'Your request to register "' || v_request.company_name || '" has been approved. Click to complete your setup.',
    jsonb_build_object('request_id', p_request_id, 'company_name', v_request.company_name)
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'user_id', v_request.user_id
  );
END;
$$;

-- =============================================================================
-- 13. FUNCTION: REJECT TENANT REQUEST
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reject_tenant_request(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request tenant_requests%ROWTYPE;
  v_admin_id uuid := auth.uid();
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can reject tenant requests';
  END IF;

  -- Get the request
  SELECT * INTO v_request
  FROM public.tenant_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Update request status
  UPDATE public.tenant_requests
  SET 
    status = 'rejected',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    review_notes = p_notes,
    updated_at = now()
  WHERE id = p_request_id;

  -- Create notification for the user
  PERFORM public.create_notification(
    v_request.user_id,
    'tenant_request_rejected',
    'Your company registration was not approved',
    'Unfortunately, your request to register "' || v_request.company_name || '" was not approved. ' || COALESCE('Reason: ' || p_notes, 'Please contact support for more information.'),
    jsonb_build_object('request_id', p_request_id, 'company_name', v_request.company_name, 'reason', p_notes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id
  );
END;
$$;

-- =============================================================================
-- 14. FUNCTION: ACCEPT APPROVED REQUEST (Creates Tenant + Updates Role)
-- =============================================================================
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
  INSERT INTO public.tenants (name, created_at, updated_at)
  VALUES (v_request.company_name, now(), now())
  RETURNING id INTO v_tenant_id;

  -- Update user profile: assign tenant and change role to staff
  UPDATE public.profiles
  SET 
    tenant_id = v_tenant_id,
    role = 'staff',
    updated_at = now()
  WHERE id = v_user_id;

  -- Update request status to accepted
  UPDATE public.tenant_requests
  SET 
    status = 'accepted',
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

-- =============================================================================
-- 15. UPDATE HANDLE_NEW_USER FUNCTION
-- =============================================================================
-- New users now start as 'guest' with no tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'guest', -- New users start as guest
    NULL     -- No tenant assigned initially
  );
  
  -- Create welcome notification
  PERFORM public.create_notification(
    NEW.id,
    'system',
    'Welcome to CTS ERP!',
    'Please complete your company registration to get started.',
    '{}'::jsonb
  );
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 16. FUNCTION: GET USER ROLE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- =============================================================================
-- 17. FUNCTION: GET UNREAD NOTIFICATION COUNT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer 
  FROM public.notifications 
  WHERE user_id = auth.uid() AND is_read = false;
$$;

-- =============================================================================
-- 18. FUNCTION: MARK NOTIFICATION AS READ
-- =============================================================================
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- =============================================================================
-- 19. FUNCTION: MARK ALL NOTIFICATIONS AS READ
-- =============================================================================
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================================================
-- 20. UPDATE PROFILES RLS - Allow guests to update their own profile
-- =============================================================================

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Guests can read their own profile even without tenant
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their tenant"
  ON public.profiles FOR SELECT
  USING (tenant_id IS NOT NULL AND tenant_id = public.tenant_id());

-- =============================================================================
-- DONE
-- =============================================================================
-- Run this after running database-schema.sql
-- Then create your super admin and test the flow!

