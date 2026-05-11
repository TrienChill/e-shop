-- =====================================================================
-- FIX: RLS Policies cho Anonymous User (Guest Checkout)
-- Chạy trên Supabase Dashboard → SQL Editor
-- =====================================================================

-- 1. Cho phép user (bao gồm anonymous) INSERT profile của chính mình
-- Cần thiết khi trigger handle_new_user chưa tạo profile kịp thời
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. Cho phép anonymous user UPDATE profile của chính mình
-- (Policy hiện tại đã có: "Users can update own profile" với auth.uid() = id)
-- Kiểm tra lại nếu policy đã tồn tại thì bỏ qua bước 1

-- 3. Cho phép anonymous user INSERT địa chỉ giao hàng
-- (Policy hiện tại đã có: "Users can insert own addresses" với auth.uid() = user_id)
-- Anonymous user IS authenticated → policy này đã đủ

-- =====================================================================
-- KIỂM TRA: Xem trigger handle_new_user có chạy với anonymous user không
-- =====================================================================
-- Chạy câu sau để kiểm tra profile của anonymous user vừa tạo:
-- SELECT id, full_name, phone, role, created_at 
-- FROM public.profiles 
-- WHERE id = '<anonymous_user_id>';

-- Nếu profile tồn tại nhưng full_name rỗng → trigger có chạy, chỉ là UPDATE lỗi
-- Nếu profile không tồn tại → trigger không chạy cho anonymous user

-- =====================================================================
-- QUAN TRỌNG: Kiểm tra trigger handle_new_user trong Supabase
-- Vào Authentication → Hooks hoặc Database → Triggers
-- Tìm trigger trên bảng auth.users
-- Xem body của function handle_new_user có điều kiện nào lọc anonymous không
-- Ví dụ: nếu có điều kiện "IF NEW.email IS NOT NULL" thì anonymous sẽ bị bỏ qua
-- =====================================================================
