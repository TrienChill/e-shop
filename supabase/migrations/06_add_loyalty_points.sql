-- =====================================================
-- RPC: check_user_lock_status
-- Mục đích: Kiểm tra trạng thái khóa của user bằng email
-- Sử dụng: Login flow để chặn user bị khóa ngay từ đầu
-- Bypass RLS: SECURITY DEFINER cho phép đọc profiles an toàn
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
SECURITY DEFINER
AS $$
BEGIN
  -- Join auth.users với profiles để lấy email chính xác
  RETURN QUERY
  SELECT 
    p.is_locked,
    p.lock_reason,
    p.locked_at,
    p.locked_by,
    p.id AS user_id
  FROM auth.users au
  INNER JOIN public.profiles p ON au.id = p.id
  WHERE LOWER(au.email) = LOWER(p_email)
  LIMIT 1;
END;
$$;

-- Grant quyền gọi function cho tất cả users (authenticated & anon)
GRANT EXECUTE ON FUNCTION public.check_user_lock_status(TEXT) TO authenticated, anon;

-- =====================================================
-- RPC: get_user_lock_status_by_id (phụ trợ)
-- Dùng khi đã có user ID (sau login)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_lock_status_by_id(p_user_id UUID)
RETURNS TABLE (
  is_locked BOOLEAN,
  lock_reason TEXT,
  locked_at TIMESTAMPTZ,
  locked_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.is_locked,
    p.lock_reason,
    p.locked_at,
    p.locked_by
  FROM public.profiles p
  WHERE p.id = p_user_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_lock_status_by_id(UUID) TO authenticated, anon;

-- =====================================================
-- COMMENT
-- =====================================================
COMMENT ON FUNCTION public.check_user_lock_status(TEXT) IS 'Check if a user account is locked by email. Used in pre-login check to prevent locked users from authenticating.';
COMMENT ON FUNCTION public.get_user_lock_status_by_id(UUID) IS 'Check lock status by user ID. Used as secondary check after successful login.';
