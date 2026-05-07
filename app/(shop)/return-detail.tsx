import { CommonHeader } from "@/src/components/layout/Header";
import { supabase } from "@/src/lib/supabase";
import {
  COLOR_TRANSLATIONS,
  getProductImageByColor,
} from "@/src/services/product";
import {
  cancelReturn,
  getReturnDetail,
  RETURN_STATUS_COLORS,
  RETURN_STATUS_LABELS,
} from "@/src/services/returns";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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

const TIMELINE_STEPS = [
  { key: "pending", label: "Gửi yêu cầu" },
  { key: "approved", label: "Shop duyệt" },
  { key: "shipping_back", label: "Đang trả hàng" },
  { key: "completed", label: "Đã nhận hàng" },
  { key: "refunded", label: "Hoàn tiền" },
];

export default function ReturnDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnId: string }>();
  const [loading, setLoading] = useState(true);
  const [returnData, setReturnData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const init = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);

      const data = await getReturnDetail(Number(params.returnId));
      setReturnData(data);
    } catch (err: any) {
      console.error("Lỗi load return detail:", err.message);
    } finally {
      setLoading(false);
    }
  }, [params.returnId]);

  useEffect(() => {
    init();
  }, [init]);

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await cancelReturn(Number(params.returnId), user.id);
      setShowCancelModal(false);
      alert("Đã hủy yêu cầu trả hàng");
      init();
    } catch (err: any) {
      alert(err.message || "Không thể hủy yêu cầu");
    } finally {
      setCancelling(false);
    }
  };

  const getCurrentStepIndex = (status: string) => {
    if (status === "rejected" || status === "cancelled") return -1;
    const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
    return idx;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <CommonHeader
          renderLeft={() => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <ChevronLeft size={28} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
          renderRight={() => <View />}
          title="Chi tiết trả hàng"
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const status = returnData?.status || "pending";
  const statusLabel = RETURN_STATUS_LABELS[status] || status;
  const statusColor = RETURN_STATUS_COLORS[status] || "#999";
  const currentStepIdx = getCurrentStepIndex(status);
  const isRejectedOrCancelled = status === "rejected" || status === "cancelled";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <CommonHeader
        renderLeft={() => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={28} color={COLORS.secondary} />
          </TouchableOpacity>
        )}
        renderRight={
          status === "pending"
            ? () => (
                <TouchableOpacity onPress={() => setShowCancelModal(true)}>
                  <XCircle size={22} color={COLORS.danger} />
                </TouchableOpacity>
              )
            : () => <View />
        }
        title="Chi tiết trả hàng"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Header */}
        <LinearGradient
          colors={[statusColor + "15", statusColor + "05"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statusHeader}
        >
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {statusLabel}
            </Text>
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
          </View>
          <Text style={styles.statusDate}>
            Ngày tạo: {formatDate(returnData?.created_at)}
          </Text>
          <Text style={styles.refundSummary}>
            Hoàn tiền:{" "}
            <Text style={styles.refundAmount}>
              {Number(returnData?.refund_amount || 0).toLocaleString("vi-VN")}₫
            </Text>
          </Text>
        </LinearGradient>

        {/* Timeline */}
        {!isRejectedOrCancelled && (
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Trạng thái xử lý</Text>
            <View style={styles.timeline}>
              {TIMELINE_STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineDot,
                          isCompleted && styles.timelineDotActive,
                          isCurrent && styles.timelineDotCurrent,
                        ]}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle2 size={14} color="#fff" />
                        ) : null}
                      </View>
                      {idx < TIMELINE_STEPS.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            idx < currentStepIdx && styles.timelineLineActive,
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.timelineRight}>
                      <Text
                        style={[
                          styles.stepLabel,
                          isCompleted
                            ? styles.stepLabelActive
                            : styles.stepLabelInactive,
                          isCurrent && styles.stepLabelCurrent,
                        ]}
                      >
                        {step.label}
                      </Text>
                      {isCurrent && (
                        <Text style={styles.stepHint}>Đang xử lý...</Text>
                      )}
                      {isCompleted && !isCurrent && step.key === status && (
                        <Text style={styles.stepTime}>
                          {formatDate(returnData?.[getTimestampField(status)])}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Rejected/Cancelled Info */}
        {isRejectedOrCancelled && (
          <View
            style={[
              styles.sectionCard,
              { borderLeftWidth: 4, borderLeftColor: statusColor },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <AlertTriangle size={20} color={statusColor} />
              <Text style={[styles.rejectedTitle, { color: statusColor }]}>
                {status === "rejected"
                  ? "Yêu cầu bị từ chối"
                  : "Yêu cầu đã hủy"}
              </Text>
            </View>
            {returnData?.rejection_reason && (
              <Text style={styles.rejectionReason}>
                Lý do: {returnData.rejection_reason}
              </Text>
            )}
          </View>
        )}

        {/* Return Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sản phẩm trả hàng</Text>
          {(returnData?.return_items || []).map((item: any, idx: number) => {
            const img =
              item.products?.images?.[0] ||
              getProductImageByColor(
                item.products,
                item.order_items?.selected_variant?.color,
              );

            return (
              <View key={idx} style={styles.detailItem}>
                <Image
                  source={{
                    uri: img || "https://via.placeholder.com/60",
                  }}
                  style={styles.detailItemImage}
                />
                <View style={styles.detailItemInfo}>
                  <Text style={styles.detailItemName} numberOfLines={2}>
                    {item.products?.name || "Sản phẩm"}
                  </Text>
                  <Text style={styles.detailItemVariant}>
                    {COLOR_TRANSLATIONS[
                      item.order_items?.selected_variant?.color?.toLowerCase()
                    ] || item.order_items?.selected_variant?.color}
                    , {item.order_items?.selected_variant?.size}
                  </Text>
                  <View style={styles.detailItemRow}>
                    <Text style={styles.detailItemQty}>
                      SL: {item.quantity}
                    </Text>
                    <Text style={styles.detailItemRefund}>
                      {Number(item.refund_amount).toLocaleString("vi-VN")}₫
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Reason & Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin yêu cầu</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại yêu cầu:</Text>
            <Text style={styles.infoValue}>
              {returnData?.request_type === "exchange"
                ? "Đổi hàng"
                : "Trả hàng hoàn tiền"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lý do:</Text>
            <Text style={styles.infoValue}>{returnData?.reason}</Text>
          </View>

          {returnData?.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mô tả:</Text>
              <Text style={styles.infoValueDesc}>{returnData.description}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phương thức hoàn tiền:</Text>
            <Text style={styles.infoValue}>
              {returnData?.refund_method === "bank_transfer"
                ? "Chuyển khoản ngân hàng"
                : returnData?.refund_method === "wallet"
                  ? "Ví điện tử"
                  : "Nguyên phương thức TT"}
            </Text>
          </View>

          {returnData?.refund_method === "bank_transfer" && (
            <>
              {returnData?.bank_name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ngân hàng:</Text>
                  <Text style={styles.infoValue}>{returnData.bank_name}</Text>
                </View>
              )}
              {returnData?.bank_account_name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Chủ TK:</Text>
                  <Text style={styles.infoValue}>
                    {returnData.bank_account_name}
                  </Text>
                </View>
              )}
            </>
          )}

          {returnData?.admin_notes && (
            <View
              style={[
                styles.infoRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: "#F0F0F0",
                  paddingTop: 10,
                  marginTop: 8,
                },
              ]}
            >
              <Text style={styles.infoLabel}>Ghi chú shop:</Text>
              <Text style={styles.infoValueDesc}>{returnData.admin_notes}</Text>
            </View>
          )}
        </View>

        {/* Evidence Images */}
        {returnData?.evidence_images?.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Hình ảnh minh chứng</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {returnData.evidence_images.map((imgUrl: string, idx: number) => (
                <Image
                  key={idx}
                  source={{ uri: imgUrl }}
                  style={styles.evidenceImage}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Cancel Button */}
        {status === "pending" && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowCancelModal(true)}
            activeOpacity={0.7}
          >
            <X size={18} color={COLORS.danger} />
            <Text style={styles.cancelBtnText}>Hủy yêu cầu trả hàng</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCancelModal(false)}
        />
        <View style={styles.cancelModalContent}>
          <AlertTriangle size={40} color={COLORS.warning} />
          <Text style={styles.cancelModalTitle}>Xác nhận hủy?</Text>
          <Text style={styles.cancelModalDesc}>
            Yêu cầu trả hàng sẽ bị hủy và không thể khôi phục.
          </Text>
          <View style={styles.cancelModalActions}>
            <TouchableOpacity
              style={styles.cancelModalNo}
              onPress={() => setShowCancelModal(false)}
            >
              <Text style={styles.cancelModalNoText}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelModalYes}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.cancelModalYesText}>Xác nhận hủy</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getTimestampField(status: string): string {
  switch (status) {
    case "approved":
      return "approved_at";
    case "shipping_back":
      return "shipped_back_at";
    case "completed":
      return "completed_at";
    case "refunded":
      return "refunded_at";
    default:
      return "created_at";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backBtn: { padding: 4, marginLeft: -8 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  statusHeader: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 18,
    borderRadius: 16,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusLabel: { fontSize: 22, fontWeight: "800" },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  refundSummary: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  refundAmount: { fontWeight: "700", color: COLORS.danger, fontSize: 16 },

  timelineSection: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
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
    marginBottom: 16,
  },
  timeline: {},
  timelineStep: { flexDirection: "row" },
  timelineLeft: { alignItems: "center", width: 30, paddingTop: 3 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#DDD",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  timelineDotCurrent: {
    borderColor: COLORS.primary,
    backgroundColor: "#fff",
  },
  timelineLine: { width: 2, height: 32, backgroundColor: "#EEE" },
  timelineLineActive: { backgroundColor: COLORS.primary },
  timelineRight: { flex: 1, paddingLeft: 12, paddingBottom: 16 },
  stepLabel: { fontSize: 14, fontWeight: "500" },
  stepLabelActive: { color: COLORS.secondary },
  stepLabelInactive: { color: "#AAA" },
  stepLabelCurrent: { color: COLORS.primary, fontWeight: "700" },
  stepHint: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  stepTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  sectionCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rejectedTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  rejectionReason: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },

  detailItem: { flexDirection: "row", marginBottom: 14, alignItems: "center" },
  detailItemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    marginRight: 14,
  },
  detailItemInfo: { flex: 1 },
  detailItemName: { fontSize: 14, fontWeight: "600", color: COLORS.secondary },
  detailItemVariant: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  detailItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  detailItemQty: { fontSize: 13, color: COLORS.textSecondary },
  detailItemRefund: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.success,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, width: 130 },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.secondary,
    flex: 1,
    textAlign: "right",
  },
  infoValueDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: "right",
    lineHeight: 19,
  },

  evidenceImage: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.35,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: "#F5F5F5",
  },

  cancelBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: "#FFF5F5",
  },
  cancelBtnText: { color: COLORS.danger, fontSize: 15, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: SCREEN_WIDTH * 0.82,
    alignItems: "center",
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginTop: 14,
  },
  cancelModalDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
  cancelModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  cancelModalNo: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  cancelModalNoText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  cancelModalYes: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: "center",
  },
  cancelModalYesText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
