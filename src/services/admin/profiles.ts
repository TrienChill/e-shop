import { supabase } from "../../lib/supabase";

export async function listProfiles(params?: { search?: string; role?: string }) {
  let q = supabase.from("profiles").select("*").order("created_at", { ascending: false });

  if (params?.role) q = q.eq("role", params.role);
  if (params?.search) q = q.ilike("full_name", `%${params.search}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function updateUserRole(userId: string, role: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw error;
}
