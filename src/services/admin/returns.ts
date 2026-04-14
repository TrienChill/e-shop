import { supabase } from "@/src/lib/supabase";

export type AdminReturnRequest = {
  id: number;
  order_id: number;
  user_id: string;
  request_type: string;
  reason_category: string;
  reason: string;
  description: string | null;
  evidence_images: string[];
  refund_amount: number;
  refund_method: string;
  status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  approved: "Đã duyệt",
  shipping_back: "Đang trả hàng",
  completed: "Hoàn thành",
  refunded: "Đã hoàn tiền",
  rejected: "Bị từ chối",
  cancelled: "Đã hủy",
};

export const RETURN_STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#2563EB",
  shipping_back: "#8B5CF6",
  completed: "#10B981",
  refunded: "#059669",
  rejected: "#EF4444",
  cancelled: "#9CA3AF",
};

export async function listAllReturns(params?: { status?: string; limit?: number }) {
  let q = supabase
    .from("return_requests")
    .select(`
      *,
      return_items (
        *,
        products (name),
        order_items (price_at_purchase)
      ),
      profiles (full_name, phone)
    `)
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 50);

  if (params?.status && params.status !== "all") {
    q = q.eq("status", params.status);
  }

  const { data, error } = await q;
  if (error) throw error;

  const returns = data ?? [];
  if (returns.length === 0) return returns;

  const orderIds = returns.map((r: any) => r.order_id);
  const { data: ordersData } = await supabase
    .from("orders")
    .select("id, total_amount, receiver_name, phone_contact, status")
    .in("id", orderIds);

  const orderMap: Record<number, any> = {};
  (ordersData ?? []).forEach((o: any) => { orderMap[o.id] = o; });

  return returns.map((r: any) => ({
    ...r,
    orders: orderMap[r.order_id] || null,
  }));
}

export async function getAdminReturnDetail(returnId: number) {
  const { data, error } = await supabase
    .from("return_requests")
    .select(`
      *,
      return_items (*),
      profiles (full_name, phone, avatar_url)
    `)
    .eq("id", returnId)
    .single();

  if (error) throw error;
  if (!data) return null;

  const { data: orderData } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (*, products (name, images)),
      user_addresses (*)
    `)
    .eq("id", data.order_id)
    .single();

  return { ...data, orders: orderData };
}

export async function approveReturn(returnId: number, adminId: string, notes?: string) {
  const { error } = await supabase.rpc("approve_return", {
    p_return_id: returnId,
    p_admin_id: adminId,
    p_admin_notes: notes || null,
  });
  if (error) throw error;
  return true;
}

export async function rejectReturn(returnId: number, adminId: string, reason: string) {
  const { error } = await supabase.rpc("reject_return", {
    p_return_id: returnId,
    p_admin_id: adminId,
    p_rejection_reason: reason,
  });
  if (error) throw error;
  return true;
}

export async function markShippingBack(returnId: number, adminId: string) {
  const { error } = await supabase.rpc("mark_shipping_back", {
    p_return_id: returnId,
    p_admin_id: adminId,
  });

  if (error) throw error;

  await supabase
    .from("orders")
    .update({ status: "returning", returning_at: new Date().toISOString() })
    .eq("active_return_id", returnId);

  return true;
}

export async function completeReturn(returnId: number, adminId?: string) {
  const { error } = await supabase.rpc("complete_return", {
    p_return_id: returnId,
    p_admin_id: adminId || null,
  });
  if (error) throw error;
  return true;
}

export async function processRefund(returnId: number, adminId: string) {
  const { error } = await supabase.rpc("process_refund", {
    p_return_id: returnId,
    p_admin_id: adminId,
  });
  if (error) throw error;
  return true;
}
