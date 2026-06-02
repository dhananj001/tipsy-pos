-- =====================================================================
-- STEP 3 — INITIAL RESTAURANT POS DATABASE SCHEMA
-- =====================================================================
-- Relies on Supabase Auth. Includes multi-tenant security by restaurant_id
-- and prepares for Role-Based Access Control (RBAC).

-- ---------------------------------------------------------------------
-- 1. Create Enums
-- ---------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('captain', 'manager', 'admin');
CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'billing');
CREATE TYPE public.order_status AS ENUM ('preparing', 'ready', 'served', 'cancelled');
CREATE TYPE public.printer_type AS ENUM ('kitchen', 'bar', 'billing');
CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'card');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE public.print_status AS ENUM ('pending', 'processing', 'printed', 'failed');

-- ---------------------------------------------------------------------
-- 2. Create Tables
-- ---------------------------------------------------------------------

-- Restaurants Table (Multi-tenant Root)
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (Profiles) Table - linked to Supabase auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'captain',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tables (Physical Dining Tables)
CREATE TABLE public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    number INT NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status public.table_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_table_number_per_restaurant UNIQUE (restaurant_id, number)
);

-- Menu Categories Table
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_category_name_per_restaurant UNIQUE (restaurant_id, name)
);

-- Menu Items Table
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    printer_type public.printer_type NOT NULL DEFAULT 'kitchen',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE RESTRICT,
    captain_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status public.order_status NOT NULL DEFAULT 'preparing',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    notes TEXT,
    price_at_order DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Printers Table
CREATE TABLE public.printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    port INT NOT NULL DEFAULT 9100,
    type public.printer_type NOT NULL DEFAULT 'kitchen',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments Table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    method public.payment_method NOT NULL,
    status public.payment_status NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Print Jobs Table
CREATE TABLE public.print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    printer_id UUID NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status public.print_status NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. Automatic Timestamps Triggers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp updater to all tables
CREATE TRIGGER set_timestamp_restaurants BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_tables BEFORE UPDATE ON public.tables FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_menu_categories BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_menu_items BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_order_items BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_printers BEFORE UPDATE ON public.printers FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_print_jobs BEFORE UPDATE ON public.print_jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ---------------------------------------------------------------------
-- 4. Create Recommended Indexes
-- ---------------------------------------------------------------------
-- Crucial for fast real-time query scaling and multi-tenant lookups.

CREATE INDEX idx_users_restaurant ON public.users(restaurant_id);
CREATE INDEX idx_tables_restaurant ON public.tables(restaurant_id);
CREATE INDEX idx_tables_status ON public.tables(restaurant_id, status);
CREATE INDEX idx_menu_categories_restaurant ON public.menu_categories(restaurant_id, sort_order);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_orders_table ON public.orders(table_id);
CREATE INDEX idx_orders_status ON public.orders(restaurant_id, status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_printers_restaurant ON public.printers(restaurant_id);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_print_jobs_status ON public.print_jobs(restaurant_id, status);

-- ---------------------------------------------------------------------
-- 5. Row-Level Security (RLS) Policies
-- ---------------------------------------------------------------------

-- Enable Row-Level Security on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Helper Function to resolve user's tenant (restaurant_id)
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT restaurant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- Helper Function to resolve user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- A. Restaurants Policies
CREATE POLICY "Users can read their own restaurant" ON public.restaurants
    FOR SELECT USING (id = public.get_tenant_id());

-- B. Users Policies
CREATE POLICY "Staff can view other profiles in same restaurant" ON public.users
    FOR SELECT USING (restaurant_id = public.get_tenant_id());

CREATE POLICY "Only admins/managers can update profiles" ON public.users
    FOR ALL USING (
        restaurant_id = public.get_tenant_id() 
        AND public.get_user_role() IN ('admin', 'manager')
    );

-- C. Tables Policies
CREATE POLICY "Staff can view tables" ON public.tables
    FOR SELECT USING (restaurant_id = public.get_tenant_id());

CREATE POLICY "Staff can edit tables" ON public.tables
    FOR ALL USING (restaurant_id = public.get_tenant_id());

-- D. Menu Categories Policies
CREATE POLICY "Anyone in restaurant can read categories" ON public.menu_categories
    FOR SELECT USING (restaurant_id = public.get_tenant_id());

CREATE POLICY "Only admins/managers can alter categories" ON public.menu_categories
    FOR ALL USING (
        restaurant_id = public.get_tenant_id()
        AND public.get_user_role() IN ('admin', 'manager')
    );

-- E. Menu Items Policies
CREATE POLICY "Anyone in restaurant can read menu items" ON public.menu_items
    FOR SELECT USING (restaurant_id = public.get_tenant_id());

CREATE POLICY "Only admins/managers can alter menu items" ON public.menu_items
    FOR ALL USING (
        restaurant_id = public.get_tenant_id()
        AND public.get_user_role() IN ('admin', 'manager')
    );

-- F. Orders Policies
CREATE POLICY "Staff can read and modify orders" ON public.orders
    FOR ALL USING (restaurant_id = public.get_tenant_id());

-- G. Order Items Policies
CREATE POLICY "Staff can read and modify order items" ON public.order_items
    FOR ALL USING (restaurant_id = public.get_tenant_id());

-- H. Printers Policies
CREATE POLICY "Staff can view printers" ON public.printers
    FOR SELECT USING (restaurant_id = public.get_tenant_id());

CREATE POLICY "Only admins/managers can modify printers" ON public.printers
    FOR ALL USING (
        restaurant_id = public.get_tenant_id()
        AND public.get_user_role() IN ('admin', 'manager')
    );

-- I. Payments Policies
CREATE POLICY "Staff can read and create payments" ON public.payments
    FOR ALL USING (restaurant_id = public.get_tenant_id());

-- J. Print Jobs Policies
CREATE POLICY "Staff can manage print jobs" ON public.print_jobs
    FOR ALL USING (restaurant_id = public.get_tenant_id());

-- ---------------------------------------------------------------------
-- 6. Automatic User Synchronization Trigger (on Supabase Sign-Up)
-- ---------------------------------------------------------------------
-- Automatically copies newly registered Supabase Auth users to public.users.
-- Synchronizes user_metadata: role, name, and restaurant_id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_restaurant_id UUID;
    v_role public.user_role;
    v_name TEXT;
BEGIN
    -- Read metadata from signup claims
    v_name := COALESCE(new.raw_user_meta_data->>'name', 'Staff User');
    v_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'captain'::public.user_role);
    v_restaurant_id := (new.raw_user_meta_data->>'restaurant_id')::UUID;

    -- If restaurant_id is null, automatically seed/assign a default demo restaurant
    IF v_restaurant_id IS NULL THEN
        -- Look up the existing default sandbox restaurant first
        SELECT id INTO v_restaurant_id FROM public.restaurants WHERE name = 'Tipsy POS Sandbox' LIMIT 1;
        
        -- Only create a new one if it doesn't exist
        IF v_restaurant_id IS NULL THEN
            INSERT INTO public.restaurants (name)
            VALUES ('Tipsy POS Sandbox')
            RETURNING id INTO v_restaurant_id;
        END IF;
    END IF;

    -- Insert profile
    INSERT INTO public.users (id, restaurant_id, email, name, role)
    VALUES (
        new.id,
        v_restaurant_id,
        new.email,
        v_name,
        v_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution link
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
