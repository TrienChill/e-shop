import { listOrders, updateOrderStatus, pushOrderToGHN } from "@/src/services/admin/orders";
import { hexToRgba } from "@/src/context/AppearanceContext";
import { ArrowUp, Check, Clock, Package, Search, Settings, Truck, XCircle, Printer, ExternalLink } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { InvoiceTemplate, InvoiceOrderData } from "@/src/components/admin/InvoiceTemplate";
import {
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const STATUS_LABELS: any = {
  pending: "Chờ xử lý",
  processing: "Đang chuẩn bị",
  shipping: "Đang giao",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: any = {
  pending: "#F59E0B",
  processing: "#2563EB",
  shipping: "#8B5CF6",
  completed: "#10B981",
  cancelled: "#EF4444",
};

const STATUS_TABS = [
  { id: "all", label: "Tất cả", icon: Package },
  { id: "pending", label: "Chờ duyệt", icon: Clock },
  { id: "processing", label: "Đang chuẩn bị", icon: Settings },
  { id: "shipping", label: "Đang giao", icon: Truck },
  { id: "completed", label: "Thành công", icon: Check },
  { id: "cancelled", label: "Đã hủy", icon: XCircle },
];


// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Per-order loading state
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // GHN Result Modal
  const [ghnModal, setGhnModal] = useState<{
    visible: boolean;
    success: boolean;
    trackingCode?: string;
    errorMsg?: string;
  }>({ visible: false, success: false });

  const scrollRef = useRef<ScrollView>(null);

  // Print Logic
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<InvoiceOrderData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const reactToPrintFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Hoa-Don-${selectedPrintOrder?.id || "DH"}`,
    onAfterPrint: () => setSelectedPrintOrder(null),
  });

  const handlePrintDraft = async (order: any) => {
    const printData: InvoiceOrderData = {
      id: order.id,
      created_at: order.created_at,
      receiver_name: order.receiver_name,
      phone_contact: order.phone_contact,
      shipping_address: order.shipping_address,
      total_amount: order.total_amount,
      shipping_fee: 0,
      items: order.order_items || [],
    };
    setSelectedPrintOrder(printData);
  };

  useEffect(() => {
    if (selectedPrintOrder?.id) {
      reactToPrintFn();
    }
  }, [selectedPrintOrder]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listOrders();
      setOrders(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /**
   * Đẩy đơn lên GHN và cập nhật trạng thái.
   * Checkout đã bắt buộc có mã GHN → push thẳng, không cần modal chỉnh sửa.
   */
  const attemptGHNPushAndUpdateStatus = async (order: any, newStatus: string) => {
    setProcessingOrderId(order.id);
    try {
      const trackingCode = await pushOrderToGHN(order);
      await updateOrderStatus(order.id, newStatus);
      await fetchOrders();
      setGhnModal({ visible: true, success: true, trackingCode });
    } catch (ghnErr: any) {
      // Lỗi GHN (API, network, thiếu dữ liệu...) → hỏi admin có tiếp tục không
      const continueWithout =
        typeof window !== "undefined" &&
        window.confirm(
          `⚠️ Lỗi khi đẩy đơn lên GHN:\n${ghnErr.message}\n\nTiếp tục chuyển trạng thái mà không có mã vận đơn?`
        );
      if (continueWithout) {
        await updateOrderStatus(order.id, newStatus);
        await fetchOrders();
        setGhnModal({ visible: true, success: false, errorMsg: ghnErr.message });
      }
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleUpdateStatus = async (order: any, newStatus: string) => {
    // Khi duyệt (pending→processing) hoặc giao nhưng chưa có tracking → push GHN
    const shouldPushGHN =
      newStatus === "processing" ||
      (newStatus === "shipping" && !order.ghn_order_code);

    if (shouldPushGHN) {
      await attemptGHNPushAndUpdateStatus(order, newStatus);
      return;
    }

    // Các trạng thái còn lại: chỉ cập nhật status
    setProcessingOrderId(order.id);
    try {
      await updateOrderStatus(order.id, newStatus);
      await fetchOrders();
    } catch (e: any) {
      alert("Lỗi cập nhật trạng thái: " + e.message);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    const matchId    = String(order.id               || "").toLowerCase().includes(query);
    const matchName  = String(order.receiver_name    || "").toLowerCase().includes(query);
    const matchPhone = String(order.phone_contact    || "").toLowerCase().includes(query);
    const matchGHN   = String(order.ghn_order_code   || "").toLowerCase().includes(query);
    const matchesSearch = matchId || matchName || matchPhone || matchGHN;
    const matchesTab    = activeTab === "all" || order.status === activeTab;
    return matchesTab && matchesSearch;
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Quản lý Đơn hàng</Text>
            <Text style={styles.subtitle}>
              Duyệt đơn hàng để tự động đẩy lên GHN và lấy mã vận đơn.
            </Text>
          </View>
          <View style={styles.searchContainer}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Tìm theo ID, tên, SĐT hoặc mã vận đơn..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {STATUS_TABS.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={StyleSheet.flatten([styles.tab, activeTab === tab.id && styles.tabActive])}
              >
                <tab.icon size={16} color={activeTab === tab.id ? "#2563EB" : "#9CA3AF"} />
                <Text style={StyleSheet.flatten([styles.tabText, activeTab === tab.id && styles.tabTextActive])}>
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
              <Text style={StyleSheet.flatten([styles.columnId, styles.headerText])}>ID & Ngày</Text>
              <Text style={StyleSheet.flatten([styles.columnCustomer, styles.headerText])}>Khách hàng</Text>
              <Text style={StyleSheet.flatten([styles.columnAmount, styles.headerText, styles.textRight])}>Tổng tiền</Text>
              <Text style={StyleSheet.flatten([styles.columnTracking, styles.headerText, styles.textCenter])}>Mã vận đơn GHN</Text>
              <Text style={StyleSheet.flatten([styles.columnStatus, styles.headerText, styles.textCenter])}>Trạng thái</Text>
              <Text style={StyleSheet.flatten([styles.columnActions, styles.headerText, styles.textRight])}>Hành động</Text>
            </View>

            {/* TABLE BODY */}
            <View>
              {filteredOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không tìm thấy đơn hàng nào.</Text>
                </View>
              ) : (
                filteredOrders.map((order) => {
                  const isProcessingThis = processingOrderId === order.id;
                  return (
                    <View key={order.id} style={styles.row}>
                      {/* ID & Ngày */}
                      <View style={styles.columnId}>
                        <Text style={styles.orderId}>#{String(order.id).slice(-8)}</Text>
                        <Text style={styles.orderDate}>
                          {new Date(order.created_at).toLocaleString("vi-VN")}
                        </Text>
                      </View>

                      {/* Khách hàng */}
                      <View style={styles.columnCustomer}>
                        <Text style={styles.customerName}>{order.receiver_name || "N/A"}</Text>
                        <Text style={styles.customerPhone}>{order.phone_contact}</Text>
                      </View>

                      {/* Tổng tiền */}
                      <View style={styles.columnAmount}>
                        <Text style={styles.amountText}>
                          {order.total_amount?.toLocaleString("vi-VN")}₫
                        </Text>
                      </View>

                      {/* Mã vận đơn GHN */}
                      <View style={StyleSheet.flatten([styles.columnTracking, styles.itemsCenter])}>
                        {order.ghn_order_code ? (
                          <View style={styles.trackingContainer}>
                            <Text style={styles.trackingCode}>{order.ghn_order_code}</Text>
                            <Pressable
                              onPress={() => {
                                const url = `https://tracking.ghn.dev/?order_code=${order.ghn_order_code}`;
                                if (typeof window !== "undefined") window.open(url, "_blank");
                              }}
                              style={styles.trackingLink}
                            >
                              <ExternalLink size={12} color="#2563EB" />
                            </Pressable>
                          </View>
                        ) : (
                          <Text style={styles.noTracking}>—</Text>
                        )}
                      </View>

                      {/* Trạng thái */}
                      <View style={StyleSheet.flatten([styles.columnStatus, styles.itemsCenter])}>
                        <View style={StyleSheet.flatten([
                          styles.statusBadge,
                          { backgroundColor: hexToRgba(STATUS_COLORS[order.status] ?? '#000000', 0.12) }
                        ])}>
                          <Text style={StyleSheet.flatten([
                            styles.statusText,
                            { color: STATUS_COLORS[order.status] }
                          ])}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Text>
                        </View>
                      </View>

                      {/* Hành động */}
                      <View style={StyleSheet.flatten([styles.columnActions, styles.actionsContainer])}>
                        {isProcessingThis ? (
                          <View style={styles.buttonLoading}>
                            <ActivityIndicator size="small" color="#2563EB" />
                            <Text style={styles.buttonLoadingText}>Đang xử lý...</Text>
                          </View>
                        ) : (
                          <>
                            <ActionButton onPress={() => handlePrintDraft(order)} label="In HĐ" color="#1F2937" />
                            {order.status === "pending" && (
                              <ActionButton
                                onPress={() => handleUpdateStatus(order, "processing")}
                                label="Duyệt →GHN"
                                color="#2563EB"
                              />
                            )}
                            {order.status === "processing" && (
                              <ActionButton
                                onPress={() => handleUpdateStatus(order, "shipping")}
                                label="Giao"
                                color="#8B5CF6"
                              />
                            )}
                            {order.status === "shipping" && (
                              <ActionButton
                                onPress={() => handleUpdateStatus(order, "completed")}
                                label="Xong"
                                color="#10B981"
                              />
                            )}
                            {["pending", "processing"].includes(order.status) && (
                              <ActionButton
                                onPress={() => handleUpdateStatus(order, "cancelled")}
                                label="Hủy"
                                color="#EF4444"
                                outline
                              />
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* SCROLL TOP */}
      {showScrollTop && (
        <Pressable
          onPress={scrollToTop}
          style={({ hovered }: any) => [
            styles.scrollTopButton,
            hovered && styles.scrollTopButtonHover
          ]}
        >
          <ArrowUp size={24} color="white" />
        </Pressable>
      )}

      {/* INVOICE PRINT */}
      {Platform.OS === "web" && (
        <div style={{ display: "none" }}>
          <InvoiceTemplate ref={printRef} order={selectedPrintOrder} />
        </div>
      )}



      {/* ── GHN Result Modal ── */}
      <Modal
        visible={ghnModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setGhnModal({ visible: false, success: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {ghnModal.success ? (
              <>
                <View style={styles.modalIconSuccess}>
                  <Check size={32} color="white" />
                </View>
                <Text style={styles.modalTitle}>Đẩy GHN thành công! 🎉</Text>
                <Text style={styles.modalSubtitle}>Mã vận đơn của đơn hàng:</Text>
                <View style={styles.trackingCodeBox}>
                  <Text style={styles.trackingCodeLarge}>{ghnModal.trackingCode}</Text>
                </View>
                <Text style={styles.modalHint}>
                  GHN đã nhận đơn và sẽ cử shipper đến lấy hàng. Khách có thể tra cứu tại GHN Tracking.
                </Text>
                <Pressable
                  style={styles.modalBtn}
                  onPress={() => {
                    const url = `https://tracking.ghn.dev/?order_code=${ghnModal.trackingCode}`;
                    if (typeof window !== "undefined") window.open(url, "_blank");
                  }}
                >
                  <ExternalLink size={16} color="white" />
                  <Text style={styles.modalBtnText}>Xem trên GHN Tracking</Text>
                </Pressable>
                <Pressable style={styles.modalBtnOutline} onPress={() => setGhnModal({ visible: false, success: false })}>
                  <Text style={styles.modalBtnOutlineText}>Đóng</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.modalIconError}>
                  <XCircle size={32} color="white" />
                </View>
                <Text style={styles.modalTitle}>Không thể đẩy lên GHN</Text>
                <Text style={styles.modalErrorMsg}>{ghnModal.errorMsg}</Text>
                <Text style={styles.modalHint}>
                  Đơn hàng đã cập nhật trạng thái nhưng chưa có mã vận đơn. Bạn có thể thử lại bằng nút "Giao".
                </Text>
                <Pressable style={styles.modalBtnOutline} onPress={() => setGhnModal({ visible: false, success: false })}>
                  <Text style={styles.modalBtnOutlineText}>Đóng</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionButton({ onPress, label, color, outline = false }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => StyleSheet.flatten([
        styles.actionButton,
        {
          backgroundColor: outline ? "transparent" : color,
          borderWidth: outline ? 1 : 0,
          borderColor: color,
          opacity: hovered ? 0.8 : 1
        }
      ])}
    >
      <Text style={StyleSheet.flatten([styles.actionButtonText, { color: outline ? color : "white" }])}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 40 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 32,
  },
  title: { fontSize: 30, fontWeight: "800", color: "#111827", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  searchContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "white",
    borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB",
    paddingHorizontal: 16, height: 48, width: 380,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)", elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, outlineStyle: "none" as any },
  tabsContainer: { marginBottom: 24 },
  tabsScroll: { gap: 12 },
  tab: {
    flexDirection: "row", alignItems: "center", backgroundColor: "white",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: "#E5E7EB", gap: 8,
  },
  tabActive: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#2563EB" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  errorContainer: { padding: 40, alignItems: "center" },
  errorText: { color: "#EF4444", marginTop: 16, fontWeight: "700" },
  tableCard: {
    backgroundColor: "white", borderRadius: 16, borderWidth: 1,
    borderColor: "#E5E7EB", overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)", elevation: 2,
  },
  tableHeader: {
    flexDirection: "row", backgroundColor: "#F9FAFB",
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
    paddingHorizontal: 24, paddingVertical: 16,
  },
  headerText: { fontWeight: "700", color: "#4B5563", fontSize: 13 },
  row: {
    flexDirection: "row", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    paddingHorizontal: 24, paddingVertical: 20,
  },
  columnId: { flex: 1.5 },
  columnCustomer: { flex: 2 },
  columnAmount: { flex: 1 },
  columnTracking: { flex: 1.8 },
  columnStatus: { flex: 1 },
  columnActions: { flex: 2 },
  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  itemsCenter: { alignItems: "center" },
  orderId: { fontWeight: "700", color: "#111827", textTransform: "uppercase" },
  orderDate: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  customerName: { fontSize: 14, fontWeight: "600", color: "#374151" },
  customerPhone: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  amountText: { fontWeight: "700", color: "#2563EB", textAlign: "right" },
  trackingContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  trackingCode: {
    fontSize: 12, fontWeight: "700", color: "#065F46",
    backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, fontFamily: "monospace" as any,
  },
  trackingLink: { padding: 2 },
  noTracking: { fontSize: 14, color: "#D1D5DB", fontWeight: "500" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  actionsContainer: { flexDirection: "row", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  actionButton: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    alignItems: "center", justifyContent: "center", minWidth: 50,
  },
  actionButtonText: { fontSize: 11, fontWeight: "700" },
  buttonLoading: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "#EFF6FF", borderRadius: 8,
    minWidth: 120, justifyContent: "center",
  },
  buttonLoadingText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  emptyContainer: { paddingVertical: 80, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#9CA3AF", fontSize: 14 },
  mobilePlaceholder: { padding: 40 },
  scrollTopButton: {
    position: "absolute", bottom: 40, right: 40,
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#111827",
    alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)", elevation: 8,
  },
  scrollTopButtonHover: { backgroundColor: "#374151", marginTop: -2 },

  // ── GHN Address Fixer ──
  fixerHeader: {
    flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16,
  },
  fixerIconBox: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: "#2563EB",
    alignItems: "center", justifyContent: "center",
  },
  fixerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  fixerSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  fixerHint: {
    fontSize: 13, color: "#6B7280", backgroundColor: "#F3F4F6",
    padding: 12, borderRadius: 8, marginBottom: 4,
  },
  fixerHint2: {
    fontSize: 13, color: "#6B7280", marginBottom: 16,
  },
  pickerRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  pickerCol: { flex: 1 },
  pickerLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  pickerSearch: {
    height: 36, borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 8, paddingHorizontal: 10, fontSize: 13,
    backgroundColor: "white", marginBottom: 6, outlineStyle: "none" as any,
  },
  pickerList: { height: 220, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, backgroundColor: "white" },
  pickerItem: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  pickerItemActive: { backgroundColor: "#EFF6FF" },
  pickerItemText: { fontSize: 13, color: "#374151" },
  pickerItemTextActive: { color: "#2563EB", fontWeight: "700" },
  pickerEmpty: { padding: 12, fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 8 },
  selectedSummary: {
    backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#10B981",
    borderRadius: 8, padding: 12, marginBottom: 12,
  },
  selectedSummaryText: { fontSize: 13, fontWeight: "600", color: "#065F46", marginBottom: 4 },
  selectedSummaryCode: { fontSize: 11, color: "#6B7280", fontFamily: "monospace" as any },
  fixerError: {
    backgroundColor: "#FEF2F2", borderRadius: 8, padding: 12, marginBottom: 12,
  },
  fixerErrorText: { fontSize: 13, color: "#EF4444" },
  fixerActions: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },

  // ── GHN Result Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "white", borderRadius: 24, padding: 40, width: 440,
    alignItems: "center",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)", elevation: 20,
  },
  modalIconSuccess: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#10B981",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  modalIconError: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" },
  modalSubtitle: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  trackingCodeBox: {
    backgroundColor: "#F0FDF4", borderWidth: 2, borderColor: "#10B981",
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    marginBottom: 16, width: "100%", alignItems: "center",
  },
  trackingCodeLarge: {
    fontSize: 22, fontWeight: "800", color: "#065F46",
    letterSpacing: 2, fontFamily: "monospace" as any,
  },
  modalHint: {
    fontSize: 13, color: "#6B7280", textAlign: "center",
    lineHeight: 20, marginBottom: 24, paddingHorizontal: 8,
  },
  modalErrorMsg: {
    fontSize: 13, color: "#EF4444", textAlign: "center",
    marginBottom: 12, backgroundColor: "#FEF2F2",
    padding: 12, borderRadius: 8, width: "100%",
  },
  modalBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#2563EB", borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14,
    width: "100%", justifyContent: "center", marginBottom: 12,
  },
  modalBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  modalBtnOutline: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14, width: "100%", alignItems: "center",
  },
  modalBtnOutlineText: { color: "#374151", fontWeight: "600", fontSize: 15 },
});
