-- =====================================================
-- MIGRATION: Thêm loyalty_points vào bảng profiles
-- Dùng cho AdminUserManagementScreen
-- =====================================================

-- Thêm cột loyalty_points
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Thêm index nếu cần query theo điểm
CREATE INDEX IF NOT EXISTS idx_profiles_loyalty_points ON public.profiles(loyalty_points);

-- =====================================================
-- END MIGRATION
-- =====================================================
