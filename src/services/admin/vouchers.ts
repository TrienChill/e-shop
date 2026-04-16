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

export async function createVoucher(data: Partial<VoucherRow>, productIds?: number[]) {
  const { error, data: insertedVoucher } = await supabase
    .from("vouchers")
    .insert([data])
    .select("id")
    .single();
    
  if (error) throw error;
  
  if (data.voucher_type === "shop" && productIds && productIds.length > 0) {
    const discounts = productIds.map(id => ({
      product_id: id,
      discount_type: data.discount_type || "percentage",
      discount_value: data.discount_value || 0,
      start_date: data.start_date,
      end_date: data.expired_at,
      is_active: data.is_active ?? true
    }));
    const { error: pdError } = await supabase.from("product_discounts").insert(discounts);
    if (pdError) {
      console.error("Failed to append discount to products", pdError);
    }
  }
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
  // Try to delete cascade, assume supabase will handle it if FK cascade is present.
  // If not, we manually delete dependencies.
  await supabase.from("order_vouchers").delete().eq("voucher_id", id);
  await supabase.from("user_vouchers").delete().eq("voucher_id", id);
  
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
