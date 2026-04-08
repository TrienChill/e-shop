import { listOrders, type AdminOrder } from "@/src/services/admin/orders";
import React from "react";
import { Platform, ScrollView, Text, View } from "react-native";

export default function AdminOrdersScreen() {
  const [orders, setOrders] = React.useState<AdminOrder[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    listOrders({ limit: 50 })
      .then((rows) => {
        if (!mounted) return;
        setOrders(rows);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (Platform.OS === "web") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Đơn hàng</h1>
          <div className="text-sm text-gray-500">{loading ? "Loading..." : `${orders.length} orders`}</div>
        </div>
        {error ? (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-100">{error}</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                    <td className="px-4 py-3">{o.status}</td>
                    <td className="px-4 py-3 text-right">{o.total_amount ?? "-"}</td>
                    <td className="px-4 py-3">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Đơn hàng</Text>
      {loading ? <Text style={{ marginTop: 12 }}>Loading...</Text> : null}
      {error ? <Text style={{ marginTop: 12, color: "red" }}>{error}</Text> : null}
      <View style={{ marginTop: 12, gap: 8 }}>
        {orders.map((o) => (
          <View key={o.id} style={{ padding: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12 }}>
            <Text style={{ fontWeight: "700" }}>{o.status}</Text>
            <Text>{o.total_amount ?? "-"}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

