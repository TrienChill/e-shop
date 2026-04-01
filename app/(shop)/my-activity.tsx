import CommonHeader from "@/src/components/layout/Header";
import { supabase } from "@/src/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  Settings,
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
  textSecondary: "#666666",
  shadow: "rgba(0, 0, 0, 0.1)",
};

const CATEGORIES = [
  { id: "clothing", label: "Quần áo", amount: 183, color: COLORS.blue },
  { id: "lingerie", label: "Nội y", amount: 92, color: COLORS.green },
  { id: "shoes", label: "Giày dép", amount: 47, color: COLORS.orange },
  { id: "bags", label: "Túi xách", amount: 43, color: COLORS.pink },
];

export default function MyActivityScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState("Tháng 4");
  const [loading, setLoading] = useState(true);
  const [purchasedProducts, setPurchasedProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    pending: 0,
  });

  // Fetch real activity data
  const fetchActivityData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch stats
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status")
        .eq("user_id", user.id);

      if (ordersError) throw ordersError;

      const total = orders.length;
      const delivered = orders.filter((o) => o.status === "completed").length;
      const pending = orders.filter((o) =>
        ["pending", "processing", "shipping"].includes(o.status),
      ).length;

      setStats({ total, delivered, pending });

      // 2. Fetch purchased products (limit to 10 latest unique products)
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select(
          `
          product_id,
          products (id, name, images),
          orders!inner (user_id)
        `,
        )
        .eq("orders.user_id", user.id)
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;

      // Filter unique products
      const productsMap = new Map();
      items.forEach((item: any) => {
        if (item.products && !productsMap.has(item.products.id)) {
          productsMap.set(item.products.id, {
            id: item.products.id,
            name: item.products.name,
            image: item.products.images?.[0] || "",
          });
        }
      });

      setPurchasedProducts(Array.from(productsMap.values()).slice(0, 10));
    } catch (error) {
      console.error("Lỗi lấy dữ liệu hoạt động:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActivityData();
    }, [fetchActivityData]),
  );

  // Tính toán dữ liệu biểu đồ
  const totalAmount = useMemo(
    () => CATEGORIES.reduce((acc, cat) => acc + cat.amount, 0),
    [],
  );
  const displayAmount = selectedCategory
    ? CATEGORIES.find((c) => c.id === selectedCategory)?.amount
    : totalAmount;

  // Tính toán các phân đoạn biểu đồ
  const chartData = useMemo(() => {
    let currentOffset = 0;
    return CATEGORIES.map((cat) => {
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
  }, [totalAmount]);

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
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtnHeader}
            >
              <ChevronLeft size={28} color={COLORS.dark} />
            </TouchableOpacity>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
              }}
              style={styles.avatar}
            />
            <Text style={styles.headerTitle}>Hoạt động</Text>
          </View>
        )}
        renderRight={() => (
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <LayoutGrid size={22} color={COLORS.dark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Filter size={22} color={COLORS.dark} />
              <View style={styles.activeDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Settings size={22} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
        )}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Thanh chọn tháng */}
        <View style={styles.monthPickerContainer}>
          <Text style={styles.monthText}>{currentMonth}</Text>
        </View>

        {/* 2. Biểu đồ chi tiêu (Donut Chart Section) */}
        <View style={styles.chartSection}>
          <TouchableOpacity style={styles.arrowNav}>
            <ChevronLeft size={28} color={COLORS.blue} />
          </TouchableOpacity>

          <View style={styles.chartWrapper}>
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
                ${displayAmount?.toLocaleString()},00
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.arrowNav}>
            <ChevronRight size={28} color={COLORS.blue} />
          </TouchableOpacity>
        </View>

        {/* 3. Chú thích phân mục (Categories) */}
        <View style={styles.categoriesContainer}>
          {CATEGORIES.map((cat) => (
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
                {cat.label} ${cat.amount},00
              </Text>
            </TouchableOpacity>
          ))}
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
            <Text style={styles.emptyText}>Bạn chưa mua sản phẩm nào.</Text>
          )}
        </View>

        {/* 5. Nút hành động cuối trang */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() =>
            router.push({ pathname: "/to-receive", params: { status: "history" } })
          }
        >
          <Text style={styles.historyButtonText}>Lịch sử mua hàng</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FF7676",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
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
    color: COLORS.dark,
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
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
});
