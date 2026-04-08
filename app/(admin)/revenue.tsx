import { useAuth } from "@/src/auth/AuthContext";
import { getRevenueSummary } from "@/src/services/admin/revenue";
import React from "react";
import { Platform } from "react-native";

export default function AdminRevenueScreen() {
  const { role } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [totalRevenue, setTotalRevenue] = React.useState<number>(0);
  const [ordersCount, setOrdersCount] = React.useState<number>(0);

  React.useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);

    setLoading(true);
    setError(null);
    getRevenueSummary({ from: from.toISOString(), to: to.toISOString() })
      .then((r) => {
        setTotalRevenue(r.total_revenue);
        setOrdersCount(r.orders_count);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (role !== "admin") {
    return Platform.OS === "web" ? (
      <div className="p-6 rounded-2xl bg-white border border-gray-200">
        <h1 className="text-lg font-bold">Doanh thu</h1>
        <p className="mt-2 text-gray-600">Bạn không có quyền xem doanh thu.</p>
      </div>
    ) : null;
  }

  if (Platform.OS !== "web") return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Doanh thu (30 ngày gần đây)</h1>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-100">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-white border border-gray-200">
          <div className="text-sm text-gray-500">Total revenue</div>
          <div className="mt-2 text-2xl font-bold">{loading ? "..." : totalRevenue.toLocaleString()}</div>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-gray-200">
          <div className="text-sm text-gray-500">Completed orders</div>
          <div className="mt-2 text-2xl font-bold">{loading ? "..." : ordersCount.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

