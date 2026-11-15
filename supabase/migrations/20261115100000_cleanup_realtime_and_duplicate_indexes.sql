-- =====================================================================
-- MIGRATION: Drop Duplicate Indexes & Optimize Realtime Publication
-- =====================================================================

-- 1. Remove printers from supabase_realtime publication to eliminate
-- the 1.1M+ realtime.list_changes WAL amplification caused by heartbeats.
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.printers;

-- 2. Drop duplicate indexes on orders (covered by idx_orders_restaurant and idx_orders_table)
DROP INDEX IF EXISTS public.idx_orders_restaurant_id;
DROP INDEX IF EXISTS public.idx_orders_table_id;

-- 3. Drop duplicate index on order_items (covered by idx_order_items_order)
DROP INDEX IF EXISTS public.idx_order_items_order_id;

-- 4. Drop duplicate index on printers (covered by idx_printers_restaurant)
DROP INDEX IF EXISTS public.idx_printers_restaurant_id;

-- 5. Refresh query planner statistics
ANALYZE public.orders;
ANALYZE public.order_items;
ANALYZE public.printers;

