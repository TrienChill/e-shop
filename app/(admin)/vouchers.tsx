import { useAuth } from "@/src/auth/AuthContext";
import {
  listAllVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  setVoucherActive,
  type VoucherRow,
} from "@/src/services/admin/vouchers";
import { RefreshCcw, Plus, Edit2, Trash2 } from "lucide-react-native";
import React, { useState, useEffect, useCallback } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, Alert } from "react-native";
import AdminVoucherModal from "@/src/components/admin/AdminVoucherModal";

// Helper to determine status string
const getStatus = (v: VoucherRow) => {
  if (!v.is_active) return { text: "Tạm dừng", color: "inactive" };
  if (v.expired_at && new Date(v.expired_at).getTime() < Date.now()) return { text: "Hết hạn", color: "expired" };
  const usageCount = v.order_vouchers?.[0]?.count || 0;
  if (v.usage_limit && usageCount >= v.usage_limit) return { text: "Hết lượt", color: "expired" };
  return { text: "Đang chạy", color: "active" };
};

export default function AdminVouchersScreen() {
  const { role } = useAuth();
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherRow | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return listAllVouchers()
      .then(setRows)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSaveModal = async (data: Partial<VoucherRow>, productIds?: number[]) => {
    try {
      if (editingVoucher) {
        await updateVoucher(editingVoucher.id, data);
      } else {
        await createVoucher(data, productIds);
      }
      setModalVisible(false);
      refresh();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể lưu voucher");
    }
  };

  const handleDelete = (id: string, code: string | null) => {
    const confirmMessage = `Bạn có chắc chắn muốn xóa voucher ${code || ""}?\nĐiều này sẽ xóa cả dữ liệu đã áp dụng.`;

    // 1. Hàm thực thi việc xóa (Gọi API và Refresh giao diện)
    const executeDelete = async () => {
      try {
        await deleteVoucher(id);
        refresh(); // Tải lại danh sách sau khi xóa thành công
      } catch (e: any) {
        // Nếu xóa bị lỗi (ví dụ lỗi khóa ngoại database), báo lỗi ra màn hình
        if (Platform.OS === "web") {
          window.alert(e.message || "Không thể xóa voucher");
        } else {
          Alert.alert("Lỗi", e.message || "Không thể xóa voucher");
        }
      }
    };

    // 2. Xử lý hiển thị Pop-up xác nhận tùy theo nền tảng (Web vs Mobile)
    if (Platform.OS === "web") {
      // Dùng Pop-up mặc định của trình duyệt (Chrome/Edge/Safari)
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        executeDelete();
      }
    } else {
      // Dùng Pop-up gốc của iOS/Android
      Alert.alert(
        "Xóa Voucher",
        confirmMessage,
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Xóa", 
            style: "destructive",
            onPress: executeDelete
          }
        ]
      );
    }
  };

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
        <View style={styles.headerActions}>
          <Pressable
            style={({ hovered }: any) => StyleSheet.flatten([styles.refreshButton, hovered && styles.refreshButtonHover])}
            onPress={() => refresh()}
          >
            <RefreshCcw size={16} color="white" />
            <Text style={styles.refreshText}>Làm mới</Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) => StyleSheet.flatten([styles.addButton, hovered && styles.refreshButtonHover])}
            onPress={() => {
              setEditingVoucher(null);
              setModalVisible(true);
            }}
          >
            <Plus size={16} color="white" />
            <Text style={styles.refreshText}>Thêm Voucher</Text>
          </Pressable>
        </View>
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
          <Text style={StyleSheet.flatten([styles.columnUsage, styles.headerText])}>Số lượng</Text>
          <Text style={StyleSheet.flatten([styles.columnValue, styles.headerText, styles.textRight])}>Giá trị</Text>
          <Text style={StyleSheet.flatten([styles.columnExpired, styles.headerText, styles.textCenter])}>Hết hạn</Text>
          <Text style={StyleSheet.flatten([styles.columnStatus, styles.headerText, styles.textCenter])}>Trạng thái</Text>
          <Text style={StyleSheet.flatten([styles.columnActions, styles.headerText, styles.textRight])}>Hành động</Text>
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
            rows.map((v) => {
              const status = getStatus(v);
              const usageCount = v.order_vouchers?.[0]?.count || 0;
              return (
                <View key={v.id} style={styles.row}>
                  <View style={styles.columnCode}>
                    <Text style={styles.columnCodeText}>{v.code ?? "-"}</Text>
                    <Text style={{fontSize: 10, color: "#6B7280", marginTop: 4, textTransform: "capitalize"}}>{v.voucher_type}</Text>
                  </View>
                  <View style={styles.columnUsage}>
                     <Text style={{fontSize: 13, color: "#4B5563", fontWeight: "600"}}>
                       {usageCount} / {v.usage_limit || "∞"}
                     </Text>
                  </View>
                  <Text style={styles.columnValueText}>
                    {v.discount_value?.toLocaleString() ?? "0"}{v.discount_type === 'percentage' ? '%' : '₫'}
                  </Text>
                  <Text style={styles.columnExpiredText}>
                    {v.expired_at ? new Date(v.expired_at).toLocaleDateString("vi-VN") : "-"}
                  </Text>
                  <View style={styles.columnStatusContainer}>
                    <Pressable
                      style={StyleSheet.flatten([
                        styles.statusBadge,
                        status.color === "active" ? styles.statusActive : 
                        status.color === "inactive" ? styles.statusInactive : styles.statusExpired
                      ])}
                      onPress={() => {
                        // Allow toggling active/inactive only
                        if (status.color !== "expired") {
                          setVoucherActive(v.id, !v.is_active)
                            .then(() => refresh())
                            .catch((e) => setError((e as Error).message));
                        }
                      }}
                    >
                      <Text style={StyleSheet.flatten([
                        styles.statusText, 
                        status.color === "active" ? styles.statusTextActive : 
                        status.color === "inactive" ? styles.statusTextInactive : styles.statusTextExpired
                      ])}>
                        {status.text}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.columnActionsContainer}>
                    <Pressable
                       onPress={() => {
                         setEditingVoucher(v);
                         setModalVisible(true);
                       }}
                       style={{marginRight: 12}}
                    >
                      <Edit2 size={18} color="#4B5563" />
                    </Pressable>
                    <Pressable
                       onPress={() => handleDelete(v.id, v.code)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      <AdminVoucherModal
        visible={isModalVisible}
        onClose={() => {
           setModalVisible(false);
           setEditingVoucher(null);
        }}
        onSave={handleSaveModal}
        initialData={editingVoucher}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerActions: { flexDirection: "row", gap: 12 },
  titleLarge: { fontSize: 24, fontWeight: "900", color: "#111827" },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#374151",
    gap: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#2563EB",
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
  columnUsage: { flex: 1 },
  columnValue: { flex: 1 },
  columnExpired: { flex: 1 },
  columnStatus: { flex: 1.2 },
  columnActions: { flex: 1 },
  
  columnCodeText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: "700", color: "#2563EB", textTransform: "uppercase" },
  columnValueText: { flex: 1, textAlign: "right", fontWeight: "700", color: "#111827" },
  columnExpiredText: { flex: 1, textAlign: "center", fontSize: 12, color: "#6B7280" },
  
  columnStatusContainer: { flex: 1.2, alignItems: "center" },
  columnActionsContainer: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
  
  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  loadingContainer: { padding: 80, alignItems: "center" },
  emptyContainer: { padding: 80, alignItems: "center" },
  emptyText: { color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statusActive: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  statusInactive: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  statusExpired: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  statusTextActive: { color: "#15803D" },
  statusTextInactive: { color: "#6B7280" },
  statusTextExpired: { color: "#B91C1C" }
});
