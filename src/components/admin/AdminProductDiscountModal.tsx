import {
    getProductsWithDiscounts,
    ProductDiscountRow,
    ProductWithDiscount,
} from "@/src/services/admin/vouchers";
import { Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type SelectedProduct = {
  id: number;
  name: string;
  image: string | null;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (
    data: Partial<ProductDiscountRow> | Partial<ProductDiscountRow>[],
  ) => Promise<void>;
  initialData?: ProductDiscountRow | null;
}

export default function AdminProductDiscountModal({
  visible,
  onClose,
  onSave,
  initialData,
}: Props) {
  const [productId, setProductId] = useState("");
  const [discountType, setDiscountType] = useState<
    "percentage" | "fixed_amount"
  >("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Product Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );
  const [smartProducts, setSmartProducts] = useState<ProductWithDiscount[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "no_discount" | "expired"
  >("all");

  useEffect(() => {
    if (initialData) {
      setProductId(initialData.product_id?.toString() || "");
      setSelectedProducts([
        initialData.products
          ? {
              id: initialData.product_id,
              name: initialData.products.name,
              image:
                initialData.products.images && initialData.products.images[0],
            }
          : {
              id: initialData.product_id,
              name: `ID: ${initialData.product_id}`,
              image: null,
            },
      ]);
      setDiscountType((initialData.discount_type as any) || "percentage");
      setDiscountValue(initialData.discount_value?.toString() || "");
      setStartDate(
        initialData.start_date
          ? new Date(initialData.start_date).toISOString().split("T")[0]
          : "",
      );
      setEndDate(
        initialData.end_date
          ? new Date(initialData.end_date).toISOString().split("T")[0]
          : "",
      );
    } else {
      setProductId("");
      setSelectedProducts([]);
      setSearchQuery("");
      setDiscountType("percentage");
      setDiscountValue("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
    }
  }, [initialData, visible]);

  useEffect(() => {
    if (visible) {
      setLoadingProducts(true);
      getProductsWithDiscounts()
        .then(setSmartProducts)
        .catch(console.error)
        .finally(() => setLoadingProducts(false));
    }
  }, [visible]);

  // Handle Local Search & Status Filter
  const filteredSmartProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date().getTime();

    // Map and attach status
    const processed = smartProducts.map((p) => {
      const latestDiscount =
        p.product_discounts && p.product_discounts.length > 0
          ? [...p.product_discounts].sort(
              (a, b) =>
                new Date(b.end_date).getTime() - new Date(a.end_date).getTime(),
            )[0]
          : null;

      let status = "no_discount";
      if (latestDiscount) {
        if (
          latestDiscount.is_active &&
          new Date(latestDiscount.end_date).getTime() > now
        ) {
          status = "active";
        } else {
          status = "expired";
        }
      }
      return { ...p, _status: status, _latestDiscount: latestDiscount };
    });

    return processed.filter((p) => {
      // Name/ID query match
      if (
        query &&
        !p.name.toLowerCase().includes(query) &&
        !p.id.toString().includes(query)
      )
        return false;
      // Filter tab
      if (filterStatus !== "all" && p._status !== filterStatus) return false;
      return true;
    });
  }, [smartProducts, searchQuery, filterStatus]);

  const selectProduct = (item: any) => {
    const product = {
      id: item.id,
      name: item.name,
      image: item.images && item.images[0],
    };

    setSearchQuery("");

    if (initialData) {
      setSelectedProducts([product]);
      setProductId(item.id.toString());
    } else {
      setSelectedProducts((prev) => {
        const exists = prev.some((p) => p.id === item.id);
        if (exists) {
          return prev.filter((p) => p.id !== item.id);
        }
        return [...prev, product];
      });
      setProductId(item.id.toString());
    }

    // Auto populate existing discount if any
    if (item._latestDiscount) {
      const d = item._latestDiscount;
      setDiscountType(d.discount_type);
      setDiscountValue(d.discount_value.toString());
      setStartDate(
        d.start_date
          ? new Date(d.start_date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
      setEndDate(
        d.end_date ? new Date(d.end_date).toISOString().split("T")[0] : "",
      );
    }
  };

  const handleSave = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất một sản phẩm.");
      return;
    }

    const payload = {
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      start_date: startDate
        ? new Date(startDate).toISOString()
        : new Date().toISOString(),
      end_date: endDate
        ? new Date(endDate).toISOString()
        : new Date("2099-12-31").toISOString(),
      is_active: initialData ? initialData.is_active : true, // default active
    };

    if (initialData) {
      await onSave({
        ...payload,
        product_id: selectedProducts[0].id,
      });
    } else {
      if (selectedProducts.length === 1) {
        await onSave({
          ...payload,
          product_id: selectedProducts[0].id,
        });
      } else {
        await onSave(
          selectedProducts.map((product) => ({
            ...payload,
            product_id: product.id,
          })),
        );
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {initialData ? "Chỉnh sửa Giảm giá SP" : "Thêm Giảm giá SP"}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            {/* PRODUCT SELECTION UI */}
            <View style={styles.productSelectionSection}>
              <Text style={styles.label}>Sản phẩm áp dụng</Text>

              <View style={styles.selectedProductsWrapper}>
                {selectedProducts.length > 0 ? (
                  <View style={styles.selectedChipsRow}>
                    {selectedProducts.map((product) => (
                      <View key={product.id} style={styles.selectedChip}>
                        <Text style={styles.selectedChipText} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setSelectedProducts((prev) =>
                              prev.filter((p) => p.id !== product.id),
                            )
                          }
                          style={styles.selectedChipRemove}
                        >
                          <Text style={styles.selectedChipRemoveText}>×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
                {selectedProducts.length === 0 && (
                  <Text style={styles.smallHint}>
                    Chọn tối đa nhiều sản phẩm để áp dụng cùng lúc.
                  </Text>
                )}
              </View>
              <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                  <Search color="#9CA3AF" size={18} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Nhập tên tải hoặc ID sản phẩm..."
                  />
                </View>

                {/* Status Filters */}
                <View style={styles.filterGroup}>
                  <Pressable
                    style={
                      filterStatus === "all"
                        ? styles.filterBtnActive
                        : styles.filterBtn
                    }
                    onPress={() => setFilterStatus("all")}
                  >
                    <Text
                      style={
                        filterStatus === "all"
                          ? styles.filterTextActive
                          : styles.filterText
                      }
                    >
                      Tất cả
                    </Text>
                  </Pressable>
                  <Pressable
                    style={
                      filterStatus === "no_discount"
                        ? styles.filterBtnActive
                        : styles.filterBtn
                    }
                    onPress={() => setFilterStatus("no_discount")}
                  >
                    <Text
                      style={
                        filterStatus === "no_discount"
                          ? styles.filterTextActive
                          : styles.filterText
                      }
                    >
                      Chưa giảm giá
                    </Text>
                  </Pressable>
                  <Pressable
                    style={
                      filterStatus === "active"
                        ? styles.filterBtnActive
                        : styles.filterBtn
                    }
                    onPress={() => setFilterStatus("active")}
                  >
                    <Text
                      style={
                        filterStatus === "active"
                          ? styles.filterTextActive
                          : styles.filterText
                      }
                    >
                      Đang giảm
                    </Text>
                  </Pressable>
                  <Pressable
                    style={
                      filterStatus === "expired"
                        ? styles.filterBtnActive
                        : styles.filterBtn
                    }
                    onPress={() => setFilterStatus("expired")}
                  >
                    <Text
                      style={
                        filterStatus === "expired"
                          ? styles.filterTextActive
                          : styles.filterText
                      }
                    >
                      Hết hạn
                    </Text>
                  </Pressable>
                </View>

                {loadingProducts ? (
                  <ActivityIndicator
                    size="small"
                    color="#2563EB"
                    style={{ marginVertical: 20 }}
                  />
                ) : (
                  <ScrollView
                    style={styles.searchResultsContainer}
                    nestedScrollEnabled={true}
                  >
                    {filteredSmartProducts.map((item) => {
                      return (
                        <View key={item.id} style={styles.searchResultItem}>
                          <Image
                            source={{
                              uri:
                                (item.images && item.images[0]) ||
                                "https://placehold.co/100",
                            }}
                            style={styles.searchResultImage}
                          />
                          <View style={styles.searchResultInfo}>
                            <Text
                              style={styles.searchResultName}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <View style={styles.badgeRow}>
                              {item._status === "no_discount" && (
                                <View
                                  style={[styles.statusBadge, styles.badgeGray]}
                                >
                                  <Text
                                    style={[styles.badgeText, styles.textGray]}
                                  >
                                    Chưa giảm giá
                                  </Text>
                                </View>
                              )}
                              {item._status === "active" && (
                                <View
                                  style={[
                                    styles.statusBadge,
                                    styles.badgeGreen,
                                  ]}
                                >
                                  <Text
                                    style={[styles.badgeText, styles.textGreen]}
                                  >
                                    Đang giảm:{" "}
                                    {item._latestDiscount?.discount_type ===
                                    "percentage"
                                      ? `${item._latestDiscount?.discount_value}%`
                                      : `${item._latestDiscount?.discount_value.toLocaleString()}đ`}
                                  </Text>
                                </View>
                              )}
                              {item._status === "expired" && (
                                <View
                                  style={[
                                    styles.statusBadge,
                                    styles.badgeYellow,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.badgeText,
                                      styles.textYellow,
                                    ]}
                                  >
                                    Hết hạn
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Pressable
                            style={styles.selectActionBtn}
                            onPress={() => selectProduct(item)}
                          >
                            <Text style={styles.selectActionText}>
                              {selectedProducts.some((p) => p.id === item.id)
                                ? "Bỏ chọn"
                                : "Chọn"}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                    {filteredSmartProducts.length === 0 && (
                      <Text style={styles.emptyText}>
                        Không tìm thấy sản phẩm nào.
                      </Text>
                    )}
                  </ScrollView>
                )}
              </View>
            </View>

            <View style={styles.rowWrapper}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Loại Giảm</Text>
                <View style={styles.buttonSegment}>
                  <Pressable
                    style={[
                      styles.segmentBtn,
                      discountType === "percentage" && styles.segmentActive,
                    ]}
                    onPress={() => setDiscountType("percentage")}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        discountType === "percentage" &&
                          styles.segmentTextActive,
                      ]}
                    >
                      %
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.segmentBtn,
                      discountType === "fixed_amount" && styles.segmentActive,
                    ]}
                    onPress={() => setDiscountType("fixed_amount")}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        discountType === "fixed_amount" &&
                          styles.segmentTextActive,
                      ]}
                    >
                      VNĐ
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Giá trị giảm</Text>
                <TextInput
                  style={styles.input}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                  placeholder="VD: 10 hay 50000"
                />
              </View>
            </View>

            <View style={styles.rowWrapper}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Ngày bắt đầu (Y-M-D)</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-01-01"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Ngày kết thúc (Y-M-D)</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-12-31"
                />
              </View>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Lưu Cài đặt</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeBtn: { padding: 4 },
  scroll: { padding: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
  },
  rowWrapper: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  halfWidth: { flex: 1 },
  buttonSegment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
  },
  segmentBtn: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  segmentActive: { backgroundColor: "#2563EB" },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  segmentTextActive: { color: "white" },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  cancelText: { color: "#4B5563", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveText: { color: "white", fontWeight: "600" },

  // New UI Styles
  productSelectionSection: { marginBottom: 8 },
  searchContainer: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    color: "#111827",
  },
  filterGroup: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  filterBtnActive: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  filterText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  filterTextActive: { fontSize: 11, fontWeight: "600", color: "#1D4ED8" },
  searchResultsContainer: {
    marginTop: 12,
    maxHeight: 220,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  searchResultImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  searchResultInfo: { flex: 1, gap: 4 },
  searchResultName: { fontSize: 13, fontWeight: "600", color: "#374151" },
  badgeRow: { flexDirection: "row" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeGray: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  badgeGreen: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  badgeYellow: { backgroundColor: "#FEF9C3", borderColor: "#FEF08A" },
  badgeText: { fontSize: 10, fontWeight: "600" },
  textGray: { color: "#6B7280" },
  textGreen: { color: "#166534" },
  textYellow: { color: "#854D0E" },
  selectActionBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectActionText: { color: "#2563EB", fontSize: 12, fontWeight: "600" },
  selectedProductsWrapper: { marginVertical: 8 },
  selectedChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  selectedChipText: { maxWidth: 160, fontSize: 12, color: "#1D4ED8" },
  selectedChipRemove: { marginLeft: 8, padding: 4 },
  selectedChipRemoveText: { fontSize: 12, color: "#1F2937", fontWeight: "700" },
  smallHint: { fontSize: 12, color: "#6B7280" },
  selectedProductCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
  },
  selectedProductInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  selectedProductImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D5DB",
  },
  selectedProductName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  changeProductBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
  },
  changeProductText: { fontSize: 13, fontWeight: "700", color: "#1D4ED8" },
  emptyText: { textAlign: "center", padding: 20, color: "#9CA3AF" },
});
