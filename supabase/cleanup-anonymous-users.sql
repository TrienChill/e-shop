-- =====================================================================
-- CRON JOB: Dọn dẹp Anonymous Users rác
-- Chạy trên Supabase Dashboard → SQL Editor
-- =====================================================================

-- 1. Bật extension pg_cron (chỉ cần chạy 1 lần)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Tạo lịch dọn dẹp: mỗi Chủ nhật lúc 3:00 AM UTC
-- Xóa tất cả anonymous users:
--   - Được tạo quá 7 ngày trước
--   - KHÔNG có bất kỳ đơn hàng nào trong bảng orders
-- Khi user bị xóa, profile sẽ tự xóa theo nhờ ON DELETE CASCADE

SELECT cron.schedule(
  'cleanup-anonymous-users',    -- Tên job
  '0 3 * * 0',                  -- Cron: mỗi Chủ nhật 3:00 AM UTC
  $$
    DELETE FROM auth.users
    WHERE is_anonymous = true
      AND created_at < NOW() - INTERVAL '7 days'
      AND id NOT IN (
        SELECT DISTINCT user_id 
        FROM public.orders 
        WHERE user_id IS NOT NULL
      );
  $$
);

-- 3. Kiểm tra job đã được tạo chưa
SELECT * FROM cron.job;

-- 4. Xem lịch sử chạy job (sau khi đã chạy ít nhất 1 lần)
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- =====================================================================
-- GHI CHÚ:
-- - pg_cron yêu cầu Supabase Pro plan trở lên
-- - Nếu dùng Free plan, có thể dùng Edge Function với cron trigger:
--   https://supabase.com/docs/guides/functions/schedule-functions
-- - Hoặc chạy thủ công câu DELETE ở trên mỗi tuần
-- =====================================================================
