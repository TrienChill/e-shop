import { supabase } from "@/src/lib/supabase";
import {
  AlertCircle,
  Bell,
  Filter,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { LineChart, PieChart } from "react-native-gifted-charts";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

// --- Components ---

const Shimmer = ({ width, height, borderRadius = 8, style }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: "#E5E7EB", opacity },
        style,
      ]}
    />
  );
};

const KPICard = ({ title, value, icon: Icon, color, iconBg, isLoading }: any) => (
  <View style={styles.kpiCardWrapper}>
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Icon size={24} color={color} strokeWidth={2} />
        </View>
        <TouchableOpacity>
          <MoreVertical size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      <View>
        <Text style={styles.kpiTitle}>{title}</Text>
        {isLoading ? (
          <Shimmer width={120} height={26} style={{ marginTop: 4 }} />
        ) : (
          <Text style={styles.kpiValue}>{value}</Text>
        )}
      </View>
    </View>
  </View>
);

const FilterButton = ({ label, isActive, onPress }: any) => (
  <TouchableOpacity
    style={[styles.filterButton, isActive && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function AdminDashboardHome() {
  const { width } = useWindowDimensions();
  const [chartWidth, setChartWidth] = useState(300);

  // States for real data
  const [summaryData, setSummaryData] = useState<any>({
    revenue: 0,
    new_orders: 3,
    new_returns: 0,
    new_customers: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  // Loading & Filtering States
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [filterType, setFilterType] = useState<"7" | "30" | "month">("7");

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const getResponsiveCardWidth = () => {
    if (isDesktop) return "25%";
    if (isTablet) return "50%";
    return "100%";
  };

  const getResponsiveChartWidth = () => {
    if (isDesktop) return "65%";
    if (isTablet) return "100%";
    return "100%";
  };

  const getResponsivePieWidth = () => {
    if (isDesktop) return "35%";
    if (isTablet) return "100%";
    return "100%";
  };

  // Initial Fetch
  useEffect(() => {
    loadOtherData(true);
  }, []);

  // Fetch Revenue when filter changes
  useEffect(() => {
    let days = 7;
    if (filterType === "30") days = 30;
    if (filterType === "month") days = new Date().getDate();

    // Do not show isolated chart spinner if it's already doing a full refresh pull
    fetchRevenueData(days, !isRefreshing);
  }, [filterType]);

  const loadOtherData = async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true);
    try {
      setErrorMsg("");

      const [
        { data: summary, error: err1 },
        { data: status, error: err2 },
        { data: products, error: err3 },
      ] = await Promise.all([
        supabase.rpc("get_dashboard_summary"),
        supabase.rpc("get_order_status_distribution"),
        supabase.rpc("get_top_selling_products", { limit_num: 5 }),
      ]);

      if (err1 || err2 || err3) {
        console.warn("Lỗi fetch RPC khác:", err1 || err2 || err3);
        setErrorMsg("Không thể tải một số dữ liệu từ máy chủ.");
      }

      // 1. Map Summary
      const sumObj = Array.isArray(summary) ? summary[0] : summary;
      if (sumObj) {
        // Fallback robust để hứng mọi dạng key JSON từ RPC
        setSummaryData({
          revenue: sumObj.revenue ?? sumObj.total_revenue ?? sumObj.totalAmount ?? 0,
          new_orders: sumObj.new_orders ?? sumObj.pending_orders ?? sumObj.total_orders ?? 0,
          new_returns: sumObj.new_returns ?? sumObj.pending_returns ?? sumObj.return_requests ?? 0,
          new_customers: sumObj.new_customers ?? sumObj.new_users ?? sumObj.total_customers ?? 0,
        });
      }

      // 2. Map Status
      if (status && Array.isArray(status)) {
        const statusColors: any = {
          pending: "#F59E0B", // Yellow
          processing: "#8B5CF6", // Purple
          shipping: "#3B82F6", // Blue
          completed: "#10B981", // Green
          cancelled: "#EF4444", // Red
          refunded: "#64748B", // Gray
          return_requested: "#F43F5E", // Rose
          returning: "#EC4899", // Pink
          returned: "#14B8A6", // Teal
        };
        const statusLabels: any = {
          pending: "Chờ xử lý",
          processing: "Đang chuẩn bị",
          shipping: "Đang giao",
          completed: "Hoàn thành",
          cancelled: "Đã hủy",
          refunded: "Đã hoàn tiền",
          return_requested: "Yêu cầu hoàn trả",
          returning: "Đang hoàn trả",
          returned: "Đã hoàn trả",
        };

        const totalCount = status.reduce(
          (acc, curr) => acc + (Number(curr.count) || 0),
          0
        );

        const mappedStatus = status.map((s: any) => {
          const val = Number(s.count) || 0;
          return {
            value: val,
            color: statusColors[s.status] || "#9CA3AF",
            text: statusLabels[s.status] || s.status,
            label: statusLabels[s.status] || s.status,
            percentage:
              totalCount > 0
                ? Math.round((val / totalCount) * 100) + "%"
                : "0%",
          };
        });
        setStatusData(mappedStatus);
      }

      // 3. Map Products
      if (products && Array.isArray(products)) {
        setTopProducts(products);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      if (showSkeleton) setIsLoading(false);
    }
  };

  const fetchRevenueData = async (days: number, showSpinner = false) => {
    if (showSpinner) setIsChartLoading(true);
    try {
      const { data: revenue, error } = await supabase.rpc("get_revenue_by_days", {
        p_days: days,
      });
      if (error) {
        console.warn("Lỗi fetch revenue:", error);
      }
      if (revenue && Array.isArray(revenue)) {
        const mappedRevenue = revenue.map((r: any) => {
          // Format date from YYYY-MM-DD to DD/MM
          const parts = r.date_str ? r.date_str.split("-") : [];
          const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : r.date_str;
          return {
            value: Number(r.daily_revenue) || 0,
            label,
          };
        });
        setRevenueData(mappedRevenue);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showSpinner) setIsChartLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    let days = 7;
    if (filterType === "30") days = 30;
    if (filterType === "month") days = new Date().getDate();

    await Promise.all([
      loadOtherData(false),
      fetchRevenueData(days, false),
    ]);
    setIsRefreshing(false);
  };

  const renderPieChart = () => {
    if (isLoading) {
      return <Shimmer width={180} height={180} borderRadius={90} />;
    }
    if (statusData.length === 0) {
      return (
        <View style={[styles.pieCenter, { height: 180 }]}>
          <Text style={{ color: "#9CA3AF" }}>Chưa có dữ liệu</Text>
        </View>
      );
    }
    return (
      <PieChart
        data={statusData}
        donut
        radius={90}
        innerRadius={60}
        centerLabelComponent={() => {
          return (
            <View style={styles.pieCenter}>
              <Text style={styles.pieCenterText}>Tổng</Text>
              <Text style={styles.pieCenterValue}>100%</Text>
            </View>
          );
        }}
      />
    );
  };

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.rootContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={["#6366F1"]}
          tintColor="#6366F1"
        />
      }
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarLabel}>Hệ thống quản trị</Text>
          <Text style={styles.topBarTitle}>Dashboard Tổng Quan</Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
            <RefreshCw size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={20} color="#1F2937" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <Image
              source={{ uri: "https://i.pravatar.cc/150?u=admin" }}
              style={styles.profileImage}
            />
            {Platform.OS === "web" && (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Admin</Text>
                <Text style={styles.profileRole}>Quản trị viên</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {errorMsg ? (
        <View style={styles.errorAlert}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.errorAlertText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Khu vực 1: Hàng Thẻ Thống Kê Nhanh */}
      <View style={styles.kpiGrid}>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Doanh thu (Lọc theo biểu đồ)"
            value={formatCurrency(summaryData.revenue)}
            icon={TrendingUp}
            color="#6366F1"
            iconBg="#EEF2FF"
            isLoading={isLoading}
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Đơn hàng mới"
            value={`${summaryData.new_orders} (Pending)`}
            icon={ShoppingBag}
            color="#F59E0B"
            iconBg="#FEF3C7"
            isLoading={isLoading}
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Yêu cầu hoàn trả"
            value={`${summaryData.new_returns} (Pending)`}
            icon={RotateCcw}
            color="#EF4444"
            iconBg="#FEE2E2"
            isLoading={isLoading}
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Khách hàng mới"
            value={summaryData.new_customers.toString()}
            icon={Users}
            color="#10B981"
            iconBg="#D1FAE5"
            isLoading={isLoading}
          />
        </View>
      </View>

      {/* Khu vực 2: Khu vực Biểu đồ */}
      <View style={styles.chartGrid}>
        {/* Cột 1: Biểu đồ đường (Doanh thu) */}
        <View style={[styles.chartCol, { width: getResponsiveChartWidth() }]}>
          <View style={styles.whiteCard}>
            <View style={styles.chartHeaderContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                  Biểu đồ Doanh thu
                </Text>
                {isChartLoading && (
                  <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 12 }} />
                )}
              </View>

              <View style={styles.filterGroup}>
                <Filter size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                <FilterButton
                  label="7 Ngày"
                  isActive={filterType === "7"}
                  onPress={() => setFilterType("7")}
                />
                <FilterButton
                  label="30 Ngày"
                  isActive={filterType === "30"}
                  onPress={() => setFilterType("30")}
                />
                <FilterButton
                  label="Tháng này"
                  isActive={filterType === "month"}
                  onPress={() => setFilterType("month")}
                />
              </View>
            </View>

            <View
              style={styles.chartWrapper}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setChartWidth(Math.max(width - 60, 200));
              }}
            >
              {isLoading && revenueData.length === 0 ? (
                <Shimmer width="100%" height={220} />
              ) : revenueData.length > 0 ? (
                <LineChart
                  data={revenueData}
                  width={chartWidth}
                  height={220}
                  spacing={chartWidth / Math.max(revenueData.length, 1)}
                  color="#6366F1"
                  thickness={3}
                  dataPointsColor="#6366F1"
                  dataPointsRadius={4}
                  hideRules
                  yAxisTextStyle={{ color: "#9CA3AF", fontSize: 11 }}
                  xAxisLabelTextStyle={{ color: "#9CA3AF", fontSize: 11 }}
                  yAxisLabelPrefix=" "
                  formatYLabel={(label) => {
                    return (parseInt(label) / 1000000).toString() + "M";
                  }}
                  isAnimated
                />
              ) : (
                <View style={[styles.chartWrapper, { height: 220 }]}>
                  <Text style={{ color: "#9CA3AF" }}>
                    Chưa có dữ liệu giao dịch
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Cột 2: Biểu đồ tròn (Tỉ lệ trạng thái) */}
        <View style={[styles.chartCol, { width: getResponsivePieWidth() }]}>
          <View style={styles.whiteCard}>
            <Text style={styles.cardTitle}>Tỉ lệ trạng thái đơn hàng</Text>
            <View style={styles.pieWrapper}>
              {renderPieChart()}

              {/* Legend */}
              {!isLoading && statusData.length > 0 && (
                <View style={styles.legendContainer}>
                  {statusData.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.legendText}>
                        {item.label} ({item.percentage})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Khu vực 3: Danh sách nổi bật */}
      <View style={styles.listSection}>
        <View style={styles.whiteCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Top 5 Sản Phẩm Bán Chạy Nhất</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>#</Text>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>Sản phẩm</Text>
            <Text
              style={[
                styles.tableHeaderText,
                { flex: 1.5, textAlign: "right" },
              ]}
            >
              Giá
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Đã bán
            </Text>
          </View>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <View key={index} style={styles.tableRow}>
                <Shimmer width="100%" height={40} />
              </View>
            ))
          ) : topProducts.length > 0 ? (
            topProducts.map((product, index) => (
              <View key={product.product_id} style={styles.tableRow}>
                <Text
                  style={[styles.tableCellText, styles.rankText, { flex: 0.5 }]}
                >
                  {index + 1}
                </Text>
                <View style={[styles.productCell, { flex: 3 }]}>
                  <Image
                    source={{
                      uri:
                        product.image_url ||
                        "https://via.placeholder.com/60",
                    }}
                    style={styles.productImage}
                  />
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tableCellText,
                    styles.priceText,
                    { flex: 1.5, textAlign: "right" },
                  ]}
                >
                  {formatCurrency(product.price)}
                </Text>
                <Text
                  style={[
                    styles.tableCellText,
                    styles.salesText,
                    { flex: 1, textAlign: "right" },
                  ]}
                >
                  {product.total_sold ?? product.total_sales ?? 0}
                </Text>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF" }}>Chưa có sản phẩm bán chạy</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },
  rootContent: { padding: 24, paddingBottom: 48 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  topBarLabel: { color: "#9CA3AF", fontSize: 14, fontWeight: "500" },
  topBarTitle: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: "#EF4444",
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "white",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 4,
    paddingRight: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileImage: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  profileInfo: { display: "flex" },
  profileName: { color: "#111827", fontWeight: "700", fontSize: 13 },
  profileRole: { color: "#9CA3AF", fontSize: 11 },

  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorAlertText: { color: "#B91C1C", marginLeft: 8, fontWeight: "500" },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
    marginBottom: 24,
  },
  kpiCardWrapper: { padding: 8 },
  kpiCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 140,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconContainer: { padding: 12, borderRadius: 14 },
  kpiTitle: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 4,
  },
  kpiValue: { color: "#111827", fontSize: 22, fontWeight: "800" },

  chartGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
    marginBottom: 24,
  },
  chartCol: { padding: 8 },
  whiteCard: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  chartHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  cardTitle: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 18,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#111827",
  },
  chartWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginLeft: -10,
  },
  pieWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  pieCenter: { alignItems: "center", justifyContent: "center" },
  pieCenterText: { color: "#6B7280", fontSize: 12, fontWeight: "500" },
  pieCenterValue: { color: "#111827", fontSize: 20, fontWeight: "800" },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 24,
    gap: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: "#4B5563", fontSize: 12, fontWeight: "500" },

  listSection: { marginTop: 8 },
  seeAllText: { color: "#6366F1", fontWeight: "600", fontSize: 14 },

  tableHeader: {
    flexDirection: "row",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 12,
  },
  tableHeaderText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  tableCellText: { color: "#111827", fontSize: 14, fontWeight: "500" },
  rankText: { color: "#6B7280", fontWeight: "700" },
  productCell: { flexDirection: "row", alignItems: "center" },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F3F4F6",
  },
  productName: { color: "#111827", fontSize: 14, fontWeight: "600", flex: 1 },
  priceText: { color: "#4B5563" },
  salesText: { color: "#10B981", fontWeight: "700" },
});
