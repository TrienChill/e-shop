import { supabase } from "@/src/lib/supabase";
import { useRouter } from "expo-router";
import {
  ArrowUpDown,
  CheckCircle2,
  Filter,
  PackageX,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
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
  white: "#FFFFFF",
};

interface OrderItem {
  id: string;
  orderCode: string;
  shippingMethod: string;
  itemsCount: number;
  totalAmount: number;
  status: string;
  images: string[];
  rawStatus: string;
}

export default function ToReceiveScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [isAscending, setIsAscending] = useState(true);

  const STATUS_PRIORITY: Record<string, number> = {
    completed: 1, // Đã giao
    shipping: 2, // Đang giao
    processing: 3, // Đang đóng gói
    pending: 4, // Đang xử lý
    cancelled: 5, // Đã hủy
  };

  const STATUS_OPTIONS = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Đang xử lý" },
    { key: "processing", label: "Đang đóng gói" },
    { key: "shipping", label: "Đang giao" },
    { key: "completed", label: "Đã giao" },
    { key: "cancelled", label: "Đã hủy" },
  ];

  const fetchOrders = async (statusFilter = selectedStatus) => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("orders")
        .select(
          `
          id,
          status,
          total_amount,
          order_items (
            quantity,
            products (
              images
            )
          )
        `,
        )
        .eq("user_id", user.id);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      const formattedOrders: OrderItem[] = data.map((order: any) => {
        const itemsCount = order.order_items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        );

        const images: string[] = [];
        order.order_items.forEach((item: any) => {
          if (item.products?.images?.[0] && images.length < 4) {
            const imgName = item.products.images[0];
            const imageUrl = imgName.startsWith("http")
              ? imgName
              : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${imgName}`;
            images.push(imageUrl);
          }
        });

        const statusMap: Record<string, string> = {
          pending: "Đang xử lý",
          processing: "Đang đóng gói",
          shipping: "Đang giao",
          completed: "Đã giao",
          cancelled: "Đã hủy",
        };

        return {
          id: order.id.toString(),
          orderCode: order.id.toString().slice(-8).toUpperCase(),
          shippingMethod: "Giao hàng tiêu chuẩn",
          itemsCount,
          totalAmount: order.total_amount,
          status: statusMap[order.status] || "Đang đóng gói",
          images,
          rawStatus: order.status,
        };
      });

      // Sắp xếp theo ưu tiên: Đã giao -> Đang giao -> Đang đóng gói -> Đang xử lý -> Đã hủy (hoặc ngược lại)
      const multiplier = isAscending ? 1 : -1;
      formattedOrders.sort((a, b) => {
        const priorityA = STATUS_PRIORITY[a.rawStatus] || 99;
        const priorityB = STATUS_PRIORITY[b.rawStatus] || 99;
        return (priorityA - priorityB) * multiplier;
      });

      setOrders(formattedOrders);
    } catch (error) {
      console.error("Lỗi lấy danh sách đơn hàng:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(selectedStatus);
  }, [selectedStatus, isAscending]);

  const toggleSort = () => {
    setIsAscending(!isAscending);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(selectedStatus);
  };

  const renderImageGrid = (images: string[]) => {
    if (images.length === 0) {
      return (
        <View
          style={[
            styles.singleImage,
            {
              backgroundColor: "#F0F0F0",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <PackageX size={32} color="#CCC" />
        </View>
      );
    }

    if (images.length === 1) {
      return (
        <Image
          source={{ uri: images[0] }}
          style={styles.singleImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.imageGrid}>
        {images.slice(0, 4).map((img, index) => (
          <Image
            key={index}
            source={{ uri: img }}
            style={[
              styles.gridImage,
              images.length === 2 && styles.gridImageLarge,
            ]}
            resizeMode="cover"
          />
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: OrderItem }) => {
    const isDelivered = item.status === "Đã giao";

    return (
      <View style={styles.orderCard}>
        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
            {renderImageGrid(item.images)}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoHeader}>
              <Text style={styles.orderCode}>Đơn hàng #{item.orderCode}</Text>
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>
                  {item.itemsCount} sản phẩm
                </Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.shippingMethod}>{item.shippingMethod}</Text>
              <Text style={styles.totalAmount}>
                {item.totalAmount.toLocaleString("vi-VN")}₫
              </Text>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusText}>{item.status}</Text>
                {isDelivered && (
                  <CheckCircle2
                    size={18}
                    color={COLORS.primary}
                    fill={"#E6EFFF"}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>

              {isDelivered ? (
                <TouchableOpacity
                  style={styles.reviewButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reviewButtonText}>Đánh giá</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.trackButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.trackButtonText}>Theo dõi</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.avatarContainer}
          >
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Lịch sử mua hàng</Text>
            <Text style={styles.headerSubtitle}>Đơn hàng của tôi</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconButton, !isAscending && styles.iconButtonActive]}
            activeOpacity={0.7}
            onPress={toggleSort}
          >
            <ArrowUpDown
              size={22}
              color={!isAscending ? COLORS.white : COLORS.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              selectedStatus !== "all" && { backgroundColor: COLORS.primary },
            ]}
            onPress={() => setShowFilter(true)}
          >
            <Filter
              size={22}
              color={selectedStatus !== "all" ? COLORS.white : COLORS.primary}
            />
            {selectedStatus !== "all" && <View style={styles.activeDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Bộ lọc trạng thái */}
      <Modal
        visible={showFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFilter(false)}
        />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Lọc theo trạng thái</Text>
            <TouchableOpacity onPress={() => setShowFilter(false)}>
              <X color={COLORS.secondary} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterOptions}>
            {STATUS_OPTIONS.map((option) => {
              const isSelected = selectedStatus === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterItem,
                    isSelected && styles.filterItemActive,
                  ]}
                  onPress={() => {
                    setSelectedStatus(option.key);
                    setShowFilter(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      isSelected && styles.filterTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <CheckCircle2 size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {selectedStatus !== "all" && (
        <View style={styles.activeFilterBar}>
          <Text style={styles.activeFilterText}>
            Đang lọc:{" "}
            <Text style={{ fontWeight: "bold" }}>
              {STATUS_OPTIONS.find((o) => o.key === selectedStatus)?.label}
            </Text>
          </Text>
          <TouchableOpacity onPress={() => setSelectedStatus("all")}>
            <Text style={styles.clearFilterText}>Xóa lọc</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <PackageX size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.emptySubtitle}>
            Khi bạn đặt hàng, chúng sẽ xuất hiện tại đây.
          </Text>
          <TouchableOpacity
            style={styles.shopNowButton}
            onPress={() => router.push("/(shop)/(tabs)")}
          >
            <Text style={styles.shopNowText}>Mua sắm ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#F0F0F0",
  },
  titleContainer: {
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0F5FF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  iconButtonActive: {
    backgroundColor: COLORS.primary,
  },
  activeDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: "#F0F5FF",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    height: "100%",
  },
  gridImage: {
    width: "50%",
    height: "50%",
    borderWidth: 0.5,
    borderColor: COLORS.white,
  },
  gridImageLarge: {
    height: "100%",
  },
  singleImage: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "space-between",
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderCode: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
    flex: 1,
  },
  itemBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemBadgeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  shippingMethod: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.secondary,
  },
  trackButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 12,
  },
  trackButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  reviewButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  reviewButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  shopNowButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 15,
    marginTop: 30,
  },
  shopNowText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.secondary,
  },
  filterOptions: {
    gap: 12,
  },
  filterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
  },
  filterItemActive: {
    backgroundColor: "#E6EFFF",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  activeFilterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F0F5FF",
    marginBottom: 10,
  },
  activeFilterText: {
    fontSize: 14,
    color: COLORS.secondary,
  },
  clearFilterText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "bold",
  },
});
