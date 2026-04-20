-- =====================================================
-- RLS Policies cho bảng membership_levels
-- =====================================================

-- Bật RLS
ALTER TABLE membership_levels ENABLE ROW LEVEL SECURITY;

-- Xóa policies cũ (nếu có)
DROP POLICY IF EXISTS "Cho phép đọc membership levels cho tất cả người dùng đã đăng nhập" ON membership_levels;
DROP POLICY IF EXISTS "Cho phép admin/staff quản lý membership levels" ON membership_levels;

-- =====================================================
-- 1. Policy đọc: Tất cả user đã đăng nhập đều có thể đọc
-- =====================================================
CREATE POLICY "Cho phép đọc membership levels cho tất cả người dùng đã đăng nhập"
ON membership_levels
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 2. Policy quản lý (INSERT, UPDATE, DELETE): Chỉ admin và staff
-- =====================================================
CREATE POLICY "Cho phép admin/staff quản lý membership levels"
ON membership_levels
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'staff')
  )
);
