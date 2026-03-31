// eslint-disable-next-line import/no-named-as-default
import CommonHeader from "@/src/components/layout/Header";
import ReviewModal from "@/src/components/modals/ReviewModal";
import { supabase } from "@/src/lib/supabase";
import {
  COLOR_TRANSLATIONS,
  getProductImageByColor,
} from "@/src/services/product";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  Filter,
  PackageX,
  X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { width: SCREEN_WIDTH } = Dimensions.get("window");

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  allProducts: any[];
}

export default function ToReceiveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // 👈 Lấy params từ URL
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    getUser();
  }, []);
  // Lấy status từ params, nếu không có thì mặc định là "all"
  const initialStatus = (params.status as string) || "all";
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [showFilter, setShowFilter] = useState(false);
  const [isAscending, setIsAscending] = useState(false);

  // Review states
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState<any>(null);
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any>(null);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleExpand = (orderId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  // Sync selectedStatus with URL params
  useEffect(() => {
    if (params.status) {
      setSelectedStatus(params.status as string);
    }
  }, [params.status]);

  const STATUS_PRIORITY: Record<string, number> = {
    completed: 1, // Đã giao
    shipping: 2, // Đang giao
    processing: 3, // Đang đóng gói
    pending: 4, // Đang xử lý
    cancelled: 5, // Đã hủy
  };

  const STATUS_OPTIONS = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Chờ xác nhận" }, // Đổi nhãn cho giống Shopee
    { key: "processing", label: "Chờ lấy hàng" },
    { key: "shipping", label: "Chờ giao hàng" },
    { key: "history", label: "Lịch sử mua hàng (Đã giao/Hủy)" }, // Thêm option mới
  ];

  const fetchOrders = async (statusFilter = selectedStatus) => {
    try {
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      // [WORKAROUND RLS] Lấy danh sách order_item_id mà user đã đánh giá
      const { data: userReviews } = await supabase
        .from("reviews")
        .select("order_item_id")
        .eq("user_id", user.id);
      
      const reviewedItemIds = new Set(
        userReviews?.map((r) => r.order_item_id) || []
      );

      // Trong file app/(shop)/to-receive.tsx, tìm đến hàm fetchOrders

      let query = supabase
        .from("orders")
        .select(
          `
    id,
    status,
    total_amount,
    created_at,
    order_items (
      id,
      order_id,
      is_reviewed,
      quantity,
      price_at_purchase,
      selected_variant,
      product_id,
      products (
        name,
        images,
        variants
      )
    )
  `,
        )
        .eq("user_id", user.id);

      // Sửa logic lọc để xử lý trường hợp "history" (Lịch sử mua hàng)
      if (statusFilter === "history") {
        query = query.in("status", ["completed", "cancelled"]); // Lấy cả đã giao và đã hủy
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter); // Lọc theo pending, processing, shipping
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      const formattedOrders: OrderItem[] = data.map((order: any) => {
        // Thêm kiểm tra: nếu order_items không tồn tại, dùng mảng rỗng
        const itemsList = order.order_items || [];

        const itemsCount = itemsList.reduce(
          (sum: number, item: any) => sum + (item.quantity || 0),
          0,
        );
        const processedItems = itemsList.map((item: any) => {
          return {
            ...item,
            // Fallback an toàn: Nếu DB is_reviewed = true hoặc item có trong bảng reviews
            is_reviewed: item.is_reviewed || reviewedItemIds.has(item.id),
            image: getProductImageByColor(item.products, item.selected_variant?.color),
          };
        });

        const images = processedItems
          .slice(0, 4)
          .map((item: any) => item.image)
          .filter((img: string) => img !== "");

        const statusMap: Record<string, string> = {
          pending: "Chờ xác nhận",
          processing: "Chờ lấy hàng",
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
          allProducts: processedItems,
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
      return formattedOrders; 
    } catch (error) {
      console.error("Lỗi lấy danh sách đơn hàng:", error);
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders(selectedStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, isAscending, user]);

  const toggleSort = () => {
    setIsAscending(!isAscending);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(selectedStatus);
  };

  const handleReviewPress = (order: OrderItem) => {
    // Nếu đơn hàng chỉ có duy nhất 1 sản phẩm (tổng cộng)
    if (order.allProducts.length === 1) {
      const prod = order.allProducts[0];
      if (prod.is_reviewed) {
        alert("Sản phẩm này đã được đánh giá rồi!");
        return;
      }
      setSelectedReviewItem(prod);
      setReviewModalVisible(true);
      return;
    }

    // Nếu đơn hàng có nhiều sản phẩm, luôn hiện bảng chọn để người dùng thấy icon Verify
    setSelectedOrderForReview(order);
    setShowProductSelection(true);
  };

  const onReviewSubmit = async (data: { rating: number; comment: string }) => {
    try {
      if (!selectedReviewItem) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Lưu vào bảng reviews
      const { error: reviewError } = await supabase.from("reviews").insert([
        {
          user_id: user.id,
          product_id: selectedReviewItem.product_id,
          order_id: selectedReviewItem.order_id, 
          order_item_id: selectedReviewItem.id, 
          rating: data.rating,
          comment: data.comment,
        },
      ]);

      if (reviewError) throw reviewError;

      // 2. Cập nhật trạng thái is_reviewed trong order_items
      const { error: updateError } = await supabase
        .from("order_items")
        .update({ is_reviewed: true })
        .eq("id", selectedReviewItem.id);

      if (updateError) throw updateError;

      alert("Cảm ơn bạn đã đánh giá!");
      setReviewModalVisible(false);
      setSelectedReviewItem(null); 
      
      const updatedOrdersList = await fetchOrders(selectedStatus); 
      
      if (updatedOrdersList && selectedOrderForReview) {
        const updatedOrder = updatedOrdersList.find((o: OrderItem) => o.id === selectedOrderForReview.id);
        if (updatedOrder) setSelectedOrderForReview(updatedOrder);
      }
    } catch (error: any) {
      console.error("Lỗi gửi đánh giá:", error.message);
      alert("Không thể gửi đánh giá: " + error.message);
    }
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
    const isExpanded = expandedOrderId === item.id;
    const isAllReviewed = item.allProducts?.every((p: any) => p.is_reviewed);

    return (
      <View style={styles.orderCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => toggleExpand(item.id)}
          style={styles.cardHeader}
        >
          <View style={styles.cardContent}>
            <View style={styles.imageContainer}>
              {renderImageGrid(item.images)}
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.infoHeader}>
                <Text style={styles.orderCode}>Đơn hàng #{item.orderCode}</Text>
                <ChevronLeft
                  size={20}
                  color={COLORS.textSecondary}
                  style={{
                    transform: [{ rotate: isExpanded ? "90deg" : "-90deg" }],
                  }}
                />
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
                <View style={styles.itemBadge}>
                  <Text style={styles.itemBadgeText}>
                    {item.itemsCount} sản phẩm
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.dropdownContent}>
            <View style={styles.divider} />
            {item.allProducts?.map((prod: any, index: number) => (
              <View key={index} style={styles.productDetailItem}>
                <Image
                  source={{ uri: prod.image }}
                  style={styles.productDetailImage}
                />
                <View style={styles.productDetailInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.productDetailName} numberOfLines={1}>
                      {prod.products?.name}
                    </Text>
                    {prod.is_reviewed && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: COLORS.primary, marginRight: 4, fontWeight: '500' }}>Đã đánh giá</Text>
                        <CheckCircle2 size={16} color={COLORS.primary} />
                      </View>
                    )}
                  </View>
                  <View style={styles.productDetailSub}>
                    <Text style={styles.productDetailVariant}>
                      Phân loại:{" "}
                      {COLOR_TRANSLATIONS[
                        prod.selected_variant?.color?.toLowerCase()
                      ] || prod.selected_variant?.color}
                      , size: {prod.selected_variant?.size}
                    </Text>
                    <Text style={styles.productDetailQty}>x{prod.quantity}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Nút hành động nhanh bên dưới */}
            <View style={styles.actionRow}>
              {isDelivered ? (
                <TouchableOpacity
                  style={[
                    styles.reviewButton,
                    isAllReviewed && styles.reviewButtonCompleted,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleReviewPress(item)}
                >
                  <Text
                    style={[
                      styles.reviewButtonText,
                      isAllReviewed && styles.reviewButtonTextCompleted,
                    ]}
                  >
                      {isAllReviewed ? "Xem đánh giá" : "Đánh giá"}
                  </Text>
                  {isAllReviewed && (
                    <CheckCircle2
                      size={14}
                      color={COLORS.primary}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.trackButton}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/track-order",
                      params: { orderId: item.id },
                    })
                  }
                >
                  <Text style={styles.trackButtonText}>Theo dõi</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.detailButton}
                onPress={() =>
                  router.push({
                    pathname: "/track-order",
                    params: { orderId: item.id },
                  })
                }
              >
                <Text style={styles.detailButtonText}>Chi tiết đơn hàng</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <CommonHeader
        renderLeft={() => (
          <>
            <TouchableOpacity
              onPress={() => router.push("/(shop)/(tabs)/profile")}
              style={styles.backBtnHeader}
            >
              <ChevronLeft size={28} color={COLORS.secondary} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Lịch sử mua hàng</Text>
              <Text style={styles.headerSubtitle}>Đơn hàng của tôi</Text>
            </View>
          </>
        )}
        renderRight={() => (
          <>
            <TouchableOpacity
              style={[
                styles.iconButton,
                !isAscending && styles.iconButtonActive,
              ]}
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
          </>
        )}
      />

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

      {/* Modal Lựa chọn sản phẩm để đánh giá */}
      <Modal
        visible={showProductSelection}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProductSelection(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProductSelection(false)}
        />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Chọn sản phẩm đánh giá</Text>
            <TouchableOpacity onPress={() => setShowProductSelection(false)}>
              <X color={COLORS.secondary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.selectionList}>
            {selectedOrderForReview?.allProducts.map((prod: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.selectionItem,
                  prod.is_reviewed && { opacity: 0.8 }
                ]}
                onPress={() => {
                  if (prod.is_reviewed) {
                    alert("Sản phẩm này đã được đánh giá rồi!");
                    return;
                  }
                  setSelectedReviewItem(prod);
                  setReviewModalVisible(true);
                }}
              >
                <Image
                  source={{ uri: prod.image }}
                  style={styles.selectionImage}
                />
                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionName} numberOfLines={1}>
                    {prod.products?.name}
                  </Text>
                  <Text style={styles.selectionVariant}>
                    {COLOR_TRANSLATIONS[
                      prod.selected_variant?.color?.toLowerCase()
                    ] || prod.selected_variant?.color}
                    , {prod.selected_variant?.size}
                  </Text>
                </View>
                {prod.is_reviewed && (
                  <View style={styles.reviewedStatus}>
                    <Text style={styles.reviewedText}>Xem đánh giá</Text>
                    <CheckCircle2 size={18} color={COLORS.primary} fill={"#E6EFFF"} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Review Modal chung */}
      <ReviewModal
        visible={isReviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={onReviewSubmit}
        product={
          selectedReviewItem
            ? {
              name: selectedReviewItem.products?.name,
              variant: `${COLOR_TRANSLATIONS[
                selectedReviewItem.selected_variant?.color?.toLowerCase()
              ] || selectedReviewItem.selected_variant?.color
                }, ${selectedReviewItem.selected_variant?.size}`,
              image: selectedReviewItem.image,
            }
            : null
        }
      />

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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtnHeader: {
    marginRight: 12,
    padding: 4,
    marginLeft: -8,
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
  cardHeader: {
    paddingBottom: 4,
  },
  dropdownContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  productDetailItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  productDetailImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    marginRight: 12,
  },
  productDetailInfo: {
    flex: 1,
  },
  productDetailName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  productDetailSub: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  productDetailVariant: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  productDetailQty: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.secondary,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  detailButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F0F5FF",
    justifyContent: "center",
  },
  detailButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
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
  reviewButtonCompleted: {
    backgroundColor: "#F0F5FF",
    borderColor: COLORS.primary,
  },
  reviewButtonTextCompleted: {
    color: COLORS.primary,
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
  // Selection Modal Styles
  selectionList: {
    maxHeight: 400,
    marginTop: 10,
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectionImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  selectionVariant: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reviewedBadge: {
    marginLeft: 10,
  },
  reviewedStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F5FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reviewedText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "bold",
    marginRight: 6,
  },
});
