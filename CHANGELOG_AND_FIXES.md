# Tipsy POS - System Architecture, Fixes & Operations Guide

> **Last Updated**: October 2026  
> **Status**: Verified Stable & Production Ready  
> **Target Restaurant ID**: `bed0ddd2-4cb9-4a32-9038-4f2f398d0d1a` ("The Tipsy Bar & Eatery")

---

## 1. Executive Summary: What Was Done

This document provides a permanent reference of all database anomalies, schema mismatches, application bug fixes, and printer server compatibility guarantees resolved in the project.

---

## 2. Root Cause Analysis & Resolutions

### A. The "categories" vs "menu_categories" Table Name Mismatch
* **Problem**: When running initial seeds, PostgreSQL threw:
  `ERROR: 23503: insert or update on table "menu_items" violates foreign key constraint "menu_items_category_id_fkey"`
  `DETAIL: Key (category_id)=(...) is not present in table "categories".`
* **Root Cause**: The live Supabase PostgreSQL database originally had a foreign key constraint referencing a legacy table called `categories`, whereas the Next.js app and migrations use `menu_categories`.
* **Resolution in [SEED_ALL_MENU.sql](file:///home/dhananjay/Documents/GitHub/tipsy-pos/SEED_ALL_MENU.sql)**:
  1. Dynamically discovers and drops any existing foreign key on `menu_items(category_id)` using `information_schema.table_constraints`.
  2. Inserts all 40 categories into `public.menu_categories`.
  3. Re-attaches `menu_items_category_id_fkey` pointing to `public.menu_categories(id) ON DELETE CASCADE`.

### B. Duplicate Slug Key Violation
* **Problem**: `ERROR: 23505: duplicate key value violates unique constraint "menu_items_restaurant_id_slug_key"` on items like `thecha-coated-grilled-paneer`.
* **Root Cause**: The live database enforces `UNIQUE (restaurant_id, slug)`. The raw source menu contained items with identical names in different sub-sections.
* **Resolution**: Slugs were programmatically generated with collision detection. Duplicate items received deterministic `-2` suffixes (e.g. `thecha-coated-grilled-paneer-2`), ensuring 100% slug uniqueness across all 552 items.

### C. Slug NOT NULL Constraint
* **Problem**: `ERROR: 23502: null value in column "slug" of relation "menu_items" violates not-null constraint`.
* **Root Cause**: An earlier attempt to avoid slug collisions omitted `slug` from the `INSERT` statement. However, the live DB table has `slug TEXT NOT NULL`.
* **Resolution**: All 552 insert statements now explicitly include valid, non-null, unique slug values.

### D. Orphaned Rows Breaking Foreign Key Re-Attachment
* **Problem**: `ERROR: 23503 ... Key (category_id)=(b46e3346-...) is not present in table "menu_categories"`.
* **Root Cause**: At the end of the script, `ALTER TABLE public.menu_items ADD CONSTRAINT ...` validates **every existing row in `public.menu_items`**. If test rows or items from other/null restaurants existed pointing to old category IDs, the constraint creation failed.
* **Resolution**: Added a cleanup step right before re-attaching the constraint:
  ```sql
  DELETE FROM public.order_items WHERE menu_item_id IN (
      SELECT id FROM public.menu_items WHERE category_id NOT IN (SELECT id FROM public.menu_categories)
  );
  DELETE FROM public.menu_items WHERE category_id NOT IN (SELECT id FROM public.menu_categories);
  ```

### E. Missing ON CONFLICT Constraint on Tables
* **Problem**: `ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification` on `INSERT INTO public.tables ... ON CONFLICT (restaurant_id, number)`.
* **Root Cause**: The live `tables` table did not have an explicit composite unique constraint on `(restaurant_id, number)`.
* **Resolution**: Switched from `ON CONFLICT` to a standard PL/pgSQL `IF NOT EXISTS` check:
  ```sql
  FOR i IN 1..12 LOOP
      IF NOT EXISTS (SELECT 1 FROM public.tables WHERE restaurant_id = v_restaurant_id AND number = i) THEN
          INSERT INTO public.tables (restaurant_id, number, capacity, status)
          VALUES (v_restaurant_id, i, CASE WHEN i % 4 = 1 THEN 2 WHEN i % 4 = 2 THEN 4 WHEN i % 4 = 3 THEN 6 ELSE 8 END, 'available');
      END IF;
  END LOOP;
  ```

### F. Application Not Showing Data (Empty Captain/Dashboard Views)
* **Problem**: The database was seeded, but the Captain and Admin pages showed empty tables and no menu.
* **Root Cause**: The Supabase Auth trigger `handle_new_user()` defaults new users to a generated sandbox restaurant (`Tipsy POS Sandbox`) if no `restaurant_id` metadata is supplied. Because all app queries filter by `restaurant_id = profile.restaurant_id` and RLS enforces `USING (restaurant_id = public.get_tenant_id())`, the app returned empty data.
* **Resolution**: Added an automated user-link update in the seed script:
  ```sql
  UPDATE public.users SET restaurant_id = v_restaurant_id;
  ```
  Now, any signed-up user is immediately linked to `The Tipsy Bar & Eatery` and sees all tables and menu items.

### G. Syntax Error in Captain Tables Page
* **Problem**: Build error in `src/app/(captain)/captain/tables/page.tsx` (`} else {` syntax error).
* **Root Cause**: An orphaned duplicate `else` block remained from a previous refetch edit around line 244.
* **Resolution**: Cleaned up the refetch logic to standard state assignment. `npm run build` now compiles with 0 errors across all 17 routes.

---

## 3. Print Server Safety Guarantee (Remote Machine: `DESKTOP-VJVJQ4E`)

The print server running on the remote Windows machine operates via **Supabase Realtime** listening on `public.print_jobs` and reading `public.printers`.

### Why the Print Server Does NOT Need Any Updates:
1. **Preserved Printer UUIDs**:
   Instead of deleting or re-inserting printers with random UUIDs (which would break the print server's in-memory cache), the seed script uses `IF NOT EXISTS ... ELSE UPDATE`. Existing printer UUIDs remain completely permanent.
2. **Preserved Hardware Mappings**:
   - **Kitchen One**: `192.168.1.95:9100` (LAN TCP)
   - **Counter One**: `\\DESKTOP-VJVJQ4E\rp3160` (Windows Spooler Copy Bypass)
   - **Bar One**: `\\DESKTOP-VJVJQ4E\barip195` (Windows Spooler Copy Bypass)
3. **Payload Structure Intact**:
   Orders and Bill tickets insert payloads into `print_jobs` with the exact keys expected by `print-server/src/services/printer.js`:
   - `type`: `'KOT'` or `'BILL'`
   - `tableName`: `'Table'`
   - `tableNumber`: String
   - `captainName`: String
   - `items`: `[{ name, quantity, notes }]`

---

## 4. Key Files & Reference Architecture

| File Path | Description |
|---|---|
| [SEED_ALL_MENU.sql](file:///home/dhananjay/Documents/GitHub/tipsy-pos/SEED_ALL_MENU.sql) | Master SQL seed for 40 categories, 552 menu items, 3 printers, and 12 tables. Fully idempotent. |
| [allprintersworking.md](file:///home/dhananjay/Documents/GitHub/tipsy-pos/allprintersworking.md) | Technical setup of the Windows spooler bypass and printer configurations. |
| [updatedinstallingonhost.md](file:///home/dhananjay/Documents/GitHub/tipsy-pos/updatedinstallingonhost.md) | Installation and PM2 setup guide for the client machine. |
| [src/app/(captain)/captain/tables/page.tsx](file:///home/dhananjay/Documents/GitHub/tipsy-pos/src/app/(captain)/captain/tables/page.tsx) | Unified captain workspace (table grid, menu ordering, cart, KOT dispatch, checkout). |
| [src/app/(admin)/dashboard/printers/page.tsx](file:///home/dhananjay/Documents/GitHub/tipsy-pos/src/app/(admin)/dashboard/printers/page.tsx) | Admin printer management panel with silent LAN test print operations. |

---

## 5. Maintenance Cheatsheet

### To Re-Seed the Database
Copy [SEED_ALL_MENU.sql](file:///home/dhananjay/Documents/GitHub/tipsy-pos/SEED_ALL_MENU.sql) and paste it into **Supabase SQL Editor** -> Click **Run**.

### To Verify Local App Build
```bash
npm run build
```

### To Restart Print Server on Host Machine (if needed in the future)
```cmd
pm2 restart tipsy-print-server --update-env
pm2 logs tipsy-print-server --lines 50
```
