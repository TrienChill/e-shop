import { supabase } from "@/src/lib/supabase";

// ─── Legacy type (kept for backward compat) ───────────────────────────────────
export type RevenueSummary = {
  total_revenue: number;
  orders_count: number;
};

// ─── New types matching get_revenue_report RPC ────────────────────────────────
export type TrendDataItem = {
  date: string;    // "DD/MM" format as returned by the RPC
  amount: number;
  orders?: number; // Added to support order count in trends
};

export type TopProductItem = {
  name: string;
  revenue: number;
};

export type PaymentMethodItem = {
  method: string;
  count: number;
  amount: number;
};

export type HeatmapItem = [number, number, number];

export type RevenueReport = {
  revenue_in: number;
  revenue_out: number;
  profit: number;
  trend_data: TrendDataItem[];
  top_products: TopProductItem[];
  payment_methods: PaymentMethodItem[];
  heatmap: HeatmapItem[];
};

// ─── Legacy function (kept for backward compat) ───────────────────────────────
export async function getRevenueSummary(params: {
  from: string;
  to: string;
}): Promise<RevenueSummary> {
  const { data, error } = await supabase.rpc("get_revenue_summary", {
    p_from: params.from,
    p_to: params.to,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_revenue: Number(row?.total_revenue ?? 0),
    orders_count: Number(row?.orders_count ?? 0),
  };
}

/**
 * Gọi RPC get_revenue_report(p_start_date, p_end_date).
 * RPC trả về RETURNS json (object đơn) chứa:
 *   revenue_in, revenue_out, profit, trend_data, top_products
 */
export async function getRevenueReport(
  startDate: Date,
  endDate: Date
): Promise<RevenueReport> {
  const { data, error } = await supabase.rpc("get_revenue_report", {
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
  });

  if (error) throw error;

  // Supabase may wrap RETURNS json in an array — handle both cases
  const result = Array.isArray(data) ? data[0] : data;

  return {
    revenue_in:   Number(result?.revenue_in  ?? 0),
    revenue_out:  Number(result?.revenue_out ?? 0),
    profit:       Number(result?.profit      ?? 0),
    trend_data:   Array.isArray(result?.trend_data)   ? result.trend_data   : [],
    top_products: Array.isArray(result?.top_products) ? result.top_products : [],
    payment_methods: Array.isArray(result?.payment_methods) ? result.payment_methods : [],
    heatmap:      Array.isArray(result?.heatmap)      ? result.heatmap      : [],
  };
}

// ─── AI Report types & CRUD ───────────────────────────────────────────────────

export interface AiReport {
  id: string;
  admin_id: string;
  title: string;
  period: string;
  content: string;
  kpis: {
    revenueIn: number;
    revenueOut: number;
    totalOrders: number;
    aovValue: number;
  };
  created_at: string;
}

/** Tải tối đa 5 báo cáo AI gần nhất của admin */
export async function fetchAiReports(): Promise<AiReport[]> {
  const { data, error } = await supabase
    .from("ai_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as AiReport[];
}

/** Lưu một báo cáo AI mới (tự động xóa báo cáo cũ nhất nếu đã đủ 5) */
export async function saveAiReport(
  payload: Omit<AiReport, "id" | "admin_id" | "created_at">
): Promise<AiReport> {
  // Lấy user hiện tại để truyền admin_id vào insert (bắt buộc cho RLS)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Chưa đăng nhập.");

  const admin_id = user.id;

  // Đếm báo cáo hiện tại của admin này
  const { count } = await supabase
    .from("ai_reports")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", admin_id);

  if ((count ?? 0) >= 5) {
    // Xóa báo cáo cũ nhất của admin này để nhường chỗ
    const { data: oldest } = await supabase
      .from("ai_reports")
      .select("id")
      .eq("admin_id", admin_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (oldest) {
      await supabase.from("ai_reports").delete().eq("id", oldest.id);
    }
  }

  const { data, error } = await supabase
    .from("ai_reports")
    .insert([{ ...payload, admin_id }])
    .select()
    .single();
  if (error) throw error;
  return data as AiReport;
}

/** Xóa một báo cáo AI theo id */
export async function deleteAiReport(id: string): Promise<void> {
  const { error } = await supabase.from("ai_reports").delete().eq("id", id);
  if (error) throw error;
}

