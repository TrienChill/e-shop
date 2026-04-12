import { supabase } from "@/src/lib/supabase";

export interface AdminReview {
  id: string;
  rating: number;
  comment: string;
  admin_reply: string | null;
  images: string[] | null;
  is_visible: boolean;
  created_at: string;
  product_id: number;
  user_id: string;
  // Joins
  product: {
    id: number;
    name: string;
    images?: string[];
  };
  profile: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

interface FetchReviewsParams {
  rating?: number | null;
  isVisible?: boolean | null;
  page: number;
  limit?: number;
}

/**
 * Lấy danh sách đánh giá kèm thông tin sản phẩm và người dùng (Phân trang)
 */
export const fetchAdminReviews = async ({
  rating,
  isVisible,
  page,
  limit = 10,
}: FetchReviewsParams): Promise<{ data: AdminReview[]; count: number }> => {
  try {
    let query = supabase
      .from("reviews")
      .select(
        `
        id,
        rating,
        comment,
        images,
        admin_reply,
        is_visible,
        created_at,
        product_id,
        user_id,
        product:products!product_id(id, name, images),
        profile:profiles!user_id(id, full_name, avatar_url)
      `,
        { count: "exact" }
      );

    // Bộ lọc
    if (rating) query = query.eq("rating", rating);
    if (isVisible !== undefined && isVisible !== null) {
      query = query.eq("is_visible", isVisible);
    }

    // Sắp xếp & Phân trang
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    // Supabase có thể trả array cho relations nếu cấu hình 1-n, ta map lại cho chuẩn
    const mappedData = (data as any[]).map((row) => ({
      ...row,
      product: Array.isArray(row.product) ? row.product[0] : row.product,
      profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
    })) as AdminReview[];

    return { data: mappedData, count: count || 0 };
  } catch (error) {
    console.error("Lỗi fetchAdminReviews:", error);
    throw error;
  }
};

/**
 * Bật/tắt trạng thái hiển thị của một đánh giá (Kiểm duyệt)
 */
export const toggleReviewVisibility = async (id: string, currentStatus: boolean): Promise<void> => {
  try {
    const { error } = await supabase
      .from("reviews")
      .update({ is_visible: !currentStatus })
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error("Lỗi toggleReviewVisibility:", error);
    throw error;
  }
};

/**
 * Admin trả lời đánh giá
 */
export const replyToReview = async (id: string, replyContent: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("reviews")
      .update({ admin_reply: replyContent })
      .eq("id", id);
      
    if (error) throw error;
  } catch (error) {
    console.error("Lỗi replyToReview:", error);
    throw error;
  }
};
