import { ProductDiscountRow } from "@/src/services/admin/vouchers";
import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProductDiscountRow>) => void;
  initialData?: ProductDiscountRow | null;
}

export default function AdminProductDiscountModal({ visible, onClose, onSave, initialData }: Props) {
  const [productId, setProductId] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (initialData) {
      setProductId(initialData.product_id?.toString() || "");
      setDiscountType((initialData.discount_type as any) || "percentage");
      setDiscountValue(initialData.discount_value?.toString() || "");
      setStartDate(initialData.start_date ? new Date(initialData.start_date).toISOString().split("T")[0] : "");
      setEndDate(initialData.end_date ? new Date(initialData.end_date).toISOString().split("T")[0] : "");
    } else {
      setProductId("");
      setDiscountType("percentage");
      setDiscountValue("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
    }
  }, [initialData, visible]);

  const handleSave = () => {
    onSave({
      product_id: parseInt(productId, 10) || 0,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : new Date("2099-12-31").toISOString(),
      is_active: initialData ? initialData.is_active : true, // default active
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialData ? "Chỉnh sửa Giảm giá SP" : "Thêm Giảm giá SP"}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.label}>ID Sản phẩm</Text>
            <TextInput style={styles.input} value={productId} onChangeText={setProductId} keyboardType="numeric" placeholder="VD: 1" />

            <View style={styles.rowWrapper}>
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

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Giá trị giảm</Text>
                <TextInput style={styles.input} value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" placeholder="VD: 10 hay 50000" />
              </View>
            </View>

            <View style={styles.rowWrapper}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Ngày bắt đầu (Y-M-D)</Text>
                <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-01-01" />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Ngày kết thúc (Y-M-D)</Text>
                <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-12-31" />
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
