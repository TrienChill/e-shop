import { supabase } from "../lib/supabase";

export interface Banner {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  action_type: "product" | "category" | "external_url" | "none" | "campaign";
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
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;

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

/**
 * [ADMIN] Lấy tất cả danh sách Banner (Bao gồm chưa kích hoạt / hết hạn)
 */
export const getAllBanners = async (): Promise<Banner[]> => {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data as Banner[];
};

/**
 * Xóa ảnh trên Supabase Storage
 */
export const deleteBannerImage = async (imageUrl: string) => {
  if (!imageUrl || !imageUrl.includes("storage/v1/object/public/images/")) return;
  try {
    // URL format: .../images/banners/banner_123.jpg
    const filename = imageUrl.split("images/").pop();
    if (filename) {
      const { error } = await supabase.storage.from("images").remove([filename]);
      if (error) console.error("Lỗi xóa ảnh cũ:", error);
    }
  } catch (err) {
    console.error("Lỗi xóa ảnh cũ:", err);
  }
};

/**
 * Khởi tạo/Tạo mới Banner
 */
export const createBanner = async (data: Partial<Banner>) => {
  const { error } = await supabase
    .from("banners")
    .insert([data]);

  if (error) throw error;
};

/**
 * Cập nhật Banner hiện tại
 */
export const updateBanner = async (id: string, data: Partial<Banner>, oldImageUrl?: string) => {
  // Nếu có oldImageUrl và có data.image_url mới khác ảnh cũ thì xóa ảnh cũ
  if (oldImageUrl && data.image_url && oldImageUrl !== data.image_url) {
    await deleteBannerImage(oldImageUrl);
  }

  const { error } = await supabase
    .from("banners")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

/**
 * Xóa hoàn toàn Banner và file ảnh
 */
export const deleteBanner = async (id: string, imageUrl: string) => {
  // Xóa ảnh vật lý
  await deleteBannerImage(imageUrl);

  // Xóa database
  const { error } = await supabase
    .from("banners")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
