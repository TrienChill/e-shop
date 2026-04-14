-- Migration: Thêm cột lưu mã vận đơn GHN vào bảng orders
-- Chạy lệnh này trong Supabase SQL Editor

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ghn_order_code text,
  ADD COLUMN IF NOT EXISTS ghn_sort_code   text;

-- Index để tra cứu nhanh theo mã vận đơn
CREATE INDEX IF NOT EXISTS idx_orders_ghn_order_code ON public.orders(ghn_order_code);

COMMENT ON COLUMN public.orders.ghn_order_code IS 'Mã vận đơn (Tracking Code) do GHN cấp sau khi đẩy đơn';
COMMENT ON COLUMN public.orders.ghn_sort_code   IS 'Sort code của GHN phục vụ phân loại hàng tại kho';
