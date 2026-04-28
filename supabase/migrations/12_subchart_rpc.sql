-- Sub-chart RPC for Drill-down feature (Updated to User's version)

CREATE OR REPLACE FUNCTION get_order_count_by_status_and_days(p_status text, p_days integer DEFAULT 7)
RETURNS TABLE (date_str text, order_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1) * INTERVAL '1 day', 
      CURRENT_DATE, 
      '1 day'::interval
    )::date AS day_date
  )
  SELECT 
    to_char(d.day_date, 'DD/MM') AS date_str,
    COUNT(o.id)::bigint AS order_count
  FROM date_range d
  LEFT JOIN orders o ON DATE(o.created_at) = d.day_date AND o.status::text = p_status
  GROUP BY d.day_date
  ORDER BY d.day_date;
END;
$$;
