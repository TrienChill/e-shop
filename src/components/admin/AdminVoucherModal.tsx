import { VoucherRow } from "@/src/services/admin/vouchers";
import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Partial<VoucherRow>, productIds?: number[]) => void;
  initialData?: VoucherRow | null;
}

export default function AdminVoucherModal({ visible, onClose, onSave, initialData }: Props) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [voucherType, setVoucherType] = useState<"platform" | "shop">("platform");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiredAt, setExpiredAt] = useState("");

  const [productIds, setProductIds] = useState("");

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code || "");
      setDiscountType((initialData.discount_type as any) || "percentage");
      setDiscountValue(initialData.discount_value?.toString() || "");
      setVoucherType((initialData.voucher_type as any) || "platform");
      setMinOrderValue(initialData.min_order_value?.toString() || "0");
      setUsageLimit(initialData.usage_limit?.toString() || "100");
      setStartDate(initialData.start_date ? new Date(initialData.start_date).toISOString().split("T")[0] : "");
      setExpiredAt(initialData.expired_at ? new Date(initialData.expired_at).toISOString().split("T")[0] : "");

      const pIds = initialData.conditions?.product_ids || [];
      setProductIds(pIds.join(", "));
    } else {
      setCode("");
      setDiscountType("percentage");
      setDiscountValue("");
      setVoucherType("platform");
      setMinOrderValue("0");
      setUsageLimit("100");
      setStartDate(new Date().toISOString().split("T")[0]);
      setExpiredAt("");
      setProductIds("");
    }
  }, [initialData, visible]);

  const handleSave = () => {
    const listProductIds = productIds.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    const conditions = listProductIds.length > 0 ? { product_ids: listProductIds } : null;

    onSave({
      code: code.trim().toUpperCase() || null,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || null,
      voucher_type: voucherType,
      min_order_value: parseFloat(minOrderValue) || 0,
      usage_limit: parseInt(usageLimit, 10) || 0,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      expired_at: expiredAt ? new Date(expiredAt).toISOString() : null,
      conditions: conditions,
      is_active: initialData ? initialData.is_active : true, // default active
    }, listProductIds);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialData ? "Chỉnh sửa Voucher" : "Thêm Voucher Mới"}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.label}>Mã Code</Text>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="VD: SUMMER10" />

            <View style={styles.rowWrapper}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Loại hình</Text>
                <View style={styles.buttonSegment}>
                  <Pressable
                    style={[styles.segmentBtn, voucherType === "platform" && styles.segmentActive]}
                    onPress={() => setVoucherType("platform")}
                  >
                    <Text style={[styles.segmentText, voucherType === "platform" && styles.segmentTextActive]}>Toàn sàn</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segmentBtn, voucherType === "shop" && styles.segmentActive]}
                    onPress={() => setVoucherType("shop")}
                  >
                    <Text style={[styles.segmentText, voucherType === "shop" && styles.segmentTextActive]}>Sản phẩm</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Loại Giảm</Text>
                <View style={styles.buttonSegment}>
                  <Pressable
                    style={[styles.segmentBtn, discountType === "percentage" && styles.segmentActive]}
                    onPress={() => setDiscountType("percentage")}
                  >
                    <Text style={[styles.segmentText, discountType === "percentage" && styles.segmentTextActive]}>%</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segmentBtn, discountType === "fixed_amount" && styles.segmentActive]}
                    onPress={() => setDiscountType("fixed_amount")}
                  >
                    <Text style={[styles.segmentText, discountType === "fixed_amount" && styles.segmentTextActive]}>VNĐ</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {voucherType === "shop" && (
              <View>
                <Text style={styles.label}>Áp dụng cho ID sản phẩm (ngăn cách bởi dấu phẩy)</Text>
                <TextInput style={styles.input} value={productIds} onChangeText={setProductIds} placeholder="VD: 1, 2, 3" />
              </View>
            )}

            <Text style={styles.label}>Giá trị giảm ({discountType === "percentage" ? "%" : "VNĐ"})</Text>
            <TextInput style={styles.input} value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" placeholder="VD: 10 hay 50000" />

            <View style={styles.rowWrapper}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Giảm giá tối đa (VNĐ)</Text>
                <TextInput style={styles.input} value={minOrderValue} onChangeText={setMinOrderValue} keyboardType="numeric" />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Số lượt tối đa</Text>
                <TextInput style={styles.input} value={usageLimit} onChangeText={setUsageLimit} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.rowWrapper}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Ngày bắt đầu (Y-M-D)</Text>
                <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-01-01" />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Ngày hết hạn (Y-M-D)</Text>
                <TextInput style={styles.input} value={expiredAt} onChangeText={setExpiredAt} placeholder="2026-12-31" />
              </View>
            </View>

          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Lưu Voucher</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  content: { width: "90%", maxHeight: "80%", backgroundColor: "white", borderRadius: 16, overflow: "hidden" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#E5E7EB" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeBtn: { padding: 4 },
  scroll: { padding: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 14, color: "#111827" },
  rowWrapper: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  halfWidth: { flex: 1 },
  buttonSegment: { flexDirection: "row", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, overflow: "hidden" },
  segmentBtn: { flex: 1, padding: 10, alignItems: "center", backgroundColor: "#F9FAFB" },
  segmentActive: { backgroundColor: "#2563EB" },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  segmentTextActive: { color: "white" },
  footer: { flexDirection: "row", padding: 16, borderTopWidth: 1, borderColor: "#E5E7EB", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  cancelText: { color: "#4B5563", fontWeight: "600" },
  saveBtn: { backgroundColor: "#2563EB", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  saveText: { color: "white", fontWeight: "600" }
});
