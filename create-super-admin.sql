-- =============================================================================
-- Create Super Admin User
-- =============================================================================
-- This script sets up a super admin user with full permissions
-- 
-- STEP 1: First create the user in Supabase Auth Dashboard:
--   1. Go to Authentication > Users
--   2. Click "Add user" > "Create new user"
--   3. Email: micheldevweb2020@gmail.com
--   4. Password: @Ctserp!@@7
--   5. Auto Confirm User: YES (check this)
--   6. Click "Create user"
--
-- STEP 2: After creating the user, run this SQL script
-- =============================================================================

-- First, create a tenant for the super admin
INSERT INTO public.tenants (id, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Super Admin Company',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Get the user ID from auth.users (replace with actual user ID after creating user)
-- You can find the user ID by running: SELECT id, email FROM auth.users WHERE email = 'micheldevweb2020@gmail.com';
DO $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'micheldevweb2020@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please create the user in Supabase Auth Dashboard first.';
  END IF;

  -- Create or update profile with super admin role
  INSERT INTO public.profiles (id, tenant_id, full_name, role, created_at, updated_at)
  VALUES (
    v_user_id,
    v_tenant_id,
    'Super Admin',
    'admin',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    tenant_id = v_tenant_id,
    role = 'admin',
    full_name = COALESCE(profiles.full_name, 'Super Admin'),
    updated_at = now();

  RAISE NOTICE 'Super admin profile created/updated for user: %', v_user_id;
END $$;

-- =============================================================================
-- OPTIONAL: Create Super Admin Policies (Bypass RLS for this specific user)
-- =============================================================================
-- Uncomment the section below if you want the super admin to bypass RLS restrictions
-- This allows the super admin to see/edit all data across all tenants

/*
-- Drop existing super admin policies if they exist
DROP POLICY IF EXISTS "Super admin can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Super admin can view all products" ON public.products;
DROP POLICY IF EXISTS "Super admin can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Super admin can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Super admin can view all shipments" ON public.shipments;

-- Get super admin user ID
DO $$
DECLARE
  v_super_admin_id uuid;
BEGIN
  SELECT id INTO v_super_admin_id
  FROM auth.users
  WHERE email = 'micheldevweb2020@gmail.com';

  IF v_super_admin_id IS NOT NULL THEN
    -- Super admin can view/edit all tenants
    CREATE POLICY "Super admin can view all tenants"
      ON public.tenants FOR SELECT
      USING (auth.uid() = v_super_admin_id);

    CREATE POLICY "Super admin can view all profiles"
      ON public.profiles FOR SELECT
      USING (auth.uid() = v_super_admin_id);

    CREATE POLICY "Super admin can view all customers"
      ON public.customers FOR SELECT
      USING (auth.uid() = v_super_admin_id);

    CREATE POLICY "Super admin can view all products"
      ON public.products FOR SELECT
      USING (auth.uid() = v_super_admin_id);

    CREATE POLICY "Super admin can view all orders"
      ON public.orders FOR SELECT
      USING (auth.uid() = v_super_admin_id);

    CREATE POLICY "Super admin can view all invoices"
      ON public.invoices FOR SELECT
      USING (auth.uid() = v_super_admin_id);

    CREATE POLICY "Super admin can view all shipments"
      ON public.shipments FOR SELECT
      USING (auth.uid() = v_super_admin_id);
  END IF;
END $$;
*/

-- =============================================================================
-- Verify Setup
-- =============================================================================
-- Run this query to verify the super admin was created correctly:

SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  p.role,
  t.id as tenant_id,
  t.name as tenant_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.tenants t ON t.id = p.tenant_id
WHERE u.email = 'micheldevweb2020@gmail.com';

