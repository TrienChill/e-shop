import CommonHeader from "@/src/components/layout/Header";
import { supabase } from "@/src/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  PackageX,
  PieChart,
  Settings,
  BarChart,
  X
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, G } from "react-native-svg";

const { width } = Dimensions.get("window");
const CHART_SIZE = 240;
const STROKE_WIDTH = 25;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Bảng màu chuẩn theo yêu cầu
const COLORS = {
  blue: "#0055FF",
  green: "#A2FF33",
  orange: "#FF8A00",
  pink: "#FF4D8D",
  white: "#FFFFFF",
  dark: "#1A1A1A",
  lightGray: "#F5F8FF",
  textSecondary: "#ffffff",
  shadow: "rgba(0, 0, 0, 0.1)",
};

// Bảng màu cho các phân đoạn biểu đồ
const CATEGORY_COLORS = [
  "#0055FF", // Blue
  "#A2FF33", // Green
  "#FF8A00", // Orange
  "#FF4D8D", // Pink
  "#A855F7", // Purple
  "#00D1FF", // Cyan
  "#FACC15", // Yellow
];

export default function MyActivityScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasedProducts, setPurchasedProducts] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Time filter state
  type FilterType = "last7" | "last30" | "month" | "quarter" | "year" | "custom";
  const [filterType, setFilterType] = useState<FilterType>("month");
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  
  // Modal state
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [tempFilterType, setTempFilterType] = useState<FilterType>("month");
  const [customStartText, setCustomStartText] = useState("");
  const [customEndText, setCustomEndText] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    pending: 0,
  });

  const displayTimeRange = useMemo(() => {
    switch (filterType) {
      case "last7": return "7 ngày gần nhất";
      case "last30": return "30 ngày gần nhất";
      case "month": return `Tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
      case "quarter": return `Quý ${Math.floor(currentDate.getMonth() / 3) + 1}/${currentDate.getFullYear()}`;
      case "year": return `Năm ${currentDate.getFullYear()}`;
      case "custom": {
        const start = customStartDate.toLocaleDateString('vi-VN');
        const end = customEndDate.toLocaleDateString('vi-VN');
        return `${start} - ${end}`;
      }
      default: return "";
    }
  }, [filterType, currentDate, customStartDate, customEndDate]);

  // Fetch real activity data
  const fetchActivityData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile for avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }

      // 1. Xác định khung thời gian
      const now = new Date();
      let firstDay: number = 0, lastDay: number = 0;

      switch (filterType) {
        case "last7":
          firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
          lastDay = now.getTime();
          break;
        case "last30":
          firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).getTime();
          lastDay = now.getTime();
          break;
        case "quarter": {
          const quarterFloorMonth = Math.floor(currentDate.getMonth() / 3) * 3;
          firstDay = new Date(currentDate.getFullYear(), quarterFloorMonth, 1).getTime();
          lastDay = new Date(currentDate.getFullYear(), quarterFloorMonth + 3, 1).getTime();
          break;
        }
        case "year":
          firstDay = new Date(currentDate.getFullYear(), 0, 1).getTime();
          lastDay = new Date(currentDate.getFullYear() + 1, 0, 1).getTime();
          break;
        case "custom":
          firstDay = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate()).getTime();
          lastDay = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate() + 1).getTime();
          break;
        case "month":
        default:
          firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime();
          lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).getTime();
          break;
      }

      const isDateInRange = (dateString: string | null) => {
        if (!dateString) return false;
        const ms = new Date(dateString).getTime();
        return ms >= firstDay && ms < lastDay;
      };

      // 2. Fetch toàn bộ orders của user để tự filter
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, created_at, processing_at, shipping_at, completed_at, time_finished")
        .eq("user_id", user.id);

      if (ordersError) throw ordersError;

      let total = 0;
      let delivered = 0;
      let pendingCount = 0;
      const validOrderIds = new Set();

      orders.forEach((o: any) => {
        // - "Đã đặt": trạng thái pending/processing và đơn được TẠO trong thời gian
        const isPendingProc = ["pending", "processing"].includes(o.status) && isDateInRange(o.created_at);
        // - "Chờ nhận": trạng thái shipping và BẮT ĐẦU GIAO trong thời gian (nếu ko có shipping_at thì lấy created_at)
        const isShipping = o.status === "shipping" && isDateInRange(o.shipping_at || o.created_at);
        // - "Đã nhận/Chi phí": trạng thái completed và ĐÃ HOÀN THÀNH trong thời gian
        const isCompleted = o.status === "completed" && isDateInRange(o.completed_at || o.time_finished);

        if (isPendingProc) total++;
        if (isShipping) pendingCount++;
        if (isCompleted) delivered++;

        // Nếu đơn hàng liên quan đến tháng này ở bất kì trạng thái nào, mở khóa chi tiêu & SP của nó
        if (isPendingProc || isShipping || isCompleted) {
          validOrderIds.add(o.id);
        }
      });

      setStats({ total, delivered, pending: pendingCount });

      // 3. Fetch toàn bộ order items của user
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select(
          `
          product_id,
          quantity,
          price_at_purchase,
          products (
            id, 
            name, 
            images,
            categories (id, name, name_vi)
          ),
          orders!inner (id)
        `,
        )
        .eq("orders.user_id", user.id);

      if (itemsError) throw itemsError;

      // Filter unique products & Calculate spending by category
      const productsMap = new Map();
      const categorySpending: Record<
        string,
        { label: string; amount: number }
      > = {};

      items.forEach((item: any) => {
        const order = item.orders;

        // Chỉ tổng hợp những item nằm trong danh sách Order hợp lệ của Tháng
        if (!validOrderIds.has(order.id)) return;

        // Build product list
        if (item.products && !productsMap.has(item.products.id)) {
          productsMap.set(item.products.id, {
            id: item.products.id,
            name: item.products.name,
            image: item.products.images?.[0] || "",
          });
        }

        // Calculate spending
        const category = item.products?.categories;
        if (category) {
          const catName = category.name_vi || category.name || "Khác";
          if (!categorySpending[catName]) {
            categorySpending[catName] = { label: catName, amount: 0 };
          }
          categorySpending[catName].amount +=
            (item.price_at_purchase || 0) * (item.quantity || 0);
        }
      });

      // Format category data for chart
      const formattedCategories = Object.entries(categorySpending).map(
        ([name, data], index) => ({
          id: name,
          label: data.label,
          amount: data.amount,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }),
      );

      setCategoriesData(formattedCategories);
      setPurchasedProducts(Array.from(productsMap.values()).slice(0, 10));
    } catch (error) {
      console.error("Lỗi lấy dữ liệu hoạt động:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, filterType, customStartDate, customEndDate]);

  useFocusEffect(
    useCallback(() => {
      fetchActivityData();
    }, [fetchActivityData]),
  );

  const handlePrevTime = () => {
    if (filterType === "month") {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (filterType === "quarter") {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 3, 1));
    } else if (filterType === "year") {
      setCurrentDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    }
  };

  const handleNextTime = () => {
    if (filterType === "month") {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (filterType === "quarter") {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 3, 1));
    } else if (filterType === "year") {
      setCurrentDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
    }
  };

  const canNavigate = ["month", "quarter", "year"].includes(filterType);

  const parseDate = (text: string) => {
    const [d, m, y] = text.split('/');
    if (d && m && y) {
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date();
  };

  const applyFilter = () => {
    setFilterType(tempFilterType);
    if (tempFilterType === 'custom') {
       if (customStartText) setCustomStartDate(parseDate(customStartText));
       if (customEndText) setCustomEndDate(parseDate(customEndText));
    }
    setFilterModalVisible(false);
  };

  // Tính toán dữ liệu biểu đồ
  const totalAmount = useMemo(
    () => categoriesData.reduce((acc, cat) => acc + cat.amount, 0),
    [categoriesData],
  );
  const displayAmount = selectedCategory
    ? categoriesData.find((c) => c.id === selectedCategory)?.amount
    : totalAmount;

  // Tính toán các phân đoạn biểu đồ
  const chartData = useMemo(() => {
    let currentOffset = 0;
    if (totalAmount === 0) return [];
    return categoriesData.map((cat) => {
      const percentage = cat.amount / totalAmount;
      const strokeDashoffset = CIRCUMFERENCE - CIRCUMFERENCE * percentage;
      const rotation = (currentOffset / totalAmount) * 360;
      currentOffset += cat.amount;
      return {
        ...cat,
        strokeDashoffset,
        rotation,
      };
    });
  }, [totalAmount, categoriesData]);

  const maxCategoryAmount = useMemo(() => {
    if (categoriesData.length === 0) return 0;
    return Math.max(...categoriesData.map(c => c.amount));
  }, [categoriesData]);

  const getAvatarUrl = (path: string | null) => {
    if (!path)
      return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop";
    if (path.startsWith("http")) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
  };

  const getProductImageUrl = (path: string | null) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* 1. Header & Bộ lọc thời gian */}
      <CommonHeader
        renderLeft={() => (
          <>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtnHeader}
            >
              <ChevronLeft size={28} color={COLORS.dark} />
            </TouchableOpacity>
            <Image
              source={{ uri: getAvatarUrl(avatarUrl) }}
              style={styles.avatar}
            />
            <Text style={styles.headerTitle}>Hoạt động</Text>
          </>
        )}
        renderRight={() => (
          <>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setChartType(prev => prev === "pie" ? "bar" : "pie")}
            >
              {chartType === "pie" ? (
                <BarChart size={22} color={COLORS.dark} />
              ) : (
                <PieChart size={22} color={COLORS.dark} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => {
                setTempFilterType(filterType);
                setFilterModalVisible(true);
              }}
            >
              <Settings size={22} color={COLORS.dark} />
            </TouchableOpacity>
          </>
        )}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Thanh chọn tháng */}
        <View style={styles.monthPickerContainer}>
          <Text style={styles.monthText}>{displayTimeRange}</Text>
        </View>

        {/* 2. Biểu đồ chi tiêu (Donut Chart Section) */}
        <View style={styles.chartSection}>
          <View style={{ width: 44 }}>
            {canNavigate && (
              <TouchableOpacity style={styles.arrowNav} onPress={handlePrevTime}>
                <ChevronLeft size={28} color={COLORS.blue} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.chartWrapper}>
            {loading ? (
              <View style={styles.chartCenterContent}>
                <ActivityIndicator size="large" color={COLORS.blue} />
                <Text style={{ marginTop: 8, color: COLORS.blue, fontWeight: "500" }}>
                  Đang tải...
                </Text>
              </View>
            ) : totalAmount > 0 ? (
              chartType === "pie" ? (
                <>
                  <Svg
                    width={CHART_SIZE}
                    height={CHART_SIZE}
                    viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
                  >
                    <G rotation="-90" origin={`${CHART_SIZE / 2}, ${CHART_SIZE / 2}`}>
                      {chartData.map((segment) => (
                        <Circle
                          key={segment.id}
                          cx={CHART_SIZE / 2}
                          cy={CHART_SIZE / 2}
                          r={RADIUS}
                          stroke={segment.color}
                          strokeWidth={STROKE_WIDTH}
                          strokeDasharray={CIRCUMFERENCE}
                          strokeDashoffset={segment.strokeDashoffset}
                          strokeLinecap="round"
                          transform={`rotate(${segment.rotation}, ${CHART_SIZE / 2}, ${CHART_SIZE / 2})`}
                          opacity={
                            selectedCategory && selectedCategory !== segment.id
                              ? 0.3
                              : 1
                          }
                        />
                      ))}
                    </G>
                  </Svg>

                  {/* Nội dung trung tâm biểu đồ */}
                  <View style={styles.chartCenterContent}>
                    <Text style={styles.totalLabel}>
                      {selectedCategory ? "Chi phí" : "Tổng cộng"}
                    </Text>
                    <Text style={styles.totalValue}>
                      {displayAmount?.toLocaleString("vi-VN")}
                      <Text style={{ fontSize: 16 }}> ₫</Text>
                    </Text>
                  </View>
                </>
              ) : (
                <View style={{ width: CHART_SIZE, height: CHART_SIZE, justifyContent: "flex-end", alignItems: "center", paddingTop: 10 }}>
                  <Text style={[styles.totalLabel, { marginBottom: 4 }]}>
                    {selectedCategory ? "Chi phí" : "Tổng cộng"}
                  </Text>
                  <Text style={[styles.totalValue, { color: COLORS.dark, marginBottom: 20 }]}>
                    {displayAmount?.toLocaleString("vi-VN")}
                    <Text style={{ fontSize: 16 }}> ₫</Text>
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 12, height: 130, width: "100%" }}>
                    {categoriesData.map((cat) => {
                      const heightPercent = maxCategoryAmount > 0 ? (cat.amount / maxCategoryAmount) * 100 : 0;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={{
                            width: Math.min(32, (CHART_SIZE - 40 - (categoriesData.length - 1) * 12) / (categoriesData.length || 1)),
                            height: `${heightPercent}%`,
                            backgroundColor: cat.color,
                            borderTopLeftRadius: 6,
                            borderTopRightRadius: 6,
                            opacity: selectedCategory && selectedCategory !== cat.id ? 0.3 : 1
                          }}
                          onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                        />
                      );
                    })}
                  </View>
                </View>
              )
            ) : (
              <View style={styles.chartCenterContent}>
                <PieChart size={64} color="#888888" opacity={0.6} />
                <Text style={{ marginTop: 12, color: "#888888", fontWeight: "500", fontSize: 16 }}>
                  Chưa có chi tiêu
                </Text>
              </View>
            )}
          </View>

          <View style={{ width: 44 }}>
            {canNavigate && (
              <TouchableOpacity style={styles.arrowNav} onPress={handleNextTime}>
                <ChevronRight size={28} color={COLORS.blue} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. Chú thích phân mục (Categories) */}
        <View style={styles.categoriesContainer}>
          {categoriesData.length > 0 ? (
            categoriesData.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  { backgroundColor: cat.color },
                  selectedCategory === cat.id && styles.activePill,
                ]}
                onPress={() =>
                  setSelectedCategory(
                    selectedCategory === cat.id ? null : cat.id,
                  )
                }
              >
                <Text style={styles.categoryLabel}>
                  {cat.label} {cat.amount.toLocaleString("vi-VN")}₫
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Chưa có dữ liệu chi tiêu.</Text>
          )}
        </View>

        {/* 4. Thống kê đơn hàng (Order Stats) */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statCircle, styles.shadowEffect]}>
              <Text style={styles.statNumber}>{stats.total}</Text>
            </View>
            <Text style={styles.statLabel}>Đã đặt</Text>
          </View>

          <View style={styles.statItem}>
            <View
              style={[
                styles.statCircle,
                styles.shadowEffect,
                { backgroundColor: COLORS.green },
              ]}
            >
              <Text style={[styles.statNumber, { color: COLORS.dark }]}>
                {stats.delivered}
              </Text>
            </View>
            <Text style={styles.statLabel}>Đã nhận</Text>
          </View>

          <View style={styles.statItem}>
            <View
              style={[
                styles.statCircle,
                styles.shadowEffect,
                { backgroundColor: COLORS.orange },
              ]}
            >
              <Text style={styles.statNumber}>{stats.pending}</Text>
            </View>
            <Text style={styles.statLabel}>Chờ nhận</Text>
          </View>
        </View>

        {/* 4.5. Sản phẩm đã mua (Purchased Products Section) */}
        <View style={styles.purchasedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sản phẩm đã mua</Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/to-receive",
                  params: { status: "history" },
                })
              }
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ padding: 20 }}>
              <ActivityIndicator color={COLORS.blue} />
            </View>
          ) : purchasedProducts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.purchasedScroll}
            >
              {purchasedProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.purchasedCard}
                  onPress={() => router.push(`/(shop)/product/${product.id}`)}
                >
                  <Image
                    source={{ uri: getProductImageUrl(product.image) }}
                    style={styles.purchasedImage}
                  />
                  <Text style={styles.purchasedName} numberOfLines={1}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyProductsView}>
              <PackageX size={48} color="#888888" opacity={0.6} />
              <Text style={styles.emptyTextFixed}>Bạn chưa mua sản phẩm nào.</Text>
            </View>
          )}
        </View>

        {/* 5. Nút hành động cuối trang */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() =>
            router.push({
              pathname: "/to-receive",
              params: { status: "history" },
            })
          }
        >
          <Text style={styles.historyButtonText}>Lịch sử mua hàng</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thời gian</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={{ padding: 4 }}>
                <X size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptionsGrid}>
              {[
                { id: 'last7', label: '7 ngày gần nhất' },
                { id: 'last30', label: '30 ngày gần nhất' },
                { id: 'month', label: 'Theo Tháng' },
                { id: 'quarter', label: 'Theo Quý' },
                { id: 'year', label: 'Theo Năm' },
                { id: 'custom', label: 'Tùy chỉnh thời gian' },
              ].map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.filterOptionBtn, tempFilterType === item.id && styles.filterOptionBtnActive]}
                  onPress={() => setTempFilterType(item.id)}
                >
                  <Text style={[styles.filterOptionText, tempFilterType === item.id && styles.filterOptionTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tempFilterType === 'custom' && (
              <View style={styles.customDateContainer}>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateInputLabel}>Từ ngày</Text>
                  <TextInput 
                    style={styles.dateInput} 
                    placeholder="DD/MM/YYYY" 
                    value={customStartText}
                    onChangeText={setCustomStartText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateInputLabel}>Đến ngày</Text>
                  <TextInput 
                    style={styles.dateInput} 
                    placeholder="DD/MM/YYYY" 
                    value={customEndText}
                    onChangeText={setCustomEndText}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.applyFilterBtn} onPress={applyFilter}>
              <Text style={styles.applyFilterText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtnHeader: {
    marginRight: 4,
    marginLeft: -4,
    padding: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#FF7676",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  activeDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00D1FF",
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  monthPickerContainer: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 32,
  },
  monthText: {
    color: COLORS.blue,
    fontSize: 18,
    fontWeight: "bold",
  },
  chartSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  arrowNav: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  chartWrapper: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  chartCenterContent: {
    position: "absolute",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.white,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 48,
  },
  categoryPill: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    minWidth: "45%",
    alignItems: "center",
  },
  activePill: {
    borderWidth: 2,
    borderColor: COLORS.dark,
  },
  categoryLabel: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 48,
  },
  statItem: {
    alignItems: "center",
  },
  statCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "600",
  },
  shadowEffect: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  historyButton: {
    backgroundColor: COLORS.blue,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  historyButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  purchasedSection: {
    marginBottom: 48,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  seeAllText: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: "600",
  },
  purchasedScroll: {
    gap: 16,
  },
  purchasedCard: {
    width: 120,
    alignItems: "center",
  },
  purchasedImage: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    marginBottom: 8,
  },
  purchasedName: {
    fontSize: 12,
    color: COLORS.dark,
    fontWeight: "500",
    textAlign: "center",
  },
  emptyProductsView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  emptyTextFixed: {
    textAlign: "center",
    color: "#888888",
    fontSize: 14,
    marginTop: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  filterOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  filterOptionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterOptionBtnActive: {
    backgroundColor: "#E8F0FF",
    borderColor: COLORS.blue,
  },
  filterOptionText: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
  },
  filterOptionTextActive: {
    color: COLORS.blue,
    fontWeight: "bold",
  },
  customDateContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  applyFilterBtn: {
    backgroundColor: COLORS.blue,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  applyFilterText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});
