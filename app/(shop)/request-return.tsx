import CommonHeader from "@/src/components/layout/Header";
import { supabase } from "@/src/lib/supabase";
import {
  getOrderForReturn,
  createReturnRequest,
  RETURN_REASON_OPTIONS,
} from "@/src/services/returns";
import {
  COLOR_TRANSLATIONS,
  getProductImageByColor,
} from "@/src/services/product";
import { encodeOrderId } from "@/src/utils/orderId";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ImagePlus,
  MinusCircle,
  PlusCircle,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  primary: "#0055FF",
  secondary: "#1A1A1A",
  background: "#FFFFFF",
  surface: "#F9F9F9",
  textSecondary: "#666666",
  border: "#EEEEEE",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
};

interface SelectedItem {
  orderItemId: number;
  productId: number;
  name: string;
  image: string;
  variant: string;
  priceAtPurchase: number;
  maxQuantity: number;
  selectedQty: number;
  refundAmount: number;
}

export default function RequestReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // Form state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [reasonText, setReasonText] = useState("");
  const [description, setDescription] = useState("");
  const [refundMethod, setRefundMethod] = useState("original");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");

  // UI state
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) return;
      setUser(currentUser);

      const order = await getOrderForReturn(
        Number(params.orderId),
        currentUser.id
      );
      setOrderData(order);

      if (order?.return_requests?.length > 0) {
        alert("Đơn hàng này đã có yêu cầu trả hàng đang xử lý.");
        router.back();
      }
    } catch (err: any) {
      console.error("Lỗi load order:", err.message);
      alert(err.message || "Không thể tải thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelect = (item: any) => {
    const exists = selectedItems.find(
      (s) => s.orderItemId === item.id
    );
    if (exists) {
      setSelectedItems(selectedItems.filter((s) => s.orderItemId !== item.id));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          orderItemId: item.id,
          productId: item.product_id,
          name: item.products?.name || "",
          image:
            getProductImageByColor(item.products, item.selected_variant?.color) ||
            "",
          variant: `${COLOR_TRANSLATIONS[item.selected_variant?.color?.toLowerCase()] || item.selected_variant?.color}, ${item.selected_variant?.size}`,
          priceAtPurchase: Number(item.price_at_purchase) || 0,
          maxQuantity: item.quantity || 1,
          selectedQty: item.quantity || 1,
          refundAmount:
            (Number(item.price_at_purchase) || 0) * (item.quantity || 1),
        },
      ]);
    }
  };

  const updateItemQty = (orderItemId: number, delta: number) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.orderItemId === orderItemId) {
          const newQty = Math.max(1, Math.min(item.maxQuantity, item.selectedQty + delta));
          return {
            ...item,
            selectedQty: newQty,
            refundAmount: item.priceAtPurchase * newQty,
          };
        }
        return item;
      })
    );
  };

  const totalRefund = selectedItems.reduce((sum, i) => sum + i.refundAmount, 0);

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm cần trả");
      return;
    }
    if (!selectedReason) {
      alert("Vui lòng chọn lý do trả hàng");
      return;
    }
    if (!reasonText.trim()) {
      alert("Vui lòng nhập mô tả chi tiết lý do trả hàng");
      return;
    }
    if (refundMethod === "bank_transfer" && (!bankAccountName || !bankAccountNumber)) {
      alert("Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng");
      return;
    }

    try {
      setSubmitting(true);
      await createReturnRequest({
        orderId: Number(params.orderId),
        userId: user.id,
        requestType: "return",
        reasonCategory: selectedReason,
        reason: reasonText,
        description: description || undefined,
        refundMethod,
        bankAccountName: refundMethod === "bank_transfer" ? bankAccountName : undefined,
        bankAccountNumber: refundMethod === "bank_transfer" ? bankAccountNumber : undefined,
        bankName: refundMethod === "bank_transfer" ? bankName : undefined,
        items: selectedItems.map((i) => ({
          orderItemId: i.orderItemId,
          productId: i.productId,
          quantity: i.selectedQty,
          refundAmount: i.refundAmount,
        })),
      });

      alert("Gửi yêu cầu trả hàng thành công!");
      router.replace("/(shop)/my-returns");
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <CommonHeader
          renderLeft={() => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft size={28} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
          renderRight={() => <View />}
          title="Yêu cầu trả hàng"
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <CommonHeader
        renderLeft={() => (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color={COLORS.secondary} />
          </TouchableOpacity>
        )}
        renderRight={() => <View />}
        title="Yêu cầu trả hàng"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Mã đơn:</Text>
            <Text style={styles.value}>{encodeOrderId(params.orderId)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Tổng giá trị:</Text>
            <Text style={styles.valuePrimary}>
              {Number(orderData?.total_amount || 0).toLocaleString("vi-VN")}₫
            </Text>
          </View>
        </View>

        {/* Select Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chọn sản phẩm cần trả</Text>
          {(orderData?.order_items || []).map((item: any, idx: number) => {
            const isSelected = selectedItems.some(
              (s) => s.orderItemId === item.id
            );
            const img = getProductImageByColor(
              item.products,
              item.selected_variant?.color
            );

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                activeOpacity={0.7}
                onPress={() => toggleItemSelect(item)}
              >
                <Image
                  source={{ uri: img || "https://via.placeholder.com/60" }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.products?.name}
                  </Text>
                  <Text style={styles.itemVariant}>
                    {COLOR_TRANSLATIONS[item.selected_variant?.color?.toLowerCase()] ||
                      item.selected_variant?.color}
                    , {item.selected_variant?.size}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {Number(item.price_at_purchase).toLocaleString("vi-VN")}₫ x{item.quantity}
                  </Text>
                </View>
                {isSelected ? (
                  <CheckCircle2 size={24} color={COLORS.primary} />
                ) : (
                  <View style={styles.uncheckedCircle} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Items with Qty Control */}
        {selectedItems.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Số lượng hoàn tiền</Text>
            {selectedItems.map((item) => (
              <View key={item.orderItemId} style={styles.qtyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qtyItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.qtyVariant}>{item.variant}</Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    onPress={() => updateItemQty(item.orderItemId, -1)}
                  >
                    <MinusCircle size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.selectedQty}</Text>
                  <TouchableOpacity
                    onPress={() => updateItemQty(item.orderItemId, 1)}
                  >
                    <PlusCircle size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.refundAmt}>
                  {item.refundAmount.toLocaleString("vi-VN")}₫
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    toggleItemSelect(
                      orderData?.order_items?.find(
                        (oi: any) => oi.id === item.orderItemId
                      )
                    )
                  }
                >
                  <Trash2 size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng hoàn tiền:</Text>
              <Text style={styles.totalValue}>
                {totalRefund.toLocaleString("vi-VN")}₫
              </Text>
            </View>
          </View>
        )}

        {/* Reason Picker */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lý do trả hàng *</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowReasonPicker(true)}
          >
            <Text
              style={
                selectedReason ? styles.pickerValue : styles.pickerPlaceholder
              }
            >
              {selectedReason
                ? RETURN_REASON_OPTIONS.find((r) => r.value === selectedReason)
                    ?.label || selectedReason
                : "Chọn lý do..."}
            </Text>
            <ChevronLeft
              size={20}
              color={COLORS.textSecondary}
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Mô tả chi tiết lý do trả hàng..."
            placeholderTextColor="#999"
            multiline
            value={reasonText}
            onChangeText={setReasonText}
          />

          <TextInput
            style={[styles.textInput, { marginTop: 10 }]}
            placeholder="Ghi chú thêm (tùy chọn)"
            placeholderTextColor="#999"
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Refund Method */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Phương thức hoàn tiền</Text>

          {[
            { key: "original", label: "Hoàn về nguyên phương thức thanh toán" },
            { key: "bank_transfer", label: "Chuyển khoản ngân hàng" },
          ].map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[
                styles.methodOption,
                refundMethod === method.key && styles.methodOptionActive,
              ]}
              onPress={() => setRefundMethod(method.key)}
            >
              <View
                style={[
                  styles.radioOuter,
                  refundMethod === method.key && styles.radioActive,
                ]}
              >
                {refundMethod === method.key && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.methodLabel}>{method.label}</Text>
            </TouchableOpacity>
          ))}

          {refundMethod === "bank_transfer" && (
            <>
              <TextInput
                style={styles.textInput}
                placeholder="Tên ngân hàng"
                placeholderTextColor="#999"
                value={bankName}
                onChangeText={setBankName}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Chủ tài khoản"
                placeholderTextColor="#999"
                value={bankAccountName}
                onChangeText={setBankAccountName}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Số tài khoản"
                placeholderTextColor="#999"
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                keyboardType="number-pad"
              />
            </>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Gửi yêu cầu trả hàng</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reason Picker Modal */}
      <Modal visible={showReasonPicker} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowReasonPicker(false)}
        />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Chọn lý do trả hàng</Text>
            <TouchableOpacity onPress={() => setShowReasonPicker(false)}>
              <X color={COLORS.secondary} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 350 }}>
            {RETURN_REASON_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.reasonOpt,
                  selectedReason === opt.value && styles.reasonOptActive,
                ]}
                onPress={() => {
                  setSelectedReason(opt.value);
                  setShowReasonPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.reasonOptText,
                    selectedReason === opt.value && styles.reasonOptTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {selectedReason === opt.value && (
                  <CheckCircle2 size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backBtn: { padding: 4, marginLeft: -8 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 14,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { fontSize: 14, color: COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: "600", color: COLORS.secondary },
  valuePrimary: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  itemRowSelected: { backgroundColor: "#F0F5FF", borderRadius: 10, paddingHorizontal: 8 },
  itemImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#F5F5F5", marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600", color: COLORS.secondary },
  itemVariant: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: "500", color: COLORS.primary, marginTop: 4 },
  uncheckedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCC",
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  qtyItemName: { fontSize: 13, fontWeight: "600", color: COLORS.secondary, flex: 1 },
  qtyVariant: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
    minWidth: 24,
    textAlign: "center",
  },
  refundAmt: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.success,
    width: 90,
    textAlign: "right",
  },
  totalDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 15, fontWeight: "600", color: COLORS.secondary },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.danger,
  },

  pickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerValue: { fontSize: 15, color: COLORS.secondary, fontWeight: "500" },
  pickerPlaceholder: { fontSize: 15, color: "#AAA" },
  textInput: {
    minHeight: 80,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.secondary,
    textAlignVertical: "top",
    marginTop: 10,
  },

  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  methodOptionActive: {},
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CCC",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: COLORS.primary },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  methodLabel: { fontSize: 14, color: COLORS.secondary },

  submitBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.secondary },
  reasonOpt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  reasonOptActive: { backgroundColor: "#F0F5FF", borderRadius: 10, paddingHorizontal: 10 },
  reasonOptText: { fontSize: 15, color: COLORS.secondary, fontWeight: "500" },
  reasonOptTextActive: { color: COLORS.primary, fontWeight: "600" },
});
