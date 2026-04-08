import { supabase } from "@/src/lib/supabase";

export type VoucherRow = {
  id: string;
  code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  voucher_type: string | null;
  is_active: boolean | null;
  expired_at: string | null;
  created_at?: string;
};

export async function listAllVouchers() {
  const { data, error } = await supabase
    .from("vouchers")
    .select(
      "id,code,discount_type,discount_value,voucher_type,is_active,expired_at,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as VoucherRow[];
}

export async function setVoucherActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from("vouchers")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

