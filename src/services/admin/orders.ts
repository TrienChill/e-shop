import { supabase } from "@/src/lib/supabase";

export type AdminOrder = {
  id: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  user_id?: string;
};

export async function listOrders(params?: {
  limit?: number;
  status?: string;
}) {
  const limit = params?.limit ?? 50;

  let q = supabase
    .from("orders")
    .select("id,status,total_amount,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params?.status) q = q.eq("status", params.status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AdminOrder[];
}

