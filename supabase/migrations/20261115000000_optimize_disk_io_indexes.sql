-- =====================================================================
-- MIGRATION: Optimize Indexes to Mitigate High Disk IO Consumption
-- =====================================================================

-- 1. Orders: Optimize range queries & sorting on (restaurant_id, created_at)
-- Eliminates sequential disk scans on orders history and analytics
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_at 
ON public.orders (restaurant_id, created_at DESC);

-- 2. Orders: Optimize active order lookups per table
CREATE INDEX IF NOT EXISTS idx_orders_table_status 
ON public.orders (table_id, status);

-- 3. Payments: Optimize date filtering & revenue rollups
CREATE INDEX IF NOT EXISTS idx_payments_restaurant_created_at 
ON public.payments (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_restaurant_status 
ON public.payments (restaurant_id, status);

-- 4. Print Jobs: Optimize timeline queries on printers dashboard
CREATE INDEX IF NOT EXISTS idx_print_jobs_restaurant_created_at 
ON public.print_jobs (restaurant_id, created_at DESC);

-- 5. Printers: Optimize printer dispatch routing (type & active status)
CREATE INDEX IF NOT EXISTS idx_printers_routing 
ON public.printers (restaurant_id, is_active, type);

-- 6. Order Items: Optimize tenant-scoped order item joins and deletions
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant_order 
ON public.order_items (restaurant_id, order_id);

-- 7. Menu Items: Optimize available menu item queries for Captain app
CREATE INDEX IF NOT EXISTS idx_menu_items_availability 
ON public.menu_items (restaurant_id, is_available);

-- 8. Users: Optimize staff listings ordered by role and name
CREATE INDEX IF NOT EXISTS idx_users_restaurant_role_name 
ON public.users (restaurant_id, role, name);

-- Analyze tables to refresh statistics for query planner
ANALYZE public.orders;
ANALYZE public.order_items;
ANALYZE public.payments;
ANALYZE public.print_jobs;
ANALYZE public.printers;
ANALYZE public.menu_items;
ANALYZE public.tables;
ANALYZE public.users;

