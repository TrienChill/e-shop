-- BƯỚC 1: TẠO BẢNG QUẢN LÝ VÍ VOUCHER CỦA NGƯỜI DÙNG (USER_VOUCHERS)
-- Dành cho nghiệp vụ: "Voucher của tôi", "Lưu voucher", và "Voucher riêng cho 1 khách hàng"
CREATE TABLE IF NOT EXISTS public.user_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, voucher_id) -- Mỗi khách hàng chỉ được lưu 1 mã duy nhất 1 lần để tránh lạm dụng
);

-- Bật bảo mật RLS cho ví Voucher
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_view_own_vouchers" ON public.user_vouchers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_vouchers" ON public.user_vouchers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_all_user_vouchers" ON public.user_vouchers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role)
);

-- BƯỚC 2: CẬP NHẬT THẺ THÀNH VIÊN & PROFILE (Dựa trên Số Lượng Hàng/Đơn)
-- Vì bạn muốn thăng hạng theo "số lượng hàng nhất định", ta cần thêm cột điều kiện
ALTER TABLE public.membership_levels ADD COLUMN IF NOT EXISTS min_orders INTEGER DEFAULT 0;

-- Cột lưu lại tổng số đơn người dùng đã mua thành công (để xét thăng hạng)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_orders_completed INTEGER DEFAULT 0;

-- BƯỚC 3: FUNCTION HỖ TRỢ NGƯỜI DÙNG THU THẬP VOUCHER
-- Khi người dùng ấn nút "Lưu / Thu thập" trên App, gọi RPC này để kiểm tra nghiêm ngặt tồn kho
CREATE OR REPLACE FUNCTION public.collect_voucher(p_voucher_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_usage_limit INT;
    v_used_count INT;
    v_is_active BOOLEAN;
    v_expired_at TIMESTAMP WITH TIME ZONE;
    v_my_uid UUID;
BEGIN
    v_my_uid := auth.uid();
    
    IF v_my_uid IS NULL THEN
        RAISE EXCEPTION 'Vui lòng đăng nhập để lưu voucher';
    END IF;

    -- Khóa Row để tranh giành (Race Condition)
    SELECT usage_limit, used_count, is_active, expired_at 
    INTO v_usage_limit, v_used_count, v_is_active, v_expired_at
    FROM public.vouchers
    WHERE id = p_voucher_id FOR UPDATE;

    -- Kiểm tra điều kiện
    IF NOT v_is_active THEN
        RAISE EXCEPTION 'Voucher này đã bị khóa hoặc không tồn tại';
    END IF;

    IF v_expired_at < NOW() THEN
        RAISE EXCEPTION 'Voucher đã hết hạn';
    END IF;

    IF (v_usage_limit IS NOT NULL) AND (v_used_count >= v_usage_limit) THEN
        RAISE EXCEPTION 'Voucher đã hết lượt thu thập';
    END IF;

    -- Lưu vào ví voucher 
    -- Nếu đã tồn tại sẽ bị quăng lỗi nhờ ràng buộc UNIQUE
    INSERT INTO public.user_vouchers (user_id, voucher_id)
    VALUES (v_my_uid, p_voucher_id);

    -- Tăng số lượng đã sử dụng (hoặc đã lưu) trong tổng số
    UPDATE public.vouchers SET used_count = used_count + 1 WHERE id = p_voucher_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
