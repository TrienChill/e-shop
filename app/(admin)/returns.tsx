import { supabase } from "@/src/lib/supabase";
import {
  approveReturn,
  completeReturn,
  getAdminReturnDetail,
  listAllReturns,
  markShippingBack,
  processRefund,
  rejectReturn,
  RETURN_STATUS_COLORS,
  RETURN_STATUS_LABELS,
} from "@/src/services/admin/returns";
import {
  AlertTriangle,
  Check,
  Clock,
  DollarSign,
  PackageX,
  RotateCcw,
  Search,
  Truck,
  X,
  XCircle
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const STATUS_TABS = [
  { id: "all", label: "Tất cả", icon: PackageX },
  { id: "pending", label: "Chờ xử lý", icon: Clock },
  { id: "approved", label: "Đã duyệt", icon: Check },
  { id: "shipping_back", label: "Đang trả hàng", icon: Truck },
  { id: "completed", label: "Hoàn thành", icon: Check },
  { id: "refunded", label: "Đã hoàn tiền", icon: DollarSign },
  { id: "rejected", label: "Bị từ chối", icon: XCircle },
];

const STATUS_ACTIONS: Record<string, Array<{ key: string; label: string; color: string }>> = {
  pending: [
    { key: "approve", label: "Duyệt", color: "#2563EB" },
    { key: "reject", label: "Từ chối", color: "#EF4444" },
  ],
  approved: [
    { key: "shipping_back", label: "Đang trả về", color: "#8B5CF6" },
  ],
  shipping_back: [
    { key: "complete", label: "Nhận hàng + Restock", color: "#10B981" },
  ],
  completed: [
    { key: "refund", label: "Hoàn tiền", color: "#059669" },
  ],
};

export default function AdminReturnsScreen() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Detail Modal
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAllReturns({ status: activeTab });
      setReturns(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [activeTab]);

  const handleAction = async (ret: any, actionKey: string) => {
    setProcessingId(ret.id);

    try {
      const {
        data: { user: admin },
      } = await supabase.auth.getUser();
      if (!admin) throw new Error("Chưa đăng nhập admin");

      switch (actionKey) {
        case "approve":
          await approveReturn(ret.id, admin.id);
          break;
        case "reject":
          setRejectTargetId(ret.id);
          setRejectReason("");
          setShowRejectModal(true);
          setProcessingId(null);
          return;
        case "shipping_back":
          await markShippingBack(ret.id, admin.id);
          break;
        case "complete":
          await completeReturn(ret.id, admin.id);
          break;
        case "refund":
          await processRefund(ret.id, admin.id);
          break;
        default:
          throw new Error("Hành động không hợp lệ");
      }

      alert("Thao tác thành công!");
      fetchReturns();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      setProcessingId(rejectTargetId);
      const {
        data: { user: admin },
      } = await supabase.auth.getUser();

      await rejectReturn(rejectTargetId!, admin!.id, rejectReason);
      alert("Đã từ chối yêu cầu trả hàng");
      setShowRejectModal(false);
      fetchReturns();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const openDetail = async (ret: any) => {
    try {
      const detail = await getAdminReturnDetail(ret.id);
      setDetailData(detail);
      setShowDetail(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredReturns = returns.filter((ret) => {
    const q = searchQuery.toLowerCase();
    const matchId = String(ret.id || "").includes(q);
    const matchOrder = String(ret.order_id || "").includes(q);
    const matchName =
      String(ret.profiles?.full_name || "").toLowerCase().includes(q);
    const matchPhone = String(ret.profiles?.phone || "").includes(q);
    const matchReason = String(ret.reason || "").toLowerCase().includes(q);
    return matchId || matchOrder || matchName || matchPhone || matchReason;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (Platform.OS !== "web") {
    return (
      <View style={styles.mobilePlaceholder}>
        <Text>Giao diện Admin tối ưu cho trình duyệt Web.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Quản lý Trả/Hoàn hàng</Text>
            <Text style={styles.subtitle}>
              Duyệt và xử lý các yêu cầu trả hàng từ khách hàng.
            </Text>
          </View>
          <View style={styles.searchContainer}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Tìm theo ID đơn, tên, SĐT, lý do..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {STATUS_TABS.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              >
                <tab.icon
                  size={16}
                  color={activeTab === tab.id ? "#2563EB" : "#9CA3AF"}
                />
                <Text
                  style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* CONTENT */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <XCircle size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {/* TABLE HEADER */}
            <View style={styles.tableHeader}>
              <Text style={[styles.colId, styles.th]}>ID</Text>
              <Text style={[styles.colCustomer, styles.th]}>Khách hàng</Text>
              <Text style={[styles.colOrder, styles.th]}>Đơn hàng</Text>
              <Text style={[styles.colAmount, styles.th, styles.textRight]}>
                Hoàn tiền
              </Text>
              <Text style={[styles.colStatus, styles.th, styles.textCenter]}>
                Trạng thái
              </Text>
              <Text style={[styles.colActions, styles.th, styles.textRight]}>
                Hành động
              </Text>
            </View>

            {/* TABLE BODY */}
            <View>
              {filteredReturns.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <RotateCcw size={40} color="#CCC" />
                  <Text style={styles.emptyText}>
                    Không có yêu cầu trả hàng nào.
                  </Text>
                </View>
              ) : (
                filteredReturns.map((ret) => {
                  const isProcessing = processingId === ret.id;
                  const actions = STATUS_ACTIONS[ret.status];
                  const statusColor =
                    RETURN_STATUS_COLORS[ret.status] || "#999";

                  return (
                    <View key={ret.id} style={styles.row}>
                      {/* ID */}
                      <View style={styles.colId}>
                        <Text style={styles.cellId}>#{ret.id}</Text>
                        <Text style={styles.cellDate}>
                          {formatDate(ret.created_at)}
                        </Text>
                      </View>

                      {/* Customer */}
                      <View style={styles.colCustomer}>
                        <Text style={styles.customerName}>
                          {ret.profiles?.full_name || "N/A"}
                        </Text>
                        <Text style={styles.customerPhone}>
                          {ret.profiles?.phone || "-"}
                        </Text>
                      </View>

                      {/* Order */}
                      <View style={styles.colOrder}>
                        <Text
                          style={styles.orderLink}
                          onPress={() => openDetail(ret)}
                        >
                          #{String(ret.order_id).slice(-8)}
                        </Text>
                        <Text style={styles.reasonPreview}>
                          {ret.reason?.slice(0, 30)}
                          {ret.reason?.length > 30 ? "..." : ""}
                        </Text>
                      </View>

                      {/* Amount */}
                      <View style={[styles.colAmount, styles.textRight]}>
                        <Text style={styles.amountText}>
                          {Number(ret.refund_amount || 0).toLocaleString(
                            "vi-VN"
                          )}
                          ₫
                        </Text>
                      </View>

                      {/* Status */}
                      <View
                        style={[
                          styles.colStatus,
                          styles.itemsCenter,
                          styles.textCenter,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusColor + "18" },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: statusColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: statusColor },
                            ]}
                          >
                            {RETURN_STATUS_LABELS[ret.status] || ret.status}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View
                        style={[
                          styles.colActions,
                          styles.textRight,
                          styles.actionsRow,
                        ]}
                      >
                        {isProcessing ? (
                          <ActivityIndicator
                            size="small"
                            color="#2563EB"
                          />
                        ) : actions ? (
                          actions.map((action) => (
                            <Pressable
                              key={action.key}
                              style={[
                                styles.actionBtn,
                                { backgroundColor: action.color + "15" },
                              ]}
                              onPress={() => handleAction(ret, action.key)}
                            >
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  { color: action.color },
                                ]}
                              >
                                {action.label}
                              </Text>
                            </Pressable>
                          ))
                        ) : (
                          <Text style={styles.noAction}>-</Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDetail(false)}
        />
        <View style={styles.detailSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              Chi tiết yêu cầu #{detailData?.id}
            </Text>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <X size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {detailData && (
            <ScrollView style={{ maxHeight: 500 }}>
              {/* Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Khách hàng</Text>
                <Text style={styles.detailValue}>
                  {detailData.profiles?.full_name} -{" "}
                  {detailData.profiles?.phone}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Loại</Text>
                <Text style={styles.detailValue}>
                  {detailData.request_type === "exchange"
                    ? "Đổi hàng"
                    : "Trả hàng hoàn tiền"}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Lý do</Text>
                <Text style={styles.detailValue}>{detailData.reason}</Text>
              </View>

              {detailData.description && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Mô tả</Text>
                  <Text style={styles.detailValue}>
                    {detailData.description}
                  </Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Phương thức HT</Text>
                <Text style={styles.detailValue}>
                  {detailData.refund_method === "bank_transfer"
                    ? `CK: ${detailData.bank_name} - ${detailData.bank_account_name}`
                    : detailData.refund_method === "wallet"
                      ? "Ví điện tử"
                      : "Nguyên phương thức TT"}
                </Text>
              </View>

              {/* Items */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Sản phẩm trả</Text>
                {(detailData.return_items || []).map(
                  (item: any, idx: number) => (
                    <View key={idx} style={styles.detailItemRow}>
                      <Text style={styles.detailItemName}>
                        x{item.quantity} - {item.products?.name || "SP#" + item.product_id}
                      </Text>
                      <Text style={styles.detailItemPrice}>
                        {Number(item.refund_amount).toLocaleString("vi-VN")}₫
                      </Text>
                    </View>
                  )
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Tổng hoàn tiền</Text>
                <Text style={styles.detailTotal}>
                  {Number(detailData.refund_amount || 0).toLocaleString(
                    "vi-VN"
                  )}
                  ₫
                </Text>
              </View>

              {detailData.admin_notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Ghi chú admin</Text>
                  <Text style={styles.detailValue}>
                    {detailData.admin_notes}
                  </Text>
                </View>
              )}

              {detailData.rejection_reason && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Lý do từ chối</Text>
                  <Text style={[styles.detailValue, { color: "#EF4444" }]}>
                    {detailData.rejection_reason}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRejectModal(false)}
        />
        <View style={styles.rejectModal}>
          <AlertTriangle size={36} color="#F59E0B" />
          <Text style={styles.rejectTitle}>Từ chối yêu cầu trả hàng</Text>
          <Text style={styles.rejectDesc}>
            Nhập lý do từ chối để thông báo cho khách hàng:
          </Text>
          <TextInput
            style={styles.rejectInput}
            placeholder="Lý do từ chối..."
            placeholderTextColor="#999"
            multiline
            value={rejectReason}
            onChangeText={setRejectReason}
          />
          <View style={styles.rejectActions}>
            <Pressable
              style={styles.rejectCancelBtn}
              onPress={() => setShowRejectModal(false)}
            >
              <Text style={styles.rejectCancelText}>Quay lại</Text>
            </Pressable>
            <Pressable
              style={styles.rejectConfirmBtn}
              onPress={confirmReject}
              disabled={processingId !== null}
            >
              {processingId === rejectTargetId ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.rejectConfirmText}>Xác nhận từ chối</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  scrollContent: { paddingBottom: 20 },

  header: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, marginLeft: 8, color: "#111827" },

  tabsContainer: { paddingHorizontal: 24 },
  tabsScroll: { gap: 4, paddingVertical: 10 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  tabActive: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" },
  tabText: { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  tabTextActive: { color: "#2563EB", fontWeight: "600" },

  loadingContainer: { padding: 80, alignItems: "center" },
  errorContainer: { padding: 60, alignItems: "center" },
  errorText: { color: "#EF4444", marginTop: 12, fontSize: 15, textAlign: "center" },

  tableCard: {
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: "row",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
  },
  th: { fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
    alignItems: "center",
  },

  colId: { width: 100 },
  cellId: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cellDate: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  colCustomer: { width: 150 },
  customerName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  customerPhone: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  colOrder: { flex: 1 },
  orderLink: { fontSize: 13, fontWeight: "600", color: "#2563EB" },
  reasonPreview: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  colAmount: { width: 110 },
  amountText: { fontSize: 13, fontWeight: "600", color: "#059669" },

  colStatus: { width: 120 },
  itemsCenter: { alignItems: "center" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: "600" },

  colActions: { width: 180 },
  actionsRow: { gap: 6, justifyContent: "flex-end" },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 11, fontWeight: "700" },
  noAction: { fontSize: 12, color: "#CCC" },

  emptyContainer: { padding: 50, alignItems: "center" },
  emptyText: { color: "#9CA3AF", marginTop: 10, fontSize: 14 },

  textRight: { alignItems: "flex-end" },
  textCenter: { alignItems: "center", justifyContent: "center" },

  mobilePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  detailSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 20,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  detailSection: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F5F5F5", paddingBottom: 10 },
  detailLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginBottom: 4 },
  detailValue: { fontSize: 14, color: "#111827", lineHeight: 20 },
  detailItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  detailItemName: { fontSize: 13, color: "#374151" },
  detailItemPrice: { fontSize: 13, fontWeight: "600", color: "#059669" },
  detailTotal: { fontSize: 17, fontWeight: "800", color: "#EF4444" },

  rejectModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: "85%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
  },
  rejectTitle: { fontSize: 18, fontWeight: "bold", color: "#111827", marginTop: 12 },
  rejectDesc: { fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 6, lineHeight: 21 },
  rejectInput: {
    width: "100%",
    minHeight: 80,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 14,
    marginTop: 16,
    textAlignVertical: "top",
  },
  rejectActions: { flexDirection: "row", gap: 12, marginTop: 20, width: "100%" },
  rejectCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  rejectCancelText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  rejectConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  rejectConfirmText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
