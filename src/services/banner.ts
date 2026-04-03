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
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Lỗi lấy danh sách banner:", error);
    return [];
  }
};
