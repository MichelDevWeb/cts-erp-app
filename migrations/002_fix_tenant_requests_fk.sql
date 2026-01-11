-- =============================================================================
-- Migration: Fix Tenant Requests Foreign Key
-- =============================================================================
-- This migration:
-- 1. Adds a foreign key from tenant_requests.user_id to profiles.id
-- 2. Creates a view for admin queries that includes user info
-- =============================================================================

-- Add foreign key to profiles (profiles.id references auth.users.id, so this works)
-- First drop the unique constraint that might conflict
ALTER TABLE public.tenant_requests 
  DROP CONSTRAINT IF EXISTS tenant_requests_user_id_status_key;

-- Add foreign key to profiles
ALTER TABLE public.tenant_requests
  DROP CONSTRAINT IF EXISTS tenant_requests_user_id_fkey;

ALTER TABLE public.tenant_requests
  ADD CONSTRAINT tenant_requests_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Re-add the unique constraint  
-- Using a partial unique index instead (only one pending per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_requests_user_pending 
  ON public.tenant_requests (user_id) 
  WHERE status = 'pending';

-- =============================================================================
-- Create a view for admin queries (includes user info)
-- =============================================================================
CREATE OR REPLACE VIEW public.tenant_requests_with_user AS
SELECT 
  tr.*,
  p.full_name as user_full_name,
  u.email as user_email
FROM public.tenant_requests tr
LEFT JOIN public.profiles p ON p.id = tr.user_id
LEFT JOIN auth.users u ON u.id = tr.user_id;

-- Grant access to the view
GRANT SELECT ON public.tenant_requests_with_user TO authenticated;

-- =============================================================================
-- RLS for the view (optional - views inherit from base table policies)
-- =============================================================================
-- Note: The view will use the RLS policies from tenant_requests table

