// src/services/product.ts

import { supabase } from "../lib/supabase";

// Lấy top 10 sản phẩm bán chạy trong 30 ngày qua

export const getTopSellingProducts = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `
      product_id,
      quantity,
      orders!inner(status, created_at),
      products:product_id(*)
    `,
    )
    .eq("orders.status", "completed") // Chỉ tính đơn hàng thành công
    .gte("orders.created_at", thirtyDaysAgo.toISOString());

  if (error) throw error;

  // Group và tính tổng số lượng theo product_id
  const productSales = data.reduce((acc: any, item: any) => {
    const id = item.product_id;
    if (!acc[id]) {
      acc[id] = { ...item.products, total_sold: 0 };
    }
    acc[id].total_sold += item.quantity;
    return acc;
  }, {});

  // Chuyển thành mảng, sắp xếp giảm dần và lấy 10 cái đầu tiên
  return Object.values(productSales)
    .sort((a: any, b: any) => b.total_sold - a.total_sold)
    .slice(0, 10);
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
