import { supabase } from "@/src/lib/supabase";

export type VoucherRow = {
  id: string;
  code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  voucher_type: string | null;
  is_active: boolean | null;
  start_date: string | null;
  expired_at: string | null;
  usage_limit: number | null;
  min_order_value: number | null;
  max_discount: number | null;
  conditions: any | null; // For holding "product_ids"
  created_at?: string;
  order_vouchers?: { count: number }[];
};

export type UserVoucherRow = {
  id?: string;
  user_id: string;
  voucher_id: string;
  is_used?: boolean;
  used_at?: string | null;
};

export type ProductDiscountRow = {
  id?: string;
  product_id: number;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active?: boolean;
};

export async function listAllVouchers(): Promise<VoucherRow[]> {
  const { data, error } = await supabase
    .from("vouchers")
    .select("*, order_vouchers(count)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as VoucherRow[];
}

export async function createVoucher(data: Partial<VoucherRow>) {
  const { error, data: insertedVoucher } = await supabase
    .from("vouchers")
    .insert([data])
    .select("id")
    .single();
    
  if (error) throw error;
}

export async function updateVoucher(id: string, data: Partial<VoucherRow>) {
  const { error } = await supabase
    .from("vouchers")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function setVoucherActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from("vouchers")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteVoucher(id: string) {
  // 1. Gỡ liên kết voucher khỏi bảng orders để tránh lỗi Foreign Key (nếu có)
  // Chúng ta set null thay vì xóa orders để giữ lại lịch sử đơn hàng
  try {
    await supabase.from("orders").update({ platform_voucher_id: null }).eq("platform_voucher_id", id);
  } catch (e) {
    console.error("Lỗi khi gỡ liên kết đơn hàng:", e);
  }

  // 2. Xóa dữ liệu ở các bảng liên quan (log và ví người dùng)
  await supabase.from("order_vouchers").delete().eq("voucher_id", id);
  await supabase.from("user_vouchers").delete().eq("voucher_id", id);
  
  // 3. Cuối cùng mới xóa voucher chính
  const { error } = await supabase.from("vouchers").delete().eq("id", id);
  if (error) throw error;
}

export async function distributeVoucherToUsers(voucherId: string, userIds: string[]) {
  const payload = userIds.map((userId) => ({
    voucher_id: voucherId,
    user_id: userId,
    is_used: false,
  }));
  const { error } = await supabase.from("user_vouchers").insert(payload);
  if (error) throw error;
}

// ==========================================
// API Cho bảng product_discounts (Tab 2)
// ==========================================
export async function listAllProductDiscounts(): Promise<ProductDiscountRow[]> {
  const { data, error } = await supabase
    .from("product_discounts")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProductDiscountRow[];
}

export async function createProductDiscount(data: Partial<ProductDiscountRow>) {
  const { error } = await supabase
    .from("product_discounts")
    .insert([data]);
  
  if (error) throw error;
}

export async function updateProductDiscount(id: string, data: Partial<ProductDiscountRow>) {
  const { error } = await supabase
    .from("product_discounts")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProductDiscount(id: string) {
  const { error } = await supabase.from("product_discounts").delete().eq("id", id);
  if (error) throw error;
}

export async function setProductDiscountActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from("product_discounts")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}
