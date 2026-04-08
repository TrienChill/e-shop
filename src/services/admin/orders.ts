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
    .select(`
      id,
      status,
      total_amount,
      created_at,
      user_id,
      receiver_name,
      phone_contact
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params?.status) q = q.eq("status", params.status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getOrderDetails(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        products (name, images)
      ),
      profiles (*)
    `)
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({ 
      status,
      // Có thể cập nhật thời gian hoàn thành nếu status chuyển sang completed
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      ...(status === 'shipping' ? { shipping_at: new Date().toISOString() } : {}),
      ...(status === 'processing' ? { processing_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);

  if (error) throw error;
}


