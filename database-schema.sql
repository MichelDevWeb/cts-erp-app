-- =============================================================================
-- CTS ERP App - Database Schema
-- Phase 0: Initial Tables with Row Level Security (RLS)
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor after creating your project.
-- Make sure to enable the required extensions first.

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. CUSTOM TYPES (ENUMS)
-- =============================================================================

-- User roles within a tenant
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'staff');

-- Order lifecycle status
CREATE TYPE order_status AS ENUM ('draft', 'confirmed', 'shipped', 'completed', 'canceled');

-- Invoice lifecycle status
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'void');

-- Shipment status
CREATE TYPE shipment_status AS ENUM ('pending', 'in_transit', 'delivered');

-- =============================================================================
-- 3. HELPER FUNCTIONS
-- =============================================================================

-- Function to get the current user's tenant_id from JWT claims
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
$$;

-- Function to get the current user's role from JWT claims
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role')::user_role,
    (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
$$;

-- =============================================================================
-- 4. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tenants (Companies/Organizations)
-- -----------------------------------------------------------------------------
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- Profiles (User business profiles, linked to auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name text,
  role user_role DEFAULT 'staff' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- Customers
-- -----------------------------------------------------------------------------
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  unit text DEFAULT 'pcs',
  price numeric(12, 2) DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (tenant_id, sku)
);

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  order_number text,
  status order_status DEFAULT 'draft' NOT NULL,
  order_date timestamptz DEFAULT now() NOT NULL,
  total_amount numeric(12, 2) DEFAULT 0 NOT NULL,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- Order Items (Line items for orders)
-- -----------------------------------------------------------------------------
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(10, 2) DEFAULT 1 NOT NULL,
  unit_price numeric(12, 2) NOT NULL,
  line_total numeric(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- Invoices
-- -----------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status invoice_status DEFAULT 'draft' NOT NULL,
  issue_date timestamptz DEFAULT now(),
  due_date timestamptz,
  total_amount numeric(12, 2) DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (tenant_id, invoice_number)
);

-- -----------------------------------------------------------------------------
-- Shipments
-- -----------------------------------------------------------------------------
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  shipment_number text,
  carrier text,
  tracking_code text,
  status shipment_status DEFAULT 'pending' NOT NULL,
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_shipments_tenant_id ON public.shipments(tenant_id);
CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Tenants Policies
-- Users can only view their own tenant
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own tenant"
  ON public.tenants FOR SELECT
  USING (id = auth.tenant_id());

-- -----------------------------------------------------------------------------
-- Profiles Policies
-- Users can view profiles in their tenant, update only their own
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view profiles in their tenant"
  ON public.profiles FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = auth.tenant_id());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- Customers Policies
-- Tenant isolation for all CRUD operations
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view customers in their tenant"
  ON public.customers FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Users can insert customers in their tenant"
  ON public.customers FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can update customers in their tenant"
  ON public.customers FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can delete customers in their tenant"
  ON public.customers FOR DELETE
  USING (tenant_id = auth.tenant_id());

-- -----------------------------------------------------------------------------
-- Products Policies
-- Tenant isolation for all CRUD operations
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view products in their tenant"
  ON public.products FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Users can insert products in their tenant"
  ON public.products FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can update products in their tenant"
  ON public.products FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can delete products in their tenant"
  ON public.products FOR DELETE
  USING (tenant_id = auth.tenant_id());

-- -----------------------------------------------------------------------------
-- Orders Policies
-- Tenant isolation for all CRUD operations
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view orders in their tenant"
  ON public.orders FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Users can insert orders in their tenant"
  ON public.orders FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can update orders in their tenant"
  ON public.orders FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can delete orders in their tenant"
  ON public.orders FOR DELETE
  USING (tenant_id = auth.tenant_id());

-- -----------------------------------------------------------------------------
-- Order Items Policies
-- Access through order's tenant (join to orders table)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view order items for their orders"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = auth.tenant_id()
    )
  );

CREATE POLICY "Users can insert order items for their orders"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = auth.tenant_id()
    )
  );

CREATE POLICY "Users can update order items for their orders"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = auth.tenant_id()
    )
  );

CREATE POLICY "Users can delete order items for their orders"
  ON public.order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = auth.tenant_id()
    )
  );

-- -----------------------------------------------------------------------------
-- Invoices Policies
-- Tenant isolation for all CRUD operations
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view invoices in their tenant"
  ON public.invoices FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Users can insert invoices in their tenant"
  ON public.invoices FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can update invoices in their tenant"
  ON public.invoices FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can delete invoices in their tenant"
  ON public.invoices FOR DELETE
  USING (tenant_id = auth.tenant_id());

-- -----------------------------------------------------------------------------
-- Shipments Policies
-- Tenant isolation for all CRUD operations
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view shipments in their tenant"
  ON public.shipments FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Users can insert shipments in their tenant"
  ON public.shipments FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can update shipments in their tenant"
  ON public.shipments FOR UPDATE
  USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Users can delete shipments in their tenant"
  ON public.shipments FOR DELETE
  USING (tenant_id = auth.tenant_id());

-- =============================================================================
-- 7. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 8. FUNCTION: AUTO-CREATE PROFILE ON USER SIGNUP
-- =============================================================================
-- This function creates a profile entry when a new user signs up.
-- Note: tenant_id will need to be set separately (e.g., during onboarding)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 9. FUNCTION: RECALCULATE ORDER TOTAL
-- =============================================================================
-- Automatically updates order.total_amount when order_items change

CREATE OR REPLACE FUNCTION public.recalculate_order_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.orders
  SET total_amount = (
    SELECT COALESCE(SUM(line_total), 0)
    FROM public.order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
  )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalculate_order_total_on_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_total();

CREATE TRIGGER recalculate_order_total_on_update
  AFTER UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_total();

CREATE TRIGGER recalculate_order_total_on_delete
  AFTER DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_total();

-- =============================================================================
-- 10. SEED DATA FOR DEVELOPMENT (OPTIONAL)
-- =============================================================================
-- Uncomment and run separately if you want sample data for testing

/*
-- Create a demo tenant
INSERT INTO public.tenants (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company');

-- Note: After creating a user through Supabase Auth, update their profile:
-- UPDATE public.profiles 
-- SET tenant_id = '00000000-0000-0000-0000-000000000001', 
--     role = 'admin' 
-- WHERE id = '<user-id-from-auth>';
*/

