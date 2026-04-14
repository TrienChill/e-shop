-- Các RPC cho Admin xử lý Yêu cầu trả hàng
-- Chạy đoạn script này trong SQL Editor của Supabase

-- 1. Duyệt yêu cầu trả hàng
CREATE OR REPLACE FUNCTION public.approve_return(
  p_return_id bigint, p_admin_id uuid, p_admin_notes text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.return_requests
  SET status = 'approved', 
      approved_at = now(), 
      admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_return_id AND status = 'pending';
  
  RETURN true;
END;
$$;

-- 2. Từ chối yêu cầu trả hàng
CREATE OR REPLACE FUNCTION public.reject_return(
  p_return_id bigint, p_admin_id uuid, p_rejection_reason text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_oid bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM return_requests WHERE id = p_return_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Yêu cầu không trong trạng thái chờ xử lý.';
  END IF;

  SELECT order_id INTO v_oid FROM return_requests WHERE id = p_return_id;

  UPDATE public.return_requests
  SET status = 'rejected', 
      rejection_reason = p_rejection_reason, 
      updated_at = now()
  WHERE id = p_return_id;

  UPDATE public.orders
  SET status = 'completed', 
      active_return_id = NULL
  WHERE id = v_oid;

  RETURN true;
END;
$$;

-- 3. Cập nhật đang trả hàng (Shipping Back)
CREATE OR REPLACE FUNCTION public.mark_shipping_back(
  p_return_id bigint, p_admin_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_oid bigint;
BEGIN
  SELECT order_id INTO v_oid FROM return_requests WHERE id = p_return_id;

  UPDATE public.return_requests
  SET status = 'shipping_back', 
      updated_at = now()
  WHERE id = p_return_id;

  UPDATE public.orders
  SET status = 'returning', 
      returning_at = now()
  WHERE id = v_oid;

  RETURN true;
END;
$$;

-- 4. Hoàn tất nhận hàng trả (Restock)
CREATE OR REPLACE FUNCTION public.complete_return(
  p_return_id bigint, p_admin_id uuid DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_oid bigint; r record;
BEGIN
  SELECT order_id INTO v_oid FROM return_requests WHERE id = p_return_id;

  -- Cập nhật yêu cầu
  UPDATE public.return_requests
  SET status = 'completed', 
      completed_at = now()
  WHERE id = p_return_id;

  -- Cập nhật đơn hàng
  UPDATE public.orders
  SET status = 'returned', 
      returned_at = now()
  WHERE id = v_oid;

  -- Hoàn lại tồn kho cho các sản phẩm
  FOR r IN SELECT product_id, quantity FROM public.return_items WHERE return_request_id = p_return_id LOOP
    UPDATE public.products
    SET stock = stock + r.quantity
    WHERE id = r.product_id;
  END LOOP;

  RETURN true;
END;
$$;

-- 5. Cập nhật đã hoàn tiền
CREATE OR REPLACE FUNCTION public.process_refund(
  p_return_id bigint, p_admin_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_oid bigint;
BEGIN
  SELECT order_id INTO v_oid FROM return_requests WHERE id = p_return_id;

  UPDATE public.return_requests
  SET status = 'refunded', 
      refunded_at = now()
  WHERE id = p_return_id;

  UPDATE public.orders
  SET status = 'refunded', 
      refunded_at = now()
  WHERE id = v_oid;

  RETURN true;
END;
$$;
