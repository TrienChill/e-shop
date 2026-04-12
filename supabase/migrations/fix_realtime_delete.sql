-- ==========================================================================
-- FIX: Bật REPLICA IDENTITY FULL để Supabase Realtime có thể gửi
-- kèm dữ liệu `old` trong sự kiện DELETE.
--
-- Mặc định PostgreSQL chỉ gửi PRIMARY KEY trong `old` khi DELETE.
-- Nếu bảng dùng UUID hoặc ID ở dạng số nguyên thì `old.id` vẫn
-- có giá trị và fix này là đủ -- nhưng nếu bạn muốn toàn bộ
-- các cột trong `old` thì cần FULL như dưới.
-- ==========================================================================

-- Bật REPLICA IDENTITY FULL cho bảng products
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- Bật cho product_variants (nếu cần theo dõi variant bị xoá)
ALTER TABLE public.product_variants REPLICA IDENTITY FULL;

-- Đảm bảo bảng đã được enable trên Supabase Realtime publication
-- (Thường đã làm khi bật Realtime trong Dashboard, nhưng thêm cho chắc)
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
