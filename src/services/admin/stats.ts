import { supabase } from "@/src/lib/supabase";

export interface AdminStats {
  totalRevenue: number;
  revenueChange: number;
  newOrdersToday: number;
  ordersChange: number;
  totalCustomers: number;
  customersChange: number;
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

export interface TopViewedProduct {
  id: string;
  name: string;
  image_url: string | null;
  view_count: number;
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

function getDayName(date: Date): string {
  return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][date.getDay()];
}

function getDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getWeekRange(weeksAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (weeksAgo * 7) - 6);
  const weekEnd = new Date(start);
  weekEnd.setDate(start.getDate() + 7);
  return { start, end: weekEnd };
}

export async function getAdminDashboardStats(): Promise<AdminStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const { start: todayStart, end: todayEnd } = getDateRange(today);
  const { start: yesterdayStart, end: yesterdayEnd } = getDateRange(yesterday);

  const thisWeek = getWeekRange(0);
  const lastWeek = getWeekRange(1);

  try {
    const [
      todayRevenueRes,
      yesterdayRevenueRes,
      lastWeekRevenueRes,
      todayOrdersRes,
      yesterdayOrdersRes,
      customersRes,
      lastWeekCustomersRes,
      stockRes,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "completed")
        .gte("created_at", todayStart.toISOString())
        .lt("created_at", todayEnd.toISOString()),
      supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "completed")
        .gte("created_at", yesterdayStart.toISOString())
        .lt("created_at", yesterdayEnd.toISOString()),
      supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "completed")
        .gte("created_at", lastWeek.start.toISOString())
        .lt("created_at", lastWeek.end.toISOString()),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterdayStart.toISOString())
        .lt("created_at", yesterdayEnd.toISOString()),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id, created_at", { count: "exact", head: false })
        .gte("created_at", lastWeek.start.toISOString())
        .lt("created_at", lastWeek.end.toISOString()),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .lt("stock", 10)
        .eq("is_active", true),
    ]);

    const totalRevenue = (todayRevenueRes.data || []).reduce(
      (acc, order) => acc + (order.total_amount || 0),
      0
    );
    const yesterdayRevenue = (yesterdayRevenueRes.data || []).reduce(
      (acc, order) => acc + (order.total_amount || 0),
      0
    );
    const lastWeekRevenue = (lastWeekRevenueRes.data || []).reduce(
      (acc, order) => acc + (order.total_amount || 0),
      0
    );

    const revenueChange = calculatePercentageChange(totalRevenue, lastWeekRevenue);

    const newOrdersToday = todayOrdersRes.count || 0;
    const yesterdayOrders = yesterdayOrdersRes.count || 0;
    const ordersChange = calculatePercentageChange(newOrdersToday, yesterdayOrders);

    const totalCustomers = customersRes.count || 0;
    const newCustomersThisWeek = lastWeekCustomersRes.data?.length || 0;
    const customersChange = lastWeekCustomersRes.data?.length !== null
      ? calculatePercentageChange(newCustomersThisWeek, Math.max(1, totalCustomers * 0.1))
      : 0;

    return {
      totalRevenue,
      revenueChange,
      newOrdersToday,
      ordersChange,
      totalCustomers,
      customersChange,
      lowStockCount: stockRes.count || 0,
    };
  } catch (err) {
    console.error("Lỗi nghiêm trọng trong getAdminDashboardStats:", err);
    throw err;
  }
}

export async function getRevenueChartData(): Promise<ChartData[]> {
  const now = new Date();
  const days: ChartData[] = [];

  try {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("orders")
      .select("total_amount, created_at")
      .eq("status", "completed")
      .gte("created_at", sevenDaysAgo.toISOString());

    if (error) {
      console.error("Lỗi query revenue chart:", error);
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        days.push({ day: getDayName(d), revenue: 0 });
      }
      return days;
    }

    const dailyRevenue: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      dailyRevenue[dateKey] = 0;
    }

    (data || []).forEach((order) => {
      const dateKey = order.created_at.split("T")[0];
      if (dailyRevenue[dateKey] !== undefined) {
        dailyRevenue[dateKey] += order.total_amount || 0;
      }
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      days.push({ day: getDayName(d), revenue: dailyRevenue[dateKey] || 0 });
    }

    return days;
  } catch (err) {
    console.error("Lỗi getRevenueChartData:", err);
    return [];
  }
}

export async function getTopSellingProducts(limit = 5): Promise<TopProduct[]> {
  try {
    const { data: items, error: err } = await supabase
      .from("order_items")
      .select("product_id, quantity, price");

    if (err) throw err;
    if (!items || items.length === 0) return [];

    const productIds = [...new Set(items.map((i) => i.product_id))].filter(Boolean);
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);

    const productNames: Record<string, string> = {};
    products?.forEach((p) => {
      productNames[p.id] = p.name;
    });

    const stats: Record<string, { name: string; sold: number; revenue: number }> = {};
    items.forEach((item) => {
      const id = item.product_id;
      if (!stats[id]) {
        stats[id] = { name: productNames[id] || "Sản phẩm", sold: 0, revenue: 0 };
      }
      stats[id].sold += item.quantity;
      stats[id].revenue += item.quantity * item.price;
    });

    return Object.entries(stats)
      .map(([id, s]) => ({
        id,
        name: s.name,
        total_sold: s.sold,
        revenue: s.revenue,
      }))
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, limit);
  } catch (err) {
    console.error("Lỗi getTopSellingProducts:", err);
    return [];
  }
}

export async function getTopViewedProducts(limit = 5): Promise<TopViewedProduct[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: views, error: viewsErr } = await supabase
      .from("product_view_history")
      .select("product_id")
      .gte("viewed_at", thirtyDaysAgo.toISOString());

    if (viewsErr) {
      console.error("Lỗi query view history:", viewsErr);
      return [];
    }

    if (!views || views.length === 0) return [];

    const viewCounts: Record<string, number> = {};
    views.forEach((v) => {
      const key = String(v.product_id);
      viewCounts[key] = (viewCounts[key] || 0) + 1;
    });

    const topProductIds = Object.entries(viewCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    if (topProductIds.length === 0) return [];

    const { data: products, error: productsErr } = await supabase
      .from("products")
      .select("id, name, image_url")
      .in(
        "id",
        topProductIds.map((id) => (isNaN(Number(id)) ? 0 : Number(id)))
      );

    if (productsErr) {
      console.error("Lỗi query products:", productsErr);
      return [];
    }

    return products
      .map((p) => ({
        id: String(p.id),
        name: p.name,
        image_url: p.image_url,
        view_count: viewCounts[String(p.id)] || 0,
      }))
      .sort((a, b) => b.view_count - a.view_count);
  } catch (err) {
    console.error("Lỗi getTopViewedProducts:", err);
    return [];
  }
}

export async function getRecentOrders(limit = 5) {
  try {
    const { data: orders, error: orderErr } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (orderErr) throw orderErr;
    if (!orders || orders.length === 0) return [];

    const userIds = [...new Set(orders.map((o) => o.user_id))].filter(Boolean);
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profileErr) {
      console.warn("Không thể lấy thông tin profiles:", profileErr);
      return orders.map((o) => ({
        ...o,
        profiles: { full_name: "Khách hàng" },
      }));
    }

    return orders.map((order) => ({
      ...order,
      profiles:
        profiles.find((p) => p.id === order.user_id) ||
        { full_name: "Khách hàng" },
    }));
  } catch (err) {
    console.error("Lỗi getRecentOrders:", err);
    throw err;
  }
}
