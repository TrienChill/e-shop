import { supabase, supabaseAdmin } from "../../lib/supabase";

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

export async function createStaffAccount(data: { email: string; password: string; full_name: string; role: string }) {
  if (!supabaseAdmin) {
    throw new Error('Chưa cấu hình Service Role Key (EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).');
  }

  // 1. Tạo user trong auth.users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name,
    }
  });

  if (authError) throw authError;

  // 2. Chờ trigger tạo profile tự động (nếu có), hoặc update profile
  // Thông thường supabase sẽ có trigger. Ở đây ta chủ động cập nhật vai trò và tên.
  if (authData.user) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        role: data.role,
      })
      .eq("id", authData.user.id);
      
    if (profileError) {
      console.warn("Lỗi update profile sau khi tạo user:", profileError.message);
    }
  }

  return authData.user;
}

export async function toggleLockUser(userId: string, isLocked: boolean) {
  if (!supabaseAdmin) {
    throw new Error('Chưa cấu hình Service Role Key.');
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: isLocked ? '876000h' : 'none'
  });

  if (error) throw error;
}
