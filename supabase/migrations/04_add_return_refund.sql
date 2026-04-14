-- Migration: Hoàn hàng / Trả hàng (Tối giản)
-- Chạy trong Supabase SQL Editor
-- Admin chuyển status trực tiếp trên Dashboard hoặc UPDATE SQL

-- 1. Mở rộng order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_requested';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'returning';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';

-- 2. Enum lý do trả hàng
DO $$ BEGIN
  CREATE TYPE public.return_reason_type AS ENUM (
    'wrong_size','wrong_color','defective','damaged',
    'not_as_described','changed_mind','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Bảng yêu cầu trả hàng
CREATE TABLE IF NOT EXISTS public.return_requests (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id          bigint NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type      varchar(20) DEFAULT 'return' CHECK (request_type IN ('return','exchange')),
  reason_category   public.return_reason_type NOT NULL,
  reason            text NOT NULL,
  description       text,
  evidence_images   text[] DEFAULT '{}',
  refund_amount     numeric NOT NULL DEFAULT 0,
  refund_method     varchar(20) DEFAULT 'original' CHECK (refund_method IN ('original','bank_transfer','wallet')),
  bank_account_name text,
  bank_account_number text,
  bank_name         text,
  status            varchar(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','shipping_back','completed','refunded','rejected','cancelled')),
  rejection_reason  text,
  admin_notes       text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  approved_at       timestamptz,
  completed_at      timestamptz,
  refunded_at       timestamptz
);

CREATE INDEX idx_rr_order   ON public.return_requests(order_id);
CREATE INDEX idx_rr_user    ON public.return_requests(user_id);
CREATE INDEX idx_rr_status  ON public.return_requests(status);

-- 4. Chi tiết items trả hàng
CREATE TABLE IF NOT EXISTS public.return_items (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  return_request_id bigint NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id     bigint NOT NULL REFERENCES public.order_items(id),
  product_id        bigint NOT NULL REFERENCES public.products(id),
  quantity          integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  refund_amount     numeric NOT NULL DEFAULT 0,
  condition_status  varchar(20) DEFAULT 'original' CHECK (condition_status IN ('original','opened','used','damaged'))
);

CREATE INDEX idx_ri_request ON public.return_items(return_request_id);
CREATE INDEX idx_ri_item    ON public.return_items(order_item_id);

-- 5. Thêm cột vào bảng có sẵn
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_returned       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS returned_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_request_id bigint REFERENCES public.return_requests(id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS return_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS returning_at        timestamptz,
  ADD COLUMN IF NOT EXISTS returned_at         timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at         timestamptz,
  ADD COLUMN IF NOT EXISTS active_return_id    bigint REFERENCES public.return_requests(id),
  ADD COLUMN IF NOT EXISTS refund_amount       numeric DEFAULT 0;

-- 6. RPC: User tạo yêu cầu trả hàng (validation tự động)
CREATE OR REPLACE FUNCTION public.create_return_request(
  p_order_id        bigint,
  p_user_id         uuid,
  p_request_type    varchar(20),
  p_reason_category return_reason_type,
  p_reason          text,
  p_description     text DEFAULT NULL,
  p_evidence_images text[] DEFAULT '{}',
  p_refund_method   varchar(20) DEFAULT 'original',
  p_bank_account_name   text DEFAULT NULL,
  p_bank_account_number text DEFAULT NULL,
  p_bank_name           text DEFAULT NULL,
  p_items           jsonb DEFAULT '[]'::jsonb
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint; v_total numeric := 0; r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id=p_order_id AND user_id=p_user_id) THEN
    RAISE EXCEPTION 'Order không tồn tại hoặc không thuộc về bạn';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id=p_order_id AND status='completed') THEN
    RAISE EXCEPTION 'Chỉ đơn hàng đã giao mới được trả';
  END IF;
  IF EXISTS (SELECT 1 FROM return_requests WHERE order_id=p_order_id AND status IN ('pending','approved','shipping_back')) THEN
    RAISE EXCEPTION 'Đơn hàng này đang có yêu cầu trả hàng đang xử lý';
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total := v_total + (r.value->>'refund_amount')::numeric;
  END LOOP;
  INSERT INTO return_requests (order_id,user_id,request_type,reason_category,reason,description,evidence_images,refund_amount,refund_method,bank_account_name,bank_account_number,bank_name,status)
    VALUES (p_order_id,p_user_id,p_request_type,p_reason_category,p_reason,p_description,p_evidence_images,v_total,p_refund_method,p_bank_account_name,p_bank_account_number,p_bank_name,'pending')
    RETURNING id INTO v_id;
  INSERT INTO return_items (return_request_id,order_item_id,product_id,quantity,refund_amount)
    SELECT v_id,(item->>'order_item_id')::bigint,(item->>'product_id')::bigint,(item->>'quantity')::integer,(item->>'refund_amount')::numeric
    FROM jsonb_array_elements(p_items) item;
  UPDATE orders SET status='return_requested',return_requested_at=now(),active_return_id=v_id,refund_amount=v_total WHERE id=p_order_id;
  RETURN v_id;
END;
$$;

-- 7. RPC: Hủy yêu cầu (user)
CREATE OR REPLACE FUNCTION public.cancel_return(p_return_id bigint, p_user_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_oid bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM return_requests WHERE id=p_return_id AND user_id=p_user_id AND status='pending') THEN
    RAISE EXCEPTION 'Không thể hủy yêu cầu này';
  END IF;
  SELECT order_id INTO v_oid FROM return_requests WHERE id=p_return_id;
  UPDATE return_requests SET status='cancelled',updated_at=now() WHERE id=p_return_id;
  UPDATE orders SET status='completed',active_return_id=NULL,refund_amount=0 WHERE id=v_oid;
  RETURN true;
END;
$$;

-- 8. RLS
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own returns" ON public.return_requests FOR ALL USING (auth.uid()=user_id OR EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN('admin','staff')));
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own return items" ON public.return_items FOR SELECT USING (EXISTS(SELECT 1 FROM return_requests rr WHERE rr.id=return_items.return_request_id AND (rr.user_id=auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN('admin','staff')))));
CREATE POLICY "Admins insert ri" ON public.return_items FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN('admin','staff')));
