-- Patch: Fix lỗi cannot extract elements from a scalar khi gọi create_return_request
-- Chạy trong Supabase SQL Editor

-- 1. Drop và tạo lại function với fix
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
  p_items           text DEFAULT '[]'
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint; v_total numeric := 0; v_items_data jsonb; r record;
BEGIN
  v_items_data := COALESCE(p_items::jsonb, '[]'::jsonb);
  
  IF jsonb_typeof(v_items_data) IS NULL OR jsonb_typeof(v_items_data) != 'array' THEN
    v_items_data := '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id=p_order_id AND user_id=p_user_id) THEN
    RAISE EXCEPTION 'Order không tồn tại hoặc không thuộc về bạn';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id=p_order_id AND status='completed') THEN
    RAISE EXCEPTION 'Chỉ đơn hàng đã giao mới được trả';
  END IF;
  
  IF EXISTS (SELECT 1 FROM return_requests WHERE order_id=p_order_id AND status IN ('pending','approved','shipping_back')) THEN
    RAISE EXCEPTION 'Đơn hàng này đang có yêu cầu trả hàng đang xử lý';
  END IF;
  
  FOR r IN SELECT * FROM jsonb_array_elements(v_items_data) LOOP
    v_total := v_total + COALESCE((r.value->>'refund_amount')::numeric, 0);
  END LOOP;
  
  INSERT INTO return_requests (
    order_id, user_id, profiles_id, request_type, reason_category,
    reason, description, evidence_images, refund_amount, refund_method,
    bank_account_name, bank_account_number, bank_name, status
  ) VALUES (
    p_order_id, p_user_id, p_user_id, p_request_type, p_reason_category,
    p_reason, p_description, p_evidence_images, v_total, p_refund_method,
    p_bank_account_name, p_bank_account_number, p_bank_name, 'pending'
  ) RETURNING id INTO v_id;
  
  INSERT INTO return_items (return_request_id, order_item_id, product_id, quantity, refund_amount)
  SELECT v_id, (item->>'order_item_id')::bigint, (item->>'product_id')::bigint, 
         (item->>'quantity')::integer, (item->>'refund_amount')::numeric
  FROM jsonb_array_elements(v_items_data) item;
  
  UPDATE orders 
  SET status='return_requested', return_requested_at=now(), active_return_id=v_id, refund_amount=v_total 
  WHERE id=p_order_id;
  
  RETURN v_id;
END;
$$;
