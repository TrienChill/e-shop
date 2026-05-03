import { InvoiceOrderData, InvoiceTemplate } from "@/src/components/admin/InvoiceTemplate";
import { hexToRgba } from "@/src/context/AppearanceContext";
import { supabase } from "@/src/lib/supabase";
import { listOrders, pushOrderToGHN, updateOrderStatus, deleteOrders } from "@/src/services/admin/orders";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, Clock, Download, ExternalLink, Package, Plus, Search, Settings, Settings2, Trash2, Truck, XCircle } from "lucide-react-native";
import * as XLSX from 'xlsx';
import { useRouter } from "expo-router";
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";
import React, { useEffect, useRef, useState } from "react";
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
import { useReactToPrint } from "react-to-print";

const STATUS_LABELS: any = {
  pending: "Chờ xử lý",
  processing: "Đang chuẩn bị",
  shipping: "Đang giao",
  delivery_failed: "Giao thất bại",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: any = {
  pending: "#F59E0B",
  processing: "#2563EB",
  shipping: "#8B5CF6",
  delivery_failed: "#F97316",
  completed: "#10B981",
  cancelled: "#EF4444",
};

const STATUS_TABS = [
  { id: "all", label: "Tất cả", icon: Package },
  { id: "pending", label: "Chờ duyệt", icon: Clock },
  { id: "processing", label: "Đang chuẩn bị", icon: Settings },
  { id: "shipping", label: "Đang giao", icon: Truck },
  { id: "delivery_failed", label: "Giao thất bại", icon: AlertTriangle },
  { id: "completed", label: "Thành công", icon: Check },
  { id: "cancelled", label: "Đã hủy", icon: XCircle },
];


// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selection State
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    id: true,
    date: true,
    customer: true,
    phone: true,
    amount: true,
    tracking: true,
    status: true,
    actions: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' | null }>({
    key: 'created_at',
    direction: 'desc'
  });

  const togglePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setShowPageSizeDropdown(false);
  };

  // Per-order loading state
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // GHN Result Modal
  const [ghnModal, setGhnModal] = useState<{
    visible: boolean;
    success: boolean;
    trackingCode?: string;
    errorMsg?: string;
  }>({ visible: false, success: false });

  // Fail Delivery Modal
  const [failModal, setFailModal] = useState<{
    visible: boolean;
    orderId: string | null;
    reason: string;
  }>({ visible: false, orderId: null, reason: "" });

  const handleExportExcel = () => {
    if (sortedOrders.length === 0) {
      alert("Không có dữ liệu để xuất.");
      return;
    }

    // Prepare data for XLSX
    const data = sortedOrders.map(order => ({
      "Mã đơn": `#${String(order.id).slice(-8)}`,
      "Ngày đặt": new Date(order.created_at).toLocaleString("vi-VN"),
      "Tên khách": order.receiver_name || "N/A",
      "Số điện thoại": order.phone_contact || "",
      "Tổng tiền": order.total_amount || 0,
      "Mã vận đơn GHN": order.ghn_order_code || "N/A",
      "Trạng thái": STATUS_LABELS[order.status] || order.status
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách đơn hàng");

    // Write file and trigger download
    XLSX.writeFile(wb, `Danh_sach_don_hang_${new Date().getTime()}.xlsx`);
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.length === 0) return;

    if (typeof window !== "undefined") {
      const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa ${selectedOrders.length} đơn hàng đã chọn? Hành động này không thể hoàn tác.`);
      if (!confirmDelete) return;
    }

    try {
      setLoading(true);
      await deleteOrders(selectedOrders);
      setSelectedOrders([]);
      await fetchOrders(); // Refresh list
      alert("Đã xóa thành công!");
    } catch (err: any) {
      alert("Lỗi khi xóa đơn hàng: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const promptDeliveryFailed = (order: any) => {
    setFailModal({ visible: true, orderId: order.id, reason: "" });
  };

  const handleSubmitDeliveryFailed = async () => {
    const { orderId, reason } = failModal;
    if (!reason || reason.trim().length < 5) {
      alert("Vui lòng nhập lý do rõ ràng (ít nhất 5 ký tự)!");
      return;
    }

    setProcessingOrderId(orderId);
    setFailModal({ visible: false, orderId: null, reason: "" });

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivery_failed",
          cancel_reason: reason.trim(),
        })
        .eq("id", orderId);

      if (error) throw error;

      alert("Đã cập nhật trạng thái giao thất bại!");
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
    const matchId = String(order.id || "").toLowerCase().includes(query);
    const matchName = String(order.receiver_name || "").toLowerCase().includes(query);
    const matchPhone = String(order.phone_contact || "").toLowerCase().includes(query);
    const matchGHN = String(order.ghn_order_code || "").toLowerCase().includes(query);
    const matchesSearch = matchId || matchName || matchPhone || matchGHN;
    const matchesTab = activeTab === "all" || order.status === activeTab;
    return matchesTab && matchesSearch;
  });

  // Sorting Logic
  const sortedOrders = React.useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredOrders;

    return [...filteredOrders].sort((a, b) => {
      let aValue = a[sortConfig.key as keyof typeof a];
      let bValue = b[sortConfig.key as keyof typeof b];

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredOrders, sortConfig]);

  // Pagination Logic
  const totalItems = sortedOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOrders = sortedOrders.slice(startIndex, endIndex);

  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      // If same key
      if (prev.key === key) {
        if (prev.direction === 'desc') return { key, direction: 'asc' };
        if (prev.direction === 'asc') return { key: null, direction: null };
      }
      // If new key or currently none
      return { key, direction: 'desc' };
    });
  };

  const SortIndicator = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return (
      <View style={{ flexDirection: 'column', alignItems: 'center' }}>
        <ArrowUp size={8} color="#D1D5DB" />
        <ArrowDown size={8} color="#D1D5DB" style={{ marginTop: -2 }} />
      </View>
    );
    return sortConfig.direction === 'asc' ?
      <ArrowUp size={14} color="#2563EB" /> :
      <ArrowDown size={14} color="#2563EB" />;
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, pageSize]);

  if (Platform.OS !== "web") {
    return (
      <View style={styles.mobilePlaceholder}>
        <Text>Giao diện Admin tối ưu cho trình duyệt Web.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={true}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {/* FIXED HEADER SECTION */}
      <View style={styles.fixedHeaderSection}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Quản lý Đơn hàng</Text>
            <Text style={styles.subtitle}>
              Duyệt đơn hàng để tự động đẩy lên GHN và lấy mã vận đơn.
            </Text>
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
      </View>

      {/* TABLE CONTENT AREA */}
      <View style={styles.tableArea}>
        <View style={styles.tableCard}>
          {/* TOOLBAR */}
          <View style={styles.toolbar}>
            <View style={styles.toolbarSearch}>
              <Search size={18} color="#9CA3AF" />
              <TextInput
                placeholder="Tìm theo ID, tên, SĐT hoặc mã vận đơn..."
                style={styles.toolbarSearchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={styles.toolbarActions}>
              <View style={{ position: 'relative' }}>
                {showColumnDropdown && (
                  <Pressable
                    style={styles.dropdownOverlay}
                    onPress={() => setShowColumnDropdown(false)}
                  />
                )}
                <Pressable
                  style={styles.toolbarButton}
                  onPress={() => setShowColumnDropdown(!showColumnDropdown)}
                >
                  <Settings2 size={18} color="#374151" />
                  <Text style={styles.toolbarButtonText}>Hiển thị cột</Text>
                </Pressable>

                {showColumnDropdown && (
                  <View style={styles.columnDropdown}>
                    <Text style={styles.dropdownTitle}>Tùy chỉnh cột</Text>
                    {[
                      { id: 'id', label: 'Mã đơn' },
                      { id: 'date', label: 'Ngày đặt' },
                      { id: 'customer', label: 'Tên khách' },
                      { id: 'phone', label: 'Số điện thoại' },
                      { id: 'amount', label: 'Tổng tiền' },
                      { id: 'tracking', label: 'Mã vận đơn' },
                      { id: 'status', label: 'Trạng thái' },
                      { id: 'actions', label: 'Thao tác' },
                    ].map(col => (
                      <Pressable
                        key={col.id}
                        style={styles.dropdownItem}
                        onPress={() => setVisibleColumns(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
                      >
                        <View style={StyleSheet.flatten([styles.checkboxSmall, visibleColumns[col.id] && styles.checkboxSelected])}>
                          {visibleColumns[col.id] && <Check size={10} color="white" />}
                        </View>
                        <Text style={styles.dropdownItemText}>{col.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <Pressable style={styles.toolbarButton} onPress={handleExportExcel}>
                <Download size={18} color="#374151" />
                <Text style={styles.toolbarButtonText}>Xuất Excel</Text>
              </Pressable>

              <Pressable 
                style={StyleSheet.flatten([styles.toolbarButton, styles.toolbarButtonPrimary])} 
                onPress={() => router.push('/(admin)/orders/create')}
              >
                <Plus size={18} color="white" />
                <Text style={styles.toolbarButtonPrimaryText}>Tạo đơn hàng</Text>
              </Pressable>

              {selectedOrders.length > 0 && (
                <Pressable 
                  style={StyleSheet.flatten([styles.toolbarButton, styles.toolbarButtonDelete])} 
                  onPress={handleDeleteSelected}
                >
                  <Trash2 size={18} color="#EF4444" />
                  <Text style={styles.toolbarButtonDeleteText}>Xóa đơn đã chọn ({selectedOrders.length})</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* FIXED TABLE HEADER */}
          <View style={styles.tableHeader}>
            <View style={styles.columnCheck}>
              <Pressable
                onPress={() => {
                  if (selectedOrders.length === paginatedOrders.length) setSelectedOrders([]);
                  else setSelectedOrders(paginatedOrders.map(o => o.id));
                }}
                style={({ pressed }) => [
                  styles.checkbox,
                  selectedOrders.length === paginatedOrders.length && selectedOrders.length > 0 && styles.checkboxSelected,
                  pressed && { transform: [{ scale: 0.9 }] }
                ]}
              >
                {selectedOrders.length === paginatedOrders.length && selectedOrders.length > 0 && <Check size={12} color="white" />}
              </Pressable>
            </View>

            {visibleColumns.id && (
              <Pressable
                style={StyleSheet.flatten([styles.columnId, styles.headerSortable])}
                onPress={() => toggleSort('id')}
              >
                <Text style={styles.headerText}>MÃ ĐƠN</Text>
                <SortIndicator columnKey="id" />
              </Pressable>
            )}

            {visibleColumns.date && (
              <Pressable
                style={StyleSheet.flatten([styles.columnDate, styles.headerSortable])}
                onPress={() => toggleSort('created_at')}
              >
                <Text style={styles.headerText}>NGÀY ĐẶT</Text>
                <SortIndicator columnKey="created_at" />
              </Pressable>
            )}

            {visibleColumns.customer && (
              <Pressable
                style={StyleSheet.flatten([styles.columnCustomer, styles.headerSortable])}
                onPress={() => toggleSort('receiver_name')}
              >
                <Text style={styles.headerText}>TÊN KHÁCH</Text>
                <SortIndicator columnKey="receiver_name" />
              </Pressable>
            )}

            {visibleColumns.phone && (
              <Pressable
                style={StyleSheet.flatten([styles.columnPhone, styles.headerSortable])}
                onPress={() => toggleSort('phone_contact')}
              >
                <Text style={styles.headerText}>SỐ ĐIỆN THOẠI</Text>
                <SortIndicator columnKey="phone_contact" />
              </Pressable>
            )}

            {visibleColumns.amount && (
              <Pressable
                style={StyleSheet.flatten([styles.columnAmount, styles.headerSortable, styles.justifyEnd])}
                onPress={() => toggleSort('total_amount')}
              >
                <Text style={StyleSheet.flatten([styles.headerText, styles.textRight])}>TỔNG TIỀN</Text>
                <SortIndicator columnKey="total_amount" />
              </Pressable>
            )}

            {visibleColumns.tracking && (
              <View style={styles.columnTracking}>
                <Text style={StyleSheet.flatten([styles.headerText, styles.textCenter])}>MÃ VẬN ĐƠN GHN</Text>
              </View>
            )}

            {visibleColumns.status && (
              <Pressable
                style={StyleSheet.flatten([styles.columnStatus, styles.headerSortable, styles.justifyCenter])}
                onPress={() => toggleSort('status')}
              >
                <Text style={StyleSheet.flatten([styles.headerText, styles.textCenter])}>TRẠNG THÁI</Text>
                <SortIndicator columnKey="status" />
              </Pressable>
            )}

            {visibleColumns.actions && (
              <View style={styles.columnActions}>
                <Text style={StyleSheet.flatten([styles.headerText, styles.textRight])}>THAO TÁC</Text>
              </View>
            )}
          </View>

          {/* SCROLLABLE TABLE BODY */}
          <View style={styles.tableBodyContainer}>
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
              <View>
                {paginatedOrders.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không tìm thấy đơn hàng nào.</Text>
                  </View>
                ) : (
                  paginatedOrders.map((order) => {
                    const isProcessingThis = processingOrderId === order.id;
                    return (
                      <AdminDataWrapper 
                        key={order.id} 
                        onPress={() => router.push(`/(admin)/orders/${order.id}` as any)}
                        style={[
                          styles.row,
                          selectedOrders.includes(order.id) && { backgroundColor: '#F3F4F6' }
                        ]}
                      >
                        {/* Checkbox */}
                        <View style={styles.columnCheck}>
                          <Pressable
                            onPress={() => {
                              setSelectedOrders(prev =>
                                prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]
                              );
                            }}
                            style={({ pressed }) => [
                              styles.checkbox,
                              selectedOrders.includes(order.id) && styles.checkboxSelected,
                              pressed && { transform: [{ scale: 0.9 }] }
                            ]}
                          >
                            {selectedOrders.includes(order.id) && <Check size={12} color="white" />}
                          </Pressable>
                        </View>

                        {/* Mã đơn */}
                        {visibleColumns.id && (
                          <View style={styles.columnId}>
                            <Text style={styles.orderId}>#{String(order.id).slice(-8)}</Text>
                          </View>
                        )}

                        {visibleColumns.date && (
                          <View style={styles.columnDate}>
                            <Text style={styles.orderDate}>
                              {new Date(order.created_at).toLocaleString("vi-VN")}
                            </Text>
                          </View>
                        )}

                        {/* Tên khách */}
                        {visibleColumns.customer && (
                          <View style={styles.columnCustomer}>
                            <Text style={styles.customerName}>{order.receiver_name || "N/A"}</Text>
                          </View>
                        )}

                        {/* Số điện thoại */}
                        {visibleColumns.phone && (
                          <View style={styles.columnPhone}>
                            <Text style={styles.customerPhone}>{order.phone_contact}</Text>
                          </View>
                        )}

                        {/* Tổng tiền */}
                        {visibleColumns.amount && (
                          <View style={styles.columnAmount}>
                            <Text style={styles.amountText}>
                              {order.total_amount?.toLocaleString("vi-VN")}₫
                            </Text>
                          </View>
                        )}

                        {/* Mã vận đơn GHN */}
                        {visibleColumns.tracking && (
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
                        )}

                        {/* Trạng thái */}
                        {visibleColumns.status && (
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
                        )}

                        {/* Hành động */}
                        {visibleColumns.actions && (
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
                                  <>
                                    <ActionButton
                                      onPress={() => handleUpdateStatus(order, "completed")}
                                      label="Xong"
                                      color="#10B981"
                                    />
                                    <ActionButton
                                      onPress={() => promptDeliveryFailed(order)}
                                      label="Giao thất bại"
                                      color="#F97316"
                                    />
                                  </>
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
                        )}
                      </AdminDataWrapper>
                    );
                  })
                )}
              </View>
            )}
          </View>

          {/* FOOTER PAGINATION */}
          <View style={styles.tableFooter}>
            <Text style={styles.footerInfo}>
              Hiển thị {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} trong tổng số {totalItems} kết quả
            </Text>

            <View style={styles.footerRight}>
              {/* Số dòng selector */}
              <View style={styles.rowsSelectorContainer}>
                <Pressable
                  style={styles.rowsSelector}
                  onPress={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
                >
                  <Text style={styles.footerLabel}>Số dòng</Text>
                  <View style={styles.selectBox}>
                    <Text style={styles.selectText}>{pageSize}</Text>
                    <ChevronDown size={14} color="#64748B" />
                  </View>
                </Pressable>

                {showPageSizeDropdown && (
                  <View style={styles.rowsMenu}>
                    {[20, 50, 100].map((val) => (
                      <Pressable
                        key={val}
                        style={styles.rowsMenuItem}
                        onPress={() => {
                          setPageSize(val);
                          setCurrentPage(1);
                          setShowPageSizeDropdown(false);
                        }}
                      >
                        <Text style={[styles.rowsMenuText, pageSize === val && styles.rowsMenuTextActive]}>
                          {val}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Nút phân trang */}
              <View style={styles.paginationButtons}>
                <Pressable
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <Text style={styles.pageBtnText}>Trước</Text>
                </Pressable>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (totalPages > 7 && (pageNum < currentPage - 2 || pageNum > currentPage + 2) && pageNum !== 1 && pageNum !== totalPages) {
                    if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                      return <Text key={pageNum} style={styles.paginationEllipsis}>...</Text>;
                    }
                    return null;
                  }
                  return (
                    <Pressable
                      key={pageNum}
                      onPress={() => setCurrentPage(pageNum)}
                      style={[styles.pageNumber, currentPage === pageNum && styles.pageNumberActive]}
                    >
                      <Text style={[styles.pageNumberText, currentPage === pageNum && styles.pageNumberTextActive]}>
                        {pageNum}
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  style={[styles.pageBtn, (currentPage === totalPages || totalPages === 0) && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <Text style={styles.pageBtnText}>Sau</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>

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
      {/* ── Fail Delivery Modal ── */}
      <Modal
        visible={failModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFailModal({ ...failModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconError, { backgroundColor: "#F97316" }]}>
              <AlertTriangle size={32} color="white" />
            </View>
            <Text style={styles.modalTitle}>Khách không nhận hàng</Text>
            <Text style={styles.modalSubtitle}>Vui lòng nhập lý do giao thất bại (VD: Khách thuê bao, sai địa chỉ...)</Text>

            <TextInput
              style={{ width: "100%", height: 100, marginBottom: 20, textAlignVertical: "top", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", outlineStyle: "none" as any }}
              placeholder="Nhập lý do (ít nhất 5 ký tự)..."
              multiline
              value={failModal.reason}
              onChangeText={(text) => setFailModal({ ...failModal, reason: text })}
            />

            <Pressable style={[styles.modalBtn, { backgroundColor: "#F97316" }]} onPress={handleSubmitDeliveryFailed}>
              <Text style={styles.modalBtnText}>Xác nhận thất bại</Text>
            </Pressable>
            <Pressable style={styles.modalBtnOutline} onPress={() => setFailModal({ ...failModal, visible: false })}>
              <Text style={styles.modalBtnOutlineText}>Hủy</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </ScrollView>
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
  scrollContainer: { flexGrow: 1, paddingBottom: 40 },
  fixedHeaderSection: {
    paddingHorizontal: 40,
    paddingTop: 0,
    backgroundColor: "#F9FAFB",
    zIndex: 10,
  },
  tableArea: {
    paddingHorizontal: 40,
    paddingBottom: 0,
  },
  tableCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    elevation: 2,
    marginBottom: 24,
  },
  tableBodyContainer: {},
  tableBodyContainerExpanded: {},
  tableScrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 32,
  },
  title: { fontSize: 30, fontWeight: "800", color: "#111827", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
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
  tableHeader: {
    flexDirection: "row", backgroundColor: "#F9FAFB",
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
    paddingHorizontal: 24, paddingVertical: 16,
  },
  headerText: { fontWeight: "700", color: "#4B5563", fontSize: 12, textTransform: "uppercase" },
  headerSortable: { flexDirection: "row", alignItems: "center", gap: 4 },
  justifyEnd: { justifyContent: "flex-end" },
  justifyCenter: { justifyContent: "center" },
  toolbar: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    zIndex: 100,
  },
  toolbarActions: {
    flexDirection: "row",
    gap: 12,
  },
  toolbarSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 40,
    width: 320,
  },
  toolbarSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#374151",
    outlineStyle: "none" as any,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  toolbarButtonDelete: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  toolbarButtonDeleteText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  toolbarButtonPrimary: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  toolbarButtonPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  columnCheck: { width: 40, alignItems: "center" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  dropdownOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 998,
  },
  columnDropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    width: 200,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    zIndex: 999,
    ...Platform.select({
      web: {
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      },
      default: {
        elevation: 5,
      }
    }),
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  checkboxSmall: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    paddingHorizontal: 24, paddingVertical: 20,
  },
  columnId: { flex: 0.8 },
  columnDate: { flex: 1.1 },
  columnCustomer: { flex: 1.5 },
  columnPhone: { flex: 1.1 },
  columnAmount: { flex: 0.8 },
  columnTracking: { flex: 1.5 },
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

  // ── Footer / Pagination ──
  tableFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  footerInfo: {
    fontSize: 13,
    color: "#64748B",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  toggleAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  toggleAllText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  rowsSelectorContainer: {
    position: "relative",
    zIndex: 10,
  },
  rowsSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowsMenu: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 999,
  },
  rowsMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowsMenuText: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
  },
  rowsMenuTextActive: {
    color: "#10B981",
    fontWeight: "600",
  },
  footerLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  paginationButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  pageNumberActive: {
    backgroundColor: "#059669",
  },
  pageNumberText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  paginationEllipsis: {
    color: "#9CA3AF",
    fontSize: 14,
    marginHorizontal: 2,
  },
});
