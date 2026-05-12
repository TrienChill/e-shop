-- Migration: Create get_global_top_selling_products RPC
-- Purpose: Bypass Row Level Security (RLS) to aggregate sales data across all users
-- so that the "Top sản phẩm bán chạy" section shows global top selling products,
-- rather than just the products ordered by the current user.

CREATE OR REPLACE FUNCTION get_global_top_selling_products(days_ago int DEFAULT 30, limit_count int DEFAULT 10)
RETURNS TABLE (
  product_id bigint,
  total_sold bigint
)
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: This makes the function bypass RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_id,
    SUM(oi.quantity)::bigint AS total_sold
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND oi.product_id IS NOT NULL
    AND o.created_at >= (NOW() - (days_ago || ' days')::interval)
  GROUP BY oi.product_id
  ORDER BY total_sold DESC
  LIMIT limit_count;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_global_top_selling_products(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_top_selling_products(int, int) TO anon;
