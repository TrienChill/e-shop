-- =====================================================================
-- PRODUCTION CLEANUP: Dọn dẹp Anonymous Users rác (Version 2)
-- Đã sửa: xóa đúng thứ tự để tránh lỗi Foreign Key Constraint
-- =====================================================================

-- CÁCH 1: Chạy thủ công trên SQL Editor (Free Plan)
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  anon_ids UUID[];
BEGIN
  -- Lấy danh sách anonymous users cần xóa
  SELECT ARRAY_AGG(id) INTO anon_ids
  FROM auth.users
  WHERE is_anonymous = true
    AND created_at < NOW() - INTERVAL '7 days'
    AND id NOT IN (
      SELECT DISTINCT user_id 
      FROM public.orders 
      WHERE user_id IS NOT NULL
    );

  IF anon_ids IS NULL OR array_length(anon_ids, 1) = 0 THEN
    RAISE NOTICE 'Không có anonymous user nào cần xóa.';
    RETURN;
  END IF;

  RAISE NOTICE 'Đang xóa % anonymous users...', array_length(anon_ids, 1);

  -- Bước 1: Xóa user_addresses
  DELETE FROM public.user_addresses WHERE user_id = ANY(anon_ids);
  
  -- Bước 2: Xóa profiles
  DELETE FROM public.profiles WHERE id = ANY(anon_ids);
  
  -- Bước 3: Xóa auth.users (sau khi đã xóa dữ liệu phụ thuộc)
  DELETE FROM auth.users WHERE id = ANY(anon_ids);

  RAISE NOTICE 'Đã xóa xong % anonymous users.', array_length(anon_ids, 1);
END $$;

-- =====================================================================
-- CÁCH 2: Dùng pg_cron (Pro Plan trở lên)
-- ─────────────────────────────────────────────────────────────────────

-- Bật extension
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Tạo cron job
-- SELECT cron.schedule(
--   'cleanup-anonymous-users-v2',
--   '0 3 * * 0',  -- Mỗi Chủ nhật 3:00 AM UTC
--   $$
--     DO $inner$
--     DECLARE anon_ids UUID[];
--     BEGIN
--       SELECT ARRAY_AGG(id) INTO anon_ids
--       FROM auth.users
--       WHERE is_anonymous = true
--         AND created_at < NOW() - INTERVAL '7 days'
--         AND id NOT IN (
--           SELECT DISTINCT user_id FROM public.orders WHERE user_id IS NOT NULL
--         );
--       IF anon_ids IS NOT NULL THEN
--         DELETE FROM public.user_addresses WHERE user_id = ANY(anon_ids);
--         DELETE FROM public.profiles WHERE id = ANY(anon_ids);
--         DELETE FROM auth.users WHERE id = ANY(anon_ids);
--       END IF;
--     END $inner$;
--   $$
-- );
