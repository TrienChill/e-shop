-- ============================================================
-- Migration 13: Tạo bảng lưu báo cáo AI
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  period      text NOT NULL,
  content     text NOT NULL,
  kpis        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index để truy vấn nhanh theo admin
CREATE INDEX IF NOT EXISTS ai_reports_admin_id_idx ON ai_reports(admin_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- Admin chỉ xem/thêm/xóa báo cáo của mình
CREATE POLICY "Admin manages own reports"
  ON ai_reports
  FOR ALL
  USING  (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

-- ============================================================
-- Function: get_admin_ai_reports
-- Trả về tối đa 5 báo cáo gần nhất của admin đang đăng nhập
-- ============================================================
CREATE OR REPLACE FUNCTION get_admin_ai_reports()
RETURNS SETOF ai_reports
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM ai_reports
  WHERE admin_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 5;
$$;
