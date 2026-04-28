-- Dashboard RPCs for Admin/Staff

-- 1. get_dashboard_summary
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS TABLE (
  revenue numeric,
  new_orders bigint,
  new_returns bigint,
  new_customers bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin'::user_role, 'staff'::user_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COALESCE(SUM(total_amount), 0) FROM public.orders WHERE status = 'completed' AND date_trunc('month', created_at) = date_trunc('month', now()))::numeric AS revenue,
    (SELECT COUNT(*) FROM public.orders WHERE status = 'pending')::bigint AS new_orders,
    (SELECT COUNT(*) FROM public.return_requests WHERE status = 'pending')::bigint AS new_returns,
    (SELECT COUNT(*) FROM public.profiles WHERE date_trunc('month', created_at) = date_trunc('month', now()))::bigint AS new_customers;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary() TO authenticated;


-- 2. get_order_status_distribution
CREATE OR REPLACE FUNCTION public.get_order_status_distribution()
RETURNS TABLE(status text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin'::user_role, 'staff'::user_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT o.status::text, COUNT(*)::bigint AS count
  FROM public.orders o
  GROUP BY o.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_status_distribution() TO authenticated;


-- 3. get_top_selling_products
CREATE OR REPLACE FUNCTION public.get_top_selling_products(limit_num integer DEFAULT 5)
RETURNS TABLE (
  product_id bigint,
  name text,
  image_url text,
  price numeric,
  total_sales bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin'::user_role, 'staff'::user_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS product_id,
    p.name,
    p.images[1] AS image_url,
    p.price,
    COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'completed'), 0)::bigint AS total_sales
  FROM public.products p
  LEFT JOIN public.order_items oi ON p.id = oi.product_id
  LEFT JOIN public.orders o ON oi.order_id = o.id
  GROUP BY p.id
  ORDER BY total_sales DESC
  LIMIT limit_num;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_selling_products(integer) TO authenticated;


-- 4. get_revenue_by_days
CREATE OR REPLACE FUNCTION public.get_revenue_by_days(p_days integer)
RETURNS TABLE (
  date_str text,
  daily_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin'::user_role, 'staff'::user_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      date_trunc('day', now() - (p_days - 1) * interval '1 day'),
      date_trunc('day', now()),
      interval '1 day'
    )::date AS d
  )
  SELECT 
    to_char(dates.d, 'YYYY-MM-DD') AS date_str,
    COALESCE(SUM(o.total_amount), 0)::numeric AS daily_revenue
  FROM dates
  LEFT JOIN public.orders o ON date_trunc('day', o.created_at)::date = dates.d AND o.status = 'completed'
  GROUP BY dates.d
  ORDER BY dates.d ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_by_days(integer) TO authenticated;
