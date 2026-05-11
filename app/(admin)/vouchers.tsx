import { useSupabaseRealtime } from "@/src/services/useSupabaseRealtime";
import { useAuth } from "@/src/auth/AuthContext";
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";
import AdminProductDiscountModal from "@/src/components/admin/AdminProductDiscountModal";
import AdminVoucherModal from "@/src/components/admin/AdminVoucherModal";
import {
  createProductDiscount,
  createVoucher,
  deleteProductDiscount,
  deleteVoucher,
  listAllProductDiscounts,
  listAllVouchers,
  setProductDiscountActive,
  setVoucherActive,
  updateProductDiscount,
  updateVoucher,
  type ProductDiscountRow,
  type VoucherRow,
} from "@/src/services/admin/vouchers";
import { Edit2, Plus, RefreshCcw, Search, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Helper to determine status string
const getStatus = (v: VoucherRow) => {
  if (!v.is_active) return { text: "Tạm dừng", color: "inactive" };
  if (v.expired_at && new Date(v.expired_at).getTime() < Date.now())
    return { text: "Hết hạn", color: "expired" };
  const usageCount = v.order_vouchers?.[0]?.count || 0;
  if (v.usage_limit && usageCount >= v.usage_limit)
    return { text: "Hết lượt", color: "expired" };
  return { text: "Đang chạy", color: "active" };
};

export default function AdminVouchersScreen() {
  const { role } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<"VOUCHERS" | "PRODUCT_DISCOUNTS">(
    "VOUCHERS",
  );

  // Data States
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [productDiscounts, setProductDiscounts] = useState<
    ProductDiscountRow[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isVoucherModalVisible, setVoucherModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherRow | null>(null);

  const [isDiscountModalVisible, setDiscountModalVisible] = useState(false);
  const [editingDiscount, setEditingDiscount] =
    useState<ProductDiscountRow | null>(null);

  // Discount Filters State
  const [searchDiscount, setSearchDiscount] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "percentage" | "fixed_amount"
  >("all");
  const [sortBy, setSortBy] = useState<"none" | "value_desc" | "value_asc">(
    "none",
  );

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    if (activeTab === "VOUCHERS") {
      listAllVouchers()
        .then(setVouchers)
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false));
    } else {
      listAllProductDiscounts()
        .then(setProductDiscounts)
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useSupabaseRealtime({
    table: "vouchers",
    onUpdate: refresh,
  });

  // Handler Vouchers
  const handleSaveVoucher = async (data: Partial<VoucherRow>) => {
    try {
      if (editingVoucher) {
        await updateVoucher(editingVoucher.id, data);
      } else {
        await createVoucher(data);
      }
      setVoucherModalVisible(false);
      refresh();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể lưu voucher");
    }
  };

  const handleSaveDiscount = async (
    data: Partial<ProductDiscountRow> | Partial<ProductDiscountRow>[],
  ) => {
    try {
      if (editingDiscount) {
        if (Array.isArray(data)) {
          throw new Error(
            "Không thể cập nhật nhiều sản phẩm trong một lần chỉnh sửa.",
          );
        }
        await updateProductDiscount(editingDiscount.id!, data);
      } else {
        if (Array.isArray(data)) {
          await Promise.all(data.map((item) => createProductDiscount(item)));
        } else {
          await createProductDiscount(data);
        }
      }
      setDiscountModalVisible(false);
      refresh();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể lưu giảm giá sản phẩm");
    }
  };

  const handleDelete = (
    id: string,
    codeOrName: string | null,
    type: "voucher" | "discount",
  ) => {
    const confirmMessage = `Bạn có chắc chắn muốn xóa ${type === "voucher" ? "voucher" : "giảm giá"} này?\nĐiều này sẽ xóa cả dữ liệu đã áp dụng.`;

    const executeDelete = async () => {
      try {
        if (type === "voucher") {
          await deleteVoucher(id);
        } else {
          await deleteProductDiscount(id);
        }
        refresh();
      } catch (e: any) {
        if (Platform.OS === "web") {
          window.alert(e.message || "Không thể xóa");
        } else {
          Alert.alert("Lỗi", e.message || "Không thể xóa");
        }
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) executeDelete();
    } else {
      Alert.alert("Xác nhận xóa", confirmMessage, [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: executeDelete },
      ]);
    }
  };

  if (role !== "admin") {
    return (
      <View style={styles.permissionCard}>
        <Text style={styles.title}>Voucher</Text>
        <Text style={styles.permissionText}>
          Bạn không có quyền quản lý voucher.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.titleLarge}>Quản lý Giảm giá</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ hovered }: any) =>
              StyleSheet.flatten([
                styles.refreshButton,
                hovered && styles.refreshButtonHover,
              ])
            }
            onPress={() => refresh()}
          >
            <RefreshCcw size={16} color="white" />
            <Text style={styles.refreshText}>Làm mới</Text>
          </Pressable>
          <Pressable
            style={({ hovered }: any) =>
              StyleSheet.flatten([
                styles.addButton,
                hovered && styles.refreshButtonHover,
              ])
            }
            onPress={() => {
              if (activeTab === "VOUCHERS") {
                setEditingVoucher(null);
                setVoucherModalVisible(true);
              } else {
                setEditingDiscount(null);
                setDiscountModalVisible(true);
              }
            }}
          >
            <Plus size={16} color="white" />
            <Text style={styles.refreshText}>Thêm Mới</Text>
          </Pressable>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[
            styles.tabBtn,
            activeTab === "VOUCHERS" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("VOUCHERS")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "VOUCHERS" && styles.tabTextActive,
            ]}
          >
            Mã giảm giá (Sàn)
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tabBtn,
            activeTab === "PRODUCT_DISCOUNTS" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("PRODUCT_DISCOUNTS")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "PRODUCT_DISCOUNTS" && styles.tabTextActive,
            ]}
          >
            Giảm giá Sản phẩm
          </Text>
        </Pressable>
      </View>

      {/* FILTER TOOLBAR FOR DISCOUNTS */}
      {activeTab === "PRODUCT_DISCOUNTS" && (
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Search color="#9CA3AF" size={16} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo ID hoặc tên sản phẩm..."
              value={searchDiscount}
              onChangeText={setSearchDiscount}
            />
          </View>
          <View style={styles.filterGroup}>
            <Pressable
              style={[
                styles.filterBtn,
                filterType === "percentage" && styles.filterBtnActive,
              ]}
              onPress={() =>
                setFilterType(
                  filterType === "percentage" ? "all" : "percentage",
                )
              }
            >
              <Text
                style={[
                  styles.filterText,
                  filterType === "percentage" && styles.filterTextActive,
                ]}
              >
                Loại: %
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterBtn,
                filterType === "fixed_amount" && styles.filterBtnActive,
              ]}
              onPress={() =>
                setFilterType(
                  filterType === "fixed_amount" ? "all" : "fixed_amount",
                )
              }
            >
              <Text
                style={[
                  styles.filterText,
                  filterType === "fixed_amount" && styles.filterTextActive,
                ]}
              >
                Loại: VNĐ
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterBtn,
                sortBy !== "none" && styles.filterBtnActive,
              ]}
              onPress={() =>
                setSortBy(
                  sortBy === "none"
                    ? "value_desc"
                    : sortBy === "value_desc"
                      ? "value_asc"
                      : "none",
                )
              }
            >
              <Text
                style={[
                  styles.filterText,
                  sortBy !== "none" && styles.filterTextActive,
                ]}
              >
                Xếp:{" "}
                {sortBy === "none"
                  ? "Mặc định"
                  : sortBy === "value_desc"
                    ? "Giảm dần"
                    : "Tăng dần"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* TABLE */}
      <View style={styles.tableCard}>
        {/* HEADER */}
        {activeTab === "VOUCHERS" ? (
          <View style={styles.tableHeader}>
            <Text
              style={StyleSheet.flatten([styles.columnCode, styles.headerText])}
            >
              Mã Code
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnUsage,
                styles.headerText,
              ])}
            >
              Số lượng
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnValue,
                styles.headerText,
                styles.textRight,
              ])}
            >
              Giá trị
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnExpired,
                styles.headerText,
                styles.textCenter,
              ])}
            >
              Hết hạn
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnStatus,
                styles.headerText,
                styles.textCenter,
              ])}
            >
              Trạng thái
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnActions,
                styles.headerText,
                styles.textRight,
              ])}
            >
              Hành động
            </Text>
          </View>
        ) : (
          <View style={styles.tableHeader}>
            <Text
              style={StyleSheet.flatten([styles.columnCode, styles.headerText])}
            >
              ID Sản phẩm
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnValue,
                styles.headerText,
                styles.textRight,
              ])}
            >
              Giá trị giảm
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnExpired,
                styles.headerText,
                styles.textCenter,
              ])}
            >
              Thời hạn
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnStatus,
                styles.headerText,
                styles.textCenter,
              ])}
            >
              Trạng thái
            </Text>
            <Text
              style={StyleSheet.flatten([
                styles.columnActions,
                styles.headerText,
                styles.textRight,
              ])}
            >
              Hành động
            </Text>
          </View>
        )}

        {/* BODY */}
        <ScrollView>
          {(() => {
            if (loading) {
              return (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#2563EB" />
                </View>
              );
            }

            if (activeTab === "VOUCHERS") {
              if (vouchers.length === 0)
                return (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không có voucher nào.</Text>
                  </View>
                );
              return vouchers.map((v) => {
                const status = getStatus(v);
                const usageCount = v.order_vouchers?.[0]?.count || 0;
                return (
                  <AdminDataWrapper key={v.id} style={styles.row}>
                    <View style={styles.columnCode}>
                      <Text style={styles.columnCodeText}>{v.code ?? "-"}</Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#6B7280",
                          marginTop: 4,
                          textTransform: "capitalize",
                        }}
                      >
                        {v.voucher_type}
                      </Text>
                    </View>
                    <View style={styles.columnUsage}>
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#4B5563",
                          fontWeight: "600",
                        }}
                      >
                        {usageCount} / {v.usage_limit || "∞"}
                      </Text>
                    </View>
                    <Text style={styles.columnValueText}>
                      {v.discount_value?.toLocaleString() ?? "0"}
                      {v.discount_type === "percentage" ? "%" : "₫"}
                    </Text>
                    <Text style={styles.columnExpiredText}>
                      {v.expired_at
                        ? new Date(v.expired_at).toLocaleDateString("vi-VN")
                        : "-"}
                    </Text>
                    <View style={styles.columnStatusContainer}>
                      <Pressable
                        style={StyleSheet.flatten([
                          styles.statusBadge,
                          status.color === "active"
                            ? styles.statusActive
                            : status.color === "inactive"
                              ? styles.statusInactive
                              : styles.statusExpired,
                        ])}
                        onPress={() => {
                          if (status.color !== "expired") {
                            setVoucherActive(v.id, !v.is_active)
                              .then(() => refresh())
                              .catch((e) => setError((e as Error).message));
                          }
                        }}
                      >
                        <Text
                          style={StyleSheet.flatten([
                            styles.statusText,
                            status.color === "active"
                              ? styles.statusTextActive
                              : status.color === "inactive"
                                ? styles.statusTextInactive
                                : styles.statusTextExpired,
                          ])}
                        >
                          {status.text}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.columnActionsContainer}>
                      <Pressable
                        onPress={() => {
                          setEditingVoucher(v);
                          setVoucherModalVisible(true);
                        }}
                        style={{ marginRight: 12 }}
                      >
                        <Edit2 size={18} color="#4B5563" />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(v.id, v.code, "voucher")}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </AdminDataWrapper>
                );
              });
            }

            // PRODUCT DISCOUNTS RENDER
            let filteredDiscounts = [...productDiscounts];

            // Apply Search
            if (searchDiscount.trim()) {
              const lowerQuery = searchDiscount.toLowerCase();
              filteredDiscounts = filteredDiscounts.filter(
                (d) =>
                  d.product_id.toString().includes(lowerQuery) ||
                  (d.products?.name &&
                    d.products.name.toLowerCase().includes(lowerQuery)),
              );
            }

            // Apply Filter
            if (filterType !== "all") {
              filteredDiscounts = filteredDiscounts.filter(
                (d) => d.discount_type === filterType,
              );
            }

            // Apply Sort
            if (sortBy !== "none") {
              filteredDiscounts.sort((a, b) => {
                if (sortBy === "value_desc")
                  return (b.discount_value || 0) - (a.discount_value || 0);
                if (sortBy === "value_asc")
                  return (a.discount_value || 0) - (b.discount_value || 0);
                return 0;
              });
            }

            if (filteredDiscounts.length === 0)
              return (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Không có sản phẩm nào phù hợp.
                  </Text>
                </View>
              );

            return filteredDiscounts.map((d) => (
              <AdminDataWrapper key={d.id} style={styles.row}>
                <View
                  style={[
                    styles.columnCode,
                    { flexDirection: "row", alignItems: "center", gap: 10 },
                  ]}
                >
                  <Image
                    source={{
                      uri:
                        (d.products?.images && d.products.images[0]) ||
                        "https://placehold.co/100",
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      backgroundColor: "#E5E7EB",
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#111827",
                      }}
                      numberOfLines={2}
                    >
                      {d.products?.name || `Sản phẩm #${d.product_id}`}
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}
                    >
                      ID: {d.product_id}
                    </Text>
                  </View>
                </View>
                <Text style={styles.columnValueText}>
                  <Text style={{ color: "#2563EB" }}>
                    {d.discount_type === "percentage"
                      ? `-${d.discount_value}%`
                      : `-${(d.discount_value || 0).toLocaleString()}đ`}
                  </Text>
                </Text>
                <Text style={styles.columnExpiredText}>
                  {d.start_date
                    ? new Date(d.start_date).toLocaleDateString("vi-VN")
                    : "-"}
                  {"\nđến\n"}
                  {d.end_date
                    ? new Date(d.end_date).toLocaleDateString("vi-VN")
                    : "-"}
                </Text>
                <View style={styles.columnStatusContainer}>
                  <Pressable
                    style={StyleSheet.flatten([
                      styles.statusBadge,
                      d.is_active
                        ? { backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" }
                        : {
                            backgroundColor: "#F3F4F6",
                            borderColor: "#E5E7EB",
                          },
                    ])}
                    onPress={() => {
                      setProductDiscountActive(d.id!, !d.is_active)
                        .then(() => refresh())
                        .catch((e) => setError((e as Error).message));
                    }}
                  >
                    <Text
                      style={StyleSheet.flatten([
                        styles.statusText,
                        d.is_active
                          ? { color: "#1D4ED8" }
                          : { color: "#6B7280" },
                      ])}
                    >
                      {d.is_active ? "Đang chạy" : "Tạm dừng"}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.columnActionsContainer}>
                  <Pressable
                    onPress={() => {
                      setEditingDiscount(d);
                      setDiscountModalVisible(true);
                    }}
                    style={{ marginRight: 12 }}
                  >
                    <Edit2 size={18} color="#4B5563" />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      handleDelete(d.id!, d.product_id.toString(), "discount")
                    }
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </AdminDataWrapper>
            ));
          })()}
        </ScrollView>
      </View>

      <AdminVoucherModal
        visible={isVoucherModalVisible}
        onClose={() => {
          setVoucherModalVisible(false);
          setEditingVoucher(null);
        }}
        onSave={handleSaveVoucher}
        initialData={editingVoucher}
      />

      <AdminProductDiscountModal
        visible={isDiscountModalVisible}
        onClose={() => {
          setDiscountModalVisible(false);
          setEditingDiscount(null);
        }}
        onSave={handleSaveDiscount}
        initialData={editingDiscount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerActions: { flexDirection: "row", gap: 12 },
  titleLarge: { fontSize: 24, fontWeight: "900", color: "#111827" },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#2563EB" },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    width: 250,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: "#111827",
  },
  filterGroup: { flexDirection: "row", gap: 8 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterBtnActive: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  filterTextActive: { color: "#1D4ED8" },
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
  permissionCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: { fontSize: 18, fontWeight: "700" },
  permissionText: { marginTop: 8, color: "#4B5563" },
  errorCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: { color: "#B91C1C", fontWeight: "500" },
  tableCard: {
    flex: 1,
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

  columnCodeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
    color: "#2563EB",
    textTransform: "uppercase",
  },
  columnValueText: {
    flex: 1,
    textAlign: "right",
    fontWeight: "700",
    color: "#111827",
  },
  columnExpiredText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
  },

  columnStatusContainer: { flex: 1.2, alignItems: "center" },
  columnActionsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  loadingContainer: { padding: 80, alignItems: "center" },
  emptyContainer: { padding: 80, alignItems: "center" },
  emptyText: { color: "#9CA3AF" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusActive: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  statusInactive: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  statusExpired: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusTextActive: { color: "#15803D" },
  statusTextInactive: { color: "#6B7280" },
  statusTextExpired: { color: "#B91C1C" },
});
