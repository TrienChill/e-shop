import { supabase } from "@/src/lib/supabase";

export type RevenueSummary = {
  total_revenue: number;
  orders_count: number;
};

export type RevenueReportRow = {
  date_str: string;
  daily_revenue: number;
  orders_count: number;
};

export type RevenueReportResult = {
  summary: RevenueSummary;
  chartData: RevenueReportRow[];
};

/** Legacy: used by old revenue.tsx (still kept for compatibility) */
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
 * Gọi RPC get_revenue_report(p_start_date, p_end_date) từ Supabase.
 * Trả về mảng dữ liệu theo ngày (date_str, daily_revenue, orders_count).
 */
export async function getRevenueReport(
  startDate: Date,
  endDate: Date
): Promise<RevenueReportRow[]> {
  const { data, error } = await supabase.rpc("get_revenue_report", {
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
  });

  if (error) throw error;

  if (!data || !Array.isArray(data)) return [];

  return data.map((r: any) => ({
    date_str: r.date_str ?? "",
    daily_revenue: Number(r.daily_revenue ?? 0),
    orders_count: Number(r.orders_count ?? 0),
  }));
}
