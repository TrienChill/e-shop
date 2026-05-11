-- =====================================================================
-- BYPASS: Xác nhận email cho anonymous user trực tiếp trong DB
-- Dùng khi SMTP chưa hoạt động để tiếp tục test flow
-- =====================================================================

-- Bước 1: Kiểm tra trạng thái hiện tại
SELECT 
  id, email, email_change, email_change_token_new,
  email_change_sent_at, email_confirmed_at, is_anonymous
FROM auth.users
WHERE id = '4ad2cab7-50aa-4423-b7b9-e59224b7cabc';

-- Bước 2: Xác nhận email change trực tiếp (bypass OTP)
-- Gán email, xác nhận, và tắt flag anonymous
UPDATE auth.users
SET 
  email = email_change,                  -- Set email chính thức
  email_confirmed_at = NOW(),            -- Đánh dấu đã xác nhận
  is_anonymous = false,                  -- Tắt flag anonymous
  email_change = '',                     -- Xóa pending email change
  email_change_token_new = '',           -- Xóa token
  email_change_sent_at = NULL,           -- Xóa timestamp
  updated_at = NOW()
WHERE id = '4ad2cab7-50aa-4423-b7b9-e59224b7cabc'
  AND email_change IS NOT NULL 
  AND email_change != '';

-- Bước 3: Kiểm tra kết quả
SELECT 
  id, email, is_anonymous, email_confirmed_at
FROM auth.users
WHERE id = '4ad2cab7-50aa-4423-b7b9-e59224b7cabc';
