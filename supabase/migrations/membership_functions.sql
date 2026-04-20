-- =====================================================
-- Function: Auto-update membership level based on spending
-- Trigger: Runs after INSERT or UPDATE on orders table
-- =====================================================

-- Function để cập nhật membership_level_id dựa trên total_spending
CREATE OR REPLACE FUNCTION update_membership_level()
RETURNS TRIGGER AS $$
DECLARE
  new_membership_id UUID;
  current_spending NUMERIC;
  target_level RECORD;
BEGIN
  -- Lấy total_spending của user từ profiles
  SELECT total_spending INTO current_spending
  FROM profiles
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Tìm hạng cao nhất mà user đủ điều kiện
  SELECT id INTO new_membership_id
  FROM membership_levels
  WHERE min_spending <= current_spending
  ORDER BY min_spending DESC
  LIMIT 1;

  -- Nếu không có hạng nào phù hợp, set NULL
  IF new_membership_id IS NULL THEN
    new_membership_id := (
      SELECT id FROM membership_levels 
      WHERE min_spending = 0 
      LIMIT 1
    );
  END IF;

  -- Cập nhật membership_level_id trong profiles
  UPDATE profiles
  SET membership_level_id = new_membership_id,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Recalculate membership for all users
-- Usage: Gọi khi thay đổi cấu hình membership_levels
-- =====================================================
CREATE OR REPLACE FUNCTION recalculate_all_membership_levels()
RETURNS void AS $$
BEGIN
  UPDATE profiles p
  SET membership_level_id = (
    SELECT ml.id
    FROM membership_levels ml
    WHERE ml.min_spending <= p.total_spending
    ORDER BY ml.min_spending DESC
    LIMIT 1
  ),
  updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RPC Function: Get membership statistics
-- =====================================================
CREATE OR REPLACE FUNCTION get_membership_stats()
RETURNS TABLE (
  level_id UUID,
  level_name TEXT,
  member_count BIGINT,
  total_spending_sum NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ml.id AS level_id,
    ml.level_name,
    COUNT(p.id)::BIGINT AS member_count,
    COALESCE(SUM(p.total_spending), 0) AS total_spending_sum
  FROM membership_levels ml
  LEFT JOIN profiles p ON p.membership_level_id = ml.id
  GROUP BY ml.id, ml.level_name, ml.min_spending
  ORDER BY ml.min_spending ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RPC Function: Get user's next tier info
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_next_tier(p_user_id UUID)
RETURNS TABLE (
  next_level_id UUID,
  next_level_name TEXT,
  min_spending_required NUMERIC,
  current_spending NUMERIC,
  spending_remaining NUMERIC,
  progress_percentage NUMERIC
) AS $$
DECLARE
  v_current_level_min NUMERIC;
  v_total_spending NUMERIC;
BEGIN
  -- Lấy thông tin hiện tại của user
  SELECT 
    COALESCE(ml.min_spending, 0),
    p.total_spending
  INTO v_current_level_min, v_total_spending
  FROM profiles p
  LEFT JOIN membership_levels ml ON ml.id = p.membership_level_id
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT 
    ml.id AS next_level_id,
    ml.level_name AS next_level_name,
    ml.min_spending AS min_spending_required,
    v_total_spending AS current_spending,
    GREATEST(0, ml.min_spending - v_total_spending) AS spending_remaining,
    CASE 
      WHEN ml.min_spending > v_current_level_min THEN
        LEAST(100, ((v_total_spending - v_current_level_min)::NUMERIC / (ml.min_spending - v_current_level_min)::NUMERIC * 100))
      ELSE 100
    END AS progress_percentage
  FROM membership_levels ml
  WHERE ml.min_spending > v_current_level_min
  ORDER BY ml.min_spending ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Utility: Validate min_spending order
-- Ensure higher tiers have higher min_spending
-- =====================================================
CREATE OR REPLACE FUNCTION validate_membership_tiers()
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  prev_spending NUMERIC := -1;
  invalid_level RECORD;
BEGIN
  FOR invalid_level IN 
    SELECT level_name, min_spending 
    FROM membership_levels 
    ORDER BY min_spending ASC
  LOOP
    IF invalid_level.min_spending < prev_spending THEN
      is_valid := FALSE;
      error_message := 'Hạng "' || invalid_level.level_name || '" có min_spending nhỏ hơn hạng trước đó';
      RETURN NEXT;
      RETURN;
    END IF;
    prev_spending := invalid_level.min_spending;
  END LOOP;
  
  is_valid := TRUE;
  error_message := NULL;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
