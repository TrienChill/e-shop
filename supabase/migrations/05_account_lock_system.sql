-- =====================================================
-- MIGRATION: Thêm tính năng khóa tài khoản
-- Thêm các cột: is_locked, lock_reason, locked_at, locked_by
-- =====================================================

-- Bước 1: Thêm các cột mới vào bảng profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);

-- Bước 2: Tạo index để tìm nhanh tài khoản bị khóa
CREATE INDEX IF NOT EXISTS idx_profiles_is_locked ON public.profiles(is_locked);

-- Bước 3: Tạo function để admin khóa/mở khóa tài khoản
-- (Sẽ dùng trong admin panel và RPC)
CREATE OR REPLACE FUNCTION public.lock_user_account(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Lấy ID của admin đang thực hiện
  v_admin_id := auth.uid();

  -- Kiểm tra quyền admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền khóa tài khoản';
  END IF;

  -- Cập nhật trạng thái khóa
  UPDATE public.profiles
  SET
    is_locked = TRUE,
    lock_reason = p_reason,
    locked_at = NOW(),
    locked_by = v_admin_id
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bước 4: Tạo function để mở khóa tài khoản
CREATE OR REPLACE FUNCTION public.unlock_user_account(
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Lấy ID của admin đang thực hiện
  v_admin_id := auth.uid();

  -- Kiểm tra quyền admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Chỉ admin mới có quyền mở khóa tài khoản';
  END IF;

  -- Mở khóa tài khoản
  UPDATE public.profiles
  SET
    is_locked = FALSE,
    lock_reason = NULL,
    locked_at = NULL,
    locked_by = NULL
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bước 5: Grant quyền gọi function
GRANT EXECUTE ON FUNCTION public.lock_user_account(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_user_account(UUID) TO authenticated;

-- Bước 6: (Tùy chọn) Tạo bảng audit_logs để lịch sử khóa/mở khóa
CREATE TABLE IF NOT EXISTS public.account_lock_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('LOCK', 'UNLOCK')),
  reason TEXT,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_account_lock_logs_user_id ON public.account_lock_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lock_logs_admin_id ON public.account_lock_logs(admin_id);

GRANT ALL ON public.account_lock_logs TO authenticated;
GRANT ALL ON public.account_lock_logs TO service_role;

-- Bước 7: Trigger để tự động log khi khóa/mở khóa
CREATE OR REPLACE FUNCTION public.log_account_lock_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Kiểm tra xem is_locked có thay đổi không
    IF OLD.is_locked IS DISTINCT FROM NEW.is_locked THEN
      IF NEW.is_locked = TRUE THEN
        -- Vừa khóa tài khoản
        INSERT INTO public.account_lock_logs (user_id, admin_id, action, reason, locked_at)
        VALUES (NEW.id, NEW.locked_by, 'LOCK', NEW.lock_reason, NEW.locked_at);
      ELSE
        -- Vừa mở khóa tài khoản
        UPDATE public.account_lock_logs
        SET unlocked_at = NOW()
        WHERE user_id = NEW.id
          AND action = 'LOCK'
          AND unlocked_at IS NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_account_lock_change ON public.profiles;
CREATE TRIGGER on_account_lock_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.is_locked IS DISTINCT FROM NEW.is_locked)
  EXECUTE FUNCTION public.log_account_lock_change();

GRANT EXECUTE ON FUNCTION public.log_account_lock_change() TO authenticated;

-- =====================================================
-- END MIGRATION
-- =====================================================
