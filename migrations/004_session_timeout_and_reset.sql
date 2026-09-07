-- =============================================================================
-- Migration 004: Session Expiration & Session Reset System (Robust & Verified)
-- =============================================================================
-- This migration adds:
-- 1. system_settings table for global system configurations (session timeouts)
-- 2. session_valid_after and session_timeout_minutes columns to public.profiles
-- 3. Stored functions for Super Admin to manage timeouts and reset sessions
-- 4. RLS policies, permissions (GRANTs), and PostgREST schema reload
-- =============================================================================

-- 1. CREATE SYSTEM_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone authenticated can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can insert or update system settings" ON public.system_settings;

-- All users (authenticated and anon) can read system settings
CREATE POLICY "Anyone can view system settings"
  ON public.system_settings FOR SELECT
  USING (true);

-- Only admins can manage system settings
CREATE POLICY "Admins can insert or update system settings"
  ON public.system_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed default session configuration
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'session_config',
  jsonb_build_object(
    'timeout_minutes', 1440,             -- Default 24 hours (1440 minutes)
    'inactivity_timeout_minutes', 120,   -- Default 2 hours inactivity
    'enable_inactivity_timeout', false,  -- Off by default
    'last_global_reset_at', null
  ),
  'Global session expiration and inactivity timeout settings',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Grant table access
GRANT ALL ON TABLE public.system_settings TO postgres, service_role;
GRANT ALL ON TABLE public.system_settings TO authenticated;
GRANT SELECT ON TABLE public.system_settings TO anon;

-- 2. ADD COLUMNS TO PROFILES TABLE
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS session_valid_after timestamptz DEFAULT now() NOT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS session_timeout_minutes integer DEFAULT NULL;

-- 3. FUNCTION: GET SESSION CONFIG
CREATE OR REPLACE FUNCTION public.get_session_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_config jsonb;
BEGIN
  SELECT value INTO v_config
  FROM public.system_settings
  WHERE key = 'session_config';

  IF v_config IS NULL THEN
    v_config := jsonb_build_object(
      'timeout_minutes', 1440,
      'inactivity_timeout_minutes', 120,
      'enable_inactivity_timeout', false,
      'last_global_reset_at', null
    );
  END IF;

  RETURN v_config;
END;
$$;

-- 4. FUNCTION: UPDATE SESSION CONFIG (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.update_session_config(
  p_timeout_minutes integer,
  p_inactivity_minutes integer DEFAULT 120,
  p_enable_inactivity boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_current jsonb;
  v_new jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update session settings';
  END IF;

  SELECT value INTO v_current
  FROM public.system_settings
  WHERE key = 'session_config';

  v_new := jsonb_build_object(
    'timeout_minutes', GREATEST(p_timeout_minutes, 5), -- Minimum 5 minutes
    'inactivity_timeout_minutes', GREATEST(p_inactivity_minutes, 5),
    'enable_inactivity_timeout', p_enable_inactivity,
    'last_global_reset_at', v_current->>'last_global_reset_at'
  );

  INSERT INTO public.system_settings (key, value, description, updated_by, updated_at)
  VALUES ('session_config', v_new, 'Global session expiration and inactivity timeout settings', v_admin_id, now())
  ON CONFLICT (key) DO UPDATE
  SET 
    value = v_new,
    updated_by = v_admin_id,
    updated_at = now();

  RETURN v_new;
END;
$$;

-- 5. FUNCTION: RESET USER SESSION (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.reset_user_session(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_target_profile public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reset user sessions';
  END IF;

  SELECT * INTO v_target_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_profile IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Invalidate all sessions established prior to now
  UPDATE public.profiles
  SET 
    session_valid_after = now(),
    updated_at = now()
  WHERE id = p_user_id;

  -- Create notification for the user
  PERFORM public.create_notification(
    p_user_id,
    'system',
    'Phiên làm việc đã được đặt lại',
    'Phiên đăng nhập của bạn đã được quản trị viên đặt lại vì lý do bảo mật. Vui lòng đăng nhập lại.',
    jsonb_build_object('action', 'session_reset', 'reset_by', v_admin_id, 'timestamp', now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'session_valid_after', now()
  );
END;
$$;

-- 6. FUNCTION: RESET ALL SESSIONS (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.reset_all_sessions(
  p_tenant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_count integer := 0;
  v_now timestamptz := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reset all user sessions';
  END IF;

  IF p_tenant_id IS NOT NULL THEN
    -- Reset all users for a specific tenant
    UPDATE public.profiles
    SET 
      session_valid_after = v_now,
      updated_at = v_now
    WHERE tenant_id = p_tenant_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    -- Reset all non-admin users system-wide
    -- (Exclude calling admin so admin stays logged in to manage the system)
    UPDATE public.profiles
    SET 
      session_valid_after = v_now,
      updated_at = v_now
    WHERE id <> v_admin_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Update last_global_reset_at in session_config
    UPDATE public.system_settings
    SET 
      value = jsonb_set(value, '{last_global_reset_at}', to_jsonb(v_now::text)),
      updated_by = v_admin_id,
      updated_at = v_now
    WHERE key = 'session_config';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reset_count', v_count,
    'reset_at', v_now
  );
END;
$$;

-- 7. FUNCTION: GET USERS WITH SESSION INFO (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.get_users_admin()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  tenant_id uuid,
  tenant_name text,
  session_valid_after timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view user list';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    u.email::text,
    p.full_name,
    p.role::text,
    p.tenant_id,
    t.name AS tenant_name,
    p.session_valid_after,
    p.created_at,
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.tenants t ON t.id = p.tenant_id
  ORDER BY p.created_at DESC;
END;
$$;

-- 8. GRANT EXECUTE ON ALL FUNCTIONS TO AUTHENTICATED ROLES
GRANT EXECUTE ON FUNCTION public.get_session_config() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_session_config(integer, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_user_session(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_all_sessions(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_users_admin() TO authenticated, service_role;

-- 9. RELOAD SCHEMA CACHE IN POSTGREST
NOTIFY pgrst, 'reload schema';
