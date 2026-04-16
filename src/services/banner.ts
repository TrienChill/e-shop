import { supabase } from "../lib/supabase";

export interface Banner {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  action_type: "product" | "category" | "collection" | "external_url" | "none";
  action_value?: string;
  display_order: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lấy danh sách banner đang hoạt động và sắp xếp theo thứ tự hiển thị
 */
export const getActiveBanners = async (): Promise<Banner[]> => {
  try {
    // Chỉ filter is_active=true trên DB, tránh dùng .or() với timestamp dạng ISO
    // vì ký tự đặc biệt trong URL gây lỗi 502 từ CDN/proxy
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;

    // Lọc theo ngày tháng trong JavaScript để tránh URL encoding issues
    const now = new Date();
    const filtered = (data || []).filter((banner) => {
      const afterStart = !banner.start_date || new Date(banner.start_date) <= now;
      const beforeEnd = !banner.end_date || new Date(banner.end_date) >= now;
      return afterStart && beforeEnd;
    });

    return filtered;
  } catch (error) {
    console.error("Lỗi lấy danh sách banner:", error);
    return [];
  }
};
