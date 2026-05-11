-- =====================================================================
-- XÓA ANONYMOUS USER để test lại từ đầu
-- Chạy TỪNG BƯỚC trong Supabase SQL Editor → Tab "SQL Editor"
-- =====================================================================

-- BƯỚC 1: Xem danh sách anonymous users cần xóa
SELECT 
  id, email, is_anonymous, created_at
FROM auth.users
WHERE is_anonymous = true
ORDER BY created_at DESC;

-- =====================================================================
-- BƯỚC 2: Xóa dữ liệu liên quan theo thứ tự (tránh lỗi FK)
-- Thay <USER_ID> bằng UUID thực tế từ Bước 1
-- Ví dụ: '77f26466-4aea-4478-a755-cf8d0e98a7b4'
-- =====================================================================

-- 2a. Xóa order_items trước (phụ thuộc vào orders)
DELETE FROM public.order_items
WHERE order_id IN (
  SELECT id FROM public.orders WHERE user_id = '77f26466-4aea-4478-a755-cf8d0e98a7b4'
);

-- 2b. Xóa orders
DELETE FROM public.orders
WHERE user_id = '77f26466-4aea-4478-a755-cf8d0e98a7b4';

-- 2c. Xóa địa chỉ
DELETE FROM public.user_addresses
WHERE user_id = '77f26466-4aea-4478-a755-cf8d0e98a7b4';

-- 2d. Xóa profile
DELETE FROM public.profiles
WHERE id = '77f26466-4aea-4478-a755-cf8d0e98a7b4';

-- =====================================================================
-- BƯỚC 3: Sau khi xóa dữ liệu liên quan xong,
-- vào Dashboard → Authentication → Users → Xóa user thủ công
-- HOẶC chạy câu sau (cần service_role):
-- =====================================================================
-- DELETE FROM auth.users WHERE id = '77f26466-4aea-4478-a755-cf8d0e98a7b4';

-- =====================================================================
-- XÓA TẤT CẢ anonymous users không có đơn hàng (dùng để dọn sạch)
-- =====================================================================
DO $$
DECLARE
  anon_user RECORD;
BEGIN
  FOR anon_user IN
    SELECT id FROM auth.users
    WHERE is_anonymous = true
      AND id NOT IN (
        SELECT DISTINCT user_id FROM public.orders WHERE user_id IS NOT NULL
      )
  LOOP
    -- Xóa dữ liệu liên quan
    DELETE FROM public.user_addresses WHERE user_id = anon_user.id;
    DELETE FROM public.profiles WHERE id = anon_user.id;
    -- Xóa user
    DELETE FROM auth.users WHERE id = anon_user.id;
  END LOOP;
END $$;
