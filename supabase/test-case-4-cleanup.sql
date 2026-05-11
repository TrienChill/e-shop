-- =====================================================================
-- TEST CASE 4: Kiểm tra dọn dẹp (Cleanup Logic)
-- Chạy TỪNG CÂU trong Supabase SQL Editor
-- =====================================================================

-- ── BƯỚC 1: Đếm số anonymous users hiện tại ────────────────────────
SELECT COUNT(*) as anon_user_count 
FROM auth.users 
WHERE is_anonymous = true;

-- ── BƯỚC 2: Xem danh sách anonymous users (không có đơn hàng) ───────
-- Đây là những user sẽ bị dọn dẹp trong production
SELECT 
  u.id,
  u.is_anonymous,
  u.created_at,
  p.full_name,
  p.phone,
  (SELECT COUNT(*) FROM public.orders o WHERE o.user_id = u.id) as order_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.is_anonymous = true
ORDER BY u.created_at DESC;

-- ── BƯỚC 3: Giả lập dọn dẹp (đổi 7 days → 0 minutes để test) ──────
-- LƯU Ý: FK profiles → auth.users KHÔNG có CASCADE
-- Phải xóa dữ liệu liên quan TRƯỚC khi xóa auth.users

-- 3a. Xóa user_addresses của anonymous users không có đơn hàng
DELETE FROM public.user_addresses
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE is_anonymous = true
    AND created_at < NOW() - INTERVAL '0 minutes'
    AND id NOT IN (
      SELECT DISTINCT user_id FROM public.orders WHERE user_id IS NOT NULL
    )
);

-- 3b. Xóa profiles của anonymous users không có đơn hàng
DELETE FROM public.profiles
WHERE id IN (
  SELECT id FROM auth.users
  WHERE is_anonymous = true
    AND created_at < NOW() - INTERVAL '0 minutes'
    AND id NOT IN (
      SELECT DISTINCT user_id FROM public.orders WHERE user_id IS NOT NULL
    )
);

-- 3c. Xóa auth.users (sau khi đã xóa dữ liệu phụ thuộc)
DELETE FROM auth.users
WHERE is_anonymous = true
  AND created_at < NOW() - INTERVAL '0 minutes'
  AND id NOT IN (
    SELECT DISTINCT user_id FROM public.orders WHERE user_id IS NOT NULL
  );

-- ── BƯỚC 4: Kiểm tra kết quả ────────────────────────────────────────
-- Đếm lại anonymous users còn lại
SELECT COUNT(*) as remaining_anon_users FROM auth.users WHERE is_anonymous = true;

-- Kiểm tra profiles và user_addresses đã sạch chưa
SELECT COUNT(*) as orphan_profiles 
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

SELECT COUNT(*) as orphan_addresses 
FROM public.user_addresses ua
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ua.user_id);

-- =====================================================================
-- FIX PRODUCTION: Cập nhật cleanup-anonymous-users.sql
-- để xóa đúng thứ tự thay vì chỉ xóa auth.users
-- =====================================================================
-- (Xem file: supabase/cleanup-anonymous-users-v2.sql)
