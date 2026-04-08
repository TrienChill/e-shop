import { supabase } from "@/src/lib/supabase";

export interface AdminStats {
  totalRevenue: number;
  newOrdersToday: number;
  totalCustomers: number;
  lowStockCount: number;
}

export interface ChartData {
  day: string;
  revenue: number;
}

export interface TopProduct {
  id: string;
  name: string;
  total_sold: number;
  revenue: number;
}

/**
 * Lấy toàn bộ thống kê tổng quan cho Dashboard
 */
export async function getAdminDashboardStats(): Promise<AdminStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const [revenueRes, ordersRes, customersRes, stockRes] = await Promise.all([
      supabase.from("orders").select("total_amount").eq("status", "completed"),
      supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }).lt("stock", 10).eq("is_active", true),
    ]);

    if (revenueRes.error) console.error("Lỗi query revenue:", revenueRes.error);
    if (ordersRes.error) console.error("Lỗi query new orders:", ordersRes.error);
    if (customersRes.error) console.error("Lỗi query customers:", customersRes.error);
    if (stockRes.error) console.error("Lỗi query stock:", stockRes.error);

    // Một số bảng có thể chưa bật RLS hoặc chưa được tạo, nên ta kiểm tra lỗi từng phần
    const totalRevenue = (revenueRes.data || []).reduce((acc, order) => acc + (order.total_amount || 0), 0);

    return {
      totalRevenue,
      newOrdersToday: ordersRes.count || 0,
      totalCustomers: customersRes.count || 0,
      lowStockCount: stockRes.count || 0,
    };
  } catch (err) {
    console.error("Lỗi nghiêm trọng trong getAdminDashboardStats:", err);
    throw err;
  }
}

/**
 * Lấy dữ liệu biểu đồ doanh thu 7 ngày gần nhất
 */
export async function getRevenueChartData(): Promise<ChartData[]> {
  const days: ChartData[] = [];
  const now = new Date();

  try {
    // Để tối ưu, nên tính toán trên server bằng RPC hoặc query một lần rồi group by
    // Nhưng hiện tại ta làm 7 query nhỏ để chính xác theo từng ngày
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const { data, error } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "completed")
        .gte("created_at", d.toISOString())
        .lt("created_at", nextD.toISOString());

      if (error) {
        console.warn(`Lỗi query doanh thu ngày ${d.toLocaleDateString()}:`, error);
        days.push({ day: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()], revenue: 0 });
        continue;
      }

      const dailyRevenue = (data || []).reduce((acc, order) => acc + (order.total_amount || 0), 0);
      days.push({ day: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()], revenue: dailyRevenue });
    }
    return days;
  } catch (err) {
    console.error("Lỗi getRevenueChartData:", err);
    return [];
  }
}

/**
 * Lấy top 5 sản phẩm bán chạy nhất
 * Tránh dùng join trực tiếp để tương thích tốt nhất
 */
export async function getTopSellingProducts(limit = 5): Promise<TopProduct[]> {
  try {
    // 1. Lấy dữ liệu bán hàng
    const { data: items, error: err } = await supabase
      .from("order_items")
      .select("product_id, quantity, price");

    if (err) throw err;
    if (!items || items.length === 0) return [];

    // 2. Lấy thông tin tên sản phẩm
    const productIds = [...new Set(items.map(i => i.product_id))].filter(Boolean);
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);

    const productNames: Record<string, string> = {};
    products?.forEach(p => { productNames[p.id] = p.name; });

    // 3. Tổng hợp dữ liệu
    const stats: Record<string, { name: string; sold: number; revenue: number }> = {};
    items.forEach(item => {
      const id = item.product_id;
      if (!stats[id]) {
        stats[id] = { name: productNames[id] || "Sản phẩm", sold: 0, revenue: 0 };
      }
      stats[id].sold += item.quantity;
      stats[id].revenue += item.quantity * item.price;
    });

    return Object.entries(stats)
      .map(([id, s]) => ({ id, name: s.name, total_sold: s.sold, revenue: s.revenue }))
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, limit);
  } catch (err) {
    console.error("Lỗi getTopSellingProducts:", err);
    return [];
  }
}

/**
 * Lấy danh sách đơn hàng gần đây
 * Không dùng join trực tiếp để tránh lỗi PGRST200 nếu Schema Cache chưa cập nhật
 */
export async function getRecentOrders(limit = 5) {
  try {
    // 1. Lấy danh sách đơn hàng
    const { data: orders, error: orderErr } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (orderErr) throw orderErr;
    if (!orders || orders.length === 0) return [];

    // 2. Lấy thông tin profiles tương ứng
    const userIds = [...new Set(orders.map(o => o.user_id))].filter(Boolean);
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profileErr) {
      console.warn("Không thể lấy thông tin profiles:", profileErr);
      return orders.map(o => ({ ...o, profiles: { full_name: "Khách hàng" } }));
    }

    // 3. Ghép dữ liệu
    return orders.map(order => ({
      ...order,
      profiles: profiles.find(p => p.id === order.user_id) || { full_name: "Khách hàng" }
    }));
  } catch (err) {
    console.error("Lỗi getRecentOrders:", err);
    throw err;
  }
}
