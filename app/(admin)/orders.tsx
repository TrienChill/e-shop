import { listOrders, updateOrderStatus } from "@/src/services/admin/orders";
import { Check, Clock, Package, Search, Settings, Truck, XCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      fetchOrders();
    } catch (e: any) {
      alert("Lỗi cập nhật: " + e.message);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();

    // Ép kiểu ID thành String và chống lỗi null cho Name/Phone
    const matchId = String(order.id || "").toLowerCase().includes(query);
    const matchName = String(order.receiver_name || "").toLowerCase().includes(query);
    const matchPhone = String(order.phone_contact || "").toLowerCase().includes(query);

    const matchesSearch = matchId || matchName || matchPhone;
    const matchesTab = activeTab === "all" || order.status === activeTab;

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
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản lý Đơn hàng</Text>
          <Text style={styles.subtitle}>
            Theo dõi và cập nhật trạng thái vận chuyển cho khách hàng.
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Tìm theo ID, tên hoặc SĐT..."
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
              style={StyleSheet.flatten([
                styles.tab,
                activeTab === tab.id && styles.tabActive
              ])}
            >
              <tab.icon size={16} color={activeTab === tab.id ? "#2563EB" : "#9CA3AF"} />
              <Text style={StyleSheet.flatten([
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive
              ])}>
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
              filteredOrders.map((order) => (
                <View key={order.id} style={styles.row}>
                  <View style={styles.columnId}>
                    <Text style={styles.orderId}>#{String(order.id).slice(-8)}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.created_at).toLocaleString("vi-VN")}
                    </Text>
                  </View>

                  <View style={styles.columnCustomer}>
                    <Text style={styles.customerName}>{order.receiver_name || "N/A"}</Text>
                    <Text style={styles.customerPhone}>{order.phone_contact}</Text>
                  </View>

                  <View style={styles.columnAmount}>
                    <Text style={styles.amountText}>
                      {order.total_amount?.toLocaleString("vi-VN")}₫
                    </Text>
                  </View>

                  <View style={StyleSheet.flatten([styles.columnStatus, styles.itemsCenter])}>
                    <View
                      style={StyleSheet.flatten([
                        styles.statusBadge,
                        { backgroundColor: `${STATUS_COLORS[order.status]}20` }
                      ])}
                    >
                      <Text
                        style={StyleSheet.flatten([
                          styles.statusText,
                          { color: STATUS_COLORS[order.status] }
                        ])}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </Text>
                    </View>
                  </View>

                  <View style={StyleSheet.flatten([styles.columnActions, styles.actionsContainer])}>
                    {order.status === 'pending' && (
                      <ActionButton
                        onPress={() => handleUpdateStatus(order.id, 'processing')}
                        label="Duyệt"
                        color="#2563EB"
                      />
                    )}
                    {order.status === 'processing' && (
                      <ActionButton
                        onPress={() => handleUpdateStatus(order.id, 'shipping')}
                        label="Giao"
                        color="#8B5CF6"
                      />
                    )}
                    {order.status === 'shipping' && (
                      <ActionButton
                        onPress={() => handleUpdateStatus(order.id, 'completed')}
                        label="Xong"
                        color="#10B981"
                      />
                    )}
                    {['pending', 'processing'].includes(order.status) && (
                      <ActionButton
                        onPress={() => handleUpdateStatus(order.id, 'cancelled')}
                        label="Hủy"
                        color="#EF4444"
                        outline
                      />
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}
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
          backgroundColor: outline ? 'transparent' : color,
          borderWidth: outline ? 1 : 0,
          borderColor: color,
          opacity: hovered ? 0.8 : 1
        }
      ])}
    >
      <Text style={StyleSheet.flatten([styles.actionButtonText, { color: outline ? color : 'white' }])}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    height: 48,
    width: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    outlineStyle: "none" as any,
  },
  tabsContainer: {
    marginBottom: 24,
  },
  tabsScroll: {
    gap: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  tabActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#2563EB",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  errorContainer: {
    padding: 40,
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    marginTop: 16,
    fontWeight: "700",
  },
  tableCard: {
    backgroundColor: "white",
    borderRadius: 16,
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
  headerText: {
    fontWeight: "700",
    color: "#4B5563",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  columnId: { flex: 1.5 },
  columnCustomer: { flex: 2 },
  columnAmount: { flex: 1 },
  columnStatus: { flex: 1 },
  columnActions: { flex: 1.5 },
  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  itemsCenter: { alignItems: "center" },
  orderId: {
    fontWeight: "700",
    color: "#111827",
    textTransform: "uppercase",
  },
  orderDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  customerPhone: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  amountText: {
    fontWeight: "700",
    color: "#2563EB",
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  mobilePlaceholder: {
    padding: 40,
  }
});
