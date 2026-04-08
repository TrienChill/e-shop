import { useAuth } from "@/src/auth/AuthContext";
import { getRevenueSummary } from "@/src/services/admin/revenue";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

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
    return (
      <View style={styles.permissionCard}>
        <Text style={styles.title}>Doanh thu</Text>
        <Text style={styles.permissionText}>Bạn không có quyền xem doanh thu.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Doanh thu (30 ngày gần đây)</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tổng doanh thu</Text>
          <Text style={StyleSheet.flatten([styles.statValue, styles.textBlue])}>
            {loading ? <ActivityIndicator size="small" color="#2563EB" /> : `${totalRevenue.toLocaleString()}₫`}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Đơn hàng hoàn thành</Text>
          <Text style={StyleSheet.flatten([styles.statValue, styles.textDark])}>
            {loading ? <ActivityIndicator size="small" color="#111827" /> : ordersCount.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  permissionCard: { padding: 24, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB" },
  permissionText: { marginTop: 8, color: "#4B5563" },
  errorCard: { padding: 16, borderRadius: 12, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2" },
  errorText: { color: "#B91C1C", fontWeight: "500" },
  statsGrid: { flexDirection: "row", gap: 16 },
  statCard: {
    flex: 1,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    // shadow-sm
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  statValue: { fontSize: 24, fontWeight: "800", marginTop: 8 },
  textBlue: { color: "#2563EB" },
  textDark: { color: "#111827" }
});



