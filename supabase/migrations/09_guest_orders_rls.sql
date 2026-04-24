-- Migration: Fix guest insert policy for orders table (revised)
-- Fix: "new row violates row-level security policy for table orders"
--
-- Problem: policy "{public}" includes BOTH anon AND authenticated users.
-- When a guest (anon) inserts with user_id=NULL, BOTH policies are checked:
--   - "Guest can insert orders" (anon) → passes because user_id IS NULL ✓
--   - "Users can create orders" (public) → FAILS because auth.uid() != NULL
--
-- Solution: add auth.uid() IS NULL check to guest policy so it ONLY applies to anon,
-- and add auth.uid() IS NOT NULL check to users policy so it ONLY applies to auth.

-- Drop existing policies
DROP POLICY IF EXISTS "Guest can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

-- Guest policy: only for anon role, only when user_id is NULL
CREATE POLICY "Guest can insert orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL AND auth.uid() IS NULL);

-- Users policy: only for authenticated users, only when user_id matches auth.uid()
CREATE POLICY "Users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);
