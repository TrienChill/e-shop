import { supabase } from "@/src/lib/supabase";

export type RevenueSummary = {
  total_revenue: number;
  orders_count: number;
};

export async function getRevenueSummary(params: {
  from: string;
  to: string;
}): Promise<RevenueSummary> {
  const { data, error } = await supabase.rpc("get_revenue_summary", {
    p_from: params.from,
    p_to: params.to,
  });

  if (error) throw error;

  // PostgREST returns an array for set-returning functions.
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_revenue: Number(row?.total_revenue ?? 0),
    orders_count: Number(row?.orders_count ?? 0),
  };
}

