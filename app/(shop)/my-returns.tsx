import CommonHeader from "@/src/components/layout/Header";
import { supabase } from "@/src/lib/supabase";
import {
  getMyReturns,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
} from "@/src/services/returns";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Clock,
  PackageX,
  RotateCcw,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
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
};

const STATUS_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ xử lý" },
  { key: "approved", label: "Đã duyệt" },
  { key: "shipping_back", label: "Đang trả" },
  { key: "completed", label: "Hoàn thành" },
];

export default function MyReturnsScreen() {
  const router = useRouter();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    if (user) fetchReturns();
  }, [activeTab, user]);

  const initUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      if (!user) return;

      let data = await getMyReturns(user.id);

      if (activeTab !== "all") {
        data = data.filter((r: any) => r.status === activeTab);
      }

      setReturns(data);
    } catch (err: any) {
      console.error("Lỗi lấy danh sách trả hàng:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReturns();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={16} color={RETURN_STATUS_COLORS[status]} />;
      case "approved":
      case "shipping_back":
        return <RotateCcw size={16} color={RETURN_STATUS_COLORS[status]} />;
      case "completed":
      case "refunded":
        return <PackageX size={16} color={RETURN_STATUS_COLORS[status]} />;
      case "rejected":
      case "cancelled":
        return <XCircle size={16} color={RETURN_STATUS_COLORS[status]} />;
      default:
        return <Clock size={16} color="#999" />;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const firstItem = item.return_items?.[0];
    const image =
      firstItem?.products?.images?.[0] ||
      firstItem?.order_items?.products?.images?.[0];
    const itemCount = item.return_items?.length || 0;
    const statusLabel = RETURN_STATUS_LABELS[item.status] || item.status;
    const statusColor = RETURN_STATUS_COLORS[item.status] || "#999";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(shop)/return-detail" as any,
            params: { returnId: String(item.id) },
          })
        }
      >
        <View style={styles.cardTop}>
          <View style={styles.imageBox}>
            {image ? (
              <Image source={{ uri: image }} style={styles.cardImage} />
            ) : (
              <PackageX size={28} color="#CCC" />
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.orderLabel}>
              Đơn #{item.order_id?.toString().slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "18", borderColor: statusColor + "40" },
            ]}
          >
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.itemCount}>{itemCount} sản phẩm</Text>
          <Text style={styles.refundAmount}>
            {Number(item.refund_amount || 0).toLocaleString("vi-VN")}₫
          </Text>
        </View>

        {item.reason_category && (
          <View style={styles.reasonRow}>
            <Text style={styles.reasonLabel}>Lý do:</Text>
            <Text style={styles.reasonValue}>{item.reason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <CommonHeader
        renderLeft={() => (
          <TouchableOpacity
            onPress={() => router.push("/(shop)/(tabs)/profile")}
            style={styles.backBtn}
          >
            <ChevronLeft size={28} color={COLORS.secondary} />
          </TouchableOpacity>
        )}
        renderRight={() => <View />}
        title="Yêu cầu trả hàng"
      />

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : returns.length === 0 ? (
        <View style={styles.centerContainer}>
          <RotateCcw size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Chưa có yêu cầu trả hàng</Text>
          <Text style={styles.emptySubtitle}>
            Các yêu cầu trả hàng của bạn sẽ hiển thị tại đây.
          </Text>
        </View>
      ) : (
        <FlatList
          data={returns}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      )}
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
    padding: 30,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: COLORS.textSecondary },

  tabsScroll: { maxHeight: 48 },
  tabsContent: { paddingHorizontal: 20, gap: 8, paddingVertical: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: "500", color: COLORS.textSecondary },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  imageBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardImage: { width: "100%", height: "100%" },
  cardInfo: { flex: 1 },
  orderLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  itemCount: { fontSize: 13, color: COLORS.textSecondary },
  refundAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  reasonRow: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FAFAFA",
  },
  reasonLabel: { fontSize: 12, color: COLORS.textSecondary, marginRight: 6 },
  reasonValue: {
    fontSize: 12,
    color: COLORS.secondary,
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
