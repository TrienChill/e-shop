import { useAuth } from "@/src/auth/AuthContext";
import { listAllVouchers, setVoucherActive, type VoucherRow } from "@/src/services/admin/vouchers";
import { RefreshCcw } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

export default function AdminVouchersScreen() {
  const { role } = useAuth();
  const [rows, setRows] = React.useState<VoucherRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    return listAllVouchers()
      .then(setRows)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  if (role !== "admin") {
    return (
      <View style={styles.permissionCard}>
        <Text style={styles.title}>Voucher</Text>
        <Text style={styles.permissionText}>Bạn không có quyền quản lý voucher.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.titleLarge}>Quản lý Voucher</Text>
        <Pressable
          style={({ hovered }: any) => StyleSheet.flatten([styles.refreshButton, hovered && styles.refreshButtonHover])}
          onPress={() => refresh()}
        >
          <RefreshCcw size={16} color="white" />
          <Text style={styles.refreshText}>Làm mới</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* TABLE */}
      <View style={styles.tableCard}>
        {/* HEADER */}
        <View style={styles.tableHeader}>
          <Text style={StyleSheet.flatten([styles.columnCode, styles.headerText])}>Mã Code</Text>
          <Text style={StyleSheet.flatten([styles.columnType, styles.headerText])}>Loại</Text>
          <Text style={StyleSheet.flatten([styles.columnValue, styles.headerText, styles.textRight])}>Giá trị</Text>
          <Text style={StyleSheet.flatten([styles.columnExpired, styles.headerText, styles.textCenter])}>Hết hạn</Text>
          <Text style={StyleSheet.flatten([styles.columnStatus, styles.headerText, styles.textRight])}>Trạng thái</Text>
        </View>

        {/* BODY */}
        <View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có voucher nào.</Text>
            </View>
          ) : (
            rows.map((v) => (
              <View key={v.id} style={styles.row}>
                <Text style={styles.columnCodeText}>{v.code ?? "-"}</Text>
                <Text style={styles.columnTypeText}>{v.voucher_type ?? "-"}</Text>
                <Text style={styles.columnValueText}>
                  {v.discount_value?.toLocaleString() ?? "0"}{v.discount_type === 'percentage' ? '%' : '₫'}
                </Text>
                <Text style={styles.columnExpiredText}>
                  {v.expired_at ? new Date(v.expired_at).toLocaleString("vi-VN") : "-"}
                </Text>
                <View style={styles.columnStatusContainer}>
                  <Pressable
                    style={StyleSheet.flatten([
                      styles.statusBadge,
                      v.is_active ? styles.statusActive : styles.statusInactive
                    ])}
                    onPress={() =>
                      setVoucherActive(v.id, !v.is_active)
                        .then(() => refresh())
                        .catch((e) => setError((e as Error).message))
                    }
                  >
                    <Text style={StyleSheet.flatten([styles.statusText, v.is_active ? styles.statusTextActive : styles.statusTextInactive])}>
                      {v.is_active ? "Đang chạy" : "Tạm dừng"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  titleLarge: { fontSize: 24, fontWeight: "900", color: "#111827" },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111827",
    gap: 8,
  },
  refreshButtonHover: { opacity: 0.8 },
  refreshText: { color: "white", fontSize: 14, fontWeight: "700" },
  permissionCard: { padding: 24, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB" },
  title: { fontSize: 18, fontWeight: "700" },
  permissionText: { marginTop: 8, color: "#4B5563" },
  errorCard: { padding: 16, borderRadius: 12, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2" },
  errorText: { color: "#B91C1C", fontWeight: "500" },
  tableCard: {
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerText: { fontWeight: "700", color: "#4B5563", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  columnCode: { flex: 1.5 },
  columnType: { flex: 1 },
  columnValue: { flex: 1 },
  columnExpired: { flex: 1.5 },
  columnStatus: { flex: 1 },
  columnCodeText: { flex: 1.5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: "700", color: "#2563EB", textTransform: "uppercase" },
  columnTypeText: { flex: 1, color: "#374151" },
  columnValueText: { flex: 1, textAlign: "right", fontWeight: "700", color: "#111827" },
  columnExpiredText: { flex: 1.5, textAlign: "center", fontSize: 12, color: "#6B7280" },
  columnStatusContainer: { flex: 1, alignItems: "flex-end" },
  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  loadingContainer: { padding: 80, alignItems: "center" },
  emptyContainer: { padding: 80, alignItems: "center" },
  emptyText: { color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statusActive: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  statusInactive: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  statusTextActive: { color: "#15803D" },
  statusTextInactive: { color: "#6B7280" }
});



