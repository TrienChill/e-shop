import { supabase } from "@/src/lib/supabase";

export type ReturnRequest = {
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
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
};

export type ReturnItem = {
  id: number;
  return_request_id: number;
  order_item_id: number;
  product_id: number;
  quantity: number;
  refund_amount: number;
  condition_status: string;
};

export const RETURN_REASON_OPTIONS = [
  { value: "wrong_size", label: "Sai kích cỡ" },
  { value: "wrong_color", label: "Sai màu sắc" },
  { value: "defective", label: "Lỗi sản phẩm" },
  { value: "damaged", label: "Hư hỏng khi vận chuyển" },
  { value: "not_as_described", label: "Khác mô tả" },
  { value: "changed_mind", label: "Đổi ý" },
  { value: "other", label: "Lý do khác" },
] as const;

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

export async function getMyReturns(userId: string) {
  const { data, error } = await supabase
    .from("return_requests")
    .select(`
      *,
      return_items (
        *,
        products (name, images),
        order_items (price_at_purchase, selected_variant)
      ),
      orders (
        id,
        total_amount,
        created_at
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getReturnDetail(returnId: number) {
  const { data, error } = await supabase
    .from("return_requests")
    .select(`
      *,
      return_items (
        *,
        products (name, images),
        order_items (price_at_purchase, selected_variant, quantity)
      ),
      orders (
        *,
        order_items (*),
        user_addresses (
          receiver_name,
          phone_number,
          province_city,
          district,
          ward_commune,
          street_address
        )
      )
    `)
    .eq("id", returnId)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrderForReturn(orderId: number, userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        products (name, images, variants),
        reviews (id, rating)
      ),
      return_requests (id, status)
    `)
    .eq("id", orderId)
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function createReturnRequest(params: {
  orderId: number;
  userId: string;
  requestType: string;
  reasonCategory: string;
  reason: string;
  description?: string;
  evidenceImages?: string[];
  refundMethod?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  items: Array<{
    orderItemId: number;
    productId: number;
    quantity: number;
    refundAmount: number;
    reason?: string;
  }>;
}) {
  const { data, error } = await supabase.rpc("create_return_request", {
    p_order_id: params.orderId,
    p_user_id: params.userId,
    p_request_type: params.requestType || "return",
    p_reason_category: params.reasonCategory,
    p_reason: params.reason,
    p_description: params.description || null,
    p_evidence_images: params.evidenceImages || [],
    p_refund_method: params.refundMethod || "original",
    p_bank_account_name: params.bankAccountName || null,
    p_bank_account_number: params.bankAccountNumber || null,
    p_bank_name: params.bankName || null,
    p_items: JSON.stringify(
      params.items.map((item) => ({
        order_item_id: item.orderItemId,
        product_id: item.productId,
        quantity: item.quantity,
        refund_amount: item.refundAmount,
        reason: item.reason || "",
      }))
    ),
  });

  if (error) throw error;
  return data;
}

export async function cancelReturn(returnId: number, userId: string) {
  const { error } = await supabase.rpc("cancel_return", {
    p_return_id: returnId,
    p_user_id: userId,
  });

  if (error) throw error;
  return true;
}
