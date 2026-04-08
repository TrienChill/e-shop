-- RBAC (admin/staff) + revenue RPC

-- Helper check: user is admin/staff
-- Note: profiles.role is assumed to be enum user_role

-- ----------------------------
-- ORDERS: staff/admin can view all orders
-- ----------------------------
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_admin_view_all_orders" ON public.orders;
CREATE POLICY "staff_admin_view_all_orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY['admin'::user_role, 'staff'::user_role])
  )
);

-- Keep existing user policy (if present) as-is; this just adds staff/admin access.

-- ----------------------------
-- VOUCHERS: admin can manage all vouchers
-- ----------------------------
ALTER TABLE IF EXISTS public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_vouchers" ON public.vouchers;
CREATE POLICY "admin_manage_vouchers"
ON public.vouchers
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::user_role
  )
);

-- ----------------------------
-- REVENUE: admin-only RPC
-- ----------------------------
CREATE OR REPLACE FUNCTION public.get_revenue_summary(p_from timestamptz, p_to timestamptz)
RETURNS TABLE(total_revenue numeric, orders_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::user_role
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(o.total_amount), 0)::numeric AS total_revenue,
    COUNT(*)::bigint AS orders_count
  FROM public.orders o
  WHERE o.status = 'completed'
    AND o.created_at >= p_from
    AND o.created_at < p_to;
END;
$$;

REVOKE ALL ON FUNCTION public.get_revenue_summary(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_revenue_summary(timestamptz, timestamptz) TO authenticated;

