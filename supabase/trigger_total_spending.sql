-- =====================================================
-- TRIGGER: Tự động cập nhật total_spending trong profiles
-- Khi: order items thay đổi HOẶC order status = 'completed'
-- =====================================================

-- Xóa trigger cũ nếu tồn tại
DROP TRIGGER IF EXISTS on_order_completed ON orders;
DROP TRIGGER IF EXISTS on_order_items_change ON order_items;
DROP FUNCTION IF EXISTS update_user_total_spending();

-- =====================================================
-- FUNCTION: Tính lại total_spending cho user
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_total_spending()
RETURNS TRIGGER AS $$
DECLARE
  affected_user_id UUID;
  new_total_spending NUMERIC;
  new_membership_id UUID;
BEGIN
  -- Xác định user_id bị ảnh hưởng
  IF TG_TABLE_NAME = 'orders' THEN
    -- Với bảng orders: lấy user_id từ NEW (INSERT/UPDATE) hoặc OLD (DELETE)
    IF TG_OP = 'DELETE' THEN
      affected_user_id := OLD.user_id;
    ELSE
      affected_user_id := NEW.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'order_items' THEN
    -- Với bảng order_items: lấy user_id từ order liên quan
    SELECT o.user_id INTO affected_user_id
    FROM orders o
    WHERE o.id = COALESCE(NEW.order_id, OLD.order_id)
    LIMIT 1;

    -- Nếu không tìm thấy order (có thể đã bị xóa), thoát
    IF affected_user_id IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Tính tổng chi tiêu từ TẤT CẢ completed orders của user
  SELECT COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)
  INTO new_total_spending
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.user_id = affected_user_id
    AND o.status = 'completed';

  -- Tìm hạng membership phù hợp dựa trên total_spending
  SELECT id INTO new_membership_id
  FROM membership_levels
  WHERE min_spending <= new_total_spending
  ORDER BY min_spending DESC
  LIMIT 1;

  -- Nếu không có hạng nào phù hợp, set về hạng mặc định (min_spending = 0)
  IF new_membership_id IS NULL THEN
    SELECT id INTO new_membership_id
    FROM membership_levels 
    WHERE min_spending = 0 
    LIMIT 1;
  END IF;

  -- Cập nhật cả total_spending VÀ membership_level_id
  UPDATE profiles
  SET total_spending = new_total_spending,
      membership_level_id = new_membership_id,
      updated_at = NOW()
  WHERE id = affected_user_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER 1: Khi order thay đổi (INSERT/UPDATE/DELETE)
-- Chạy function update_user_total_spending
-- =====================================================
CREATE TRIGGER on_order_change
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_user_total_spending();

-- =====================================================
-- TRIGGER 2: Khi order_items thay đổi (INSERT/UPDATE/DELETE)
-- Chạy function update_user_total_spending
-- =====================================================
CREATE TRIGGER on_order_items_change
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_user_total_spending();

-- =====================================================
-- Grant quyền (nếu cần)
-- =====================================================
GRANT EXECUTE ON FUNCTION update_user_total_spending() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_total_spending() TO service_role;

-- =====================================================
-- TEST: (chạy sau khi đã có dữ liệu)
-- =====================================================
/*
-- Kiểm tra trigger hoạt động:
-- 1. Tạo order mới với status = 'completed'
INSERT INTO orders (id, user_id, status, created_at)
VALUES ('test-order-1', 'user-id-here', 'completed', NOW());

-- 2. Tạo order_items cho order đó
INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
VALUES ('test-order-1', 'product-id', 2, 100000);

-- 3. Kiểm tra profiles.total_spending của user:
SELECT total_spending FROM profiles WHERE id = 'user-id-here';
-- → Phải = 200000

-- 4. Xóa order_items: total_spending phải = 0
DELETE FROM order_items WHERE order_id = 'test-order-1';
SELECT total_spending FROM profiles WHERE id = 'user-id-here';
-- → Phải = 0
*/
