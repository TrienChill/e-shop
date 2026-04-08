import { supabase } from "../../lib/supabase";

export async function listAdminProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      product_variants (*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertProduct(product: any) {
  const { data, error } = await supabase
    .from("products")
    .upsert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertVariant(variant: any) {
  const { data, error } = await supabase
    .from("product_variants")
    .upsert(variant)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVariant(id: string) {
  const { error } = await supabase.from("product_variants").delete().eq("id", id);
  if (error) throw error;
}
