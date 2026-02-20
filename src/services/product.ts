// src/services/product.ts

import { supabase } from "../lib/supabase";

// Lấy top 10 sản phẩm bán chạy trong 30 ngày qua

export const getTopSellingProducts = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Lấy dữ liệu bán hàng từ order_items
    const { data: salesData, error: salesError } = await supabase
      .from("order_items")
      .select(
        `
        product_id,
        quantity,
        orders!inner(status, created_at)
      `,
      )
      .eq("orders.status", "completed")
      .gte("orders.created_at", thirtyDaysAgo.toISOString());

    if (salesError) throw salesError;

    // 2. Lấy tất cả sản phẩm (để làm fallback nếu không có lượt bán)
    const { data: allProducts, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true);

    if (productsError) throw productsError;

    // 3. Tính toán tổng số lượng bán (Sales Map)
    const salesMap: Record<string, number> = {};
    salesData?.forEach((item: any) => {
      salesMap[item.product_id] =
        (salesMap[item.product_id] || 0) + item.quantity;
    });

    // 4. Kết hợp dữ liệu: Gán total_sold vào danh sách sản phẩm
    const processedProducts = allProducts.map((product: any) => ({
      ...product,
      total_sold: salesMap[product.id] || 0,
    }));

    // 5. Sắp xếp:
    // - Ưu tiên sản phẩm có lượt bán (total_sold giảm dần)
    // - Nếu lượt bán bằng nhau (đều là 0), sắp xếp theo ngày tạo (mới nhất lên đầu)
    const sortedProducts = processedProducts.sort((a, b) => {
      if (b.total_sold !== a.total_sold) {
        return b.total_sold - a.total_sold;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // Trả về 10 sản phẩm đầu tiên
    return sortedProducts.slice(0, 10);
  } catch (error) {
    console.error("Lỗi lấy sản phẩm bán chạy:", error);
    return [];
  }
};

// Lấy 10 sản phẩm mới nhất

export const getLatestProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false }) // Mới nhất lên đầu
    .limit(10);

  if (error) {
    console.error("Lỗi lấy sản phẩm mới:", error);
    return [];
  }
  return data;
};

// Lấy 10 sản phẩm nổi tiếng nhất (dựa trên số lượt xem, đánh giá và bán hàng)

// src/services/product.ts

export const getMostPopularProducts = async () => {
  const { data, error } = await supabase.rpc("get_most_popular_products");

  if (error) {
    console.error("Lỗi fetch sản phẩm phổ biến:", error);
    return [];
  }
  return data;
};
