-- =====================================================
-- RPC: check_user_lock_status
-- Mục đích: Kiểm tra trạng thái khóa của user bằng email
-- Sử dụng: Admin panel & login flow
-- Bypass RLS: Cho phép public/auth role đọc is_locked
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_user_lock_status(p_email TEXT)
RETURNS TABLE (
  is_locked BOOLEAN,
  lock_reason TEXT,
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy với quyền của owner (bypass RLS)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.is_locked,
    p.lock_reason,
    p.locked_at,
    p.locked_by,
    p.id AS user_id
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(p_email)
  LIMIT 1;
END;
$$;

-- =====================================================
-- SECURITY: Grant execute cho authenticated users
-- (ai cũng có thể gọi, nhưng chỉ trả về data của user đó)
-- =====================================================
GRANT EXECUTE ON FUNCTION public.check_user_lock_status(TEXT) TO authenticated, anon;

-- =====================================================
-- COMMENT
-- =====================================================
COMMENT ON FUNCTION public.check_user_lock_status(TEXT) IS 'Check if a user account is locked by email. Used in login flow to prevent locked users from accessing the app.';
